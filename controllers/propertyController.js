import { Op } from "sequelize";
import Property from "../model/Property.js";
import User from "../model/User.js";
import Host from "../model/Host.js";
import { getCache, setCache,deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";

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
    await deleteCacheByPrefix(`host_listings:${host.id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
        state: req.body.state,
        city: req.body.city,
        zip_code: req.body.zip_code || null,
        street_address: req.body.street_address
      },
      { where: { id } }
    );

    const property = await Property.findByPk(id);

    await deleteCache(`property:${id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

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

export const softDeleteProperty = async (req, res) => {
  try {
    const property_id = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id;

    if (!property_id) {
      return res.status(400).json({ message: "property_id is required" });
    }

    const host = await Host.findOne({ where: { user_id: userId } });
    if (!host) {
      return res.status(403).json({ message: "Host profile not found" });
    }

    const property = await Property.findOne({
      where: {
        id: property_id,
        host_id: host.id,
        is_deleted: false
      }
    });

    if (!property) {
      return res.status(404).json({
        message: "Property not found or already deleted"
      });
    }

    await property.update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: userId,
      delete_reason: reason || null
    });

    // Clear caches
    await deleteCache(`property:${property_id}`);
    await deleteCacheByPrefix(`host_listings:${host.id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

    return res.json({
      success: true,
      message: "Property deleted safely"
    });

  } catch (err) {
    console.error("SOFT DELETE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





// FRONTEND APPROVED LISTINGS
export const getApprovedListings = async (req, res) => {
  try {
    // ✅ Read from headers FIRST, fallback to query
    const country =
      req.headers["x-country"] || req.query.country || null
    const state =
      req.headers["x-state"] || req.query.state || null   // ✅ ADD
    const city =
      req.headers["x-city"] || req.query.city || null
    const zip_code =
      req.headers["x-zip-code"] || req.query.zip_code || null


    // ✅ Country-aware cache key
    const cacheKey = `approved_listings:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`

    const cached = await getCache(cacheKey)
    if (cached) {
      console.log("⚡ Cache hit:", cacheKey)
      return res.json({ success: true, properties: cached })
    }

    // ✅ Dynamic DB filter
    const where = {
     status:{
      [Op.in]: ['approved','pending']
     }
    }

    if (country) where.country = country
    if (state) where.state = state 
    if (city) where.city = city
    if (zip_code) where.zip_code = zip_code

    console.log("📍 DB Query Filter:", where)

    const properties = await Property.findAll({
      where,
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
      ],
      order: [["created_at", "DESC"]]

    })

    // ✅ Cache per location
    await setCache(cacheKey, properties, 300)

    return res.json({ success: true, properties })

  } catch (err) {
    console.error("❌ getApprovedListings error:", err)
    return res.status(500).json({ message: "Server error" })
  }
}



// PUBLIC — ALL PROPERTIES
export const getAllPropertiesWithHosts = async (req, res) => {
  try {
    // -------------------------
    // Pagination
    // -------------------------
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = (page - 1) * limit;

    // -------------------------
    // Location (headers first)
    // -------------------------
    const country =
      req.headers["x-country"] || req.query.country || null;

    const state =
      req.headers["x-state"] || req.query.state || null;

    const city =
      req.headers["x-city"] || req.query.city || null;

    const zip_code =
      req.headers["x-zip-code"] || req.query.zip_code || null;

    const { minPrice, maxPrice } = req.query;

    // -------------------------
    // WHERE clause
    // -------------------------
    const where = {
      status:{
       [Op.in]:["approved","pending"]
      },
      is_deleted: false
    };

    if (country) where.country = country;
    if (state) where.state = state;          // ✅ ADDED
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    // Price filter
    if (minPrice || maxPrice) {
      where.price_per_month = {};
      if (minPrice) where.price_per_month[Op.gte] = Number(minPrice);
      if (maxPrice) where.price_per_month[Op.lte] = Number(maxPrice);
    }

    // -------------------------
    // Cache key (FULLY SAFE)
    // -------------------------
    const cacheKey = `all_properties:${page}:${limit}:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${minPrice || 0}:${maxPrice || 0}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // -------------------------
    // Query DB
    // -------------------------
    const { rows, count } = await Property.findAndCountAll({
      where,
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
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]]
    });

    const response = {
      success: true,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      },
      filters: {
        country,
        state,
        city,
        zip_code,
        minPrice: minPrice || null,
        maxPrice: maxPrice || null
      },
      data: rows
    };

    await setCache(cacheKey, response, 300);

    return res.json(response);

  } catch (error) {
    console.error("FILTERED PROPERTY ERROR:", error);
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
            "phone",
            "country",
            "state",
            "city",
            "zip_code", 
            "street_address",
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

    await setCache(`property:${id}`, property, 30);

    return res.json({ success: true, property });

  } catch (err) {
    console.log("GET PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

