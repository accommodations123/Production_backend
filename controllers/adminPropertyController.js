import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// GET pending properties (admin)
export const getPendingProperties = async (req, res) => {
  try {
    console.log("FETCHING PENDING PROPERTIES...");

    // Try Redis cache first
    const cached = await getCache("pending_properties");
    if (cached) {
      console.log("RETURNING CACHED PENDING PROPERTIES");
      return res.json({ success: true, data: cached });
    }

    const properties = await Property.findAll({
      where: { status: "pending" },
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

    console.log("PROPERTIES FOUND:", properties.length);

    const data = properties.map(property => ({
      property,
      owner: {
        userId: property.Host?.User?.id || null,
        email: property.Host?.User?.email || null,
        verification: property.Host || null
      }
    }));

    // Store in Redis cache for 5 minutes
    await setCache("pending_properties", data, 300);

    return res.json({ success: true, data });

  } catch (err) {
    console.log("PENDING ERROR:", err);
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
    await deleteCache("pending_properties");
    await deleteCache("property_status_stats");
    await deleteCache("property_country_stats");

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
    await deleteCache("pending_properties");
    await deleteCache("property_status_stats");

    return res.json({ success: true, message: "Property rejected" });

  } catch (err) {
    console.log("REJECT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// DELETE property
export const deleteProperty = async (req, res) => {
  try {
    await Property.destroy({ where: { id: req.params.id } });

    // Invalidate caches
    await deleteCache("pending_properties");
    await deleteCache("property_status_stats");
    await deleteCache("property_country_stats");

    return res.json({ success: true, message: "Property deleted" });

  } catch (err) {
    console.log("DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// simple admin aggregation
export const getPropertyStatusStats = async (req, res) => {
  try {
    // Check cache
    const cached = await getCache("property_status_stats");
    if (cached) return res.json({ success: true, stats: cached });

    const [stats] = await Property.sequelize.query(`
      SELECT status, COUNT(*) as total
      FROM properties
      GROUP BY status
    `);

    // Cache 5 minutes
    await setCache("property_status_stats", stats, 300);

    return res.json({ success: true, stats });

  } catch (err) {
    console.log("STATUS STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// property stats aggregation
export const getPropertyStats = async (req, res) => {
  try {
    const cached = await getCache("property_country_stats");
    if (cached) return res.json({ success: true, stats: cached });

    const [stats] = await Property.sequelize.query(`
      SELECT country, COUNT(*) as total
      FROM properties
      WHERE status = 'approved'
      GROUP BY country
    `);

    await setCache("property_country_stats", stats, 300);

    return res.json({ success: true, stats });

  } catch (err) {
    console.log("PROPERTY STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// simple host aggregation
export const getHostStats = async (req, res) => {
  try {
    const cached = await getCache("host_stats");
    if (cached) return res.json({ success: true, stats: cached });

    const [stats] = await Host.sequelize.query(`
      SELECT status, COUNT(*) as total
      FROM hosts
      GROUP BY status
    `);

    await setCache("host_stats", stats, 300);

    return res.json({ success: true, stats });

  } catch (err) {
    console.log("HOST STATS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
