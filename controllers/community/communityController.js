import Community from "../../model/community/Community.js";
import Event from "../../model/Events.models.js";
import { setCache, getCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";

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


/* GET COMMUNITY DETAILS */
export const getCommunityById = async (req, res) => {
  const cacheKey = `community:id:${req.params.id}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, community: cached });
    }

    const community = await Community.findByPk(req.params.id);

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    await setCache(cacheKey, community, 300);

    return res.json({ success: true, community });
  } catch {
    return res.status(500).json({ message: "Failed to fetch community" });
  }
};


/* JOIN COMMUNITY */
export const joinCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const community = await Community.findByPk(req.params.id);

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    const members = community.members || [];

    if (members.some(m => m.user_id === userId)) {
      return res.status(400).json({ message: "Already a member" });
    }

    members.push({ user_id: userId, role: "member" });

    community.members = members;
    community.members_count += 1;

    await community.save();

    /* CACHE INVALIDATION */
    await deleteCache(`community:id:${community.id}`);
    await deleteCacheByPrefix("communities:list:");

    return res.json({ success: true, message: "Joined community" });
  } catch {
    return res.status(500).json({ message: "Join failed" });
  }
};


/* LEAVE COMMUNITY */
/* LEAVE COMMUNITY */
export const leaveCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;

    const community = await Community.findByPk(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found"
      });
    }

    const members = community.members || [];

    const memberIndex = members.findIndex(
      m => m.user_id === userId
    );

    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "You are not a member of this community"
      });
    }

    const memberRole = members[memberIndex].role;

    /* OWNER CANNOT LEAVE */
    if (memberRole === "owner") {
      return res.status(400).json({
        success: false,
        message: "Community owner cannot leave the community"
      });
    }

    /* REMOVE MEMBER */
    members.splice(memberIndex, 1);

    community.members = members;
    community.members_count = Math.max(0, community.members_count - 1);

    await community.save();

    /* 🔥 CACHE INVALIDATION */
    await deleteCache(`community:id:${communityId}`);
    await deleteCacheByPrefix("communities:list:");

    return res.json({
      success: true,
      message: "Left community successfully"
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to leave community"
    });
  }
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
