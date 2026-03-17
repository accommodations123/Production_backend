
import Community from "../model/community/Community.js";
import CommunityMember from "../model/community/CommunityMember.js";

/* =====================================================
   REQUIRE COMMUNITY MEMBER
===================================================== */
export const requireCommunityMember = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;

    if (!communityId) {
      return res.status(400).json({ message: "Invalid community id" });
    }

    /* =========================
       1️⃣ COMMUNITY CHECK
       ========================= */
    const community = await Community.get(communityId);

    if (!community || community.status !== "active") {
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    /* =========================
       2️⃣ MEMBERSHIP CHECK
       ========================= */
    const members = await CommunityMember.query("community_id").eq(communityId).exec();
    const member = members.find(m => m.user_id === userId);

    if (!member) {
      return res.status(403).json({
        message: "Join community first"
      });
    }

    /* =========================
       3️⃣ ATTACH CONTEXT
       ========================= */
    req.community = community;
    req.communityMember = member;

    next();

  } catch (err) {
    console.error("COMMUNITY MEMBER AUTH ERROR:", err);
    return res.status(500).json({
      message: "Community authorization failed"
    });
  }
};

/* =====================================================
   REQUIRE ADMIN OR OWNER
===================================================== */
export const requireAdminOrOwner = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const communityId = req.params.id;

    if (!communityId) {
      return res.status(400).json({ message: "Invalid community id" });
    }

    // Reuse if already loaded
    if (!req.community) {
      const community = await Community.get(communityId);

      if (!community || community.status !== "active") {
        return res.status(404).json({
          message: "Community not found or inactive"
        });
      }

      req.community = community;
    }

    const members = await CommunityMember.query("community_id").eq(communityId).exec();
    const member = members.find(m => m.user_id === userId && (m.role === "admin" || m.role === "owner"));

    if (!member) {
      return res.status(403).json({
        message: "Admin or owner access required"
      });
    }

    req.communityMember = member;
    next();

  } catch (err) {
    console.error("COMMUNITY ADMIN AUTH ERROR:", err);
    return res.status(500).json({
      message: "Community authorization failed"
    });
  }
};
