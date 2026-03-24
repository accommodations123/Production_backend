import BuySellListing from "../model/BuySellListing.js";
import User from "../model/User.js";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
import { attachCloudFrontUrl } from "../utils/imageUtils.js";

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
            country, state, city, zip_code, street_address, name, phone
        } = req.body;

        if (!title || !category || !price || !description || !country || !state || !city || !street_address || !name || !phone) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const galleryImages = req.files?.map(file => file.location) || [];

        const listingData = {
            user_id: userId, title, category, subcategory,
            price: Number(price), // FormData sends strings; DynamoDB model expects Number
            description, country, state, city, street_address,
            name, email: user.email, phone, images: galleryImages, status: "pending"
        };
        if (zip_code) listingData.zip_code = zip_code;

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
        const country = req.headers["x-country"] || req.query.country || null;
        const state = req.headers["x-state"] || req.query.state || null;
        const city = req.headers["x-city"] || req.query.city || null;
        const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;
        const { category, minPrice, maxPrice, search } = req.query;

        const cacheKey = `active_buy_sell:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${category || "all"}:${minPrice || 0}:${maxPrice || 0}:${search || "none"}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        // Query by status GSI
        let listings = await BuySellListing.query("status").eq("active").exec();

        // Client-side filtering
        if (country) listings = listings.filter(l => l.country === country);
        if (state) listings = listings.filter(l => l.state === state);
        if (city) listings = listings.filter(l => l.city === city);
        if (zip_code) listings = listings.filter(l => l.zip_code === zip_code);
        if (category) listings = listings.filter(l => l.category === category);
        if (minPrice) listings = listings.filter(l => Number(l.price) >= Number(minPrice));
        if (maxPrice) listings = listings.filter(l => Number(l.price) <= Number(maxPrice));
        if (search) {
            const searchLower = search.toLowerCase();
            listings = listings.filter(l => l.title?.toLowerCase().includes(searchLower));
        }

        // Sort + limit
        listings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        listings = listings.slice(0, 50);

        const processedListings = listings.map(listing => {
            const l = { ...listing };
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            return l;
        });

        await setCache(cacheKey, processedListings, 300);
        return res.json({ success: true, listings: processedListings });

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

        const processedListing = { ...listing };
        if (processedListing.images) {
            processedListing.images = processedListing.images.map(attachCloudFrontUrl);
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

        const processedListings = listings.map(listing => {
            const l = { ...listing };
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            return l;
        });

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

        const allowed = ["title", "category", "subcategory", "price", "description", "state", "city", "zip_code", "street_address", "images"];
        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        await BuySellListing.update({ id: listing.id }, updates);
        const updated = await BuySellListing.get(listing.id);

        const processedListing = { ...updated };
        if (processedListing.images) {
            processedListing.images = processedListing.images.map(attachCloudFrontUrl);
        }

        return res.json({ success: true, listing: processedListing });
    } catch (err) {
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

        // Enrich with user data
        const processedListings = await Promise.all(listings.map(async listing => {
            const l = { ...listing };
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            // Fetch user info
            const user = await User.get(l.user_id);
            l.User = user ? { id: user.id, email: user.email } : null;
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
            const l = { ...listing };
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            const user = await User.get(l.user_id);
            l.User = user ? { id: user.id, email: user.email } : null;
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

        let listings = await BuySellListing.scan().filter("status").eq("blocked").exec();
        if (country) listings = listings.filter(l => l.country === country);
        if (state) listings = listings.filter(l => l.state === state);
        listings.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

        const processedListings = await Promise.all(listings.map(async listing => {
            const l = { ...listing };
            if (l.images) l.images = l.images.map(attachCloudFrontUrl);
            const user = await User.get(l.user_id);
            l.User = user ? { id: user.id, email: user.email } : null;
            return l;
        }));

        await setCache(cacheKey, processedListings, 300);
        return res.json({ success: true, listings: processedListings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch blocked listings" });
    }
};
