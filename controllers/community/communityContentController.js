import Community from "../../model/community/Community.js";
import CommunityPost from "../../model/community/CommunityPost.js";
import CommunityResource from "../../model/community/CommunityResource.js";
import CommunityMember from "../../model/community/CommunityMember.js";
import User from "../../model/User.js";
import Host from "../../model/Host.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { trackCommunityEvent } from "../../services/communityAnalytics.js";
import { attachCloudFrontUrl } from "../../utils/imageUtils.js";

const isAdminOrOwner = (community, userId) => {
  if (!Array.isArray(community.members)) return false;
  return community.members.some(m => String(m.user_id) === String(userId) && (m.role === "owner" || m.role === "admin"));
};

const getCommunityIdFromParam = async (paramId) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(paramId)) return paramId;
  const communities = await Community.query("slug").eq(paramId).exec();
  return communities[0]?.id || null;
};

export const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = await getCommunityIdFromParam(req.params.id);
    if (!communityId) return res.status(404).json({ message: "Community not found" });
    const uploadedMedia = Array.isArray(req.files) ? req.files.map(f => f.location) : [];
    const { content } = req.body;
    if (!content && uploadedMedia.length === 0) return res.status(400).json({ message: "Post must contain text or media" });
    const community = await Community.get(communityId);
    if (!community || community.status !== "active") return res.status(404).json({ message: "Community not found or inactive" });
    const hostResults = await Host.query("user_id").eq(userId).exec();
    if (!hostResults[0]) return res.status(403).json({ message: "Only hosts can create posts" });
    const members = await CommunityMember.query("community_id").eq(communityId).where("user_id").eq(userId).exec();
    const isOwner = String(community.created_by) === String(userId);
    if (!isOwner && (!members || members.length === 0)) return res.status(403).json({ message: "Join community first" });
    let mediaType = "text";
    if (uploadedMedia.length && content) mediaType = "mixed";
    else if (uploadedMedia.length) mediaType = "image";
    const postData = { community_id: communityId, user_id: userId, media_urls: uploadedMedia, media_type: mediaType };
    if (content) postData.content = content;
    const created = await CommunityPost.create(postData);
    await Community.update({ id: communityId }, { posts_count: (community.posts_count || 0) + 1 });
    await trackCommunityEvent({ event_type: "COMMUNITY_POST_CREATED", user_id: userId, community, metadata: { post_id: created.id } });
    const user = await User.get(userId);
    const host = hostResults[0];
    const post = { ...created, author: { id: userId, profile_image: user?.profile_image ? attachCloudFrontUrl(user.profile_image) : null, Host: host ? { full_name: host.full_name, country: host.country, state: host.state, city: host.city, status: host.status } : null } };
    await deleteCacheByPrefix(`community:${communityId}:feed:`);
    return res.json({ success: true, post });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
};

