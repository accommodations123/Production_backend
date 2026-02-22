import { Op } from "sequelize";
import Property from "../model/Property.js";
import User from "../model/User.js";
import Host from "../model/Host.js";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";
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

    if (!host.whatsapp && !host.instagram && !host.facebook) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one contact method in host profile"
      });
    }


    const property = await Property.create({
      user_id: userId,        // REQUIRED
      host_id: host.id,
      category_id: categoryId,
      property_type: propertyType,
      privacy_type: privacyType,
      status: "draft"
    });
    AnalyticsEvent.create({
      event_type: "PROPERTY_DRAFT_CREATED",
      user_id: userId,
      host_id: host.id,
      property_id: property.id,
      country: req.headers["x-country"] || null
    }).catch(err => {
      console.error("ANALYTICS EVENT FAILED:", err);
    });



    await deleteCacheByPrefix(`user_listings:${userId}`);
    await deleteCacheByPrefix(`host_listings:${host.id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

    return res.json({
      success: true,
      propertyId: property.id,
      message: "Draft created successfully."
    });

  } catch (err) {
    console.error("CREATE DRAFT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




// BASIC INFO
export const saveBasicInfo = async (req, res) => {
  try {
    const property = req.property;

    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      {
        title: req.body.title,
        description: req.body.description,
        guests: req.body.guests,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        pets_allowed: req.body.petsAllowed,
        area: req.body.area
      },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    // Clear caches
    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// ADDRESS
export const saveAddress = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      {
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        zip_code: req.body.zip_code || null,
        street_address: req.body.street_address
      },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// MEDIA
export const saveMedia = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const newUrls = req.files.map(file => file.location);
    // const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    const oldPhotos = property.photos || [];
    property.photos = [...oldPhotos, ...newUrls];

    await property.save();

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


export const saveVideo = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      { video: req.file.location },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// AMENITIES
export const saveAmenities = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      { amenities: req.body.amenities || [] },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    await deleteCache(`property:${property.id}`);
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
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      { rules: req.body.rules || [] },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// PRICING
export const savePricing = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be edited"
      });
    }


    await property.update(
      {
        price_per_hour: req.body.pricePerHour,
        price_per_night: req.body.pricePerNight,
        price_per_month: req.body.pricePerMonth,
        currency: req.body.currency
      },
      // { where: { id } }
    );

    // const property = await Property.findByPk(id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// SUBMIT TO ADMIN
export const submitProperty = async (req, res) => {
  try {
    const property = req.property;
    if (property.status === "approved") {
      return res.status(400).json({
        message: "Approved properties cannot be re-submitted"
      });
    }


    // const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    property.status = "pending";
    await property.save();
    AnalyticsEvent.create({
      event_type: "PROPERTY_SUBMITTED",
      user_id: property.user_id,
      host_id: property.host_id,
      property_id: property.id,
      country: req.headers["x-country"] || property.country || null,
      created_at: new Date()
    }).catch(err => {
      console.error("ANALYTICS EVENT FAILED:", err);
    });


    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    // await deleteCacheByPrefix("approved_listings:");
    // await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, message: "Submitted to admin" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// GET HOST LISTINGS
export const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;

    const host = await Host.findOne({
      where: { user_id: userId }
    });

    if (!host) {
      return res.json({ success: true, properties: [] });
    }

    const cacheKey = `host_listings:${host.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    const properties = await Property.findAll({
      where: {
        host_id: host.id,
        is_deleted: false
      },
      order: [["createdAt", "DESC"]]
    });


    const processedProps = properties.map(p => {
      const pJson = p.toJSON();
      if (pJson.photos) {
        pJson.photos = pJson.photos.map(attachCloudFrontUrl);
      }
      if (pJson.video) {
        pJson.video = attachCloudFrontUrl(pJson.video);
      }
      return processHostImages(pJson);
    });

    await setCache(cacheKey, processedProps, 300);

    return res.json({ success: true, properties: processedProps });

  } catch (err) {
    console.error("GET MY LISTINGS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


export const softDeleteProperty = async (req, res) => {
  try {
    if (!req.property) {
      return res.status(500).json({ message: "Property not loaded" });
    }

    const property = req.property;
    const userId = req.user.id;
    const reason = req.body?.reason || null;

    await property.update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: userId,
      delete_reason: reason
    });

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`user_listings:${userId}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

    return res.json({
      success: true,
      message: "Property deleted safely"
    });

  } catch (err) {
    console.error("SOFT DELETE PROPERTY ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};





// FRONTEND APPROVED LISTINGS
export const getApprovedListings = async (req, res) => {
  try {
    const now = new Date();

    const country =
      req.headers["x-country"] || req.query.country || null;
    const state =
      req.headers["x-state"] || req.query.state || null;
    const city =
      req.headers["x-city"] || req.query.city || null;
    const zip_code =
      req.headers["x-zip-code"] || req.query.zip_code || null;

    const cacheKey =
      `approved_listings:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    // ✅ HARD visibility rules
    const where = {
      is_deleted: false,
      status: "approved",
      is_expired: false,
      listing_expires_at: {
        [Op.gt]: now
      }
    };

    if (country) where.country = country;
    if (state) where.state = state;
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    const properties = await Property.findAll({
      where,
      include: [
        {
          model: Host,
          // ADD "whatsapp", "instagram", "facebook" here
          attributes: ["id", "full_name", "phone", "whatsapp", "instagram", "facebook"],
          include: [
            {
              model: User,
              // ADD "profile_image" here
              attributes: ["id", "email", "profile_image"]
            }
          ]
        }
      ],
      order: [["created_at", "DESC"]]
    });

    const processedProps = properties.map(p => {
      const pJson = p.toJSON();
      if (pJson.photos) {
        pJson.photos = pJson.photos.map(attachCloudFrontUrl);
      }
      if (pJson.video) {
        pJson.video = attachCloudFrontUrl(pJson.video);
      }
      return processHostImages(pJson);
    });

    await setCache(cacheKey, processedProps, 300);

    return res.json({ success: true, properties: processedProps });

  } catch (err) {
    console.error("❌ getApprovedListings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};




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
      is_deleted: false,
      [Op.or]: [
        // 🔴 Pending = unverified (always visible)
        { status: "pending" },

        // 🟢 Approved = visible only within 15 days
        {
          status: "approved",
          is_expired: false,
          listing_expires_at: {
            [Op.gt]: new Date()
          }
        }
      ]
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
          // ADD "whatsapp", "instagram", "facebook" here
          attributes: ["id", "full_name", "phone", "whatsapp", "instagram", "facebook"],
          include: [
            {
              model: User,
              // ADD "profile_image" here
              attributes: ["id", "email", "profile_image"]
            }
          ]
        }
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]]
    });

    const processedProps = rows.map(p => {
      const pJson = p.toJSON();
      if (pJson.photos) {
        pJson.photos = pJson.photos.map(attachCloudFrontUrl);
      }
      if (pJson.video) {
        pJson.video = attachCloudFrontUrl(pJson.video);
      }
      return processHostImages(pJson);
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
      data: processedProps
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
    const { id } = req.params;
    const now = new Date();

    const cacheKey = `property:public:${id}`;

    // ===== CACHE =====
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, property: cached });
    }

    // ===== DB FETCH =====
    const property = await Property.findOne({
      where: {
        id,
        is_deleted: false,
        [Op.or]: [
          { status: "pending" }, // ✅ PUBLIC pending
          {
            status: "approved",
            is_expired: false,
            listing_expires_at: { [Op.gt]: now }
          }
        ]
      },
      include: [
        {
          model: Host,
          required: false, // IMPORTANT
          attributes: [
            "id",
            "full_name",
            "phone",
            "status",
            "whatsapp",
            "instagram",
            "facebook"
          ],
          include: [
            {
              model: User,
              required: false,
              attributes: ["id", "email", "profile_image"]
            }
          ]
        }
      ]
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not available"
      });
    }

    // ===== NORMALIZE SHAPE (CRITICAL) =====
    const plain = property.get({ plain: true });

    plain.Host = plain.Host || {
      id: null,
      full_name: "Property Host",
      phone: "",
      whatsapp: "",
      instagram: "",
      facebook: "",
      status: "pending",
      User: {
        id: null,
        email: "",
        profile_image: null
      }
    };

    plain.Host.User = plain.Host.User || {
      id: null,
      email: "",
      profile_image: null
    };

    // ===== ANALYTICS =====
    AnalyticsEvent.create({
      event_type: "PROPERTY_VIEWED",
      user_id: req.user?.id || null,
      property_id: id,
      country: req.headers["x-country"] || plain.country || null,
      state: req.headers["x-state"] || plain.state || null,
      created_at: new Date()
    }).catch(() => { });

    if (plain.photos) plain.photos = plain.photos.map(attachCloudFrontUrl);
    if (plain.video) plain.video = attachCloudFrontUrl(plain.video);
    const processedPlain = processHostImages(plain);

    // ===== CACHE SAFE DATA =====
    await setCache(cacheKey, processedPlain, 30);

    return res.json({ success: true, property: processedPlain });

  } catch (err) {
    console.error("GET PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



