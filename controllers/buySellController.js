import BuySellListing from "../model/BuySellListing.js";
import User from "../model/User.js";
import Host from "../model/Host.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { attachCloudFrontUrl } from "../utils/imageUtils.js";

/* =====================================================================
   HELPERS
   ===================================================================== */
function extractS3Key(urlOrKey) {
    if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;
    
    const cloudFrontBase = process.env.CLOUDFRONT_URL || 'https://d3dqp3l6ug81j3.cloudfront.net';
    const cleanCFBase = cloudFrontBase.endsWith('/') ? cloudFrontBase.slice(0, -1) : cloudFrontBase;
    
    if (urlOrKey.startsWith(cleanCFBase)) {
        return urlOrKey.substring(cleanCFBase.length + 1);
    }
    
    if (urlOrKey.includes('.amazonaws.com/')) {
        return urlOrKey.replace(/^https?:\/\/[^/]+\//, '');
    }
    
    return urlOrKey;
}

async function enrichListingsWithSellerInfo(listings) {
    if (!listings || listings.length === 0) return [];

    const userIds = [...new Set(listings.map(l => l.user_id).filter(Boolean))];
    
    const hostQueries = userIds.map(async uid => {
        try {
            const hosts = await Host.query("user_id").eq(uid).exec();
            return { uid, host: hosts?.[0] || null };
        } catch (err) {
            console.error(`Failed to fetch host for user ${uid}:`, err);
            return { uid, host: null };
        }
    });

    const queryResults = await Promise.all(hostQueries);
    const hostMap = {};
    for (const res of queryResults) {
        if (res.host) {
            hostMap[res.uid] = res.host;
        }
    }

    return listings.map(listing => {
        const l = JSON.parse(JSON.stringify(listing));
        if (l.images) l.images = l.images.map(attachCloudFrontUrl);
        
        const host = hostMap[l.user_id];
        if (host) {
            l.sellerInstagram = host.instagram || "";
            l.sellerFacebook = host.facebook || "";
            l.sellerEmail = host.email || l.email || "";
            l.sellerPhone = host.phone || l.phone || "";
            l.sellerWhatsapp = host.whatsapp || "";
        } else {
            l.sellerInstagram = "";
            l.sellerFacebook = "";
            l.sellerEmail = l.email || "";
            l.sellerPhone = l.phone || "";
            l.sellerWhatsapp = "";
        }
        return l;
    });
}

/* =========================
   CREATE LISTING (User)
========================= */
export const createBuySellListing = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;
        const user = await User.get(userId);

        if (!user || !user.email) {
            return res.status(400).json({ message: "User email not found" });
        }

        const {
            title, category, subcategory, price, description,
            country, state, city, zip_code, street_address, name, phone,
            condition, make, model, year, mileage, fuel_type, transmission
        } = req.body;

        if (!title || !category || !subcategory || !condition || !price || !description || !country || !state || !city || !street_address || !name || !phone) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const galleryImages = req.files?.map(file => file.key || file.location) || [];
        const cleanImages = galleryImages.map(extractS3Key);

        const listingData = {
            user_id: userId, title, category, subcategory, condition,
            price: Number(price), // FormData sends strings; DynamoDB model expects Number
            description, country, state, city, street_address,
            name, email: user.email, phone, images: cleanImages, status: "pending"
        };
        if (zip_code) listingData.zip_code = zip_code;

        if (category === "Vehicles") {
            if (make) listingData.make = make;
            if (model) listingData.model = model;
            if (year) listingData.year = year;
            if (mileage) listingData.mileage = mileage;
            if (fuel_type) listingData.fuel_type = fuel_type;
            if (transmission) listingData.transmission = transmission;
        }

        const listing = await BuySellListing.create(listingData);

        return res.status(201).json({ success: true, message: "Listing submitted for approval", listing });

    } catch (err) {
        console.error("CREATE BUY SELL ERROR:", err);
        return res.status(500).json({ message: err.message });
    }
};

