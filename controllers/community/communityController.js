import Community from "../../model/community/Community.js";
import Event from "../../model/Events.models.js";
import Host from "../../model/Host.js";
import CommunityMember from "../../model/community/CommunityMember.js";
import { setCache, getCache, deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";
import { logAudit } from "../../services/auditLogger.js";
import { trackCommunityEvent } from "../../services/communityAnalytics.js";
import { notifyAndEmail } from "../../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../../services/emailService.js";
import User from "../../model/User.js";
import { attachCloudFrontUrl, processHostImages } from "../../utils/imageUtils.js";

const getCommunityIdFromParam = async (paramId) => {
  // DynamoDB uses UUID strings, not auto-increment integers
  // If paramId looks like a UUID, use directly; otherwise look up by slug
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(paramId)) return paramId;

  // Try slug lookup via GSI
  const communities = await Community.query("slug").eq(paramId).exec();
  return communities[0]?.id || null;
};

function processCommunityImages(community) {
  const c = { ...community };
  if (c.avatar_image) c.avatar_image = attachCloudFrontUrl(c.avatar_image);
  if (c.cover_image) c.cover_image = attachCloudFrontUrl(c.cover_image);
  return c;
}

/* CREATE COMMUNITY */
export const createCommunity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, country, state, city, topics } = req.body;

    if (!name || !country) {
      return res.status(400).json({ message: "Name and country are required" });
    }

    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();

    const community = await Community.create({
      created_by: userId, name, slug,
      description: description || null, country,
      state: state || null, city: city || null,
      topics: Array.isArray(topics) ? topics : [],
      members: [{ user_id: userId, role: "owner" }],
      members_count: 1, status: "pending"
    });

    await trackCommunityEvent({ event_type: "COMMUNITY_CREATED", user_id: userId, community });
    await deleteCacheByPrefix("communities:list:");

    const processedCommunity = processCommunityImages(community);
    return res.json({ success: true, community: processedCommunity });

  } catch (err) {
    console.error("CREATE COMMUNITY ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const updateCommunityProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const community = await Community.get(id);
    if (!community) return res.status(404).json({ message: "Community not found" });
    if (community.created_by !== userId) return res.status(403).json({ message: "Not authorized" });

    const updateData = {};
    if (req.files?.avatar_image?.[0]) updateData.avatar_image = req.files.avatar_image[0].location;
    if (req.files?.cover_image?.[0]) updateData.cover_image = req.files.cover_image[0].location;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    await Community.update({ id }, updateData);
    await deleteCache(`community:id:${id}`);
    await deleteCacheByPrefix("communities:list:");

    const updated = await Community.get(id);
    return res.json({ success: true, community: processCommunityImages(updated) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Update failed" });
  }
};

/* GET COMMUNITY DETAILS */
export const getCommunityById = async (req, res) => {
  const paramId = req.params.id;
  const cacheKey = `community:idOrSlug:${paramId}`;

  try {
    let community = await getCache(cacheKey);

    if (!community) {
      const communityId = await getCommunityIdFromParam(paramId);
      if (!communityId) return res.status(404).json({ message: "Community not found" });

      const dbCommunity = await Community.get(communityId);
      if (!dbCommunity) return res.status(404).json({ message: "Community not found" });

      community = processCommunityImages(dbCommunity);
      await setCache(cacheKey, community, 300);
    }

    let isMember = false, memberRole = null, isHost = false;

    if (req.user?.id) {
      const members = await CommunityMember.query("community_id").eq(community.id).exec();
      const membership = members.find(m => m.user_id === req.user.id);
      if (membership) {
        isMember = true;
        memberRole = membership.role;
        isHost = membership.is_host;
      }
    }

    return res.json({
      success: true,
      community: { ...community, is_member: isMember, isJoined: isMember, member_role: memberRole, is_host: isHost }
    });
  } catch (err) {
    console.error("GET COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch community" });
  }
};

/* JOIN COMMUNITY */
export const joinCommunity = async (req, res) => {
  const userId = req.user.id;
  const communityId = await getCommunityIdFromParam(req.params.id);
  if (!communityId) return res.status(404).json({ message: "Community not found" });

  try {
    const community = await Community.get(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found or inactive" });
    }

    // Check existing membership
    const members = await CommunityMember.query("community_id").eq(communityId).exec();
    if (members.some(m => m.user_id === userId)) {
      return res.status(400).json({ message: "Already a member of this community" });
    }

    // Check host status (same restriction as original MySQL version)
    let isHost = false;
    try {
      const hosts = await Host.query("user_id").eq(userId).exec();
      if (hosts && hosts[0] && hosts[0].status === "approved") {
        isHost = true;
      }
    } catch (hostErr) {
      console.error("Host lookup error:", hostErr);
      // If Host table/GSI query fails, don't block — treat as non-host
    }

    if (!isHost) {
      return res.status(403).json({ message: "Only approved hosts can join this community" });
    }

    await CommunityMember.create({
      community_id: communityId, user_id: userId, role: "member", is_host: true
    });

    // Update counts — host_count is now in the schema
    const updateData = {
      members_count: (community.members_count || 0) + 1,
      host_count: (community.host_count || 0) + 1
    };
    await Community.update({ id: communityId }, updateData);

    trackCommunityEvent({
      event_type: "COMMUNITY_JOINED", user_id: userId,
      metadata: { community_id: communityId, is_host: true }
    }).catch(console.error);

    deleteCache(`community:id:${communityId}`).catch(console.error);
    deleteCache(`community:idOrSlug:${communityId}`).catch(console.error);
    deleteCacheByPrefix("communities:list:").catch(console.error);

    return res.json({ success: true, message: "Joined community successfully" });
  } catch (err) {
    console.error("JOIN COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Failed to join community" });
  }
};

