import { ProfessionalProfile, PeopleReview, PeopleFollower, PeopleReport } from "../../model/people/People.models.js";
import ConnectionRequest from "../../model/ConnectionRequest.js";
import User from "../../model/User.js";
import Host from "../../model/Host.js";
import peopleService from "../../services/people/PeopleService.js";
import { logAudit } from "../../services/auditLogger.js";
import { checkContactAccess } from "../../utils/contactAccess.js";
import { deleteCache, deleteCacheByPrefix } from "../../services/cacheService.js";

import fs from "fs";
import path from "path";

function logDebug(msg, data) {
  try {
    fs.appendFileSync(
      path.join(process.cwd(), "debug.log"),
      `\n[${new Date().toISOString()}] ${msg}\n${JSON.stringify(data, null, 2)}\n`
    );
  } catch (err) {
    console.error("Failed to write to debug.log:", err);
  }
}


// ── GET PUBLIC PROFILES & SEARCH ─────────────────────────────────────────
export async function getPublicProfiles(req, res) {
  try {
    const result = await peopleService.searchProfiles(req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("❌ Error in getPublicProfiles:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch professional profiles."
    });
  }
}

export async function searchProfiles(req, res) {
  return getPublicProfiles(req, res);
}

// ── GET PUBLIC PROFILE BY ID ─────────────────────────────────────────────
export async function getPublicProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await peopleService.getProfileById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found."
      });
    }

    const requesterId = req.user?.id || null;
    const profileOwnerId = profile.user_id;
    const isSelf = profileOwnerId && String(profileOwnerId) === String(requesterId);
    const isAdmin = !!req.admin;

    if (!isSelf && !isAdmin && ((profile.status !== "approved" && profile.is_approved !== true) || profile.is_blocked || profile.isPublished === false)) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not found or pending approval."
      });
    }

    const hasContactAccess = isSelf || (requesterId && profileOwnerId ? await checkContactAccess({ requesterId, targetUserId: profileOwnerId, itemId: profile.id }) : false);

    let canReview = false;
    let hasReviewed = false;
    if (requesterId && !isSelf && (profile.status === "approved" || profile.is_approved === true) && !profile.is_blocked) {
      try {
        const existingReviews = await PeopleReview.query("profile_id").eq(id).using("profile_id-index").exec();
        hasReviewed = existingReviews.some(r => String(r.reviewer_user_id) === String(requesterId));

        if (!hasReviewed) {
          const requestsAsSender = await ConnectionRequest.query("requesterId").eq(requesterId).using("requesterId-index").exec();
          const requestsAsTarget = await ConnectionRequest.query("targetUserId").eq(requesterId).using("targetUserId-index").exec();
          canReview = [
            ...requestsAsSender.filter(r => String(r.targetUserId) === String(profileOwnerId)),
            ...requestsAsTarget.filter(r => String(r.requesterId) === String(profileOwnerId))
          ].some(r => r.status === "accepted" && !r.isDeleted);
        }
      } catch (e) {
        console.warn("Review eligibility check error:", e.message);
      }
    }

    const plainProfile = JSON.parse(JSON.stringify(profile));
    plainProfile.can_review = canReview;
    plainProfile.canReview = canReview;
    plainProfile.has_reviewed = hasReviewed;
    plainProfile.hasReviewed = hasReviewed;
    plainProfile.is_self = isSelf;
    plainProfile.isSelf = isSelf;

    if (!hasContactAccess) {
      plainProfile.phone = "";
      plainProfile.email = "";
      plainProfile.whatsapp = "";
      plainProfile.facebook = "";
      plainProfile.instagram = "";
      plainProfile.social_links = null;
    }

    return res.status(200).json({ success: true, data: plainProfile, profile: plainProfile });
  } catch (error) {
    console.error("❌ Error in getPublicProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch profile detail."
    });
  }
}

// ── GET CURRENT USER PROFILE ─────────────────────────────────────────────
export async function getMyProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Professional profile not created yet."
      });
    }

    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    console.error("❌ Error in getMyProfile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch current profile."
    });
  }
}

// ── CREATE PROFILE ───────────────────────────────────────────────────────
export async function createProfile(req, res) {
  logDebug("CREATE PROFILE REQUEST", { userId: req.user?.id || req.user?._id, body: req.body });
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      logDebug("CREATE PROFILE ERROR - NO USER ID", {});
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const profile = await peopleService.createProfile(userId, req.body);
    logDebug("CREATE PROFILE SUCCESS", { profileId: profile?.id });
    return res.status(201).json({
      success: true,
      message: "Profile created successfully.",
      data: profile
    });
  } catch (error) {
    console.error("❌ Error in createProfile:", error);
    logDebug("CREATE PROFILE EXCEPTION", { message: error.message, stack: error.stack });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create professional profile."
    });
  }
}

