// loadProperty.js
import Property from "../model/Property.js";

export const loadProperty = async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!propertyId) {
      return res.status(400).json({ message: "Invalid property id" });
    }

    const property = await Property.get(propertyId,
        is_deleted: false
      );

    if (!property) {
      return res.status(404).json({
        message: "Property not found"
      });
    }

    req.property = property;
    next();
  } catch (err) {
    console.error("LOAD PROPERTY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
