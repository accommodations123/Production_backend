import Property from "../model/Property.js";

export const verifyPropertyOwnership = async (req, res, next) => {
  try {
    const property = await Property.get(req.params.id);

    if (!property || property.user_id !== req.user.id || property.is_deleted) {
      return res.status(404).json({
        message: "Property not found or access denied"
      });
    }

    req.property = property;
    next();
  } catch (err) {
    console.error("verifyPropertyOwnership error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