/* =========================
   GET ACTIVE LISTINGS (Public)
========================= */
export const getActiveBuySellListings = async (req, res) => {
    try {
        console.log("GET ACTIVE BUY-SELL LISTINGS REQ QUERY:", req.query);
        console.log("GET ACTIVE BUY-SELL LISTINGS REQ HEADERS:", {
            "x-country": req.headers["x-country"],
            "x-state": req.headers["x-state"],
            "x-city": req.headers["x-city"]
        });
        // 100% robust country/state/city resolution: query parameter takes strict priority to bypass CDN header injection
        let country = req.query.country || null;
        if (!country) {
            const rawHeader = req.headers["x-country"] || null;
            // Only fall back to header country if it is a full name, not a CDN geo-code like 'IN' / 'US'
            if (rawHeader && rawHeader.trim().length > 2) {
                country = rawHeader;
            }
        }

        const state = req.query.state || req.headers["x-state"] || null;
        const city = req.query.city || req.headers["x-city"] || null;
        const zip_code = req.query.zip_code || req.headers["x-zip-code"] || null;
        const category = req.query.category || null;
        const minPrice = req.query.minPrice || null;
        const maxPrice = req.query.maxPrice || null;
        const search = req.query.search || null;
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const offset = (page - 1) * limit;

        // Normalize country names helper (maps geo codes & varying spellings)
        const normalizeCountryName = (cName) => {
            if (!cName) return "";
            const norm = cName.toString().trim().toUpperCase();
            if (norm === "IN" || norm === "INDIA") return "india";
            if (norm === "US" || norm === "USA" || norm === "UNITED STATES" || norm === "UNITED STATES OF AMERICA") {
                return "united states of america";
            }
            return norm.toLowerCase();
        };

        const cacheKey = `active_buy_sell:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${category || "all"}:${minPrice || 0}:${maxPrice || 0}:${search || "none"}:${page}:${limit}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json(cached.listings ? cached : { success: true, listings: cached });
        }

        // Query by status GSI
        let listings = await BuySellListing.query("status").eq("active").exec();

        console.log("ALL ACTIVE LISTINGS FROM DYNAMODB:", listings.map(l => ({ title: l.title, country: l.country, state: l.state, city: l.city })));

        // Client-side filtering with robust case-insensitive comparisons
        if (country) {
            const filterCountry = normalizeCountryName(country);
            listings = listings.filter(l => {
                const dbCountry = normalizeCountryName(l.country);
                const match = dbCountry === filterCountry;
                console.log(`Country Match [${l.title}]: DB='${l.country}', Filter='${country}' => ${match}`);
                return match;
            });
        }
        if (state) {
            listings = listings.filter(l => {
                const match = l.state?.toLowerCase().trim() === state.toLowerCase().trim();
                console.log(`State Match [${l.title}]: DB='${l.state}', Filter='${state}' => ${match}`);
                return match;
            });
        }
        if (city) {
            listings = listings.filter(l => {
                const match = l.city?.toLowerCase().trim() === city.toLowerCase().trim();
                console.log(`City Match [${l.title}]: DB='${l.city}', Filter='${city}' => ${match}`);
                return match;
            });
        }
        if (zip_code) listings = listings.filter(l => l.zip_code?.toLowerCase().trim() === zip_code.toLowerCase().trim());
        if (category) listings = listings.filter(l => l.category?.toLowerCase() === category.toLowerCase());
        if (minPrice) listings = listings.filter(l => Number(l.price) >= Number(minPrice));
        if (maxPrice) listings = listings.filter(l => Number(l.price) <= Number(maxPrice));
        if (search) {
            const searchLower = search.toLowerCase();
            listings = listings.filter(l => l.title?.toLowerCase().includes(searchLower));
        }

        // Sort + limit
        listings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const count = listings.length;
        const paginatedListings = listings.slice(offset, offset + limit);

        const processedListings = await enrichListingsWithSellerInfo(paginatedListings);

        const responseData = {
            success: true,
            listings: processedListings,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        };
        await setCache(cacheKey, responseData, 300);
        return res.json(responseData);

    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch listings" });
    }
};

/* =========================
   GET SINGLE LISTING
========================= */
export const getBuySellListingById = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);

        if (!listing || listing.status !== "active") {
            return res.status(404).json({ message: "Listing not found" });
        }

        const processedListing = JSON.parse(JSON.stringify(listing));
        if (processedListing.images) {
            processedListing.images = processedListing.images.map(attachCloudFrontUrl);
        }

        // Fetch seller's host profile for additional contact details
        try {
            const hosts = await Host.query("user_id").eq(processedListing.user_id).exec();
            const host = hosts?.[0];
            if (host) {
                processedListing.sellerInstagram = host.instagram || "";
                processedListing.sellerFacebook = host.facebook || "";
                processedListing.sellerEmail = host.email || processedListing.email || "";
                processedListing.sellerPhone = host.phone || processedListing.phone || "";
            }
        } catch (hostErr) {
            console.error("Failed to enrich listing with host profile:", hostErr);
        }

        return res.json({ success: true, listing: processedListing });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch listing" });
    }
};

/* =========================
   USER DASHBOARD LISTINGS
========================= */
export const getMyBuySellListings = async (req, res) => {
    try {
        // Query by user_id GSI
        let listings = await BuySellListing.query("user_id").eq(req.user.id).exec();
        listings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const processedListings = await enrichListingsWithSellerInfo(listings);

        return res.json({ success: true, listings: processedListings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch user listings" });
    }
};

/* =========================
   UPDATE LISTING (Owner only)
========================= */
export const updateBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);

        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.user_id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (listing.status === "blocked") {
            return res.status(400).json({ message: "Blocked listings cannot be edited" });
        }

        const allowed = [
            "title", "category", "subcategory", "description", "state", "city", "zip_code", "street_address",
            "condition", "make", "model", "year", "mileage", "fuel_type", "transmission"
        ];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        if (req.body.price !== undefined) {
            updates.price = Number(req.body.price);
        }

        // Merge images
        const cloudFrontBase = process.env.CLOUDFRONT_URL || 'https://d3dqp3l6ug81j3.cloudfront.net';
        const cleanCFBase = cloudFrontBase.endsWith('/') ? cloudFrontBase.slice(0, -1) : cloudFrontBase;
        const s3Base = process.env.AWS_BUCKET && process.env.AWS_REGION 
          ? `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com` 
          : null;

        let existingImages = [];
        if (req.body.existingImages) {
            try {
                const parsed = typeof req.body.existingImages === "string" 
                    ? JSON.parse(req.body.existingImages) 
                    : req.body.existingImages;
                if (Array.isArray(parsed)) {
                    existingImages = parsed.map(extractS3Key);
                }
            } catch (e) {
                console.error("Failed to parse existingImages:", e);
            }
        } else if (listing.images) {
            existingImages = listing.images.map(extractS3Key);
        }

        const newUploadedImages = req.files?.map(file => file.key || file.location) || [];
        updates.images = [...existingImages, ...newUploadedImages.map(extractS3Key)];

        await BuySellListing.update({ id: listing.id }, updates);
        
        // Clear active listings cache
        await deleteCacheByPrefix("active_buy_sell").catch(err => console.error("Cache clear failed:", err));

        const updated = await BuySellListing.get(listing.id);

        const processedListing = { ...updated };
        if (processedListing.images) {
            processedListing.images = processedListing.images.map(attachCloudFrontUrl);
        }

        return res.json({ success: true, listing: processedListing });
    } catch (err) {
        console.error("Failed to update listing:", err);
        return res.status(500).json({ message: "Failed to update listing" });
    }
};

/* =========================
   MARK AS SOLD
========================= */
export const markBuySellAsSold = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });
        if (listing.user_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

        await BuySellListing.update({ id: listing.id }, { status: "sold" });
        return res.json({ success: true, message: "Listing marked as sold" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to update status" });
    }
};

/* =========================
   DELETE LISTING
========================= */
export const deleteBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });
        if (listing.user_id !== req.user.id) return res.status(403).json({ message: "Unauthorized" });

        await BuySellListing.update({ id: listing.id }, { status: "hidden" });
        return res.json({ success: true, message: "Listing removed successfully" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to remove listing" });
    }
};

/* =========================
   ADMIN: PENDING LISTINGS
========================= */
export const getPendingBuySellListings = async (req, res) => {
    try {
        const country = req.query.country || null;
        const state = req.query.state || null;

        const cacheKey = `pending_buy_sell:${country || "all"}:${state || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        // Query by status GSI
        let listings = await BuySellListing.query("status").eq("pending").exec();

        if (country) listings = listings.filter(l => l.country === country);
        if (state) listings = listings.filter(l => l.state === state);

        // Sort ascending (oldest first for review)
        listings.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        // Enrich with user data and host details
        const processedListings = await Promise.all(listings.map(async listing => {
            const l = JSON.parse(JSON.stringify(listing));
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            // Fetch user info
            const user = await User.get(l.user_id).catch(() => null);
            l.User = user ? { id: user.id, email: user.email } : null;

            // Fetch host info for seller details
            try {
                const hosts = await Host.query("user_id").eq(l.user_id).exec();
                const host = hosts?.[0];
                if (host) {
                    l.sellerInstagram = host.instagram || "";
                    l.sellerFacebook = host.facebook || "";
                    l.sellerEmail = host.email || l.email || user?.email || "";
                    l.sellerPhone = host.phone || l.phone || "";
                    l.sellerWhatsapp = host.whatsapp || "";
                } else {
                    l.sellerInstagram = "";
                    l.sellerFacebook = "";
                    l.sellerEmail = l.email || user?.email || "";
                    l.sellerPhone = l.phone || "";
                    l.sellerWhatsapp = "";
                }
            } catch (err) {
                console.error(`Failed to fetch host for user ${l.user_id}:`, err);
                l.sellerInstagram = "";
                l.sellerFacebook = "";
                l.sellerEmail = l.email || user?.email || "";
                l.sellerPhone = l.phone || "";
                l.sellerWhatsapp = "";
            }
            return l;
        }));

        await setCache(cacheKey, processedListings, 300);
        return res.json({ success: true, listings: processedListings });

    } catch (err) {
        console.error("GET PENDING BUY SELL ERROR:", err);
        return res.status(500).json({ message: "Failed to fetch pending listings" });
    }
};

/* =========================
   APPROVE LISTING
========================= */
export const approveBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        await BuySellListing.update({ id: listing.id }, { status: "active" });

        logAudit({
            action: "BUYSELL_LISTING_APPROVED",
            actor: { id: req.admin?.id || "system", role: "admin" },
            target: { type: "buy_sell_listing", id: listing.id },
            severity: "MEDIUM", req
        }).catch(console.error);

        AnalyticsEvent.create({
            event_type: "BUYSELL_LISTING_APPROVED",
            user_id: req.admin?.id || "system",
            country: listing.country || undefined
        }).catch(console.error);

        // Notify owner
        const user = await User.get(listing.user_id);
        if (user?.email) {
            try {
                await notifyAndEmail({
                    userId: user.id, email: user.email,
                    type: NOTIFICATION_TYPES.BUYSELL_APPROVED,
                    title: "Listing approved",
                    message: "Your buy/sell listing has been approved.",
                    metadata: { listingId: listing.id }
                });
            } catch (err) { console.error("Failed to notify user:", err); }
        }

        try {
            await deleteCacheByPrefix("pending_buy_sell");
            await deleteCacheByPrefix("active_buy_sell");
            await deleteCacheByPrefix("admin:buy_sell");
        } catch (err) { console.error("Cache clear failed:", err); }

        return res.json({ success: true, message: "Listing approved" });
    } catch (err) {
        console.error("APPROVE BUYSELL ERROR:", err);
        return res.status(500).json({ message: "Failed to approve listing" });
    }
};

