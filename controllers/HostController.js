import Host from "../model/Host.js";
import User from "../model/User.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import axios from "axios";
import geoip from "geoip-lite";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { logAudit } from "../services/auditLogger.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";

// Save host details
export const saveHost = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const phone = user.phone || req.body.phone;
    const email = user.email || req.body.email;

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Phone and email are required."
      });
    }

    // Check if host already exists
    const existingHosts = await Host.query("user_id").eq(userId).exec();
    if (existingHosts.length > 0) {
      return res.status(400).json({ message: "Host profile already exists" });
    }

    const { latitude, longitude } = req.body;

    let location = {
      country: req.body.country || null,
      state: req.body.state || null,
      city: req.body.city || null,
      zip_code: req.body.zip_code || null,
      street_address: req.body.street_address || null
    };

    // 1. GPS-based resolution
    if ((!location.country || !location.state || !location.city) && latitude && longitude) {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: { lat: latitude, lon: longitude, format: "json" },
          headers: { "User-Agent": "accommodations-app" },
          timeout: 5000
        }
      );

      const addr = response.data.address || {};
      location = {
        country: addr.country || location.country,
        state: addr.state || location.state,
        city: addr.city || addr.town || addr.village || location.city,
        zip_code: addr.postcode || location.zip_code,
        street_address: response.data.display_name || location.street_address
      };
    }

    // 2. IP fallback
    if (!location.country) {
      const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
      const geo = geoip.lookup(ip);
      if (geo) {
        location = {
          country: geo.country || location.country,
          state: geo.region || location.state,
          city: geo.city || location.city,
          zip_code: location.zip_code,
          street_address: location.street_address
        };
      }
    }

    // 3. Enforce required location
    if (!location.country || !location.state || !location.city) {
      return res.status(400).json({
        success: false,
        message: "Unable to determine location automatically"
      });
    }

    const data = await Host.create({
      user_id: userId,
      email,
      phone,
      full_name: req.body.full_name,
      country: location.country,
      state: location.state,
      city: location.city,
      zip_code: location.zip_code,
      street_address: location.street_address,
      whatsapp: req.body.whatsapp,
      instagram: req.body.instagram,
      facebook: req.body.facebook,
    });

    AnalyticsEvent.create({
      event_type: "HOST_CREATED",
      user_id: userId,
      host_id: data.id,
      country: data.country,
      state: data.state,
    }).catch(err => {
      console.error("ANALYTICS HOST_CREATED FAILED:", err);
    });

    logAudit({
      action: "HOST_CREATED",
      actor: req.auditActor,
      target: { type: "host", id: data.id },
      req
    }).catch(err => {
      console.error("AUDIT LOG FAILED", err);
    });

    await deleteCacheByPrefix(`host:${userId}`);
    await deleteCacheByPrefix("pending_hosts");
    await deleteCacheByPrefix("property:");

    return res.status(201).json({
      success: true,
      message: "Details saved successfully.",
      data
    });

  } catch (error) {
    console.log("Host error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error."
    });
  }
};