/* LEAVE COMMUNITY */
export const leaveCommunity = async (req, res) => {
  const userId = req.user.id;
  const communityId = await getCommunityIdFromParam(req.params.id);
  if (!communityId) return res.status(404).json({ message: "Community not found" });

  try {
    const members = await CommunityMember.query("community_id").eq(communityId).exec();
    const member = members.find(m => m.user_id === userId);

    if (!member) return res.status(400).json({ message: "You are not a member of this community" });
    if (member.role === "owner") return res.status(400).json({ message: "Community owner cannot leave" });

    const community = await Community.get(communityId);
    if (!community) return res.status(404).json({ message: "Community not found" });

    await CommunityMember.delete(member.id);

    const updateData = { members_count: Math.max(0, (community.members_count || 0) - 1) };
    if (member.is_host) {
      updateData.host_count = Math.max(0, (community.host_count || 0) - 1);
    }
    await Community.update({ id: communityId }, updateData);

    trackCommunityEvent({
      event_type: "COMMUNITY_LEFT", user_id: userId,
      metadata: { community_id: communityId }
    }).catch(console.error);

    deleteCache(`community:id:${communityId}`).catch(console.error);
    deleteCacheByPrefix("communities:list:").catch(console.error);

    return res.json({ success: true, message: "Left community successfully" });
  } catch (err) {
    console.error("LEAVE COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Failed to leave community" });
  }
};

/* LIST COMMUNITIES (LOCATION BASED) */
export const listCommunities = async (req, res) => {
  const { country = "all", state = "all", city = "all" } = req.query;
  const cacheKey = `communities:list:${country}:${state}:${city}`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    // Query by status GSI
    let communities = await Community.query("status").eq("active").exec();

    if (country !== "all") communities = communities.filter(c => c.country === country);
    if (state !== "all") communities = communities.filter(c => c.state === state);
    if (city !== "all") communities = communities.filter(c => c.city === city);

    communities.sort((a, b) => (b.members_count || 0) - (a.members_count || 0));
    communities = communities.slice(0, 20);

    const processedCommunities = communities.map(c => processCommunityImages(c));

    await setCache(cacheKey, processedCommunities, 300);
    return res.json({ success: true, data: processedCommunities });
  } catch {
    return res.status(500).json({ message: "Failed to list communities" });
  }
};

