import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";

export const getPendingProperties = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey = `pending_properties:${country || "all"}:${state || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = { status: "pending" };
    if (country) where.country = country;
    if (state) where.state = state;

    const properties = await Property.findAll({
      where,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Host,
          attributes: ["id", "user_id", "full_name", "whatsapp", "facebook", "instagram"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    const data = properties.map(property => ({
      property,
      owner: {
        userId: property.Host?.User?.id || null,
        email: property.Host?.User?.email || null,
        verification: property.Host || null
      }
    }));

    await setCache(cacheKey, data, 300);

    return res.json({ success: true, data });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};



// APPROVE property
export const approveProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: Host,
          include: [
            {
              model: User,
              attributes: ["email"]
            }
          ]
        }
      ]
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // ✅ Only pending → approved
    if (property.status !== "pending") {
      return res.status(400).json({
        message: "Only pending properties can be approved"
      });
    }

    // 🔥 START 15-DAY TIMER HERE
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    await property.update({
      status: "approved",
      rejection_reason: "",
      listing_expires_at: expiresAt,
      is_expired: false
    });
       // 🔐 AUDIT (authoritative)
    logAudit({
      action: "PROPERTY_APPROVED",
      actor: req.auditActor,
      target: { type: "property", id: property.id },
      severity: "HIGH",
      req,
      metadata: { expires_at: expiresAt }
    }).catch(console.error);
    AnalyticsEvent.create({
      event_type: "PROPERTY_APPROVED",
      user_id: req.admin?.id || null,   // approving admin
      host_id: property.host_id,
      property_id: property.id,
      country: property.country || null,
      metadata: {
        expires_at: expiresAt
      },
      created_at: new Date()
    }).catch(err => {
      console.error("ANALYTICS EVENT FAILED:", err);
    });



    // ✅ Cache cleanup
    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
    await deleteCacheByPrefix("property_country_stats");
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

  
    // ✅ ONE LINE: notification + socket + email
    await notifyAndEmail({
      userId: property.Host.user_id,
      email: property.Host.User.email,
      type: NOTIFICATION_TYPES.PROPERTY_APPROVED,
      title: "Property approved",
      message: "Your property has been approved and is now visible.",
      metadata: {
        propertyId: property.id,
        expiresAt
      }
    });

    return res.json({
      success: true,
      message: "Property approved and 15-day timer started"
    });

  } catch (err) {
    console.error("APPROVE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





// REJECT property
export const rejectProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    property.status = "rejected";
    property.rejection_reason = req.body.reason || "Not specified";
    await property.save();
        logAudit({
      action: "PROPERTY_REJECTED",
      actor: req.auditActor,
      target: { type: "property", id: property.id },
      severity: "HIGH",
      req,
      metadata: { reason: property.rejection_reason }
    }).catch(console.error);
    AnalyticsEvent.create({
      event_type: "PROPERTY_REJECTED",
      user_id: req.admin?.id || null,
      property_id: property.id,
      country: property.country || null,
      metadata: {
        reason: property.rejection_reason
      },
      created_at: new Date()
    }).catch(err => {
      console.error("ANALYTICS EVENT FAILED:", err);
    });


    // Invalidate caches
    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
      // ✅ notify user (socket + email)
    await notifyAndEmail({
      userId: property.Host.user_id,
      email: property.Host.User.email,
      type: NOTIFICATION_TYPES.PROPERTY_REJECTED,
      title: "Property rejected",
      message: "Your property was rejected. Please review the reason.",
      metadata: {
        propertyId: property.id,
        reason
      }
    });

    return res.json({ success: true, message: "Property rejected" });

  } catch (err) {
    console.log("REJECT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// DELETE property
export const deleteProperty = async (req, res) => {
  try {
    await Property.update(
      {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: req.admin.id || null,
        delete_reason: "Admin deleted"
      },
      { where: { id: req.params.id } }
    );


    // Invalidate caches
    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
    await deleteCacheByPrefix("property_country_stats");

    return res.json({ success: true, message: "Property deleted" });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// simple admin aggregation
export const getPropertyStatusStats = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey =
      `property_status_stats:${country || "all"}:${state || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    let where = "";
    const replacements = {};

    if (country) {
      where += " WHERE country = :country";
      replacements.country = country;
    }

    if (state) {
      where += where ? " AND state = :state" : " WHERE state = :state";
      replacements.state = state;
    }

    const [stats] = await Property.sequelize.query(
      `
        SELECT status, COUNT(*) as total
        FROM properties
        ${where}
        GROUP BY status
      `,
      { replacements }
    );

    await setCache(cacheKey, stats, 300);

    return res.json({ success: true, stats });

  } catch (err) {
    console.log("STATUS STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// property stats aggregation
export const getPropertyStats = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey =
      `property_country_stats:${country || "all"}:${state || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    let where = "WHERE status = 'approved'";
    const replacements = {};

    if (country) {
      where += " AND country = :country";
      replacements.country = country;
    }

    if (state) {
      where += " AND state = :state";
      replacements.state = state;
    }

    const [stats] = await Property.sequelize.query(
      `
        SELECT country, COUNT(*) as total
        FROM properties
        ${where}
        GROUP BY country
      `,
      { replacements }
    );

    await setCache(cacheKey, stats, 300);

    return res.json({ success: true, stats });

  } catch (err) {
    console.log("PROPERTY STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// simple host aggregation
export const getHostStats = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey =
      `host_stats:${country || "all"}:${state || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    let where = "";
    const replacements = {};

    if (country) {
      where += " WHERE country = :country";
      replacements.country = country;
    }

    if (state) {
      where += where ? " AND state = :state" : " WHERE state = :state";
      replacements.state = state;
    }

    const [stats] = await Host.sequelize.query(
      `
        SELECT status, COUNT(*) as total
        FROM hosts
        ${where}
        GROUP BY status
      `,
      { replacements }
    );

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

    const cacheKey =
      `admin:properties:approved:${country || "all"}:${state || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    const where = { status: "approved", is_deleted: false };
    if (country) where.country = country;
    if (state) where.state = state;

    const properties = await Property.findAll({
      where,
      include: [
        {
          model: Host,
          attributes: ["id", "full_name"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ],
      order: [["updated_at", "DESC"]]
    });

    await setCache(cacheKey, properties, 300);

    return res.json({
      success: true,
      properties
    });

  } catch (err) {
    console.error("ADMIN APPROVED PROPERTIES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getRejectedPropertiesAdmin = async (req, res) => {
  try {
    const { country, state } = req.query;

    const cacheKey =
      `admin:properties:rejected:${country || "all"}:${state || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    const where = { status: "rejected" };
    if (country) where.country = country;
    if (state) where.state = state;

    const properties = await Property.findAll({
      where,
      attributes: {
        include: ["rejection_reason"]
      },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ],
      order: [["updated_at", "DESC"]]
    });

    await setCache(cacheKey, properties, 300);

    return res.json({
      success: true,
      properties
    });

  } catch (err) {
    console.error("ADMIN REJECTED PROPERTIES ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
