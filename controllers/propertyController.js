import Property from "../model/Property.js";
import User from "../model/User.js";
import Host from "../model/Host.js";
import jwt from "jsonwebtoken";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../services/cacheService.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";
import { batchGetHosts, batchGetUsers } from "../utils/batchUtils.js";
import { checkContactAccess } from "../utils/contactAccess.js";


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
      country: req.headers["x-country"] || undefined
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

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      guests: req.body.guests,
      bedrooms: req.body.bedrooms,
      bathrooms: req.body.bathrooms,
      pets_allowed: req.body.petsAllowed,
      area: req.body.area,
      category_id: req.body.categoryId || req.body.category_id,
      property_type: req.body.propertyType || req.body.property_type,
      privacy_type: req.body.privacyType || req.body.privacy_type
    };

    // Remove undefined/null values to avoid Dynamoose errors and maintain database purity
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
      }
    });

    await Property.update({ id: property.id }, updateData);

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });
  } catch (err) {
    console.error("SAVE BASIC INFO ERROR:", err);
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

    const updateData = {
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      street_address: req.body.street_address || req.body.address,
      zip_code: req.body.zip_code || req.body.pincode || "",
      location_privacy: req.body.location_privacy || req.body.locationPrivacy || "approximate"
    };

    if (req.body.latitude !== undefined && req.body.latitude !== null && !isNaN(Number(req.body.latitude))) {
      updateData.latitude = Number(req.body.latitude);
    }

    if (req.body.longitude !== undefined && req.body.longitude !== null && !isNaN(Number(req.body.longitude))) {
      updateData.longitude = Number(req.body.longitude);
    }

    // Remove undefined or null values to avoid Dynamoose schema validation errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) delete updateData[key];
    });

    await Property.update({ id: property.id }, updateData);

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });

  } catch (err) {
    console.error("Error in saveAddress:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
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

    const newUrls = req.files.map(file => file.location || file.path || file.key || "").filter(Boolean);
    const oldPhotos = Array.isArray(property.photos) ? property.photos : [];
    const updatedPhotos = [...oldPhotos, ...newUrls];

    await Property.update({ id: property.id }, { photos: updatedPhotos });

    const updated = await Property.get(property.id);

    await deleteCache(`property:${property.id}`);
    await deleteCacheByPrefix(`host_listings:${property.host_id}`);

    return res.json({ success: true, property: updated });
  } catch (err) {
    console.error("Error in saveMedia:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
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

    const updateData = {
      price_per_hour: req.body.pricePerHour !== undefined && req.body.pricePerHour !== null ? Number(req.body.pricePerHour) : null,
      price_per_night: req.body.pricePerNight !== undefined && req.body.pricePerNight !== null ? Number(req.body.pricePerNight) : null,
      price_per_week: req.body.pricePerWeek !== undefined && req.body.pricePerWeek !== null ? Number(req.body.pricePerWeek) : (req.body.price_per_week !== undefined && req.body.price_per_week !== null ? Number(req.body.price_per_week) : null),
      price_per_month: req.body.pricePerMonth !== undefined && req.body.pricePerMonth !== null ? Number(req.body.pricePerMonth) : null,
      currency: req.body.currency
    };

    // Remove undefined values to avoid Dynamoose errors
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    await Property.update({ id: property.id }, updateData);

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
      country: req.headers["x-country"] || property.country || undefined,
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

    const now = Date.now();
    const processedProps = properties.map(p => {
      const pObj = { ...p };
      if (pObj.listing_expires_at && new Date(pObj.listing_expires_at).getTime() < now) {
        pObj.is_expired = true;
      }
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

    const updateData = {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    };
    if (reason) updateData.delete_reason = reason;

    await Property.update({ id: property.id }, updateData);

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
    const now = Date.now();

    const country = req.query.country || req.headers["x-country"] || null;
    const state = req.query.state || req.headers["x-state"] || null;
    const city = req.query.city || req.headers["x-city"] || null;
    const zip_code = req.query.zip_code || req.headers["x-zip-code"] || null;

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
      new Date(p.listing_expires_at).getTime() > now
    );

    if (country) properties = properties.filter(p => p.country?.toLowerCase().trim() === country.toLowerCase().trim());
    if (state) properties = properties.filter(p => p.state?.toLowerCase().trim() === state.toLowerCase().trim());
    if (city) properties = properties.filter(p => p.city?.toLowerCase().trim() === city.toLowerCase().trim());
    if (zip_code) properties = properties.filter(p => p.zip_code?.toLowerCase().trim() === zip_code.toLowerCase().trim());

    // Sort by created_at DESC
    properties.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Fetch host and user data manually in batch (optimized to resolve N+1 queries)
    const hostIds = Array.from(new Set(properties.map(p => p.host_id).filter(Boolean)));
    const hosts = await batchGetHosts(hostIds);
    const hostMap = new Map(hosts.map(h => [h.id, h]));

    const userIds = Array.from(new Set(hosts.map(h => h.user_id).filter(Boolean)));
    const users = await batchGetUsers(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    const processedProps = properties.map((p) => {
      const pObj = { ...p };
      if (pObj.host_id) {
        const host = hostMap.get(pObj.host_id);
        if (host) {
          const user = userMap.get(host.user_id);
          pObj.Host = {
            id: host.id,
            full_name: host.full_name,
            phone: "",
            whatsapp: "",
            instagram: "",
            facebook: "",
            User: user ? { id: user.id, email: "", profile_image: user.profile_image } : null
          };
        }
      }
      if (pObj.photos) pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      if (pObj.video) pObj.video = attachCloudFrontUrl(pObj.video);
      return processHostImages(pObj);
    });

    await setCache(cacheKey, processedProps, 300);

    return res.json({ success: true, properties: processedProps });

  } catch (err) {
    console.error("❌ getApprovedListings error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// PUBLIC — ALL PROPERTIES
// ──────────────────────────────────────────────────────────────────────────────
// Query Strategy:
//   - Primary query: GSI on `status` = "approved" (avoids full table scan).
//   - Post-query filters: country, state, city, zip_code, price range,
//     is_deleted, is_expired, listing_expires_at.
//
// Short-page problem:
//   DynamoDB's `limit` applies BEFORE post-query filters, so a single query
//   batch might return fewer than `limit` matching items. To compensate, we
//   LOOP the query — fetching up to `limit` raw items per batch from the GSI,
//   filtering in memory, and accumulating results — until we either have
//   `limit` filtered results or LastEvaluatedKey is null (index exhausted).
//
// Iteration cap: MAX_ITERATIONS prevents runaway loops if a very selective
//   filter (e.g., zip_code) matches almost nothing in a large table.
//
// TODO (future): For high-selectivity filters (country, state), consider
//   adding a composite GSI (e.g., status-country-index) so DynamoDB can
//   filter at the index level instead of in memory. This would eliminate
//   the looping and guarantee full pages in a single query.
// ──────────────────────────────────────────────────────────────────────────────
export const getAllPropertiesWithHosts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const country = req.query.country || req.headers["x-country"] || null;
    const state = req.query.state || req.headers["x-state"] || null;
    const city = req.query.city || req.headers["x-city"] || null;
    const zip_code = req.query.zip_code || req.headers["x-zip-code"] || null;
    const { minPrice, maxPrice } = req.query;

    const cacheKey = `all_properties:${req.query.startAt || "first"}:${limit}:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${minPrice || 0}:${maxPrice || 0}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let cursor = null;
    if (req.query.startAt) {
      try {
        cursor = JSON.parse(Buffer.from(req.query.startAt, "base64").toString("utf8"));
      } catch (e) {
        console.warn("Invalid startAt parameter ignored:", e.message);
      }
    }

    const now = Date.now();
    const MAX_ITERATIONS = 10; // Safety cap to bound worst-case latency
    const collected = [];      // Accumulated filtered results
    let iterations = 0;
    let exhausted = false;     // true when LastEvaluatedKey is null (no more items in index)

    // ── Loop: fetch batches from GSI until we have `limit` filtered results ──
    while (collected.length < limit && !exhausted && iterations < MAX_ITERATIONS) {
      iterations++;

      let query = Property.query("status").eq("approved").sort("descending");
      if (cursor) {
        query = query.startAt(cursor);
      }
      // Fetch `limit` raw items per batch (DynamoDB applies this before filters)
      query = query.limit(limit);

      const batch = await query.exec();

      // Update cursor for next iteration (or mark exhausted)
      if (batch.lastKey) {
        cursor = batch.lastKey;
      } else {
        exhausted = true;
      }

      // ── Apply in-memory filters ──
      for (const p of batch) {
        if (collected.length >= limit) break;

        // Exclude deleted, expired, or listings past their expiry date
        if (p.is_deleted) continue;
        if (p.is_expired) continue;
        if (p.listing_expires_at && new Date(p.listing_expires_at).getTime() <= now) continue;

        // Geographic filters
        if (country && p.country?.toLowerCase().trim() !== country.toLowerCase().trim()) continue;
        if (state && p.state?.toLowerCase().trim() !== state.toLowerCase().trim()) continue;
        if (city && p.city?.toLowerCase().trim() !== city.toLowerCase().trim()) continue;
        if (zip_code && p.zip_code?.toLowerCase().trim() !== zip_code.toLowerCase().trim()) continue;

        // Price filters
        if (minPrice && (p.price_per_month || 0) < Number(minPrice)) continue;
        if (maxPrice && (p.price_per_month || 0) > Number(maxPrice)) continue;

        collected.push(p);
      }
    }

    // ── Build the next-page cursor ──
    // If we exhausted the index, there are no more pages.
    // If we hit MAX_ITERATIONS without exhausting, pass the current cursor so
    // the client can continue paginating.
    const nextStartAt = exhausted
      ? null
      : (cursor ? Buffer.from(JSON.stringify(cursor)).toString("base64") : null);

    // ── Enrich with host + user data manually in batch (optimized to resolve N+1 queries) ──
    const hostIds = Array.from(new Set(collected.map(p => p.host_id).filter(Boolean)));
    const hosts = await batchGetHosts(hostIds);
    const hostMap = new Map(hosts.map(h => [h.id, h]));

    const userIds = Array.from(new Set(hosts.map(h => h.user_id).filter(Boolean)));
    const users = await batchGetUsers(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    const processedProps = collected.map((p) => {
      const pObj = { ...p };
      if (pObj.host_id) {
        const host = hostMap.get(pObj.host_id);
        if (host) {
          const user = userMap.get(host.user_id);
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
      }
      if (pObj.photos) pObj.photos = pObj.photos.map(attachCloudFrontUrl);
      if (pObj.video) pObj.video = attachCloudFrontUrl(pObj.video);
      return processHostImages(pObj);
    });

    const response = {
      success: true,
      meta: {
        limit,
        nextStartAt,
        // Expose iteration count for observability/debugging (safe — not sensitive)
        _queryIterations: iterations
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

    // Extract authorization details from cookies to verify access to non-approved properties
    let userId = null;
    let isAdmin = false;

    const userToken = req.cookies?.access_token;
    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          userId = String(decoded.id);
        }
      } catch (e) {
        // Token verification failed or expired
      }
    }

    const adminToken = req.cookies?.admin_access_token;
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
        if (decoded && decoded.id && ["super_admin", "admin", "recruiter"].includes(decoded.role)) {
          isAdmin = true;
        }
      } catch (e) {
        // Token verification failed or expired
      }
    }

    const requesterId = req.user?.id || userId || null;
    const now = Date.now();
    const isExpired = property.is_expired || (property.listing_expires_at && new Date(property.listing_expires_at).getTime() < now);
    const isApproved = property.status === "approved" && !isExpired;

    const isOwner = requesterId && String(property.user_id) === String(requesterId);

    if (!isApproved && !isOwner && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: "Property not available"
      });
    }

    const plain = { ...property };

    // Fetch host and user with contact access verification
    const host = await Host.get(property.host_id);
    const isHostOwner = isOwner || Boolean(host && requesterId && String(host.user_id) === String(requesterId));
    const hasContactAccess = isHostOwner || (requesterId ? await checkContactAccess({ requesterId, targetUserId: host?.user_id || property.host_id, itemId: property.id }) : false);

    if (host) {
      const user = await User.get(host.user_id);
      plain.Host = {
        id: host.id,
        full_name: host.full_name,
        phone: hasContactAccess ? host.phone : "",
        status: host.status,
        whatsapp: hasContactAccess ? host.whatsapp : "",
        instagram: hasContactAccess ? host.instagram : "",
        facebook: hasContactAccess ? host.facebook : "",
        User: user ? { id: user.id, email: hasContactAccess ? user.email : "", profile_image: user.profile_image } : null
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
      user_id: userId || undefined,
      property_id: id,
      country: req.headers["x-country"] || plain.country || undefined,
      state: req.headers["x-state"] || plain.state || undefined,
      created_at: new Date().toISOString()
    }).catch(() => { });

    if (plain.photos) plain.photos = plain.photos.map(attachCloudFrontUrl);
    if (plain.video) plain.video = attachCloudFrontUrl(plain.video);
    const processedPlain = processHostImages(plain);

    // Only cache approved properties publicly
    if (isApproved) {
      await setCache(cacheKey, processedPlain, 30);
    }

    return res.json({ success: true, property: processedPlain });

  } catch (err) {
    console.error("GET PROPERTY ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
