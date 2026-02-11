import Wishlist from "../model/Wishlist.js";
import Property from "../model/Property.js";
import Event from "../model/Events.models.js";
import BuySellListing from "../model/BuySellListing.js";
import Community from "../model/community/Community.js";
import TravelTrip from "../model/travel/TravelTrip.js";
import { Op } from "sequelize";

// Helper for parsing integers safely
const parseInteger = (value) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
};

// Validation helper
const isValidType = (type) => {
    return ["property", "event", "buysell", "community", "trip"].includes(type);
};

// Helper to get model by type
const getModelByType = (type) => {
    switch (type) {
        case "property": return Property;
        case "event": return Event;
        case "buysell": return BuySellListing;
        case "community": return Community;
        case "trip": return TravelTrip;
        default: return null;
    }
};

export const addToWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_id = parseInteger(req.body.item_id);
        const item_type = req.body.item_type;

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const Model = getModelByType(item_type);
        const exists = await Model.findByPk(item_id, { attributes: ["id"] });

        if (!exists) {
            return res.status(404).json({ message: "Item not found" });
        }

        try {
            const wishlist = await Wishlist.create({
                user_id,
                item_id,
                item_type
            });

            return res.status(201).json({
                message: "Added to wishlist",
                wishlist
            });

        } catch (err) {
            if (err.name === "SequelizeUniqueConstraintError") {
                return res.status(200).json({
                    message: "Already in wishlist"
                });
            }
            throw err;
        }

    } catch (err) {
        console.error("ADD WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_id = parseInteger(req.params.id);
        const item_type = req.params.type;

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const deleted = await Wishlist.destroy({
            where: { user_id, item_id, item_type }
        });

        return res.status(200).json({
            success: !!deleted,
            message: deleted ? "Removed" : "Not found"
        });

    } catch (err) {
        console.error("REMOVE WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleWishlist = async (req, res) => {
    const t = await Wishlist.sequelize.transaction();

    try {
        const user_id = req.user.id;
        const item_id = parseInteger(req.body.item_id);
        const item_type = req.body.item_type;

        if (!item_id || !isValidType(item_type)) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const existing = await Wishlist.findOne({
            where: { user_id, item_id, item_type },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (existing) {
            await existing.destroy({ transaction: t });
            await t.commit();
            return res.status(200).json({
                message: "Removed from wishlist",
                isWishlisted: false
            });
        }

        const Model = getModelByType(item_type);
        const itemExists = await Model.findByPk(item_id, { attributes: ["id"] });

        if (!itemExists) {
            await t.rollback();
            return res.status(404).json({ message: "Item not found" });
        }

        await Wishlist.create(
            { user_id, item_id, item_type },
            { transaction: t }
        );

        await t.commit();

        return res.status(201).json({
            message: "Added to wishlist",
            isWishlisted: true
        });

    } catch (err) {
        // If transaction active/valid, rollback
        if (t && !t.finished) {
            try { await t.rollback(); } catch (e) { console.error("Rollback failed", e); }
        }

        // Check constraint race condition (unlikely with lock, but possible)
        if (err.name === "SequelizeUniqueConstraintError") {
            return res.status(200).json({ message: "Item already in wishlist", isWishlisted: true });
        }

        console.error("TOGGLE WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;

        const page = Math.max(parseInteger(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInteger(req.query.limit) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const where = { user_id };

        if (req.query.type && isValidType(req.query.type)) {
            where.item_type = req.query.type;
        }

        const { count, rows } = await Wishlist.findAndCountAll({
            where,
            order: [["created_at", "DESC"]],
            limit,
            offset
        });

        if (!rows.length) {
            return res.json({
                wishlist: [],
                pagination: { total: count, page, limit }
            });
        }

        const grouped = rows.reduce((acc, item) => {
            if (!acc[item.item_type]) acc[item.item_type] = [];
            acc[item.item_type].push(item.item_id);
            return acc;
        }, {});

        const detailsMap = {};

        await Promise.all(Object.keys(grouped).map(async (type) => {
            const Model = getModelByType(type);
            const items = await Model.findAll({
                where: { id: grouped[type] }
            });

            detailsMap[type] = items.reduce((m, i) => {
                m[i.id] = i;
                return m;
            }, {});
        }));

        const enriched = rows.map(item => ({
            ...item.toJSON(),
            details: detailsMap[item.item_type]?.[item.item_id] || null
        }));

        return res.json({
            wishlist: enriched,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (err) {
        console.error("GET WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const checkWishlistStatus = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_id = parseInteger(req.params.id);
        const item_type = req.params.type;

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const exists = await Wishlist.findOne({
            where: { user_id, item_id, item_type },
            attributes: ["id"]
        });

        return res.json({ isWishlisted: !!exists });

    } catch (err) {
        console.error("CHECK WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
