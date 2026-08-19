import { StayRequest, StayRequestOffer, StayRequestReport } from "../../model/stayRequest/StayRequest.models.js";
import { getCache, setCache, deleteCache } from "../cacheService.js";

const normalizeStayRequest = (reqDoc) => {
  if (!reqDoc) return null;
  const raw = typeof reqDoc.toJSON === "function" ? reqDoc.toJSON() : { ...reqDoc };
  const budget = Number(raw.budget ?? raw.price_per_month ?? 0);
  const currency = raw.currency || "EUR";

  return {
    ...raw,
    budget,
    price_per_month: budget,
    currency,
    stayType: raw.stayType || raw.stay_type || "Long Term",
    furnishing: raw.furnishing || "Furnished",
    status: raw.status || "pending",
    is_approved: raw.is_approved !== undefined ? raw.is_approved : true,
    is_published: raw.is_published !== undefined ? raw.is_published : true,
    views_count: Number(raw.views_count || 0),
    offers_count: Number(raw.offers_count || 0)
  };
};

export const getStayRequestById = async (id) => {
  if (!id) return null;
  const cacheKey = `stay_request:id:${id}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn("⚠️ Redis cache read error:", err.message);
  }

  const rawDoc = await StayRequest.get(id);
  const requestDoc = normalizeStayRequest(rawDoc);
  if (requestDoc) {
    try {
      await setCache(cacheKey, requestDoc, 600);
    } catch (err) {
      console.warn("⚠️ Redis cache write error:", err.message);
    }
  }
  return requestDoc;
};

export const getStayRequestsByUserId = async (userId) => {
  if (!userId) return [];
  const cacheKey = `stay_request:user:${userId}`;
  try {
    const cached = await getCache(cacheKey);
    if (cached) return cached;
  } catch (err) {
    console.warn("⚠️ Redis cache read error:", err.message);
  }

  const results = await StayRequest.query("user_id").eq(userId).using("user_id-index").exec();
  const items = Array.from(results || []).map(normalizeStayRequest);

  try {
    await setCache(cacheKey, items, 300);
  } catch (err) {
    console.warn("⚠️ Redis cache write error:", err.message);
  }

  return items;
};

export const searchStayRequests = async (query = {}) => {
  const { country, city, stayType, search, minBudget, maxBudget, status = "approved", page = 1, limit = 10 } = query;

  let requests = [];
  try {
    if (country) {
      requests = await StayRequest.query("country").eq(country).using("country-index").exec();
    } else if (city) {
      requests = await StayRequest.query("city").eq(city).using("city-index").exec();
    } else if (status) {
      requests = await StayRequest.query("status").eq(status).using("status-index").exec();
    } else {
      requests = await StayRequest.scan().exec();
    }
  } catch (err) {
    console.warn("⚠️ DynamoDB index query failed, performing full scan fallback:", err.message);
    requests = await StayRequest.scan().exec();
  }

  // Fallback to table scan if GSI index query returned no items
  if (!requests || Array.from(requests).length === 0) {
    try {
      requests = await StayRequest.scan().exec();
    } catch (scanErr) {
      console.error("❌ DynamoDB scan failed:", scanErr.message);
      requests = [];
    }
  }

  let items = Array.from(requests || []).map(normalizeStayRequest);

  if (country) {
    const countryFiltered = items.filter(r => r.country?.toLowerCase().includes(country.toLowerCase()));
    if (countryFiltered.length > 0) {
      items = countryFiltered;
    }
  }
  if (city) {
    items = items.filter(r => r.city?.toLowerCase().includes(city.toLowerCase()));
  }
  if (status && status !== "all") {
    items = items.filter(r => (r.status || "approved").toLowerCase() === status.toLowerCase());
  }

  // Filter only active / published / non-blocked requests for public view
  items = items.filter(r => r.is_published !== false && r.is_blocked !== true);

  if (stayType) {
    items = items.filter(r => r.stayType?.toLowerCase() === stayType.toLowerCase());
  }

  if (minBudget !== undefined && !isNaN(Number(minBudget))) {
    items = items.filter(r => r.budget >= Number(minBudget));
  }
  if (maxBudget !== undefined && !isNaN(Number(maxBudget))) {
    items = items.filter(r => r.budget <= Number(maxBudget));
  }

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(r =>
      (r.title && r.title.toLowerCase().includes(term)) ||
      (r.description && r.description.toLowerCase().includes(term)) ||
      (r.city && r.city.toLowerCase().includes(term)) ||
      (r.country && r.country.toLowerCase().includes(term))
    );
  }

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

export const createStayRequest = async (userId, data) => {
  const status = data.status || "pending";
  const isApproved = status === "approved" || data.is_approved === true;

  const newRequest = await StayRequest.create({
    ...data,
    user_id: userId,
    title: data.title,
    description: data.description,
    country: data.country,
    state: data.state || "",
    city: data.city,
    budget: Number(data.budget ?? data.price_per_month ?? 0),
    currency: data.currency || "EUR",
    stayType: data.stayType || data.stay_type || "Long Term",
    furnishing: data.furnishing || "Furnished",
    email: data.email || "",
    phone: data.phone || "",
    status: status,
    is_published: true,
    is_approved: isApproved,
    is_blocked: false,
    views_count: 0,
    offers_count: 0
  });

  try {
    if (userId) await deleteCache(`stay_request:user:${userId}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return normalizeStayRequest(newRequest);
};