/* =========================
   BLOCK LISTING
========================= */
export const blockBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.get(req.params.id);
        if (!listing) return res.status(404).json({ message: "Listing not found" });

        await BuySellListing.update({ id: listing.id }, { status: "blocked" });

        logAudit({
            action: "BUYSELL_LISTING_BLOCKED",
            actor: { id: req.admin?.id || "system", role: "admin" },
            target: { type: "buy_sell_listing", id: listing.id },
            severity: "HIGH", req
        }).catch(console.error);

        AnalyticsEvent.create({
            event_type: "BUYSELL_LISTING_BLOCKED",
            user_id: req.admin?.id || "system",
            country: listing.country || undefined
        }).catch(console.error);

        const user = await User.get(listing.user_id);
        if (user?.email) {
            try {
                await notifyAndEmail({
                    userId: user.id, email: user.email,
                    type: NOTIFICATION_TYPES.BUYSELL_REJECTED,
                    title: "Listing blocked",
                    message: "Your buy/sell listing was blocked by admin.",
                    metadata: { listingId: listing.id }
                });
            } catch (err) { console.error("Failed to notify user:", err); }
        }

        try {
            await deleteCacheByPrefix("pending_buy_sell");
            await deleteCacheByPrefix("active_buy_sell");
            await deleteCacheByPrefix("admin:buy_sell");
        } catch (err) { console.error("Cache clear failed:", err); }

        return res.json({ success: true, message: "Listing blocked" });
    } catch (err) {
        return res.status(500).json({ message: "Failed to block listing" });
    }
};

