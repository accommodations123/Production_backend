import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";

// Helper: Enrich property with Host + User
async function enrichPropertyWithHost(property) {
  const p = { ...property };
  if (p.host_id) {
    const host = await Host.get(p.host_id);
    if (host) {
      const user = await User.get(host.user_id);
      p.Host = {
        id: host.id, user_id: host.user_id, full_name: host.full_name,
        whatsapp: host.whatsapp, facebook: host.facebook, instagram: host.instagram,
        User: user ? { id: user.id, email: user.email } : null
      };
    }
  }
  return p;
}

function processPropertyImages(p) {
  if (p.photos) p.photos = p.photos.map(attachCloudFrontUrl);
  if (p.video) p.video = attachCloudFrontUrl(p.video);
  return processHostImages(p);
}

export const getPendingProperties = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `pending_properties:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    let properties = await Property.query("status").eq("pending").exec();
    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);
    properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const data = await Promise.all(properties.map(async property => {
      let p = await enrichPropertyWithHost(property);
      p = processPropertyImages(p);
      return {
        property: p,
        owner: {
          userId: p.Host?.User?.id || null,
          email: p.Host?.User?.email || null,
          verification: p.Host || null
        }
      };
    }));

    await setCache(cacheKey, data, 300);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const approveProperty = async (req, res) => {
  try {
    const property = await Property.get(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.status !== "pending") {
      return res.status(400).json({ message: "Only pending properties can be approved" });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    await Property.update({ id: property.id }, {
      status: "approved", rejection_reason: "",
      listing_expires_at: expiresAt.toISOString(), is_expired: false
    });

    logAudit({
      action: "PROPERTY_APPROVED", actor: req.auditActor,
      target: { type: "property", id: property.id },
      severity: "HIGH", req, metadata: { expires_at: expiresAt }
    }).catch(console.error);

    AnalyticsEvent.create({
      event_type: "PROPERTY_APPROVED", user_id: req.admin?.id || null,
      host_id: property.host_id, property_id: property.id,
      country: property.country || null,
      metadata: { expires_at: expiresAt }, created_at: new Date().toISOString()
    }).catch(console.error);

    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
    await deleteCacheByPrefix("property_country_stats");
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

    try {
      const host = await Host.get(property.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({
            userId: host.user_id, email: user.email,
            type: NOTIFICATION_TYPES.PROPERTY_APPROVED,
            title: "Property approved",
            message: "Your property has been approved and is now visible.",
            metadata: { propertyId: property.id, expiresAt }
          });
        }
      }
    } catch (err) { console.error("Failed to push notification/email:", err); }

    return res.json({ success: true, message: "Property approved and 15-day timer started" });
  } catch (err) {
    console.error("APPROVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const rejectProperty = async (req, res) => {
  try {
    const property = await Property.get(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    const rejection_reason = req.body.reason || "Not specified";
    await Property.update({ id: property.id }, { status: "rejected", rejection_reason });

    logAudit({
      action: "PROPERTY_REJECTED", actor: req.auditActor,
      target: { type: "property", id: property.id },
      severity: "HIGH", req, metadata: { reason: rejection_reason }
    }).catch(console.error);

    AnalyticsEvent.create({
      event_type: "PROPERTY_REJECTED", user_id: req.admin?.id || null,
      property_id: property.id, country: property.country || null,
      metadata: { reason: rejection_reason }, created_at: new Date().toISOString()
    }).catch(console.error);

    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");

    try {
      const host = await Host.get(property.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        if (user?.email) {
          await notifyAndEmail({
            userId: host.user_id, email: user.email,
            type: NOTIFICATION_TYPES.PROPERTY_REJECTED,
            title: "Property rejected",
            message: "Your property was rejected. Please review the reason.",
            metadata: { propertyId: property.id, reason: rejection_reason }
          });
        }
      }
    } catch (err) { console.error("Failed to push notification/email:", err); }

    return res.json({ success: true, message: "Property rejected" });
  } catch (err) {
    console.log("REJECT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteProperty = async (req, res) => {
  try {
    await Property.update({ id: req.params.id }, {
      is_deleted: true, deleted_at: new Date().toISOString(),
      deleted_by: req.admin.id || null, delete_reason: "Admin deleted"
    });

    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
    await deleteCacheByPrefix("property_country_stats");

    return res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    console.log("DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getPropertyStatusStats = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `property_status_stats:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, stats: cached });

    let allProperties = await Property.scan().exec();
    if (country) allProperties = allProperties.filter(p => p.country === country);
    if (state) allProperties = allProperties.filter(p => p.state === state);

    const statusMap = {};
    allProperties.forEach(p => {
      statusMap[p.status] = (statusMap[p.status] || 0) + 1;
    });

    const stats = Object.entries(statusMap).map(([status, total]) => ({ status, total }));
    await setCache(cacheKey, stats, 300);
    return res.json({ success: true, stats });
  } catch (err) {
    console.log("STATUS STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getPropertyStats = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `property_country_stats:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, stats: cached });

    let properties = await Property.query("status").eq("approved").exec();
    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);

    const countryMap = {};
    properties.forEach(p => {
      countryMap[p.country] = (countryMap[p.country] || 0) + 1;
    });

    const stats = Object.entries(countryMap).map(([country, total]) => ({ country, total }));
    await setCache(cacheKey, stats, 300);
    return res.json({ success: true, stats });
  } catch (err) {
    console.log("PROPERTY STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getHostStats = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `host_stats:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, stats: cached });

    let allHosts = await Host.scan().exec();
    if (country) allHosts = allHosts.filter(h => h.country === country);
    if (state) allHosts = allHosts.filter(h => h.state === state);

    const statusMap = {};
    allHosts.forEach(h => {
      statusMap[h.status] = (statusMap[h.status] || 0) + 1;
    });

    const stats = Object.entries(statusMap).map(([status, total]) => ({ status, total }));
    await setCache(cacheKey, stats, 300);
    return res.json({ success: true, stats });
  } catch (err) {
    console.log("HOST STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getApprovedPropertiesAdmin = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `admin:properties:approved:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, properties: cached });

    let properties = await Property.query("status").eq("approved").exec();
    properties = properties.filter(p => !p.is_deleted);
    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);
    properties.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const processedProps = await Promise.all(properties.map(async p => {
      let enriched = await enrichPropertyWithHost(p);
      return processPropertyImages(enriched);
    }));

    await setCache(cacheKey, processedProps, 300);
    return res.json({ success: true, properties: processedProps });
  } catch (err) {
    console.error("ADMIN APPROVED PROPERTIES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getRejectedPropertiesAdmin = async (req, res) => {
  try {
    const { country, state } = req.query;
    const cacheKey = `admin:properties:rejected:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json({ success: true, properties: cached });

    let properties = await Property.scan().filter("status").eq("rejected").exec();
    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);
    properties.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const processedProps = await Promise.all(properties.map(async p => {
      let enriched = await enrichPropertyWithHost(p);
      return processPropertyImages(enriched);
    }));

    await setCache(cacheKey, processedProps, 300);
    return res.json({ success: true, properties: processedProps });
  } catch (err) {
    console.error("ADMIN REJECTED PROPERTIES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
