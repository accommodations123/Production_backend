import Community from "../../model/community/Community.js";
import CommunityPost from "../../model/community/CommunityPost.js";
import CommunityResource from "../../model/community/CommunityResource.js";
import CommunityMember from "../../model/community/CommunityMember.js";
import User from "../../model/User.js";
import Host from "../../model/Host.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { trackCommunityEvent } from "../../services/communityAnalytics.js";
import { logAudit } from "../../services/auditLogger.js";
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
  const userId = req.user.id;
  const communityId = Number(req.params.id);

  const uploadedMedia = Array.isArray(req.files)
    ? req.files.map(f => f.location)
    : [];

  const { content } = req.body;

  /* =====================================================
     1️⃣ FAST FAIL VALIDATION (NO TRANSACTION)
  ===================================================== */
  if (!content && uploadedMedia.length === 0) {
    return res.status(400).json({
      message: "Post must contain text or media"
    });
  }

  const host = await Host.findOne({ where: { user_id: userId } });
  if (!host) {
    return res.status(403).json({
      message: "Only hosts can create posts"
    });
  }

  const member = await CommunityMember.findOne({
    where: { community_id: communityId, user_id: userId }
  });
  if (!member) {
    return res.status(403).json({
      message: "Join community first"
    });
  }

  /* =====================================================
     2️⃣ TRANSACTION (DB ONLY — NO HTTP RETURNS)
  ===================================================== */
  let post;
  let community;

  const t = await Community.sequelize.transaction();

  try {
    community = await Community.findByPk(communityId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!community || community.status !== "active") {
      throw new Error("COMMUNITY_INACTIVE");
    }

    let mediaType = "text";
    if (uploadedMedia.length && content) mediaType = "mixed";
    else if (uploadedMedia.length) mediaType = "image";

    post = await CommunityPost.create(
      {
        community_id: communityId,
        user_id: userId,
        content: content || null,
        media_urls: uploadedMedia,
        media_type: mediaType
      },
      { transaction: t }
    );

    await Community.increment(
      "posts_count",
      { by: 1, where: { id: communityId }, transaction: t }
    );

    await t.commit();

  } catch (err) {
    await t.rollback();

    if (err.message === "COMMUNITY_INACTIVE") {
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    console.error("CREATE POST TX ERROR:", err);
    return res.status(500).json({
      message: "Failed to create post"
    });
  }

  /* =====================================================
     3️⃣ AUDIT (NON-BLOCKING)
  ===================================================== */
  logAudit({
    action: "COMMUNITY_POST_CREATED",
    actor: { id: userId, role: "user" },
    target: { type: "community_post", id: post.id },
    severity: "LOW",
    req
  }).catch(console.error);

  /* =====================================================
     4️⃣ ANALYTICS (NON-BLOCKING)
  ===================================================== */
  trackCommunityEvent({
    event_type: "COMMUNITY_POST_CREATED",
    user_id: userId,
    community_id: community.id,
    country: community.country,
    state: community.state,
    metadata: { media_type: post.media_type }
  }).catch(console.error);

  /* =====================================================
     5️⃣ RESPONSE POPULATION (OPTIONAL)
  ===================================================== */
  let populatedPost = post;

  try {
    populatedPost = await CommunityPost.findByPk(post.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "profile_image"],
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
  } catch (err) {
    console.warn("POST POPULATION FAILED:", err.message);
  }

  /* =====================================================
     6️⃣ CACHE INVALIDATION
  ===================================================== */
  await deleteCacheByPrefix(`community:${communityId}:feed:`);

  return res.json({
    success: true,
    post: populatedPost
  });
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
   /* ✅ AUDIT */
    logAudit({
      action: "COMMUNITY_POST_DELETED",
      actor: { id: userId, role: "user" },
      target: { type: "community_post", id: post.id },
      severity: "MEDIUM",
      req
    }).catch(console.error);

    /* ✅ ANALYTICS */
    trackCommunityEvent({
      event_type: "COMMUNITY_POST_DELETED",
      user_id: userId,
      community_id: community.id,
      country: community.country,
      state: community.state
    }).catch(console.error);


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
 logAudit({
      action: "COMMUNITY_RESOURCE_ADDED",
      actor: { id: userId, role: "user" },
      target: { type: "community_resource", id: resource.id },
      severity: "LOW",
      req
    }).catch(console.error);

    trackCommunityEvent({
      event_type: "COMMUNITY_RESOURCE_ADDED",
      user_id: userId,
      community_id: community.id,
      country: community.country,
      state: community.state,
      metadata: { resource_type }
    }).catch(console.error);


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
  logAudit({
      action: "COMMUNITY_RESOURCE_DELETED",
      actor: { id: userId, role: "user" },
      target: { type: "community_resource", id: resource.id },
      severity: "HIGH",
      req
    }).catch(console.error);

    trackCommunityEvent({
      event_type: "COMMUNITY_RESOURCE_DELETED",
      user_id: userId,
      community_id: community.id,
      country: community.country,
      state: community.state
    }).catch(console.error);


    /* 🔥 REDIS INVALIDATION */
    await deleteCache(`community:${resource.community_id}:resources`);

    return res.json({ success: true, message: "Resource deleted" });

  } catch (err) {
    return res.status(500).json({ message: "Failed to delete resource" });
  }
};