// ── UPDATE PROFILE ───────────────────────────────────────────────────────
export async function updateProfile(req, res) {
  logDebug("UPDATE PROFILE REQUEST", { userId: req.user?.id || req.user?._id, params: req.params, body: req.body });
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      logDebug("UPDATE PROFILE ERROR - NO USER ID", {});
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { id } = req.params;
    const updated = await peopleService.updateProfile(id, userId, req.body);
    logDebug("UPDATE PROFILE SUCCESS", { profileId: updated?.id });
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updated
    });
  } catch (error) {
    console.error("❌ Error in updateProfile:", error);
    logDebug("UPDATE PROFILE EXCEPTION", { message: error.message, stack: error.stack });
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update profile."
    });
  }
}

// ── DELETE PROFILE ───────────────────────────────────────────────────────
export async function deleteProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const profile = await peopleService.getProfileById(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }
    if (profile.user_id !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden." });
    }

    await ProfessionalProfile.delete({ id });
    return res.status(200).json({ success: true, message: "Profile deleted successfully." });
  } catch (error) {
    console.error("❌ Error in deleteProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to delete profile." });
  }
}

// ── SUB-SECTION UPDATES (EXPERIENCE, EDUCATION, SKILLS, PORTFOLIO, SERVICES) ─
export async function updateExperience(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const experience = req.body.experience || req.body;
    const updated = await peopleService.updateProfile(profile.id, userId, { experience });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error in updateExperience:", error);
    return res.status(500).json({ success: false, message: "Failed to update experience." });
  }
}

export async function updateEducation(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const education = req.body.education || req.body;
    const updated = await peopleService.updateProfile(profile.id, userId, { education });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error in updateEducation:", error);
    return res.status(500).json({ success: false, message: "Failed to update education." });
  }
}

export async function updateSkills(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const skills = req.body.skills || req.body;
    const updated = await peopleService.updateProfile(profile.id, userId, { skills });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error in updateSkills:", error);
    return res.status(500).json({ success: false, message: "Failed to update skills." });
  }
}

export async function updatePortfolio(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const portfolio = req.body.portfolio || req.body;
    const updated = await peopleService.updateProfile(profile.id, userId, { portfolio });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error in updatePortfolio:", error);
    return res.status(500).json({ success: false, message: "Failed to update portfolio." });
  }
}

export async function updateServices(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const profile = await peopleService.getProfileByUserId(userId);
    if (!profile) return res.status(404).json({ success: false, message: "Profile not found." });

    const services = req.body.services || req.body;
    const updated = await peopleService.updateProfile(profile.id, userId, { services });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("❌ Error in updateServices:", error);
    return res.status(500).json({ success: false, message: "Failed to update services." });
  }
}

// ── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────
export async function toggleFollow(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { targetUserId } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (userId === targetUserId) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself." });
    }

    const result = await peopleService.toggleFollow(userId, targetUserId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error in toggleFollow:", error);
    return res.status(500).json({ success: false, message: "Failed to toggle follow status." });
  }
}

export async function getFollowers(req, res) {
  try {
    const { userId } = req.params;
    const followers = await PeopleFollower.query("following_user_id").eq(userId).using("following_user_id-index").exec();
    return res.status(200).json({ success: true, data: followers });
  } catch (error) {
    console.error("❌ Error in getFollowers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch followers." });
  }
}

export async function getFollowing(req, res) {
  try {
    const { userId } = req.params;
    const following = await PeopleFollower.query("follower_user_id").eq(userId).using("follower_user_id-index").exec();
    return res.status(200).json({ success: true, data: following });
  } catch (error) {
    console.error("❌ Error in getFollowing:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch following users." });
  }
}

