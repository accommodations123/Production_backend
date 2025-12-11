import { Op } from "sequelize";
import Property from "../model/Property.js";
import User from "../model/User.js";
import Host from "../model/Host.js";

// CREATE DRAFT LISTING
export const createDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, propertyType, privacyType } = req.body;

    if (!categoryId || !propertyType || !privacyType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const host = await Host.findOne({ where: { user_id: userId } });

    if (!host) {
      return res.status(400).json({
        message: "You must complete host details before posting a property."
      });
    }

    const property = await Property.create({
      host_id: host.id,
      category_id: categoryId,
      property_type: propertyType,
      privacy_type: privacyType,
      status: "draft"
    });

    return res.json({
      success: true,
      propertyId: property.id,
      message: "Draft created successfully."
    });

  } catch (err) {
    console.log("CREATE DRAFT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// BASIC INFO
export const saveBasicInfo = async (req, res) => {
  try {
    await Property.update(
      {
        guests: req.body.guests,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        pets_allowed: req.body.petsAllowed,
        area: req.body.area
      },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// ADDRESS
export const saveAddress = async (req, res) => {
  try {
    await Property.update(
      {
        country: req.body.country,
        city: req.body.city,
        address: req.body.address
      },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// MEDIA
export const saveMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const newUrls = req.files.map(file => file.location);
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const oldPhotos = property.photos || [];
    property.photos = [...oldPhotos, ...newUrls];

    await property.save();
    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const saveVideo = async (req, res) => {
  try {
    const url = req.file.location;

    await Property.update(
      { video: url },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// AMENITIES
export const saveAmenities = async (req, res) => {
  try {
    await Property.update(
      { amenities: req.body.amenities || [] },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// RULES
export const saveRules = async (req, res) => {
  try {
    await Property.update(
      { rules: req.body.rules || [] },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// LEGAL DOCS
export const saveLegalDocs = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const newUrls = req.files.map(file => file.location);
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const oldDocs = property.legal_docs || [];
    property.legal_docs = [...oldDocs, ...newUrls];

    await property.save();
    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// PRICING
export const savePricing = async (req, res) => {
  try {
    await Property.update(
      {
        price_per_hour: req.body.pricePerHour,
        price_per_night: req.body.pricePerNight,
        price_per_month: req.body.pricePerMonth,
        currency: req.body.currency
      },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// SUBMIT TO ADMIN
export const submitProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    property.status = "pending";
    await property.save();

    return res.json({ success: true, message: "Submitted to admin" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// GET HOST LISTINGS
export const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;

    const properties = await Property.findAll({
      where: { host_id: userId }
    });

    return res.json({ success: true, properties });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

// FRONTEND APPROVED LISTINGS
export const getApprovedListings = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: {
        status: ["approved", "pending"]
      },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status","phone"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    return res.json({ success: true, properties });

  } catch (err) {
    console.log("Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// PUBLIC: return all properties (approved + pending) with host
export const getAllPropertiesWithHosts = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { status: ["approved", "pending"] },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status",],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      data: properties
    });

  } catch (err) {
    console.log("GET ALL PROPERTIES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// single property
export const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        {
          model: Host,
          attributes: [
            "id",
            "full_name",
            "country",
            "city",
            "address",
            "status",
            "id_photo",
            "selfie_photo"
          ],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    if (!property) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    return res.json({ success: true, property });

  } catch (err) {
    console.log("GET PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

