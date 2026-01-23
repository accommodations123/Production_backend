import Community from "../../model/community/Community.js";
import Event from "../../model/Events.models.js";
import Host from "../../model/Host.js";
import CommunityMember from "../../model/community/CommunityMember.js";
import { setCache, getCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { logAudit } from "../../services/auditLogger.js";
import { trackCommunityEvent } from "../../services/communityAnalytics.js";
/* CREATE COMMUNITY */
export const createCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, country, state, city, topics } = req.body;

    if (!name || !country) {
      return res.status(400).json({
        message: "Name and country are required"
      });
    }

    const slug =
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-") +
      "-" +
      Date.now();

    const community = await Community.create({
      created_by: userId,
      name,
      slug,
      description: description || null,
      country,
      state: state || null,
      city: city || null,
      topics: Array.isArray(topics) ? topics : [],
      members: [{ user_id: userId, role: "owner" }],
      members_count: 1,
      status: "pending" // ✅ IMPORTANT
    });


    await trackCommunityEvent({
      event_type: "COMMUNITY_CREATED",
      user_id: userId,
      community
    });



    await deleteCacheByPrefix("communities:list:");

    return res.json({
      success: true,
      community
    });

  } catch (err) {
    console.error("CREATE COMMUNITY ERROR:", err);

    return res.status(500).json({
      message: err.message
    });
  }
};