export const updateHost = async (req, res) => {
  try {
    const hostId = req.params.id;
    const userId = req.user.id;

    const host = await Host.get(hostId);
    if (!host) {
      return res.status(404).json({
        success: false,
        message: "Host not found"
      });
    }

    // Ownership check
    if (host.user_id !== userId) {
      logAudit({
        action: "HOST_UPDATE_FORBIDDEN",
        actor: req.auditActor,
        target: { type: "host", id: hostId },
        severity: "HIGH",
        req
      }).catch(console.error);
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this host"
      });
    }

    const user = await User.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /* HOST UPDATES */
    const hostUpdates = {
      full_name: req.body.full_name ?? host.full_name,
      phone: req.body.phone ?? host.phone,
      country: req.body.country ?? host.country,
      state: req.body.state ?? host.state,
      city: req.body.city ?? host.city,
      zip_code: req.body.zip_code ?? host.zip_code,
      street_address: req.body.street_address ?? host.street_address,
      whatsapp: req.body.whatsapp ?? host.whatsapp,
      instagram: req.body.instagram ?? host.instagram,
      facebook: req.body.facebook ?? host.facebook
    };

    await Host.update({ id: hostId }, hostUpdates);

    /* USER PROFILE IMAGE UPDATE */
    if (req.file?.location) {
      await User.update({ id: userId }, { profile_image: req.file.location });
    }

    AnalyticsEvent.create({
      event_type: "HOST_UPDATED",
      user_id: userId,
      host_id: host.id,
      country: host.country,
      state: host.state,
      metadata: { fields_updated: Object.keys(req.body) },
    }).catch(err => {
      console.error("ANALYTICS HOST_UPDATED FAILED:", err);
    });

    logAudit({
      action: "HOST_UPDATED",
      actor: req.auditActor,
      target: { type: "host", id: host.id },
      req,
      metadata: { fields: Object.keys(req.body) }
    }).catch(console.error);

    await deleteCacheByPrefix(`host:${userId}`);
    await deleteCacheByPrefix("pending_hosts");
    await deleteCacheByPrefix("property:");
    await deleteCacheByPrefix(`user:${userId}`);

    const updatedHost = await Host.get(hostId);
    const updatedUser = await User.get(userId);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        host: updatedHost,
        user: {
          id: updatedUser.id,
          profile_image: attachCloudFrontUrl(updatedUser.profile_image)
        }
      }
    });

  } catch (error) {
    console.error("Update host error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// Get host data for logged-in user
export const getMyHost = async (req, res) => {
  try {
    const userId = req.user.id;

    const cacheKey = `host:${userId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts.length > 0 ? hosts[0] : null;

    if (!host) {
      return res.status(404).json({
        success: false,
        message: "Host profile not found"
      });
    }

    // Fetch user for profile image
    const user = await User.get(host.user_id);

    const response = {
      ...host,
      profile_image: attachCloudFrontUrl(user?.profile_image || null),
      email: user?.email || null
    };

    await setCache(cacheKey, response, 300);

    return res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("GET HOST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// get pending hosts (admin)
export const getPendingHosts = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `pending_hosts:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, hosts: cached });
    }

    // Query by status GSI
    let results = await Host.query("status").eq("pending").exec();

    // Client-side filter for country/state
    if (country) results = results.filter(h => h.country === country);
    if (state) results = results.filter(h => h.state === state);

    // Sort by created_at DESC
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch user data for each host
    const processedHosts = await Promise.all(results.map(async (host) => {
      const user = await User.get(host.user_id);
      const hostObj = { ...host };
      hostObj.User = user ? { id: user.id, email: user.email } : null;
      return processHostImages(hostObj);
    }));

    await setCache(cacheKey, processedHosts, 300);

    return res.json({ success: true, hosts: processedHosts });

  } catch (err) {
    console.error("getPendingHosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// approve host
export const approveHost = async (req, res) => {
  try {
    const host = await Host.get(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    await Host.update({ id: host.id }, {
      status: "approved",
      rejection_reason: ""
    });

    // Fetch user email
    const user = await User.get(host.user_id);

    AnalyticsEvent.create({
      event_type: "HOST_APPROVED",
      user_id: req.admin?.id || null,
      host_id: host.id,
      country: host.country,
      state: host.state,
    }).catch(err => {
      console.error("ANALYTICS HOST_APPROVED FAILED:", err);
    });

    logAudit({
      action: "HOST_PROFILE_APPROVED",
      actor: { id: req.admin?.id || "system", role: "admin" },
      target: { type: "host_profile", id: host.id },
      severity: "HIGH",
      req
    }).catch(console.error);

    await deleteCacheByPrefix(`host:${host.user_id}`);
    await deleteCacheByPrefix("pending_hosts");

    // ✅ notify host user
    try {
      if (user?.email) {
        await notifyAndEmail({
          userId: host.user_id,
          email: user.email,
          type: NOTIFICATION_TYPES.HOST_APPROVED,
          title: "Host approved",
          message: "Your host profile has been approved.",
          metadata: { hostId: host.id }
        });
      }
    } catch (err) {
      console.error("Failed to notify user:", err);
    }

    return res.json({ success: true, message: "Host approved" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// reject host
export const rejectHost = async (req, res) => {
  try {
    const host = await Host.get(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    const rejection_reason = req.body.reason || "";

    await Host.update({ id: host.id }, {
      status: "rejected",
      rejection_reason
    });

    const user = await User.get(host.user_id);

    AnalyticsEvent.create({
      event_type: "HOST_REJECTED",
      user_id: req.admin?.id || "system",
      host_id: host.id,
      country: host.country || null,
      state: host.state || null,
      metadata: { reason: rejection_reason },
    }).catch(err => {
      console.error("ANALYTICS HOST_REJECTED FAILED:", err);
    });

    logAudit({
      action: "HOST_REJECTED",
      actor: req.auditActor,
      target: { type: "host", id: host.id },
      severity: "HIGH",
      req,
      metadata: { reason: rejection_reason }
    }).catch(console.error);

    await deleteCacheByPrefix(`host:${host.user_id}`);
    await deleteCacheByPrefix("pending_hosts");

    try {
      if (user?.email) {
        await notifyAndEmail({
          userId: host.user_id,
          email: user.email,
          type: NOTIFICATION_TYPES.HOST_REJECTED,
          title: "Host application rejected",
          message: "Your host application was rejected. Please review our guidelines.",
          metadata: {
            hostId: host.id,
            reason: rejection_reason
          }
        });
      }
    } catch (err) {
      console.error("Failed to notify user:", err);
    }

    return res.json({
      success: true,
      message: "Host rejected"
    });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getApprovedHosts = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `admin:hosts:approved:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, hosts: cached });
    }

    let results = await Host.query("status").eq("approved").exec();

    if (country) results = results.filter(h => h.country === country);
    if (state) results = results.filter(h => h.state === state);

    results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const processedHosts = await Promise.all(results.map(async (host) => {
      const user = await User.get(host.user_id);
      const hostObj = { ...host };
      hostObj.User = user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null;
      return processHostImages(hostObj);
    }));

    await setCache(cacheKey, processedHosts, 300);

    return res.json({ success: true, hosts: processedHosts });

  } catch (err) {
    console.error("GET APPROVED HOSTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getRejectedHosts = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `admin:hosts:rejected:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, hosts: cached });
    }

    let results = await Host.query("status").eq("rejected").exec();

    if (country) results = results.filter(h => h.country === country);
    if (state) results = results.filter(h => h.state === state);

    results.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    const processedHosts = await Promise.all(results.map(async (host) => {
      const user = await User.get(host.user_id);
      const hostObj = { ...host };
      hostObj.User = user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null;
      return processHostImages(hostObj);
    }));

    await setCache(cacheKey, processedHosts, 300);

    return res.json({ success: true, hosts: processedHosts });

  } catch (err) {
    console.error("GET REJECTED HOSTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
