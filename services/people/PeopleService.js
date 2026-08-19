import { ProfessionalProfile, PeopleReview, PeopleFollower, PeopleReport } from "../../model/people/People.models.js";
import { getCache, setCache, deleteCache } from "../cacheService.js";

const normalizeProfile = (p) => {
  if (!p) return null;
  const raw = typeof p.toJSON === "function" ? p.toJSON() : { ...p };
  const rate = Number(raw.pricing?.consultation ?? raw.hourlyRate ?? raw.hourly_rate ?? 0);
  const curr = raw.pricing?.currency || raw.currency || "USD";
  return {
    ...raw,
    hourlyRate: rate,
    currency: curr,
    pricing: {
      consultation: rate,
      currency: curr,
      type: raw.pricing?.type || "hourly"
    }
  };
};

export const getProfileById = async (id) => {
  if (!id) return null;
  const cacheKey = `people:profile:${id}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn("⚠️ Redis cache read error:", err.message);
  }

  const rawProfile = await ProfessionalProfile.get(id);
  const profile = normalizeProfile(rawProfile);
  if (profile) {
    try {
      await setCache(cacheKey, profile, 600);
    } catch (err) {
      console.warn("⚠️ Redis cache write error:", err.message);
    }
  }
  return profile;
};

export const getProfileByUserId = async (userId) => {
  const cacheKey = `people:user:${userId}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn("⚠️ Redis cache read error:", err.message);
  }

  const results = await ProfessionalProfile.query("user_id").eq(userId).using("user_id-index").exec();
  const rawProfile = results && results.length > 0 ? results[0] : null;
  const profile = normalizeProfile(rawProfile);

  if (profile) {
    try {
      await setCache(cacheKey, profile, 600);
    } catch (err) {
      console.warn("⚠️ Redis cache write error:", err.message);
    }
  }
  return profile;
};

export const searchProfiles = async (query = {}) => {
  const { category, country, search, page = 1, limit = 10 } = query;

  let profiles = [];
  if (category) {
    profiles = await ProfessionalProfile.query("category").eq(category).using("category-index").exec();
  } else if (country) {
    profiles = await ProfessionalProfile.query("country").eq(country).using("country-index").exec();
  } else {
    profiles = await ProfessionalProfile.scan().exec();
  }

  let items = Array.from(profiles || []);

  // Only show approved, unblocked, published profiles in public listing
  items = items.filter(p => (p.status === "approved" || p.is_approved === true) && !p.is_blocked && p.isPublished !== false);

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.headline && p.headline.toLowerCase().includes(term)) ||
      (p.bio && p.bio.toLowerCase().includes(term)) ||
      (p.skills && p.skills.some(s => s.toLowerCase().includes(term)))
    );
  }

  items = items.map(normalizeProfile);

  const numericLimit = parseInt(limit, 10) || 10;
  const numericPage = parseInt(page, 10) || 1;
  const startIndex = (numericPage - 1) * numericLimit;
  const paginatedItems = items.slice(startIndex, startIndex + numericLimit);

  return {
    items: paginatedItems,
    total: items.length,
    page: numericPage,
    limit: numericLimit,
    hasMore: startIndex + numericLimit < items.length
  };
};

export const createProfile = async (userId, data) => {
  const existing = await getProfileByUserId(userId);
  const { status, is_approved, is_blocked, is_featured, rejection_reason, ...safeData } = data || {};

  if (existing) {
    // If existing profile was rejected, resetting to pending on resubmission
    const updates = {
      ...safeData,
      status: existing.status === "rejected" ? "pending" : existing.status,
      is_approved: existing.status === "rejected" ? false : existing.is_approved
    };
    return await updateProfile(existing.id, userId, updates);
  }

  const newProfile = await ProfessionalProfile.create({
    ...safeData,
    user_id: userId,
    status: "pending",
    is_approved: false,
    is_blocked: false,
    rejection_reason: "",
    name: safeData.name || `${safeData.firstName || ""} ${safeData.lastName || ""}`.trim() || "Professional",
    profession: safeData.profession || safeData.headline || "Advisor",
    hourlyRate: Number(safeData.hourlyRate ?? safeData.pricing?.consultation ?? 0),
    currency: safeData.currency || safeData.pricing?.currency || "USD",
    pricing: safeData.pricing || {
      consultation: Number(safeData.hourlyRate ?? 0),
      currency: safeData.currency || "USD",
      type: "hourly"
    }
  });

  try {
    if (userId) await deleteCache(`people:user:${userId}`);
    if (newProfile?.id) await deleteCache(`people:profile:${newProfile.id}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return newProfile;
};

export const updateProfile = async (id, userId, updates) => {
  let doc = null;
  if (id) {
    doc = await ProfessionalProfile.get(id);
  } else if (userId) {
    const results = await ProfessionalProfile.query("user_id").eq(userId).using("user_id-index").exec();
    doc = results && results.length > 0 ? results[0] : null;
  }

  if (!doc) {
    throw new Error("Professional profile not found for update.");
  }
  if (userId && doc.user_id !== userId) {
    throw new Error("Unauthorized to update this profile");
  }

  // Strip administrative moderation fields from standard user updates
  const { status, is_approved, is_blocked, is_featured, rejection_reason, ...safeUpdates } = updates || {};

  const rate = Number(safeUpdates.hourlyRate ?? safeUpdates.pricing?.consultation ?? doc.hourlyRate ?? 0);
  const curr = safeUpdates.currency || safeUpdates.pricing?.currency || doc.currency || "USD";

  Object.assign(doc, {
    ...safeUpdates,
    hourlyRate: rate,
    currency: curr,
    pricing: {
      consultation: rate,
      currency: curr,
      type: safeUpdates.pricing?.type || doc.pricing?.type || "hourly"
    }
  });

  const updatedDoc = await doc.save();

  try {
    if (doc.id) await deleteCache(`people:profile:${doc.id}`);
    if (userId) await deleteCache(`people:user:${userId}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return normalizeProfile(updatedDoc);
};

export const addReview = async ({ profileId, reviewerUserId, reviewerName, reviewerAvatar, rating, comment }) => {
  const review = await PeopleReview.create({
    profile_id: profileId,
    reviewer_user_id: reviewerUserId,
    reviewer_name: reviewerName,
    reviewer_avatar: reviewerAvatar,
    rating: Number(rating),
    comment,
    created_at: new Date().toISOString()
  });

  // Recalculate average rating for profile
  try {
    const reviews = await PeopleReview.query("profile_id").eq(profileId).using("profile_id-index").exec();
    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const avgRating = totalRating / reviews.length;
      const targetProfile = await getProfileById(profileId);
      if (targetProfile) {
        targetProfile.rating = parseFloat(avgRating.toFixed(1));
        targetProfile.reviewCount = reviews.length;
        await targetProfile.save();
      }
    }
  } catch (err) {
    console.warn("Could not update profile aggregate rating:", err);
  }

  return review;
};

export const toggleFollow = async (followerUserId, followingUserId) => {
  const existing = await PeopleFollower.query("follower_user_id").eq(followerUserId).using("follower_user_id-index").exec();
  const alreadyFollowing = existing.find(f => f.following_user_id === followingUserId);

  if (alreadyFollowing) {
    await PeopleFollower.delete({ id: alreadyFollowing.id });
    return { followed: false };
  } else {
    await PeopleFollower.create({
      follower_user_id: followerUserId,
      following_user_id: followingUserId
    });
    return { followed: true };
  }
};

export default {
  getProfileById,
  getProfileByUserId,
  searchProfiles,
  createProfile,
  updateProfile,
  addReview,
  toggleFollow
};
