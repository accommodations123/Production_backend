import BuySellListing from "../model/BuySellListing.js";
import User from "../model/User.js";
import { Op } from "sequelize";
import { getCache, setCache, deleteCacheByPrefix } from "../services/cacheService.js";
import { logAudit } from "../services/auditLogger.js";
import AnalyticsEvent from "../model/DashboardAnalytics/AnalyticsEvent.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
import { NOTIFICATION_TYPES } from "../services/emailService.js";
/* =========================
   CREATE LISTING
   (User)
========================= */

export const createBuySellListing = async (req, res) => {
    try {
        // 🔒 AUTH GUARD (NON-NEGOTIABLE)
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userId = req.user.id;

        // ✅ ALWAYS get email from DB
        const user = await User.findByPk(userId, {
            attributes: ["email"]
        });

        if (!user || !user.email) {
            return res.status(400).json({
                message: "User email not found"
            });
        }

        const {
            title,
            category,
            subcategory,
            price,
            description,
            country,
            state,
            city,
            zip_code,
            street_address,
            name,
            phone
        } = req.body;

        if (
            !title ||
            !category ||
            !price ||
            !description ||
            !country ||
            !state ||
            !city ||
            !street_address ||
            !name ||
            !phone
        ) {
            return res.status(400).json({
                message: "Missing required fields"
            });
        }

        const galleryImages =
            req.files?.map(file => file.location) || [];

        const listing = await BuySellListing.create({
            user_id: userId,
            title,
            category,
            subcategory,
            price,
            description,
            country,
            state,
            city,
            zip_code: zip_code || null,
            street_address,
            name,
            email: user.email,   // ✅ GUARANTEED
            phone,
            images: galleryImages,
            status: "pending"
        });

        return res.status(201).json({
            success: true,
            message: "Listing submitted for approval",
            listing
        });

    } catch (err) {
        console.error("CREATE BUY SELL ERROR:", err);
        return res.status(500).json({ message: err.message });
    }
};