/* NEARBY EVENTS FOR COMMUNITY */
export const getNearbyEvents = async (req, res) => {
  const cacheKey = `community:${req.params.id}:nearby_events`;

  try {
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, events: cached });

    const community = await Community.get(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });

    // Query events by status, then filter by location
    let events = await Event.query("status").eq("published").exec();
    events = events.filter(e => e.country === community.country && e.city === community.city);
    events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    events = events.slice(0, 10);

    await setCache(cacheKey, events, 120);
    return res.json({ success: true, events });
  } catch {
    return res.status(500).json({ message: "Failed to fetch events" });
  }
};

/* GET ALL PENDING COMMUNITIES */
export const getPendingCommunities = async (req, res) => {
  let communities = await Community.query("status").eq("pending").exec();
  communities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const processedCommunities = communities.map(c => processCommunityImages(c));
  res.json({ success: true, communities: processedCommunities });
};

/* APPROVE COMMUNITY */
export const approveCommunity = async (req, res) => {
  const community = await Community.get(req.params.id);
  if (!community) return res.status(404).json({ message: "Community not found" });
  if (community.status !== "pending") {
    return res.status(400).json({ message: "Community is not pending approval" });
  }

  await Community.update({ id: community.id }, { status: "active" });

  logAudit({
    action: "COMMUNITY_APPROVED",
    actor: { id: req.admin?.id || "system", role: "admin" },
    target: { type: "community", id: community.id },
    severity: "MEDIUM", req
  }).catch(console.error);

  trackCommunityEvent({ event_type: "COMMUNITY_APPROVED", user_id: req.admin?.id || "system", community });

  const creator = await User.get(community.created_by);
  try {
    if (creator?.email) {
      await notifyAndEmail({
        userId: creator.id, email: creator.email,
        type: NOTIFICATION_TYPES.COMMUNITY_APPROVED,
        title: "Community approved", message: "Your community has been approved.",
        metadata: { communityId: community.id }
      });
    }
  } catch (err) { console.error("Failed to notify user:", err); }

  res.json({ success: true, message: "Community approved" });
};

/* REJECT COMMUNITY */
export const rejectCommunity = async (req, res) => {
  const community = await Community.get(req.params.id);
  if (!community) return res.status(404).json({ message: "Community not found" });

  await Community.update({ id: community.id }, { status: "deleted" });

  logAudit({
    action: "COMMUNITY_REJECTED",
    actor: { id: req.admin?.id || "system", role: "admin" },
    target: { type: "community", id: community.id },
    severity: "HIGH", req
  }).catch(console.error);

  await trackCommunityEvent({ event_type: "COMMUNITY_REJECTED", user_id: req.admin?.id || "system", community });

  const creator = await User.get(community.created_by);
  try {
    if (creator?.email) {
      await notifyAndEmail({
        userId: creator.id, email: creator.email,
        type: NOTIFICATION_TYPES.COMMUNITY_REJECTED,
        title: "Community rejected", message: "Your community was rejected by admin.",
        metadata: { communityId: community.id }
      });
    }
  } catch (err) { console.error("Failed to notify user:", err); }

  res.json({ success: true, message: "Community rejected" });
};

