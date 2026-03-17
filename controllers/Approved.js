import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { getCache, setCache } from "../services/cacheService.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";

/* ───────────────── UTILITIES ───────────────── */

const normalize = (v) => {
  if (!v || typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s.length ? s : null;
};

const safe = (v) => (v ? v : "all");

/* ───────────────── ADMIN SNAPSHOT LIST ───────────────── */

export const getApprovedList = async (req, res) => {
  try {
    const country = normalize(req.headers["x-country"] || req.query.country);
    const state   = normalize(req.headers["x-state"] || req.query.state);
    const city    = normalize(req.headers["x-city"] || req.query.city);
    const zip     = normalize(req.headers["x-zip-code"] || req.query.zip_code);

    const cacheKey =
      `approved_snapshot_list:${safe(country)}:${safe(state)}:${safe(city)}:${safe(zip)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    /* ───────── SCAN + CLIENT-SIDE FILTER ───────── */
    let list = await ApprovedHost.scan().exec();

    // Filter by property_snapshot JSON fields
    if (country) list = list.filter(item => normalize(item.property_snapshot?.country) === country);
    if (state) list = list.filter(item => normalize(item.property_snapshot?.state) === state);
    if (city) list = list.filter(item => normalize(item.property_snapshot?.city) === city);
    if (zip) list = list.filter(item => normalize(item.property_snapshot?.zip_code) === zip);

    // Sort by created_at DESC
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const formatted = list.map((item) => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title ?? null,
      country: item.property_snapshot?.country ?? null,
      state: item.property_snapshot?.state ?? null,
      city: item.property_snapshot?.city ?? null,
      zip_code: item.property_snapshot?.zip_code ?? null,
      street_address: item.property_snapshot?.street_address ?? null,
      pricePerNight: item.property_snapshot?.price_per_night ?? null,
      photos: (item.property_snapshot?.photos || []).map(attachCloudFrontUrl),
      ownerName: item.host_snapshot?.full_name ?? null,
      ownerEmail: item.host_snapshot?.email ?? null,
      ownerPhone: item.host_snapshot?.phone ?? null,
      approvedAt: item.approved_at
    }));

    await setCache(cacheKey, formatted, 300);

    return res.json({ success: true, data: formatted });

  } catch (err) {
    console.error("APPROVED LIST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ───────────────── LIVE APPROVED + HOST DETAILS ───────────────── */

export const getApprovedWithHosts = async (req, res) => {
  try {
    const country  = req.headers["x-country"] || req.query.country || null;
    const state    = req.headers["x-state"] || req.query.state || null;
    const city     = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;

    const cacheKey =
      `approved_properties_with_hosts:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const now = new Date();

    // Query by status GSI
    let properties = await Property.query("status").eq("approved").exec();

    // Client-side filters
    properties = properties.filter(p =>
      !p.is_deleted &&
      !p.is_expired &&
      p.listing_expires_at &&
      new Date(p.listing_expires_at) > now
    );

    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);
    if (city) properties = properties.filter(p => p.city === city);
    if (zip_code) properties = properties.filter(p => p.zip_code === zip_code);

    // Sort newest first
    properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch host + user data manually (replaces Sequelize includes)
    const plain = await Promise.all(properties.map(async (p) => {
      const pObj = { ...p };
      const host = await Host.get(p.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        pObj.Host = {
          id: host.id,
          full_name: host.full_name,
          status: host.status,
          phone: host.phone,
          country: host.country,
          state: host.state,
          city: host.city,
          User: user ? { id: user.id, email: user.email } : null
        };
      }
      if (pObj.photos) pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      if (pObj.video) pObj.video = attachCloudFrontUrl(pObj.video);
      return processHostImages(pObj);
    }));

    await setCache(cacheKey, plain, 300);

    return res.json({ success: true, data: plain });

  } catch (err) {
    console.error("GET APPROVED W HOSTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