// ── REVIEWS ──────────────────────────────────────────────────────────────
export async function createReview(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { profileId } = req.params;
    const { rating, comment } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const profile = await peopleService.getProfileById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Professional profile not found." });
    }

    // 0. Profile must be approved & not blocked
    if ((profile.status !== "approved" && profile.is_approved !== true) || profile.is_blocked) {
      return res.status(400).json({
        success: false,
        message: "You cannot review a profile that is pending approval or blocked."
      });
    }

    // 1. Prevent self-reviews
    if (String(profile.user_id) === String(userId)) {
      return res.status(400).json({ success: false, message: "You cannot review your own profile." });
    }

    // 2. Prevent duplicate reviews by the same user
    const existingReviews = await PeopleReview.query("profile_id").eq(profileId).using("profile_id-index").exec();
    const alreadyReviewed = existingReviews.some(r => String(r.reviewer_user_id) === String(userId));
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: "You have already submitted a review for this profile." });
    }

    // 3. Verify that the reviewer has taken a service / had an accepted connection request with this professional
    const requestsAsSender = await ConnectionRequest.query("requesterId").eq(userId).using("requesterId-index").exec();
    const requestsAsTarget = await ConnectionRequest.query("targetUserId").eq(userId).using("targetUserId-index").exec();

    const hasAcceptedService = [
      ...requestsAsSender.filter(r => String(r.targetUserId) === String(profile.user_id)),
      ...requestsAsTarget.filter(r => String(r.requesterId) === String(profile.user_id))
    ].some(r => r.status === "accepted" && !r.isDeleted);

    if (!hasAcceptedService) {
      return res.status(403).json({
        success: false,
        message: "Only verified clients who have connected and taken a service from this professional can leave a review."
      });
    }

    const review = await peopleService.addReview({
      profileId,
      reviewerUserId: userId,
      reviewerName: req.user?.name || req.user?.full_name || "Client",
      reviewerAvatar: req.user?.avatar || req.user?.profile_image || "",
      rating: Number(rating),
      comment
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error("❌ Error in createReview:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to post review." });
  }
}

export async function getReviews(req, res) {
  try {
    const { profileId } = req.params;
    const requesterId = req.user?.id || null;
    const reviews = await PeopleReview.query("profile_id").eq(profileId).using("profile_id-index").exec();

    let canReview = false;
    let hasReviewed = false;
    if (requesterId) {
      hasReviewed = reviews.some(r => String(r.reviewer_user_id) === String(requesterId));
      const profile = await peopleService.getProfileById(profileId);
      if (profile && !hasReviewed && String(profile.user_id) !== String(requesterId) && (profile.status === "approved" || profile.is_approved === true) && !profile.is_blocked) {
        const requestsAsSender = await ConnectionRequest.query("requesterId").eq(requesterId).using("requesterId-index").exec();
        const requestsAsTarget = await ConnectionRequest.query("targetUserId").eq(requesterId).using("targetUserId-index").exec();
        canReview = [
          ...requestsAsSender.filter(r => String(r.targetUserId) === String(profile.user_id)),
          ...requestsAsTarget.filter(r => String(r.requesterId) === String(profile.user_id))
        ].some(r => r.status === "accepted" && !r.isDeleted);
      }
    }

    return res.status(200).json({
      success: true,
      data: reviews,
      reviews,
      can_review: canReview,
      canReview: canReview,
      has_reviewed: hasReviewed,
      hasReviewed: hasReviewed
    });
  } catch (error) {
    console.error("❌ Error in getReviews:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reviews." });
  }
}

// ── REPORT PROFILE ───────────────────────────────────────────────────────
export async function reportProfile(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { reported_profile_id, reason, details } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const report = await PeopleReport.create({
      reporter_user_id: userId,
      reported_profile_id,
      reason,
      details
    });

    return res.status(201).json({ success: true, message: "Report submitted successfully.", data: report });
  } catch (error) {
    console.error("❌ Error in reportProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to submit report." });
  }
}

export async function adminGetReports(req, res) {
  try {
    const reports = await PeopleReport.scan().exec();
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error("❌ Error in adminGetReports:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch reports." });
  }
}

// ═══════ FULL ADMIN MODERATION & MANAGEMENT ═══════

async function purgeProfileCaches(profileId, userId) {
  try {
    if (profileId) await deleteCache(`people:profile:${profileId}`);
    if (userId) await deleteCache(`people:user:${userId}`);
    await deleteCacheByPrefix("people:");
  } catch (err) {
    console.warn("⚠️ Cache purge warning:", err.message);
  }
}

