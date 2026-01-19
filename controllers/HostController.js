import Host from "../model/Host.js";
import User from "../model/User.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import axios from "axios";
import geoip from "geoip-lite";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { logAudit } from "../services/auditLogger.js";

// Save host details
export const saveHost = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
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
    const existing = await Host.findOne({ where: { user_id: userId } });
    if (existing) {
      return res.status(400).json({ message: "Host profile already exists" });
    }
    const { latitude, longitude } = req.body;

    let location = {
      country: null,
      state: null,
      city: null,
      zip_code: null,
      street_address: null
    };

    // 1. GPS-based resolution
    if (latitude && longitude) {
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
        country: addr.country || null,
        state: addr.state || null,
        city: addr.city || addr.town || addr.village || null,
        zip_code: addr.postcode || null,
        street_address: response.data.display_name || null
      };
    }

    // 2. IP fallback
    if (!location.country) {
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress;

      const geo = geoip.lookup(ip);
      if (geo) {
        location = {
          country: geo.country,
          state: geo.region,
          city: geo.city,
          zip_code: null,
          street_address: null
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
      // 🔹 Direct communication
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




    // Invalidate caches
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

    const host = await Host.findByPk(hostId);
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

    // Fetch user (for profile updates)
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /* ===============================
       HOST UPDATES
    =============================== */
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

    await host.update(hostUpdates);

    /* ===============================
       USER PROFILE IMAGE UPDATE
    =============================== */
    if (req.file?.location) {
      await user.update({
        profile_image: req.file.location
      });
    }
    AnalyticsEvent.create({
      event_type: "HOST_UPDATED",
      user_id: userId,
      host_id: host.id,
      country: host.country,
      state: host.state,
      metadata: {
        fields_updated: Object.keys(req.body)
      },

    }).catch(err => {
      console.error("ANALYTICS HOST_UPDATED FAILED:", err);
    });
     logAudit({
      action: "HOST_UPDATED",
      actor: req.auditActor,
      target: { type: "host", id: host.id },
      req,
      metadata: {
        fields: Object.keys(req.body)
      }
    }).catch(console.error);



    /* ===============================
       CACHE INVALIDATION
    =============================== */
    await deleteCacheByPrefix(`host:${userId}`);
    await deleteCacheByPrefix("pending_hosts");
    await deleteCacheByPrefix("property:");
    await deleteCacheByPrefix(`user:${userId}`);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        host,
        user: {
          id: user.id,
          profile_image: user.profile_image
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

    const host = await Host.findOne({
      where: { user_id: userId },
      include: [
        {
          model: User,
          attributes: [
            "id",
            "email",
            "profile_image"
          ]
        }
      ]
    });

    if (!host) {
      return res.status(404).json({
        success: false,
        message: "Host profile not found"
      });
    }

    // 🔹 Normalize response (frontend-friendly)
    const response = {
      ...host.toJSON(),
      profile_image: host.User?.profile_image || null,
      email: host.User?.email || null
    };

    // Cache normalized response
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
   

    // ✅ Location-aware cache key
    const cacheKey = `pending_hosts:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, hosts: cached });
    }

    // ✅ Build where clause FIRST
    const where = { status: "pending" };

    if (country) where.country = country;
    if (state) where.state = state;

    const hosts = await Host.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "email"]
        }
      ],
      order: [["created_at", "DESC"]]
    });


    // ✅ Cache per location
    await setCache(cacheKey, hosts, 300);

    return res.json({ success: true, hosts });

  } catch (err) {
    console.error("getPendingHosts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// approve host
export const approveHost = async (req, res) => {
  try {
    const host = await Host.findByPk(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    host.status = "approved";
    host.rejection_reason = "";
    await host.save();
    AnalyticsEvent.create({
      event_type: "HOST_APPROVED",
      user_id: req.admin?.id || null,   // approving admin
      host_id: host.id,
      country: host.country,
      state: host.state,

    }).catch(err => {
      console.error("ANALYTICS HOST_APPROVED FAILED:", err);
    });
     logAudit({
      action: "HOST_APPROVED",
      actor: req.auditActor,
      target: { type: "host", id: host.id },
      severity: "HIGH",
      req
    }).catch(console.error);

    // Clear caches
    await deleteCacheByPrefix(`host:${host.user_id}`);
    await deleteCacheByPrefix("pending_hosts");

    return res.json({ success: true, message: "Host approved" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// reject host
export const rejectHost = async (req, res) => {
  try {
    const host = await Host.findByPk(req.params.id);
    if (!host) {
      return res.status(404).json({ message: "Not found" });
    }

    host.status = "rejected";
    host.rejection_reason = req.body.reason || "";
    await host.save();
    AnalyticsEvent.create({
      event_type: "HOST_REJECTED",
      user_id: req.admin?.id || null,
      host_id: host.id,
      country: host.country,
      state: host.state,
      metadata: {
        reason: host.rejection_reason
      },
    }).catch(err => {
      console.error("ANALYTICS HOST_REJECTED FAILED:", err);
    });
     logAudit({
      action: "HOST_REJECTED",
      actor: req.auditActor,
      target: { type: "host", id: host.id },
      severity: "HIGH",
      req,
      metadata: {
        reason: host.rejection_reason
      }
    }).catch(console.error);



    // Clear caches
    await deleteCacheByPrefix(`host:${host.user_id}`);
    await deleteCacheByPrefix("pending_hosts");

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

    const where = { status: "approved" };
    if (country) where.country = country;
    if (state) where.state = state;

    const hosts = await Host.findAll({
      where,
      include: [
        {
          model: User,
          attributes: ["id", "email", "profile_image"]
        }
      ],
      order: [["updated_at", "DESC"]]
    });

    await setCache(cacheKey, hosts, 300);

    return res.json({ success: true, hosts });

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

    const where = { status: "rejected" };
    if (country) where.country = country;
    if (state) where.state = state;

    const hosts = await Host.findAll({
      where,
      attributes: {
        include: ["rejection_reason"]
      },
      include: [
        {
          model: User,
          attributes: ["id", "email", "profile_image"]
        }
      ],
      order: [["updated_at", "DESC"]]
    });

    await setCache(cacheKey, hosts, 300);

    return res.json({ success: true, hosts });

  } catch (err) {
    console.error("GET REJECTED HOSTS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