export const getFeed = async (req, res) => {
  try {
    const communityId = await getCommunityIdFromParam(req.params.id);
    if (!communityId) return res.status(404).json({ message: "Community not found" });
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 10;
    
    const cacheKey = `community:${communityId}:feed:${page}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const offset = (page - 1) * limit;
    let posts = await CommunityPost.query("community_id").eq(communityId).exec();
    posts = posts.filter(p => p.status === "active");
    posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paginatedPosts = posts.slice(offset, offset + limit);
    const userIds = [...new Set(paginatedPosts.map(p => p.user_id).filter(Boolean))];
    let usersList = [];
    if (userIds.length > 0) {
      try {
        usersList = await User.batchGet(userIds);
      } catch (err) {
        console.error("User batchGet failed in getFeed", err);
      }
    }
    const usersMap = {};
    for (const u of usersList) {
      if (u && u.id) {
        usersMap[u.id] = u;
      }
    }

    const hostQueries = userIds.map(async uid => {
      try {
        const hosts = await Host.query("user_id").eq(uid).exec();
        return { uid, host: hosts?.[0] || null };
      } catch (err) {
        console.error("Host GSI query failed in getFeed", err);
        return { uid, host: null };
      }
    });
    const hostQueryResults = await Promise.all(hostQueries);
    const hostMap = {};
    for (const res of hostQueryResults) {
      if (res.host) {
        hostMap[res.uid] = res.host;
      }
    }

    const enrichedPosts = paginatedPosts.map(post => {
      const user = usersMap[post.user_id];
      const host = hostMap[post.user_id];
      return {
        ...post,
        author: {
          id: post.user_id,
          profile_image: user?.profile_image ? attachCloudFrontUrl(user.profile_image) : null,
          Host: host ? {
            full_name: host.full_name,
            country: host.country,
            state: host.state,
            city: host.city,
            status: host.status
          } : null
        }
      };
    });

    const response = { success: true, page, posts: enrichedPosts };
    await setCache(cacheKey, response, 300);

    return res.json(response);
  } catch (err) {
    console.error("GET FEED ERROR:", err);
    return res.status(500).json({ message: "Failed to load feed" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    if (!postId) return res.status(400).json({ message: "Invalid post id" });
    const post = await CommunityPost.get(postId);
    if (!post || post.status === "deleted") return res.status(404).json({ message: "Post not found" });
    const community = await Community.get(post.community_id);
    if (!community) return res.status(404).json({ message: "Community not found" });
    const isAuthor = String(post.user_id) === String(userId);
    const isOwner = String(community.created_by) === String(userId);
    if (!isAuthor && !isOwner) return res.status(403).json({ message: "Not authorized" });
    await CommunityPost.update({ id: postId }, { status: "deleted" });
    await Community.update({ id: community.id }, { posts_count: Math.max(0, (community.posts_count || 0) - 1) });
    deleteCacheByPrefix(`community:${post.community_id}:feed:`).catch(console.error);
    trackCommunityEvent({ event_type: "COMMUNITY_POST_DELETED", user_id: req.user.id, community, metadata: { post_id: postId } }).catch(console.error);
    return res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    return res.status(500).json({ message: "Failed to delete post" });
  }
};

export const addResource = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = await getCommunityIdFromParam(req.params.id);
    const { title, description, resource_type } = req.body;
    let resource_value = req.body.resource_value;
    if (!title || !resource_type) return res.status(400).json({ message: "Missing required fields" });
    if (!communityId) return res.status(404).json({ message: "Community not found" });
    const community = await Community.get(communityId);
    if (!community || community.status !== "active") return res.status(404).json({ message: "Community not found" });
    if (!isAdminOrOwner(community, userId)) return res.status(403).json({ message: "Only admin or owner can add resources" });
    if (req.file) resource_value = req.file.location;
    if (!resource_value) return res.status(400).json({ message: "Resource value is required" });
    const resource = await CommunityResource.create({ community_id: communityId, added_by: userId, title, description, resource_type, resource_value });
    await trackCommunityEvent({ event_type: "COMMUNITY_RESOURCE_ADDED", user_id: userId, community, metadata: { resource_id: resource.id } });
    await deleteCache(`community:${communityId}:resources`);
    return res.json({ success: true, resource });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to add resource" });
  }
};

export const getResources = async (req, res) => {
  try {
    const communityId = await getCommunityIdFromParam(req.params.id);
    if (!communityId) return res.status(404).json({ message: "Community not found" });
    const cacheKey = `community:${communityId}:resources`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, resources: cached });
    let resources = await CommunityResource.query("community_id").eq(communityId).exec();
    resources = resources.filter(r => r.status === "active");
    resources.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    await setCache(cacheKey, resources, 300);
    return res.json({ success: true, resources });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const userId = req.user.id;
    const resourceId = req.params.resourceId;
    const resource = await CommunityResource.get(resourceId);
    if (!resource || resource.status === "deleted") return res.status(404).json({ message: "Resource not found" });
    const community = await Community.get(resource.community_id);
    if (!community) return res.status(404).json({ message: "Community not found" });
    if (!isAdminOrOwner(community, userId)) return res.status(403).json({ message: "Not authorized" });
    await CommunityResource.update({ id: resourceId }, { status: "deleted" });
    await trackCommunityEvent({ event_type: "COMMUNITY_RESOURCE_DELETED", user_id: userId, community, metadata: { resource_id: resource.id } });
    await deleteCache(`community:${resource.community_id}:resources`);
    return res.json({ success: true, message: "Resource deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};