async function enrichAdminProfile(profile) {
  if (!profile) return null;
  const raw = typeof profile.toJSON === "function" ? profile.toJSON() : { ...profile };
  let user = null;
  let host = null;
  if (raw.user_id) {
    try {
      user = await User.get(raw.user_id);
    } catch (e) {}
    try {
      const hosts = await Host.query("user_id").eq(raw.user_id).exec();
      host = hosts?.[0] || null;
    } catch (e) {}
  }

  const rawWhatsapp = raw.whatsapp || host?.whatsapp || "";
  const cleanPhoneFromWhatsapp = rawWhatsapp ? rawWhatsapp.replace(/^https?:\/\/wa\.me\//i, "").replace(/[^0-9+]/g, "") : "";
  const phone = raw.phone || host?.phone || cleanPhoneFromWhatsapp || "";
  const email = raw.email || user?.email || host?.email || "";
  const whatsapp = rawWhatsapp || host?.whatsapp || (cleanPhoneFromWhatsapp ? `https://wa.me/${cleanPhoneFromWhatsapp.replace(/[^0-9]/g, "")}` : "");
  
  const rawSocial = typeof raw.social_links === "object" && raw.social_links !== null ? raw.social_links : {};
  const rawContactInfo = typeof raw.contact_info === "object" && raw.contact_info !== null ? raw.contact_info : {};
  const rawContactPrefs = typeof raw.contact_preferences === "object" && raw.contact_preferences !== null ? raw.contact_preferences : {};

  const instagram = rawSocial.instagram || raw.instagram || rawContactInfo.instagram || rawContactPrefs.instagram || host?.instagram || "";
  const linkedin = rawSocial.linkedin || raw.linkedin || rawContactInfo.linkedin || rawContactPrefs.linkedin || host?.linkedin || "";
  const twitter = rawSocial.twitter || rawSocial.x || raw.twitter || raw.x || rawContactInfo.twitter || "";
  const github = rawSocial.github || raw.github || rawContactInfo.github || "";
  const facebook = rawSocial.facebook || raw.facebook || rawContactInfo.facebook || "";
  const youtube = rawSocial.youtube || raw.youtube || rawContactInfo.youtube || "";
  const website = raw.website || rawSocial.website || rawContactInfo.website || "";

  const social_links = {
    ...rawSocial,
    ...(instagram ? { instagram } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(twitter ? { twitter } : {}),
    ...(github ? { github } : {}),
    ...(facebook ? { facebook } : {}),
    ...(youtube ? { youtube } : {}),
    ...(whatsapp ? { whatsapp } : {}),
    ...(website ? { website } : {})
  };

  return {
    ...raw,
    phone,
    email,
    whatsapp,
    website,
    instagram,
    linkedin,
    twitter,
    github,
    facebook,
    youtube,
    social_links,
    contact: {
      email,
      phone,
      whatsapp,
      website,
      instagram,
      linkedin,
      twitter,
      github,
      facebook,
      youtube
    },
    contact_info: {
      ...rawContactInfo,
      email,
      phone,
      whatsapp,
      website,
      instagram,
      linkedin,
      twitter,
      github,
      facebook,
      youtube
    }
  };
}

// 1. GET /admin/people - List all profiles with status filters, search & pagination
export async function adminGetAllProfiles(req, res) {
  try {
    const { status, category, is_blocked, is_approved, is_verified, is_featured, search, page = 1, limit = 50 } = req.query;
    const profiles = await ProfessionalProfile.scan().exec();
    let items = Array.from(profiles || []);

    if (status && status !== "all") {
      const targetStatus = String(status).toLowerCase();
      if (targetStatus === "pending") {
        items = items.filter(p => p.status === "pending" || (!p.status && !p.is_approved));
      } else if (targetStatus === "approved") {
        items = items.filter(p => p.status === "approved" || p.is_approved === true);
      } else if (targetStatus === "rejected") {
        items = items.filter(p => p.status === "rejected");
      } else if (targetStatus === "blocked") {
        items = items.filter(p => p.status === "blocked" || p.is_blocked === true);
      } else {
        items = items.filter(p => p.status === status);
      }
    }

    if (category) items = items.filter(p => p.category === category);
    if (is_approved !== undefined) items = items.filter(p => String(Boolean(p.is_approved)) === String(is_approved === "true" || is_approved === true));
    if (is_blocked !== undefined) items = items.filter(p => String(Boolean(p.is_blocked)) === String(is_blocked === "true" || is_blocked === true));
    if (is_verified !== undefined) items = items.filter(p => String(Boolean(p.is_verified)) === String(is_verified === "true" || is_verified === true));
    if (is_featured !== undefined) items = items.filter(p => String(Boolean(p.is_featured)) === String(is_featured === "true" || is_featured === true));

    if (search) {
      const term = search.toLowerCase();
      items = items.filter(p =>
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.firstName && p.firstName.toLowerCase().includes(term)) ||
        (p.lastName && p.lastName.toLowerCase().includes(term)) ||
        (p.user_id && p.user_id.toLowerCase().includes(term)) ||
        (p.headline && p.headline.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.city && p.city.toLowerCase().includes(term))
      );
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const numericLimit = parseInt(limit, 10) || 50;
    const numericPage = parseInt(page, 10) || 1;
    const startIndex = (numericPage - 1) * numericLimit;
    const paginatedItems = items.slice(startIndex, startIndex + numericLimit);

    const enrichedItems = await Promise.all(paginatedItems.map(enrichAdminProfile));

    return res.status(200).json({
      success: true,
      data: {
        items: enrichedItems,
        total: items.length,
        page: numericPage,
        limit: numericLimit,
        hasMore: startIndex + numericLimit < items.length
      },
      profiles: enrichedItems,
      total: items.length
    });
  } catch (error) {
    console.error("❌ Error in adminGetAllProfiles:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profiles for admin." });
  }
}

// 2. GET /admin/people/:profile_id - Get full profile (including private fields)
export async function adminGetProfileById(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }
    const enriched = await enrichAdminProfile(profile);
    return res.status(200).json({ success: true, data: enriched, profile: enriched });
  } catch (error) {
    console.error("❌ Error in adminGetProfileById:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch profile detail." });
  }
}

