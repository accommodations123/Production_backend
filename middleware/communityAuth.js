
import { Op } from "sequelize";
import Community from "../model/community/Community.js";
import CommunityMember from "../model/community/CommunityMember.js";

/* =====================================================
   REQUIRE COMMUNITY MEMBER
===================================================== */
export const requireCommunityMember = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const communityId = Number(req.params.id);

    if (!Number.isInteger(communityId)) {
      return res.status(400).json({ message: "Invalid community id" });
    }

    /* =========================
       1️⃣ COMMUNITY CHECK
       ========================= */
    const community = await Community.findOne({
      where: {
        id: communityId,
        status: "active"
      },
      attributes: ["id"]
    });

    if (!community) {
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    /* =========================
       2️⃣ MEMBERSHIP CHECK
       ========================= */
    const member = await CommunityMember.findOne({
      where: {
        community_id: communityId,
        user_id: userId
      }
    });

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
    const communityId = Number(req.params.id);

    if (!Number.isInteger(communityId)) {
      return res.status(400).json({ message: "Invalid community id" });
    }

    /* =========================
       1️⃣ COMMUNITY CHECK
       ========================= */
    const community = await Community.findOne({
      where: {
        id: communityId,
        status: "active"
      },
      attributes: ["id"]
    });

    if (!community) {
      return res.status(404).json({
        message: "Community not found or inactive"
      });
    }

    /* =========================
       2️⃣ ROLE CHECK (CORRECT)
       ========================= */
    const member = await CommunityMember.findOne({
      where: {
        community_id: communityId,
        user_id: userId,
        role: {
          [Op.in]: ["admin", "owner"]
        }
      }
    });

    if (!member) {
      return res.status(403).json({
        message: "Admin or owner access required"
      });
    }

    /* =========================
       3️⃣ ATTACH CONTEXT
       ========================= */
    req.community = community;
    req.communityMember = member;

    next();

  } catch (err) {
    console.error("COMMUNITY ADMIN AUTH ERROR:", err);
    return res.status(500).json({
      message: "Community authorization failed"
    });
  }
};

