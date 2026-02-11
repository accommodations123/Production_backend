import Community from "../../model/community/Community.js";
import CommunityPost from "../../model/community/CommunityPost.js";
import CommunityResource from "../../model/community/CommunityResource.js";
import CommunityMember from "../../model/community/CommunityMember.js";
import User from "../../model/User.js";
import Host from "../../model/Host.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { trackCommunityEvent } from "../../services/communityAnalytics.js";

/* ======================================================
   HELPERS
====================================================== */
const isAdminOrOwner = (community, userId) => {
  if (!Array.isArray(community.members)) return false;

  return community.members.some(
    m =>
      Number(m.user_id) === Number(userId) &&
      (m.role === "owner" || m.role === "admin")
  );
};


/* ======================================================
   FEED CONTROLLERS
====================================================== */

/* CREATE POST (text / image / video like tweet) */


export const createPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = Number(req.params.id);

    const uploadedMedia = Array.isArray(req.files)
      ? req.files.map(f => f.location)
      : [];

    const { content } = req.body;

    if (!content && uploadedMedia.length === 0) {
      return res.status(400).json({
        message: "Post must contain text or media"
      });
    }

    const community = await Community.findByPk(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    /* HOST-ONLY POSTING */
    const host = await Host.findOne({
      where: { user_id: userId }
    });

    if (!host) {
      return res.status(403).json({
        message: "Only hosts can create posts"
      });
    }

    /* MEMBERSHIP CHECK (O(1) INDEXED) */
    const member = await CommunityMember.findOne({
      where: { community_id: communityId, user_id: userId },
      attributes: ["role"]
    });

    if (!member) {
      return res.status(403).json({
        message: "Join community first"
      });
    }

    let mediaType = "text";
    if (uploadedMedia.length && content) mediaType = "mixed";
    else if (uploadedMedia.length) mediaType = "image";

    const created = await CommunityPost.create({
      community_id: communityId,
      user_id: userId,
      content: content || null,
      media_urls: uploadedMedia,
      media_type: mediaType
    });
 
/* =========================
       2️⃣ UPDATE AGGREGATE
       ========================= */
    await Community.increment("posts_count", {
      where: { id: communityId }
    });

    /* =========================
       3️⃣ ANALYTICS (AFTER COMMIT)
       ========================= */
    await trackCommunityEvent({
      event_type: "COMMUNITY_POST_CREATED",
      user_id: userId,
      community,
      metadata: { post_id: created.id }
    });

    const post = await CommunityPost.findByPk(created.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id","profile_image"],   // keep user minimal
          include: [
            {
              model: Host,
              attributes: [
                "full_name",
                "country",
                "state",
                "city",
                "status"
              ]
            }
          ]
        }
      ]
    });


    await deleteCacheByPrefix(`community:${communityId}:feed:`);

    return res.json({ success: true, post });

  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    return res.status(500).json({
      message: "Failed to create post"
    });
  }
};



/* GET COMMUNITY FEED (PAGINATED) */
export const getFeed = async (req, res) => {
  try {
    const communityId = Number(req.params.id);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 10;
    const offset = (page - 1) * limit;

    const posts = await CommunityPost.findAll({
      where: {
        community_id: communityId,
        status: "active"
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id","profile_image"], // keep minimal
          include: [
            {
              model: Host,
              attributes: [
                "full_name",
                "country",
                "state",
                "city",
                "status"
              ]
            }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      page,
      posts
    });

  } catch (err) {
    console.error("GET FEED ERROR:", err);
    return res.status(500).json({
      message: "Failed to load feed"
    });
  }
};





export const deletePost = async (req, res) => {
  const t = await Community.sequelize.transaction();

  try {
    const userId = req.user.id;
    const postId = Number(req.params.postId);

    if (!Number.isInteger(postId)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid post id" });
    }

    const post = await CommunityPost.findByPk(postId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!post || post.status === "deleted") {
      await t.rollback();
      return res.status(404).json({ message: "Post not found" });
    }

    const community = await Community.findByPk(post.community_id, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!community) {
      await t.rollback();
      return res.status(404).json({ message: "Community not found" });
    }

    // ✅ FIXED: Direct Owner Check (Bypasses isAdminOrOwner helper)
    const isAuthor = Number(post.user_id) === Number(userId);
    const isOwner = Number(community.created_by) === Number(userId);

    if (!isAuthor && !isOwner) {
      await t.rollback();
      return res.status(403).json({ message: "Not authorized" });
    }

    // Soft delete
    post.status = "deleted";
    await post.save({ transaction: t });

    // Safe decrement
    community.posts_count = Math.max(0, community.posts_count - 1);
    await community.save({ transaction: t });

    await t.commit();

    /* ✅ MOVED UP: Execute side effects BEFORE returning */
    // We catch these errors so they don't block the response
    deleteCacheByPrefix(`community:${post.community_id}:feed:`).catch(console.error);

    trackCommunityEvent({
      event_type: "COMMUNITY_POST_DELETED",
      user_id: req.user.id,
      community, // Pass community object for better logging
      metadata: { post_id: postId }
    }).catch(console.error);

    return res.json({ success: true, message: "Post deleted" });

  } catch (err) {
    await t.rollback();
    console.error("DELETE POST ERROR:", err);
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

    const { title, description, resource_type } = req.body;

    let resource_value = req.body.resource_value;

    if (!title || !resource_type) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const community = await Community.findByPk(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found" });
    }

    if (!isAdminOrOwner(community, userId)) {
      return res.status(403).json({
        message: "Only admin or owner can add resources"
      });
    }

    // If file uploaded, override resource_value
    if (req.file) {
      resource_value = req.file.location;
    }

    if (!resource_value) {
      return res.status(400).json({ message: "Resource value is required" });
    }

    const resource = await CommunityResource.create({
      community_id: communityId,
      added_by: userId,
      title,
      description,
      resource_type,
      resource_value
    });
    await trackCommunityEvent({
  event_type: "COMMUNITY_RESOURCE_ADDED",
  user_id:userId,
  community,
  metadata: { resource_id: resource.id }
});


    await deleteCache(`community:${communityId}:resources`);

    return res.json({ success: true, resource });

  } catch (err) {
    console.error(err);
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
    await trackCommunityEvent({
  event_type: "COMMUNITY_RESOURCE_DELETED",
  user_id:userId,
  community,
  metadata: { resource_id:resource.id }
});


    /* 🔥 REDIS INVALIDATION */
    await deleteCache(`community:${resource.community_id}:resources`);

    return res.json({ success: true, message: "Resource deleted" });

  } catch (err) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