// 3. POST/PUT /admin/people/:id/approve (or /accept) - Approve / Accept profile
export async function adminApproveProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const updated = await ProfessionalProfile.update({ id }, {
      status: "approved",
      is_approved: true,
      is_blocked: false,
      rejection_reason: ""
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_APPROVED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "MEDIUM",
      req
    });

    return res.status(200).json({
      success: true,
      message: "Profile approved successfully.",
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminApproveProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to approve profile." });
  }
}

// 4. POST/PUT /admin/people/:id/reject - Reject profile
export async function adminRejectProfile(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const rejectionReason = reason || "Rejected by administrator";

    const updated = await ProfessionalProfile.update({ id }, {
      status: "rejected",
      is_approved: false,
      rejection_reason: rejectionReason
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_REJECTED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "MEDIUM",
      req,
      metadata: { reason: rejectionReason }
    });

    return res.status(200).json({
      success: true,
      message: "Profile rejected successfully.",
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminRejectProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to reject profile." });
  }
}

// 5. POST/PUT /admin/people/:id/block - Block profile
export async function adminBlockProfile(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const blockReason = reason || "Blocked by administrator";

    const updated = await ProfessionalProfile.update({ id }, {
      status: "blocked",
      is_blocked: true,
      is_approved: false,
      rejection_reason: blockReason
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_BLOCKED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "HIGH",
      req,
      metadata: { reason: blockReason }
    });

    return res.status(200).json({
      success: true,
      message: "Profile blocked successfully.",
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminBlockProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to block profile." });
  }
}

// 6. POST/PUT /admin/people/:id/unblock - Unblock profile
export async function adminUnblockProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const updated = await ProfessionalProfile.update({ id }, {
      status: "approved",
      is_blocked: false,
      is_approved: true,
      rejection_reason: ""
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_UNBLOCKED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "MEDIUM",
      req
    });

    return res.status(200).json({
      success: true,
      message: "Profile unblocked and restored to approved successfully.",
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminUnblockProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to unblock profile." });
  }
}

// 7. POST/PUT /admin/people/:id/feature - Feature / Unfeature profile
export async function adminFeatureProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const newFeaturedState = req.body.is_featured !== undefined ? Boolean(req.body.is_featured) : !profile.is_featured;

    const updated = await ProfessionalProfile.update({ id }, {
      is_featured: newFeaturedState
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_FEATURED_TOGGLED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "LOW",
      req,
      metadata: { is_featured: newFeaturedState }
    });

    return res.status(200).json({
      success: true,
      message: `Profile ${newFeaturedState ? "featured" : "unfeatured"} successfully.`,
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminFeatureProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to update feature status." });
  }
}

// 8. POST /admin/people/:id/verify - Verify profile
export async function adminVerifyProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const newVerifiedState = req.body.is_verified !== undefined ? Boolean(req.body.is_verified) : !profile.is_verified;

    const updated = await ProfessionalProfile.update({ id }, {
      is_verified: newVerifiedState
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_VERIFICATION_TOGGLED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "MEDIUM",
      req,
      metadata: { is_verified: newVerifiedState }
    });

    return res.status(200).json({
      success: true,
      message: `Profile verification set to ${newVerifiedState}.`,
      data: updated,
      profile: updated
    });
  } catch (error) {
    console.error("❌ Error in adminVerifyProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to update verification status." });
  }
}

