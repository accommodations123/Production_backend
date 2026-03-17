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

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts.length > 0 ? hosts[0] : null;

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
      user_id: userId,
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

    await Property.update({ id: property.id }, {
      title: req.body.title,
      description: req.body.description,
      guests: req.body.guests,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      pets_allowed: req.body.petsAllowed,
      area: req.body.area
    });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });
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

    await Property.update({ id: property.id }, {
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      zip_code: req.body.zip_code || null,
      street_address: req.body.street_address
    });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });

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
    const oldPhotos = property.photos || [];
    const updatedPhotos = [...oldPhotos, ...newUrls];

    await Property.update({ id: property.id }, { photos: updatedPhotos });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });
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

    await Property.update({ id: property.id }, { video: req.file.location });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });
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

    await Property.update({ id: property.id }, { amenities: req.body.amenities || [] });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);
    await deleteCacheByPrefix("approved_listings:");
    await deleteCacheByPrefix("all_properties:");

    return res.json({ success: true, property: updated });

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

    await Property.update({ id: property.id }, { rules: req.body.rules || [] });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });

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

    await Property.update({ id: property.id }, {
      price_per_hour: req.body.pricePerHour,
      price_per_night: req.body.pricePerNight,
      price_per_month: req.body.pricePerMonth,
      currency: req.body.currency
    });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });

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

    if (!property) {
      return res.status(404).json({ message: "Not found" });
    }

    await Property.update({ id: property.id }, { status: "pending" });

    AnalyticsEvent.create({
      event_type: "PROPERTY_SUBMITTED",
      user_id: property.user_id,
      host_id: property.host_id,
      property_id: property.id,
      country: req.headers["x-country"] || property.country || null,
      created_at: new Date().toISOString()
    }).catch(err => {
      console.error("ANALYTICS EVENT FAILED:", err);
    });

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, message: "Submitted to admin" });

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// GET HOST LISTINGS
export const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;

    const hosts = await Host.query("user_id").eq(userId).exec();
    const host = hosts.length > 0 ? hosts[0] : null;

    if (!host) {
      return res.json({ success: true, properties: [] });
    }

    const cacheKey = `host_listings:${host.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    let properties = await Property.query("host_id").eq(host.id).exec();

    // Filter non-deleted and sort
    properties = properties
      .filter(p => !p.is_deleted)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const processedProps = properties.map(p => {
      const pObj = { ...p };
      if (pObj.photos) {
        pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      }
      if (pObj.video) {
        pObj.video = attachCloudFrontUrl(pObj.video);
      }
      return processHostImages(pObj);
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

    await Property.update({ id: property.id }, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
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

    const country = req.headers["x-country"] || req.query.country || null;
    const state = req.headers["x-state"] || req.query.state || null;
    const city = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;

    const cacheKey = `approved_listings:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, properties: cached });
    }

    // Query by status GSI
    let properties = await Property.query("status").eq("approved").exec();

    // Client-side filters
    properties = properties.filter(p =>
      !p.is_deleted &&
      !p.is_expired &&
      p.listing_expires_at &&
      new Date(p.listing_expires_at) > now
    );

    if (country) properties = properties.filter(p => p.country === country);
    if (state) properties = properties.filter(p => p.state === state);
    if (city) properties = properties.filter(p => p.city === city);
    if (zip_code) properties = properties.filter(p => p.zip_code === zip_code);

    // Sort by created_at DESC
    properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch host and user data
    const processedProps = await Promise.all(properties.map(async (p) => {
      const pObj = { ...p };
      const host = await Host.get(p.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        pObj.Host = {
          id: host.id,
          full_name: host.full_name,
          phone: host.phone,
          whatsapp: host.whatsapp,
          instagram: host.instagram,
          facebook: host.facebook,
          User: user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null
        };
      }
      if (pObj.photos) pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      if (pObj.video) pObj.video = attachCloudFrontUrl(pObj.video);
      return processHostImages(pObj);
    }));

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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const country = req.headers["x-country"] || req.query.country || null;
    const state = req.headers["x-state"] || req.query.state || null;
    const city = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;
    const { minPrice, maxPrice } = req.query;

    const cacheKey = `all_properties:${page}:${limit}:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${minPrice || 0}:${maxPrice || 0}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Scan all properties (DynamoDB doesn't support OR in queries easily)
    let allProperties = await Property.scan().exec();

    const now = new Date();

    // Apply filters
    allProperties = allProperties.filter(p => {
      if (p.is_deleted) return false;
      if (p.status === "pending") return true;
      if (p.status === "approved" && !p.is_expired && p.listing_expires_at && new Date(p.listing_expires_at) > now) return true;
      return false;
    });

    if (country) allProperties = allProperties.filter(p => p.country === country);
    if (state) allProperties = allProperties.filter(p => p.state === state);
    if (city) allProperties = allProperties.filter(p => p.city === city);
    if (zip_code) allProperties = allProperties.filter(p => p.zip_code === zip_code);

    if (minPrice) allProperties = allProperties.filter(p => (p.price_per_month || 0) >= Number(minPrice));
    if (maxPrice) allProperties = allProperties.filter(p => (p.price_per_month || 0) <= Number(maxPrice));

    // Sort
    allProperties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const count = allProperties.length;
    const offset = (page - 1) * limit;
    const paged = allProperties.slice(offset, offset + limit);

    // Fetch host and user data
    const processedProps = await Promise.all(paged.map(async (p) => {
      const pObj = { ...p };
      const host = await Host.get(p.host_id);
      if (host) {
        const user = await User.get(host.user_id);
        pObj.Host = {
          id: host.id,
          full_name: host.full_name,
          phone: host.phone,
          whatsapp: host.whatsapp,
          instagram: host.instagram,
          facebook: host.facebook,
          User: user ? { id: user.id, email: user.email, profile_image: user.profile_image } : null
        };
      }
      if (pObj.photos) pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      if (pObj.video) pObj.video = attachCloudFrontUrl(pObj.video);
      return processHostImages(pObj);
    }));

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

    const cacheKey = `property:public:${id}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, property: cached });
    }

    const property = await Property.get(id);

    if (!property || property.is_deleted) {
      return res.status(404).json({
        success: false,
        message: "Property not available"
      });
    }

    const now = new Date();
    // Check visibility
    if (property.status !== "pending" &&
      !(property.status === "approved" && !property.is_expired &&
        property.listing_expires_at && new Date(property.listing_expires_at) > now)) {
      return res.status(404).json({
        success: false,
        message: "Property not available"
      });
    }

    const plain = { ...property };

    // Fetch host and user
    const host = await Host.get(property.host_id);
    if (host) {
      const user = await User.get(host.user_id);
      plain.Host = {
        id: host.id,
        full_name: host.full_name,
        phone: host.phone,
        status: host.status,
        whatsapp: host.whatsapp,
        instagram: host.instagram,
        facebook: host.facebook,
        User: user ? { id: user.id, email: user.email, profile_image: user.profile_image } : {
          id: null, email: "", profile_image: null
        }
      };
    } else {
      plain.Host = {
        id: null,
        full_name: "Property Host",
        phone: "",
        whatsapp: "",
        instagram: "",
        facebook: "",
        status: "pending",
        User: { id: null, email: "", profile_image: null }
      };
    }

    // ===== ANALYTICS =====
    AnalyticsEvent.create({
      event_type: "PROPERTY_VIEWED",
      user_id: req.user?.id || null,
      property_id: id,
      country: req.headers["x-country"] || plain.country || null,
      state: req.headers["x-state"] || plain.state || null,
      created_at: new Date().toISOString()
    }).catch(() => { });

    if (plain.photos) plain.photos = plain.photos.map(attachCloudFrontUrl);
    if (plain.video) plain.video = attachCloudFrontUrl(plain.video);
    const processedPlain = processHostImages(plain);

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
