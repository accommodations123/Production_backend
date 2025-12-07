import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

// GET pending properties including user and host info
export const getPendingProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { status: "pending" },
      order: [["created_at", "DESC"]],

      include: [
        {
          model: User,
          attributes: ["id", "email"]  // only fields that actually exist
        }
      ]
    });

    const data = await Promise.all(
      properties.map(async (property) => {
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

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
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

    res.json({ success: true, message: "Property approved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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

    res.json({ success: true, message: "Property rejected" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE property
export const deleteProperty = async (req, res) => {
  try {
    await Property.destroy({ where: { id: req.params.id } });
    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// SINGLE property with owner and host verification
export const getPropertyDetailsForAdmin = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ["id", "email"]
        }
      ]
    });

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const host = await Host.findOne({
      where: { user_id: property.user_id }
    });

    const owner = {
      userId: property.User?.id,
      email: property.User?.email,
      verification: host || null
    };

    res.json({
      success: true,
      property,
      owner
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
