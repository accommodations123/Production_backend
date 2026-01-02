import Community from "../../model/community/Community.js";
import CommunityPost from "../../model/community/CommunityPost.js";
import CommunityResource from "../../model/community/CommunityResource.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";

/* ======================================================
   HELPERS
====================================================== */

const isMember = (community, userId) => {
  return community.members?.some(m => m.user_id === userId);
};

const isAdminOrOwner = (community, userId) => {
  return community.members?.some(
    m => m.user_id === userId && (m.role === "owner" || m.role === "admin")
  );
};

/* ======================================================
   FEED CONTROLLERS
====================================================== */

/* CREATE POST (text / image / video like tweet) */
export const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;

    // ✅ Extract uploaded media URLs from multer
    const uploadedMedia =
      req.files && req.files.length > 0
        ? req.files.map(file => file.location)
        : [];

    const { content } = req.body;

    if (!content && uploadedMedia.length === 0) {
      return res.status(400).json({
        message: "Post must contain text or media"
      });
    }

    const community = await Community.findByPk(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found" });
    }

    if (!isMember(community, userId)) {
      return res.status(403).json({ message: "Join community first" });
    }

    // ✅ Detect media type
    let mediaType = "text";
    if (uploadedMedia.length > 0 && content) {
      mediaType = "mixed";
    } else if (uploadedMedia.length > 0) {
      mediaType = "media"; // covers image + video
    }

    const post = await CommunityPost.create({
      community_id: communityId,
      user_id: userId,
      content: content || null,
      media_urls: uploadedMedia,
      media_type: mediaType
    });

    /* ✅ AGGREGATION */
    await Community.increment("posts_count", {
      where: { id: communityId }
    });

    /* 🔥 REDIS INVALIDATION */
    await deleteCacheByPrefix(`community:${communityId}:feed:`);

    return res.json({ success: true, post });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    return res.status(500).json({ message: "Failed to create post" });
  }
};



/* GET COMMUNITY FEED (PAGINATED) */
export const getFeed = async (req, res) => {
  try {
    const communityId = req.params.id;
    const page = parseInt(req.query.page || 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const cacheKey = `community:${communityId}:feed:page:${page}`;

    /* 🔹 REDIS READ */
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, page, posts: cached });
    }

    const community = await Community.findByPk(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found" });
    }

    const posts = await CommunityPost.findAll({
      where: {
        community_id: communityId,
        status: "active"
      },
      order: [["created_at", "DESC"]],
      limit,
      offset
    });

    /* 🔹 REDIS WRITE (short TTL) */
    await setCache(cacheKey, posts, 60);

    return res.json({ success: true, page, posts });

  } catch (err) {
    return res.status(500).json({ message: "Failed to load feed" });
  }
};


/* SOFT DELETE POST */
export const deletePost = async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;

    const post = await CommunityPost.findByPk(postId);
    if (!post || post.status === "deleted") {
      return res.status(404).json({ message: "Post not found" });
    }

    const community = await Community.findByPk(post.community_id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (post.user_id !== userId && !isAdminOrOwner(community, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    post.status = "deleted";
    await post.save();

    /* ✅ AGGREGATION */
    await Community.decrement("posts_count", {
      where: { id: post.community_id }
    });

    /* 🔥 REDIS INVALIDATION */
    await deleteCacheByPrefix(`community:${post.community_id}:feed:`);

    return res.json({ success: true, message: "Post deleted" });

  } catch (err) {
    return res.status(500).json({ message: "Failed to delete post" });
  }
};


/* ======================================================
   RESOURCES CONTROLLERS
====================================================== */

/* ADD RESOURCE (ADMIN / OWNER ONLY) */
export const addResource = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;
    const { title, description, resource_type, resource_value } = req.body;

    if (!title || !resource_type || !resource_value) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const community = await Community.findByPk(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found" });
    }

    if (!isAdminOrOwner(community, userId)) {
      return res.status(403).json({ message: "Only admin or owner can add resources" });
    }

    const resource = await CommunityResource.create({
      community_id: communityId,
      added_by: userId,
      title,
      description,
      resource_type,
      resource_value
    });

    /* 🔥 REDIS INVALIDATION */
    await deleteCache(`community:${communityId}:resources`);

    return res.json({ success: true, resource });

  } catch (err) {
    return res.status(500).json({ message: "Failed to add resource" });
  }
};


/* GET RESOURCES */
export const getResources = async (req, res) => {
  try {
    const communityId = req.params.id;
    const cacheKey = `community:${communityId}:resources`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, resources: cached });
    }

    const resources = await CommunityResource.findAll({
      where: {
        community_id: communityId,
        status: "active"
      },
      order: [["created_at", "DESC"]]
    });

    await setCache(cacheKey, resources, 300);

    return res.json({ success: true, resources });

  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch resources" });
  }
};


/* SOFT DELETE RESOURCE (ADMIN / OWNER ONLY) */
export const deleteResource = async (req, res) => {
  try {
    const userId = req.user.id;
    const resourceId = req.params.resourceId;

    const resource = await CommunityResource.findByPk(resourceId);
    if (!resource || resource.status === "deleted") {
      return res.status(404).json({ message: "Resource not found" });
    }

    const community = await Community.findByPk(resource.community_id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (!isAdminOrOwner(community, userId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    resource.status = "deleted";
    await resource.save();

    /* 🔥 REDIS INVALIDATION */
    await deleteCache(`community:${resource.community_id}:resources`);

    return res.json({ success: true, message: "Resource deleted" });

  } catch (err) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