/* =========================
   GET ACTIVE LISTINGS
   (Public)
========================= */
export const getActiveBuySellListings = async (req, res) => {
    try {
        const country =
            req.headers["x-country"] || req.query.country || null;
        const state =
            req.headers["x-state"] || req.query.state || null;
        const city =
            req.headers["x-city"] || req.query.city || null;
        const zip_code =
            req.headers["x-zip-code"] || req.query.zip_code || null;

        const { category, minPrice, maxPrice, search } = req.query;

        const where = { status: "active" };

        if (country) where.country = country;
        if (state) where.state = state;            // ✅ ADD
        if (city) where.city = city;
        if (zip_code) where.zip_code = zip_code;

        if (category) where.category = category;

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = Number(minPrice);
            if (maxPrice) where.price[Op.lte] = Number(maxPrice);
        }

        if (search) {
            where.title = { [Op.like]: `%${search}%` };
        }

        const cacheKey =
            `active_buy_sell:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}:${category || "all"}:${minPrice || 0}:${maxPrice || 0}:${search || "none"}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        const listings = await BuySellListing.findAll({
            where,
            order: [["created_at", "DESC"]],
            limit: 50
        });

        await setCache(cacheKey, listings, 300);

        return res.json({ success: true, listings });

    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch listings" });
    }
};


/* =========================
   GET SINGLE LISTING
========================= */
export const getBuySellListingById = async (req, res) => {
    try {
        const listing = await BuySellListing.findOne({
            where: {
                id: req.params.id,
                status: "active"
            }
        });

        if (!listing) {
            return res.status(404).json({
                message: "Listing not found"
            });
        }

        return res.json({
            success: true,
            listing
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch listing"
        });
    }
};

/* =========================
   USER DASHBOARD LISTINGS
========================= */
export const getMyBuySellListings = async (req, res) => {
    try {
        const listings = await BuySellListing.findAll({
            where: { user_id: req.user.id },
            order: [["created_at", "DESC"]]
        });

        return res.json({
            success: true,
            listings
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to fetch user listings"
        });
    }
};

/* =========================
   UPDATE LISTING
   (Owner only)
========================= */
export const updateBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.findByPk(req.params.id);

        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.user_id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        if (listing.status === "blocked") {
            return res.status(400).json({
                message: "Blocked listings cannot be edited"
            });
        }

        const allowed = [
            "title",
            "category",
            "subcategory",
            "price",
            "description",
            "state",
            "city",
            "zip_code",
            "street_address",
            "images"
        ];

        const updates = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) {
                updates[key] = req.body[key];
            }
        }

        await listing.update(updates);


        return res.json({
            success: true,
            listing
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to update listing"
        });
    }
};

/* =========================
   MARK AS SOLD
========================= */
export const markBuySellAsSold = async (req, res) => {
    try {
        const listing = await BuySellListing.findByPk(req.params.id);

        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.user_id !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        await listing.update({ status: "sold" });

        return res.json({
            success: true,
            message: "Listing marked as sold"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to update status"
        });
    }
};

/* =========================
   DELETE LISTING
========================= */
export const deleteBuySellListing = async (req, res) => {
    try {
        const listing = await BuySellListing.findByPk(req.params.id);

        if (!listing) {
            return res.status(404).json({
                message: "Listing not found"
            });
        }

        if (listing.user_id !== req.user.id) {
            return res.status(403).json({
                message: "Unauthorized"
            });
        }

        // Soft delete
        await listing.update({ status: "hidden" });

        return res.json({
            success: true,
            message: "Listing removed successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to remove listing"
        });
    }
};


/* =========================
   ADMIN CONTROLLERS
========================= */

export const getPendingBuySellListings = async (req, res) => {
    try {
        const country = req.query.country || null;
        const state = req.query.state || null;

        const where = { status: "pending" };
        if (country) where.country = country;
        if (state) where.state = state;

        const cacheKey =
            `pending_buy_sell:${country || "all"}:${state || "all"}`;

        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        const listings = await BuySellListing.findAll({
            where,
            include: [
                {
                    model: User,
                    attributes: ["id", "email"] // ✅ SOURCE OF TRUTH
                }
            ],
            order: [["created_at", "ASC"]]
        });

        await setCache(cacheKey, listings, 300);

        return res.json({ success: true, listings });

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
        const listing = await BuySellListing.findByPk(req.params.id);
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        await listing.update({ status: "active" });

        logAudit({
            action: "BUYSELL_LISTING_APPROVED",
            actor: { id: req.admin.id, role: "admin" },
            target: { type: "buy_sell_listing", id: listing.id },
            severity: "MEDIUM",
            req
        }).catch(console.error);

        AnalyticsEvent.create({
            event_type: "BUYSELL_LISTING_APPROVED",
            user_id: req.admin.id,
            country: listing.country || null
        }).catch(console.error);

        // 🔔 Notify owner
        const user = await User.findByPk(listing.user_id);

        if (user?.email) {
            await notifyAndEmail({
                userId: user.id,
                email: user.email,
                type: NOTIFICATION_TYPES.BUYSELL_APPROVED,
                title: "Listing approved",
                message: "Your buy/sell listing has been approved.",
                metadata: { listingId: listing.id }
            });
        }

        // 🧹 Cache
        await deleteCacheByPrefix("pending_buy_sell");
        await deleteCacheByPrefix("active_buy_sell");
        await deleteCacheByPrefix("admin:buy_sell");

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
        const listing = await BuySellListing.findByPk(req.params.id);

        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }

        await listing.update({ status: "blocked" });
        logAudit({
            action: "BUYSELL_LISTING_BLOCKED",
            actor: { id: req.admin.id, role: "admin" },
            target: { type: "buy_sell_listing", id: listing.id },
            severity: "HIGH",
            req
        }).catch(console.error);

        AnalyticsEvent.create({
            event_type: "BUYSELL_LISTING_BLOCKED",
            user_id: req.admin.id,
            country: listing.country || null
        }).catch(console.error);
        const user = await User.findByPk(listing.user_id);


        if (user?.email) {
            await notifyAndEmail({
                userId: user.id,
                email: user.email,
                type: NOTIFICATION_TYPES.BUYSELL_REJECTED,
                title: "Listing blocked",
                message: "Your buy/sell listing was blocked by admin.",
                metadata: { listingId: listing.id }
            });
        }
        await deleteCacheByPrefix("pending_buy_sell");
        await deleteCacheByPrefix("active_buy_sell");
        await deleteCacheByPrefix("admin:buy_sell");



        return res.json({
            success: true,
            message: "Listing blocked"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Failed to block listing"
        });
    }
};

export const getAdminApprovedBuySellListings = async (req, res) => {
    try {
        const { country, state } = req.query;

        const where = { status: "active" };
        if (country) where.country = country;
        if (state) where.state = state;

        const cacheKey = `admin:buy_sell:approved:${country || "all"}:${state || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        const listings = await BuySellListing.findAll({
            where,
            include: [{ model: User, attributes: ["id", "email"] }],
            order: [["updated_at", "DESC"]]
        });

        await setCache(cacheKey, listings, 300);

        return res.json({ success: true, listings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch approved listings" });
    }
};


export const getAdminBlockedBuySellListings = async (req, res) => {
    try {
        const { country, state } = req.query;

        const where = { status: "blocked" };
        if (country) where.country = country;
        if (state) where.state = state;

        const cacheKey = `admin:buy_sell:blocked:${country || "all"}:${state || "all"}`;
        const cached = await getCache(cacheKey);
        if (cached) {
            return res.json({ success: true, listings: cached });
        }

        const listings = await BuySellListing.findAll({
            where,
            include: [{ model: User, attributes: ["id", "email"] }],
            order: [["updated_at", "DESC"]]
        });

        await setCache(cacheKey, listings, 300);

        return res.json({ success: true, listings });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch blocked listings" });
    }
};