/* SUSPEND COMMUNITY */
export const suspendCommunity = async (req, res) => {
  try {
    const community = await Community.get(req.params.id);
    if (!community) return res.status(404).json({ message: "Community not found" });
    if (community.status !== "active") {
      return res.status(400).json({ message: "Only active communities can be suspended" });
    }

    await Community.update({ id: community.id }, { status: "suspended" });

    logAudit({
      action: "COMMUNITY_SUSPENDED",
      actor: { id: req.admin?.id || "system", role: "admin" },
      target: { type: "community", id: community.id },
      severity: "CRITICAL", req
    }).catch(console.error);

    await trackCommunityEvent({ event_type: "COMMUNITY_SUSPENDED", user_id: req.admin?.id || "system", community });

    const owner = await User.get(community.created_by);
    if (owner?.email) {
      try {
        await notifyAndEmail({
          userId: owner.id, email: owner.email,
          type: NOTIFICATION_TYPES.COMMUNITY_SUSPENDED,
          title: "Community suspended",
          message: "Your community has been suspended by admin. Please contact support for details.",
          metadata: { communityId: community.id, communityName: community.name }
        });
      } catch (err) { console.error("Failed to notify user:", err); }
    }

    return res.json({ success: true, message: "Community suspended" });
  } catch (err) {
    console.error("SUSPEND COMMUNITY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* RE-ACTIVATE COMMUNITY */
export const activateCommunity = async (req, res) => {
  const community = await Community.get(req.params.id);
  if (!community) return res.status(404).json({ message: "Community not found" });

  await Community.update({ id: community.id }, { status: "active" });
  res.json({ success: true, message: "Community activated" });
};

export const getApprovedCommunities = async (req, res) => {
  let communities = await Community.query("status").eq("active").exec();
  communities.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  res.json({ success: true, communities: communities.map(c => processCommunityImages(c)) });
};

export const getRejectedCommunities = async (req, res) => {
  let communities = await Community.scan().filter("status").eq("deleted").exec();
  communities.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  res.json({ success: true, communities: communities.map(c => processCommunityImages(c)) });
};

export const getSuspendedCommunities = async (req, res) => {
  let communities = await Community.scan().filter("status").eq("suspended").exec();
  communities.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  res.json({ success: true, communities: communities.map(c => processCommunityImages(c)) });
};

/* GET COMMUNITY HOST MEMBERS */
export const getCommunityHostMembers = async (req, res) => {
  const communityId = await getCommunityIdFromParam(req.params.id);
  if (!communityId) return res.status(404).json({ message: "Community not found" });

  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(20, Number(req.query.limit || 10));
  const offset = (page - 1) * limit;

  try {
    const community = await Community.get(communityId);
    if (!community || community.status !== "active") {
      return res.status(404).json({ message: "Community not found or inactive" });
    }

    if (community.visibility !== "public" && !req.user) {
      return res.status(403).json({ message: "This community is private" });
    }

    // Fetch members and filter host members
    const allMembers = await CommunityMember.query("community_id").eq(communityId).exec();
    const hostMembers = allMembers.filter(m => m.is_host);
    const count = hostMembers.length;
    const paginatedMembers = hostMembers.slice(offset, offset + limit);

    // Enrich with Host + User data
    const hosts = await Promise.all(paginatedMembers.map(async member => {
      const hostResults = await Host.query("user_id").eq(member.user_id).exec();
      const host = hostResults[0];
      if (!host || host.status !== "approved") return null;

      const user = await User.get(host.user_id);
      return {
        user_id: member.user_id,
        full_name: host.full_name,
        profile_image: attachCloudFrontUrl(user?.profile_image || null),
        country: host.country, state: host.state, city: host.city
      };
    }));

    return res.json({
      success: true, count, page,
      hosts: hosts.filter(Boolean)
    });
  } catch (err) {
    console.error("GET COMMUNITY HOST MEMBERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch community host members" });
  }
};

/* ADMIN: GET COMMUNITY BY ID WITH MEMBERS */
export const getAdminCommunityById = async (req, res) => {
  try {
    const communityId = await getCommunityIdFromParam(req.params.id);
    if (!communityId) return res.status(404).json({ message: "Community not found" });

    const dbCommunity = await Community.get(communityId);
    if (!dbCommunity) return res.status(404).json({ message: "Community not found" });

    const community = processCommunityImages(dbCommunity);

    // Fetch members via GSI
    const members = await CommunityMember.query("community_id").eq(communityId).exec();
    community.members = members.map(m => ({
      user_id: m.user_id, role: m.role, is_host: m.is_host
    }));

    return res.json({ success: true, community });
  } catch (err) {
    console.error("ADMIN GET COMMUNITY BY ID ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch community details" });
  }
};