export const updateCommunityProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.findByPk(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Owner-only update (correct security)
    if (community.created_by !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updateData = {};

    // 🔥 FILES COME FROM req.files, NOT req.body
    if (req.files?.avatar_image?.[0]) {
      updateData.avatar_image = req.files.avatar_image[0].location;
    }

    if (req.files?.cover_image?.[0]) {
      updateData.cover_image = req.files.cover_image[0].location;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    await community.update(updateData);

    // cache cleanup
    await deleteCache(`community:id:${id}`);
    await deleteCacheByPrefix("communities:list:");

    return res.json({
      success: true,
      community
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Update failed" });
  }
};



/* =========================================
   GET COMMUNITY DETAILS (PRODUCTION SAFE)
   ========================================= */
export const getCommunityById = async (req, res) => {
  const communityId = Number(req.params.id);

  if (!Number.isInteger(communityId)) {
    return res.status(400).json({ message: "Invalid community id" });
  }

  const cacheKey = `community:id:${communityId}`;

  try {
    /* =========================
       1️⃣ FETCH COMMUNITY (CACHE SAFE)
       ========================= */
    let community = await getCache(cacheKey);

    if (!community) {
      const dbCommunity = await Community.findByPk(communityId);

      if (!dbCommunity) {
        return res.status(404).json({ message: "Community not found" });
      }

      community = dbCommunity.toJSON();
      await setCache(cacheKey, community, 300);
    }

    /* =========================
       2️⃣ USER-SPECIFIC MEMBERSHIP
       ========================= */
    let isMember = false;
    let memberRole = null;
    let isHost = false;

    if (req.user?.id) {
      const membership = await CommunityMember.findOne({
        where: {
          community_id: communityId,
          user_id: req.user.id
        },
        attributes: ["role", "is_host"]
      });

      if (membership) {
        isMember = true;
        memberRole = membership.role;
        isHost = membership.is_host;
      }
    }

    /* =========================
       3️⃣ RESPONSE
       ========================= */
    return res.json({
      success: true,
      community: {
        ...community,
        is_member: isMember,
        isJoined: isMember,
        member_role: memberRole,
        is_host: isHost
      }
    });

  } catch (err) {
    console.error("GET COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch community" });
  }
};




/* JOIN COMMUNITY */

export const joinCommunity = async (req, res) => {
  const t = await Community.sequelize.transaction();

  try {
    const userId = req.user.id;
    const communityId = Number(req.params.id);

    if (!Number.isInteger(communityId)) {
      await t.rollback();
      return res.status(400).json({ message: "Invalid community id" });
    }

    /* =========================
       1️⃣ LOCK COMMUNITY
       ========================= */
    const community = await Community.findOne({
      where: {
        id: communityId,
        status: "active"
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!community) {
      await t.rollback();
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    /* =========================
       2️⃣ CHECK EXISTING MEMBERSHIP
       ========================= */
    const existingMember = await CommunityMember.findOne({
      where: {
        community_id: communityId,
        user_id: userId
      },
      transaction: t
    });

    if (existingMember) {
      await t.rollback();
      return res.status(400).json({
        message: "Already a member of this community"
      });
    }

  /* 3️⃣ CHECK HOST STATUS */
const host = await Host.findOne({
  where: { user_id: userId },
  transaction: t
});

if (!host) {
  await t.rollback();
  return res.status(403).json({
    message: "Only approved hosts can join this community"
  });
}

/* 4️⃣ CREATE MEMBERSHIP */
await CommunityMember.create({
  community_id: communityId,
  user_id: userId,
  role: "member",
  is_host: true
}, { transaction: t });

community.members_count += 1;
community.host_count += 1;
await community.save({ transaction: t });


    /* =========================
       6️⃣ COMMIT
       ========================= */
    await t.commit();

    /* =========================
       7️⃣ ANALYTICS (POST COMMIT)
       ========================= */
    trackCommunityEvent({
      event_type: "COMMUNITY_JOINED",
      user_id: userId,
      community,
      metadata: { is_host: isHost }
    }).catch(console.error);

    /* =========================
       8️⃣ CACHE INVALIDATION
       ========================= */
    await deleteCache(`community:id:${communityId}`);
    await deleteCacheByPrefix("communities:list:");

    return res.json({
      success: true,
      message: "Joined community successfully"
    });

  } catch (err) {
    await t.rollback();
    console.error("JOIN COMMUNITY ERROR:", err);

    return res.status(500).json({
      message: "Failed to join community"
    });
  }
};





/* LEAVE COMMUNITY */


export const leaveCommunity = async (req, res) => {
  const userId = req.user.id;
  const communityId = Number(req.params.id);

  if (!Number.isInteger(communityId)) {
    return res.status(400).json({ message: "Invalid community id" });
  }

  const t = await Community.sequelize.transaction();

  try {
    /* =========================
       1️⃣ LOCK MEMBERSHIP
       ========================= */
    const member = await CommunityMember.findOne({
      where: {
        community_id: communityId,
        user_id: userId
      },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!member) {
      await t.rollback();
      return res.status(400).json({
        message: "You are not a member of this community"
      });
    }

    /* =========================
       2️⃣ OWNER CANNOT LEAVE
       ========================= */
    if (member.role === "owner") {
      await t.rollback();
      return res.status(400).json({
        message: "Community owner cannot leave"
      });
    }

    /* =========================
       3️⃣ LOCK COMMUNITY
       ========================= */
    const community = await Community.findByPk(communityId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!community) {
      await t.rollback();
      return res.status(404).json({
        message: "Community not found"
      });
    }

    /* =========================
       4️⃣ DELETE MEMBERSHIP
       ========================= */
    await member.destroy({ transaction: t });

    /* =========================
       5️⃣ UPDATE AGGREGATES
       ========================= */
    community.members_count = Math.max(
      0,
      community.members_count - 1
    );

    if (member.is_host) {
      community.host_count = Math.max(
        0,
        community.host_count - 1
      );
    }

    await community.save({ transaction: t });

    /* =========================
       6️⃣ COMMIT (DB STATE FINAL)
       ========================= */
    await t.commit();

  } catch (err) {
    await t.rollback();
    console.error("LEAVE COMMUNITY ERROR:", err);

    return res.status(500).json({
      message: "Failed to leave community"
    });
  }

  /* =========================
     7️⃣ POST-COMMIT SIDE EFFECTS
     (NEVER ROLLBACK DB)
     ========================= */

  trackCommunityEvent({
    event_type: "COMMUNITY_LEFT",
    user_id: userId,
    metadata: {
      community_id: communityId
    }
  }).catch(console.error);

  deleteCache(`community:id:${communityId}`).catch(console.error);
  deleteCacheByPrefix("communities:list:").catch(console.error);

  return res.json({
    success: true,
    message: "Left community successfully"
  });
};







/* LIST COMMUNITIES (LOCATION BASED) */
export const listCommunities = async (req, res) => {
  const { country = "all", state = "all", city = "all" } = req.query;
  const cacheKey = `communities:list:${country}:${state}:${city}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = { status: "active" };
    if (country !== "all") where.country = country;
    if (state !== "all") where.state = state;
    if (city !== "all") where.city = city;

    const communities = await Community.findAll({
      where,
      order: [["members_count", "DESC"]],
      limit: 20
    });

    await setCache(cacheKey, communities, 300);

    return res.json({ success: true, data: communities });
  } catch {
    return res.status(500).json({ message: "Failed to list communities" });
  }
};


/* NEARBY EVENTS FOR COMMUNITY */
export const getNearbyEvents = async (req, res) => {
  const cacheKey = `community:${req.params.id}:nearby_events`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, events: cached });
    }

    const community = await Community.findByPk(req.params.id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const events = await Event.findAll({
      where: {
        country: community.country,
        city: community.city,
        status: "published"
      },
      order: [["start_date", "ASC"]],
      limit: 10
    });

    await setCache(cacheKey, events, 120);

    return res.json({ success: true, events });
  } catch {
    return res.status(500).json({ message: "Failed to fetch events" });
  }
};

/* GET ALL PENDING COMMUNITIES */
export const getPendingCommunities = async (req, res) => {
  const communities = await Community.findAll({
    where: { status: "pending" },
    order: [["created_at", "DESC"]]
  });

  res.json({ success: true, communities });
};

/* APPROVE COMMUNITY */
export const approveCommunity = async (req, res) => {
  const community = await Community.findByPk(req.params.id);

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  if (community.status !== "pending") {
    return res.status(400).json({
      message: "Community is not pending approval"
    });
  }

  community.status = "active";
  await community.save();
  logAudit({
    action: "COMMUNITY_APPROVED",
    actor: { id: req.admin.id, role: "admin" },
    target: { type: "community", id: community.id },
    severity: "MEDIUM",
    req
  }).catch(console.error);

  trackCommunityEvent({
    event_type: "COMMUNITY_APPROVED",
    user_id: req.admin.id,
    community
  });


  res.json({
    success: true,
    message: "Community approved"
  });
};

/* REJECT COMMUNITY */
export const rejectCommunity = async (req, res) => {
  const community = await Community.findByPk(req.params.id);

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  community.status = "deleted";
  await community.save();
  logAudit({
    action: "COMMUNITY_REJECTED",
    actor: { id: req.admin.id, role: "admin" },
    target: { type: "community", id: community.id },
    severity: "HIGH",
    req
  }).catch(console.error);

  await trackCommunityEvent({
    event_type: "COMMUNITY_REJECTED",
    user_id: req.admin.id,
    community
  });


  res.json({
    success: true,
    message: "Community rejected"
  });
};

/* SUSPEND COMMUNITY (AFTER APPROVAL) */
export const suspendCommunity = async (req, res) => {
  const community = await Community.findByPk(req.params.id);

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  community.status = "suspended";
  await community.save();
  logAudit({
    action: "COMMUNITY_SUSPENDED",
    actor: { id: req.admin.id, role: "admin" },
    target: { type: "community", id: community.id },
    severity: "CRITICAL",
    req
  }).catch(console.error);

  await trackCommunityEvent({
    event_type: "COMMUNITY_SUSPENDED",
    user_id: req.admin.id,
    community
  });


  res.json({
    success: true,
    message: "Community suspended"
  });
};

/* RE-ACTIVATE COMMUNITY */
export const activateCommunity = async (req, res) => {
  const community = await Community.findByPk(req.params.id);

  if (!community) {
    return res.status(404).json({ message: "Community not found" });
  }

  community.status = "active";
  await community.save();

  res.json({
    success: true,
    message: "Community activated"
  });
};


export const getApprovedCommunities = async (req, res) => {
  const communities = await Community.findAll({
    where: { status: "active" },
    order: [["updated_at", "DESC"]]
  });

  res.json({ success: true, communities });
};

export const getRejectedCommunities = async (req, res) => {
  const communities = await Community.findAll({
    where: { status: "deleted" },
    order: [["updated_at", "DESC"]]
  });

  res.json({ success: true, communities });
};

export const getSuspendedCommunities = async (req, res) => {
  const communities = await Community.findAll({
    where: { status: "suspended" },
    order: [["updated_at", "DESC"]]
  });

  res.json({ success: true, communities });
};