// 9. POST /admin/people/:id/force-unpublish - Force unpublish
export async function adminForceUnpublish(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    const updated = await ProfessionalProfile.update({ id }, {
      isPublished: false,
      status: "unpublished"
    });

    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_FORCE_UNPUBLISHED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "MEDIUM",
      req
    });

    return res.status(200).json({ success: true, message: "Profile force-unpublished successfully.", data: updated, profile: updated });
  } catch (error) {
    console.error("❌ Error in adminForceUnpublish:", error);
    return res.status(500).json({ success: false, message: "Failed to force unpublish profile." });
  }
}

// 10. DELETE /admin/people/:id - Admin delete profile
export async function adminDeleteProfile(req, res) {
  try {
    const { id } = req.params;
    const profile = await ProfessionalProfile.get(id);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found." });
    }

    await ProfessionalProfile.delete({ id });
    await purgeProfileCaches(id, profile.user_id);

    await logAudit({
      action: "PEOPLE_PROFILE_DELETED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "ProfessionalProfile", id },
      severity: "HIGH",
      req
    });

    return res.status(200).json({ success: true, message: "Profile deleted permanently by admin." });
  } catch (error) {
    console.error("❌ Error in adminDeleteProfile:", error);
    return res.status(500).json({ success: false, message: "Failed to delete profile." });
  }
}

// 11. POST /admin/people/reports/:id/resolve - Resolve report
export async function adminResolveReport(req, res) {
  try {
    const { id } = req.params;
    const { action_taken, resolution_notes } = req.body;
    const report = await PeopleReport.get(id);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    const updated = await PeopleReport.update({ id }, {
      status: "resolved",
      action_taken: action_taken || "Reviewed by admin",
      resolution_notes: resolution_notes || ""
    });

    await logAudit({
      action: "PEOPLE_REPORT_RESOLVED",
      actor: { admin_id: req.user?.id || req.user?._id },
      target: { type: "PeopleReport", id },
      severity: "MEDIUM",
      req,
      metadata: { action_taken, resolution_notes }
    });

    return res.status(200).json({ success: true, message: "Report resolved successfully.", data: updated });
  } catch (error) {
    console.error("❌ Error in adminResolveReport:", error);
    return res.status(500).json({ success: false, message: "Failed to resolve report." });
  }
}

// 12. GET /admin/people/analytics - People domain analytics
export async function adminGetPeopleAnalytics(req, res) {
  try {
    const profiles = await ProfessionalProfile.scan().exec();
    const reports = await PeopleReport.scan().exec();
    const reviews = await PeopleReview.scan().exec();

    const totalViews = profiles.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

    const analytics = {
      totalProfiles: profiles.length,
      publishedProfiles: profiles.filter(p => p.isPublished === true).length,
      verifiedProfiles: profiles.filter(p => p.is_verified === true).length,
      featuredProfiles: profiles.filter(p => p.is_featured === true).length,
      blockedProfiles: profiles.filter(p => p.is_blocked === true || p.status === "blocked").length,
      pendingProfiles: profiles.filter(p => p.status === "pending" || p.is_approved === false).length,
      approvedProfiles: profiles.filter(p => p.status === "approved" || p.is_approved === true).length,
      rejectedProfiles: profiles.filter(p => p.status === "rejected").length,
      totalReports: reports.length,
      pendingReports: reports.filter(r => r.status === "pending").length,
      totalReviews: reviews.length,
      totalProfileViews: totalViews
    };

    return res.status(200).json({ success: true, data: analytics, analytics });
  } catch (error) {
    console.error("❌ Error in adminGetPeopleAnalytics:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch people analytics." });
  }
}

export default {
  getPublicProfiles,
  searchProfiles,
  getPublicProfile,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  updateExperience,
  updateEducation,
  updateSkills,
  updatePortfolio,
  updateServices,
  toggleFollow,
  getFollowers,
  getFollowing,
  createReview,
  getReviews,
  reportProfile,
  adminGetAllProfiles,
  adminGetProfileById,
  adminApproveProfile,
  adminRejectProfile,
  adminBlockProfile,
  adminUnblockProfile,
  adminFeatureProfile,
  adminVerifyProfile,
  adminForceUnpublish,
  adminDeleteProfile,
  adminGetReports,
  adminResolveReport,
  adminGetPeopleAnalytics
};