/* =========================
   ADMIN: APPROVED LISTINGS
========================= */
export const getAdminApprovedBuySellListings = async (req, res) => {
    try {
        const { country, state } = req.query;
        const cacheKey = `admin:buy_sell:approved:${country || "all"}:${state || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json({ success: true, listings: cached });

        let listings = await BuySellListing.query("status").eq("active").exec();
        if (country) listings = listings.filter(l => l.country === country);
        if (state) listings = listings.filter(l => l.state === state);
        listings.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

        const processedListings = await Promise.all(listings.map(async listing => {
            const l = JSON.parse(JSON.stringify(listing));
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            const user = await User.get(l.user_id).catch(() => null);
            l.User = user ? { id: user.id, email: user.email } : null;

            // Fetch host info for seller details
            try {
                const hosts = await Host.query("user_id").eq(l.user_id).exec();
                const host = hosts?.[0];
                if (host) {
                    l.sellerInstagram = host.instagram || "";
                    l.sellerFacebook = host.facebook || "";
                    l.sellerEmail = host.email || l.email || user?.email || "";
                    l.sellerPhone = host.phone || l.phone || "";
                    l.sellerWhatsapp = host.whatsapp || "";
                } else {
                    l.sellerInstagram = "";
                    l.sellerFacebook = "";
                    l.sellerEmail = l.email || user?.email || "";
                    l.sellerPhone = l.phone || "";
                    l.sellerWhatsapp = "";
                }
            } catch (err) {
                console.error(`Failed to fetch host for user ${l.user_id}:`, err);
                l.sellerInstagram = "";
                l.sellerFacebook = "";
                l.sellerEmail = l.email || user?.email || "";
                l.sellerPhone = l.phone || "";
                l.sellerWhatsapp = "";
            }
            return l;
        }));

        await setCache(cacheKey, processedListings, 300);
        return res.json({ success: true, listings: processedListings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch approved listings" });
    }
};

/* =========================
   ADMIN: BLOCKED LISTINGS
========================= */
export const getAdminBlockedBuySellListings = async (req, res) => {
    try {
        const { country, state } = req.query;
        const cacheKey = `admin:buy_sell:blocked:${country || "all"}:${state || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) return res.json({ success: true, listings: cached });

        let listings = await BuySellListing.query("status").eq("blocked").exec();
        if (country) listings = listings.filter(l => l.country === country);
        if (state) listings = listings.filter(l => l.state === state);
        listings.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

        const processedListings = await Promise.all(listings.map(async listing => {
            const l = JSON.parse(JSON.stringify(listing));
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            const user = await User.get(l.user_id).catch(() => null);
            l.User = user ? { id: user.id, email: user.email } : null;

            // Fetch host info for seller details
            try {
                const hosts = await Host.query("user_id").eq(l.user_id).exec();
                const host = hosts?.[0];
                if (host) {
                    l.sellerInstagram = host.instagram || "";
                    l.sellerFacebook = host.facebook || "";
                    l.sellerEmail = host.email || l.email || user?.email || "";
                    l.sellerPhone = host.phone || l.phone || "";
                    l.sellerWhatsapp = host.whatsapp || "";
                } else {
                    l.sellerInstagram = "";
                    l.sellerFacebook = "";
                    l.sellerEmail = l.email || user?.email || "";
                    l.sellerPhone = l.phone || "";
                    l.sellerWhatsapp = "";
                }
            } catch (err) {
                console.error(`Failed to fetch host for user ${l.user_id}:`, err);
                l.sellerInstagram = "";
                l.sellerFacebook = "";
                l.sellerEmail = l.email || user?.email || "";
                l.sellerPhone = l.phone || "";
                l.sellerWhatsapp = "";
            }
            return l;
        }));

        await setCache(cacheKey, processedListings, 300);
        return res.json({ success: true, listings: processedListings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch blocked listings" });
    }
};
