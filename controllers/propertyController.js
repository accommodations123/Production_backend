import { Op } from "sequelize";
import Property from "../model/Property.js";
import User from "../model/User.js";
import Host from "../model/Host.js";

import { getCache, setCache, deleteCache } from "../services/cacheService.js";

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

    // Clear related cache
    await deleteCache(`host_listings:${host.id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

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
    const id = req.params.id;

    await Property.update(
      {
        guests: req.body.guests,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        pets_allowed: req.body.petsAllowed,
        area: req.body.area
      },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    // Clear caches
    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// ADDRESS
export const saveAddress = async (req, res) => {
  try {
    const id = req.params.id;

    await Property.update(
      {
        country: req.body.country,
        city: req.body.city,
        address: req.body.address
      },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// MEDIA
export const saveMedia = async (req, res) => {
  try {
    const id = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const newUrls = req.files.map(file => file.location);
    const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const oldPhotos = property.photos || [];
    property.photos = [...oldPhotos, ...newUrls];

    await property.save();

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


export const saveVideo = async (req, res) => {
  try {
    const id = req.params.id;

    await Property.update(
      { video: req.file.location },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// AMENITIES
export const saveAmenities = async (req, res) => {
  try {
    const id = req.params.id;

    await Property.update(
      { amenities: req.body.amenities || [] },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// RULES
export const saveRules = async (req, res) => {
  try {
    const id = req.params.id;

    await Property.update(
      { rules: req.body.rules || [] },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// LEGAL DOCS
export const saveLegalDocs = async (req, res) => {
  try {
    const id = req.params.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const newUrls = req.files.map(file => file.location);
    const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const oldDocs = property.legal_docs || [];
    property.legal_docs = [...oldDocs, ...newUrls];

    await property.save();

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// PRICING
export const savePricing = async (req, res) => {
  try {
    const id = req.params.id;

    await Property.update(
      {
        price_per_hour: req.body.pricePerHour,
        price_per_night: req.body.pricePerNight,
        price_per_month: req.body.pricePerMonth,
        currency: req.body.currency
      },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// SUBMIT TO ADMIN
export const submitProperty = async (req, res) => {
  try {
    const id = req.params.id;

    const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    property.status = "pending";
    await property.save();

    await deleteCache(`property:${id}`);
    await deleteCache(`host_listings:${property.host_id}`);
    await deleteCache("approved_listings");
    await deleteCache("all_properties");

    return res.json({ success: true, message: "Submitted to admin" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// GET HOST LISTINGS
export const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;

    const host = await Host.findOne({ where: { user_id: userId } });

    if (!host) {
      return res.json({ success: true, properties: [] });
    }

    const cached = await getCache(`host_listings:${host.id}`);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    const properties = await Property.findAll({
      where: { host_id: host.id }
    });

    await setCache(`host_listings:${host.id}`, properties, 300);

    return res.json({ success: true, properties });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// FRONTEND APPROVED LISTINGS
export const getApprovedListings = async (req, res) => {
  try {
    const cached = await getCache("approved_listings");
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    const properties = await Property.findAll({
      where: {
        status: ["approved", "pending"]
      },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status", "phone", "selfie_photo"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    await setCache("approved_listings", properties, 300);

    return res.json({ success: true, properties });

  } catch (err) {
    console.log("Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// PUBLIC — ALL PROPERTIES
export const getAllPropertiesWithHosts = async (req, res) => {
  try {
    const cached = await getCache("all_properties");
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const properties = await Property.findAll({
      where: { status: ["approved", "pending"] },
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    await setCache("all_properties", properties, 300);

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
    const id = req.params.id;

    const cached = await getCache(`property:${id}`);
    if (cached) {
      return res.json({ success: true, property: cached });
    }

    const property = await Property.findByPk(id, {
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

    await setCache(`property:${id}`, property, 300);

    return res.json({ success: true, property });

  } catch (err) {
    console.log("GET PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