export const updateStayRequest = async (id, userId, updates) => {
  const doc = await StayRequest.get(id);
  if (!doc) {
    throw new Error("Stay request not found for update.");
  }
  if (userId && doc.user_id !== userId) {
    throw new Error("Unauthorized to update this stay request.");
  }

  const budget = updates.budget !== undefined ? Number(updates.budget) : doc.budget;

  Object.assign(doc, {
    ...updates,
    budget,
    currency: updates.currency || doc.currency || "EUR",
    stayType: updates.stayType || updates.stay_type || doc.stayType || "Long Term",
    furnishing: updates.furnishing || doc.furnishing || "Furnished"
  });

  const updatedDoc = await doc.save();

  try {
    if (doc.id) await deleteCache(`stay_request:id:${doc.id}`);
    if (userId) await deleteCache(`stay_request:user:${userId}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return normalizeStayRequest(updatedDoc);
};

export const deleteStayRequest = async (id, userId) => {
  const doc = await StayRequest.get(id);
  if (!doc) {
    throw new Error("Stay request not found.");
  }
  if (userId && doc.user_id !== userId) {
    throw new Error("Unauthorized to delete this stay request.");
  }

  await StayRequest.delete({ id });

  try {
    if (id) await deleteCache(`stay_request:id:${id}`);
    if (userId) await deleteCache(`stay_request:user:${userId}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return { success: true, message: "Stay request deleted successfully." };
};

export const addStayRequestOffer = async ({ requestId, hostUserId, propertyId, message, offeredPrice, currency, contactPhone, contactEmail }) => {
  const targetRequest = await StayRequest.get(requestId);
  if (!targetRequest) {
    throw new Error("Target stay request not found.");
  }

  const offer = await StayRequestOffer.create({
    request_id: requestId,
    host_user_id: hostUserId,
    property_id: propertyId || "",
    message,
    offered_price: Number(offeredPrice || 0),
    currency: currency || targetRequest.currency || "EUR",
    status: "pending",
    contact_phone: contactPhone || "",
    contact_email: contactEmail || ""
  });

  // Increment offers count on the target request
  try {
    targetRequest.offers_count = (targetRequest.offers_count || 0) + 1;
    await targetRequest.save();
    if (requestId) await deleteCache(`stay_request:id:${requestId}`);
  } catch (err) {
    console.warn("Could not update offers_count for request:", err.message);
  }

  return offer;
};

export const getOffersForRequest = async (requestId) => {
  const offers = await StayRequestOffer.query("request_id").eq(requestId).using("request_id-index").exec();
  return Array.from(offers || []);
};

export const getOffersByHost = async (hostUserId) => {
  const offers = await StayRequestOffer.query("host_user_id").eq(hostUserId).using("host_user_id-index").exec();
  return Array.from(offers || []);
};

export const reportStayRequest = async ({ reporterUserId, reportedRequestId, reason, details }) => {
  const report = await StayRequestReport.create({
    reporter_user_id: reporterUserId,
    reported_request_id: reportedRequestId,
    reason,
    details: details || "",
    status: "pending"
  });

  return report;
};

export const getPendingStayRequests = async () => {
  let pending = [];
  try {
    pending = await StayRequest.query("status").eq("pending").using("status-index").exec();
  } catch (err) {
    console.warn("⚠️ Pending index query failed, doing scan fallback:", err.message);
  }

  if (!pending || Array.from(pending).length === 0) {
    const all = await StayRequest.scan().exec();
    pending = Array.from(all || []).filter(r => r.status === "pending");
  }

  return Array.from(pending || []).map(normalizeStayRequest);
};

export const approveStayRequest = async (id) => {
  const doc = await StayRequest.get(id);
  if (!doc) throw new Error("Stay request not found.");

  doc.status = "approved";
  doc.is_approved = true;
  doc.rejection_reason = "";
  const updated = await doc.save();

  try {
    await deleteCache(`stay_request:id:${id}`);
    if (doc.user_id) await deleteCache(`stay_request:user:${doc.user_id}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return normalizeStayRequest(updated);
};

export const rejectStayRequest = async (id, reason) => {
  const doc = await StayRequest.get(id);
  if (!doc) throw new Error("Stay request not found.");

  doc.status = "rejected";
  doc.is_approved = false;
  doc.rejection_reason = reason || "Request rejected by administrator.";
  const updated = await doc.save();

  try {
    await deleteCache(`stay_request:id:${id}`);
    if (doc.user_id) await deleteCache(`stay_request:user:${doc.user_id}`);
  } catch (err) {
    console.warn("⚠️ Redis cache delete error:", err.message);
  }

  return normalizeStayRequest(updated);
};

export const getAdminStayRequestStats = async () => {
  const all = await StayRequest.scan().exec();
  const list = Array.from(all || []);
  const offersAll = await StayRequestOffer.scan().exec();

  const total = list.length;
  const approved = list.filter(r => r.status === "approved" || r.is_approved).length;
  const pending = list.filter(r => r.status === "pending").length;
  const rejected = list.filter(r => r.status === "rejected").length;
  const totalOffers = Array.from(offersAll || []).length;

  return {
    total,
    approved,
    pending,
    rejected,
    totalOffers
  };
};

export const getAdminReports = async () => {
  const reports = await StayRequestReport.scan().exec();
  return Array.from(reports || []);
};

export default {
  getStayRequestById,
  getStayRequestsByUserId,
  searchStayRequests,
  createStayRequest,
  updateStayRequest,
  deleteStayRequest,
  addStayRequestOffer,
  getOffersForRequest,
  getOffersByHost,
  reportStayRequest,
  getPendingStayRequests,
  approveStayRequest,
  rejectStayRequest,
  getAdminStayRequestStats,
  getAdminReports
};
