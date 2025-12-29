import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { getIO } from "../services/socket.js";

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
          attributes: ["id", "user_id"],
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
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    property.status = "approved";
    property.rejection_reason = "";
    await property.save();

    // Invalidate related caches
    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");
    await deleteCacheByPrefix("property_country_stats");
    const io = getIO();
    io.to(`user:${property.user_id}`).emit("notification",{
      type: "PROPERTY_APPROVED",
      title: "property approved",
      message: "Your property has been approved and is now visible",
      entityType: "property",
      entityId: property.id
    })

    return res.json({ success: true, message: "Property approved" });

  } catch (err) {
    console.log("APPROVE ERROR:", err);
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

    // Invalidate caches
    await deleteCacheByPrefix("pending_properties");
    await deleteCacheByPrefix("property_status_stats");

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

