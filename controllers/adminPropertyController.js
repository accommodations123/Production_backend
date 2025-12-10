import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { getCache, setCache, deleteCache } from "../services/cacheService.js";

// GET pending properties (admin)
export const getPendingProperties = async (req, res) => {
  try {
    const key = "pendingProperties";

    const cached = await getCache(key);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const properties = await Property.findAll({
      where: { status: "pending" },
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "email"]
        }
      ]
    });

    const data = await Promise.all(
      properties.map(async property => {
        const host = await Host.findOne({
          where: { user_id: property.user_id }
        });

        const owner = {
          userId: property.User?.id,
          email: property.User?.email,
          verification: host || null
        };

        return { property, owner };
      })
    );

    await setCache(key, data, 300);

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

    await deleteCache("pendingProperties");
    await deleteCache("propertyStats");

    return res.json({ success: true, message: "Property approved" });

  } catch (err) {
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

    await deleteCache("pendingProperties");
    await deleteCache("propertyStats");

    return res.json({ success: true, message: "Property rejected" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE property
export const deleteProperty = async (req, res) => {
  try {
    await Property.destroy({ where: { id: req.params.id } });

    await deleteCache("pendingProperties");
    await deleteCache("approvedListings");
    await deleteCache("propertyStats");

    return res.json({ success: true, message: "Property deleted" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// simple admin aggregation
export const getPropertyStatusStats = async (req, res) => {
  try {
    const key = "propertyStats";
    const cached = await getCache(key);

    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    const [stats] = await Property.sequelize.query(`
      SELECT status, COUNT(*) as total
      FROM properties
      GROUP BY status
    `);

    await setCache(key, stats, 1200);

    return res.json({ success: true, stats });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// property stats aggregation (example)
export const getPropertyStats = async (req, res) => {
  try {
    const key = "propertyStats";
    const cached = await getCache(key);

    if (cached) {
      return res.json({ success: true, stats: cached });
    }

    const [stats] = await Property.sequelize.query(`
      SELECT country, COUNT(*) as total
      FROM properties
      WHERE status = 'approved'
      GROUP BY country
    `);

    await setCache(key, stats, 1800);

    return res.json({ success: true, stats });

  } catch(err){
    return res.status(500).json({ message: "Server error" });
  }
};


// simple aggregation
export const getHostStats = async (req, res) => {
  try {
    const key = "hostStats";

    const cached = await getCache(key);
    if (cached) {
      return res.json({ success:true, stats: cached });
    }

    // aggregation query
    const [stats] = await Host.sequelize.query(`
      SELECT status, COUNT(*) as total
      FROM hosts
      GROUP BY status
    `);

    await setCache(key, stats, 600);

    return res.json({ success:true, stats });

  } catch(err){
    return res.status(500).json({ message:"Server error" });
  }
};