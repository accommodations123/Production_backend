import Property from "../model/Property.js";
import Host from "../model/Host.js";
export const loadProperty = async (req, res, next) => {
  try {
    const propertyId = Number(req.params.id);
    const hostId = req.host.id; // 🔥 from hostOnly

    if (!propertyId) {
      return res.status(400).json({
        message: "Invalid property id"
      });
    }

    const property = await Property.findOne({
      where: {
        id: propertyId,
        host_id: hostId,
        is_deleted: false
      }
    });

    if (!property) {
      return res.status(404).json({
        message: "Property not found or access denied"
      });
    }

    req.property = property;
    next();

  } catch (err) {
    console.error("LOAD PROPERTY ERROR:", err);
    return res.status(500).json({
      message: "Server error"
    });
  }
};
