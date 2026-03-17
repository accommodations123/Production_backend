import Wishlist from "../model/Wishlist.js";
import Property from "../model/Property.js";
import Event from "../model/Events.models.js";
import BuySellListing from "../model/BuySellListing.js";
import Community from "../model/community/Community.js";
import TravelTrip from "../model/travel/TravelTrip.js";
import { attachCloudFrontUrl, processHostImages } from "../utils/imageUtils.js";

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

// Helper to resolve ID (handles community slugs)
const resolveItemId = async (type, idParam) => {
    if (!idParam) return null;

    // For DynamoDB, IDs are UUIDs (strings), not numbers
    // If it's a community slug (not a UUID pattern), look it up
    if (type === "community" && !idParam.match(/^[0-9a-f-]{36}$/i)) {
        const communities = await Community.query("slug").eq(idParam).exec();
        return communities[0]?.id || null;
    }
    return idParam;
};

export const addToWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_type = req.body.item_type;
        const item_id = await resolveItemId(item_type, req.body.item_id);

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const Model = getModelByType(item_type);
        const exists = await Model.get(item_id);

        if (!exists) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check if already in wishlist
        const userWishlist = await Wishlist.query("user_id").eq(user_id).exec();
        const alreadyExists = userWishlist.find(
            w => w.item_id === item_id && w.item_type === item_type
        );

        if (alreadyExists) {
            return res.status(200).json({ message: "Already in wishlist" });
        }

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
        console.error("ADD WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_type = req.params.type;
        const item_id = await resolveItemId(item_type, req.params.id);

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        // Find the wishlist entry
        const userWishlist = await Wishlist.query("user_id").eq(user_id).exec();
        const entry = userWishlist.find(
            w => w.item_id === item_id && w.item_type === item_type
        );

        if (entry) {
            await Wishlist.delete(entry.id);
            return res.status(200).json({ success: true, message: "Removed" });
        }

        return res.status(200).json({ success: false, message: "Not found" });

    } catch (err) {
        console.error("REMOVE WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleWishlist = async (req, res) => {
    try {
        const user_id = req.user.id;
        const item_type = req.body.item_type;
        const item_id = await resolveItemId(item_type, req.body.item_id);

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        // Check existing
        const userWishlist = await Wishlist.query("user_id").eq(user_id).exec();
        const existing = userWishlist.find(
            w => w.item_id === item_id && w.item_type === item_type
        );

        if (existing) {
            await Wishlist.delete(existing.id);
            return res.status(200).json({
                message: "Removed from wishlist",
                isWishlisted: false
            });
        }

        const Model = getModelByType(item_type);
        const itemExists = await Model.get(item_id);

        if (!itemExists) {
            return res.status(404).json({ message: "Item not found" });
        }

        await Wishlist.create({ user_id, item_id, item_type });

        return res.status(201).json({
            message: "Added to wishlist",
            isWishlisted: true
        });

    } catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
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

        // Query by user_id GSI
        let allItems = await Wishlist.query("user_id").eq(user_id).exec();

        // Filter by type if specified
        if (req.query.type && isValidType(req.query.type)) {
            allItems = allItems.filter(w => w.item_type === req.query.type);
        }

        const count = allItems.length;

        if (!allItems.length) {
            return res.json({
                wishlist: [],
                pagination: { total: count, page, limit }
            });
        }

        // Paginate
        const rows = allItems.slice(offset, offset + limit);

        // Group by type for batch fetching
        const grouped = rows.reduce((acc, item) => {
            if (!acc[item.item_type]) acc[item.item_type] = [];
            acc[item.item_type].push(item.item_id);
            return acc;
        }, {});

        const detailsMap = {};

        await Promise.all(Object.keys(grouped).map(async (type) => {
            const Model = getModelByType(type);
            // Fetch each item individually (DynamoDB batchGet alternative)
            const items = await Promise.all(
                grouped[type].map(id => Model.get(id).catch(() => null))
            );

            detailsMap[type] = items.filter(Boolean).reduce((m, i) => {
                m[i.id] = i;
                return m;
            }, {});
        }));

        const enriched = rows.map(item => ({
            ...item,
            details: detailsMap[item.item_type]?.[item.item_id] ? (() => {
                let detail = { ...detailsMap[item.item_type][item.item_id] };
                // Process images based on item type
                if (item.item_type === 'property' || item.item_type === 'trip') {
                    if (detail.photos) detail.photos = detail.photos.map(attachCloudFrontUrl);
                    if (detail.video) detail.video = attachCloudFrontUrl(detail.video);
                } else if (item.item_type === 'event') {
                    if (detail.banner_image) detail.banner_image = attachCloudFrontUrl(detail.banner_image);
                    if (detail.gallery_images) detail.gallery_images = detail.gallery_images.map(attachCloudFrontUrl);
                } else if (item.item_type === 'buysell') {
                    if (detail.images) detail.images = detail.images.map(attachCloudFrontUrl);
                } else if (item.item_type === 'community') {
                    if (detail.avatar_image) detail.avatar_image = attachCloudFrontUrl(detail.avatar_image);
                    if (detail.cover_image) detail.cover_image = attachCloudFrontUrl(detail.cover_image);
                }

                // Process host mapping if it exists
                detail = processHostImages(detail);
                return detail;
            })() : null
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
        const item_type = req.params.type;
        const item_id = await resolveItemId(item_type, req.params.id);

        if (!item_id || !isValidType(item_type)) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const userWishlist = await Wishlist.query("user_id").eq(user_id).exec();
        const exists = userWishlist.find(
            w => w.item_id === item_id && w.item_type === item_type
        );

        return res.json({ isWishlisted: !!exists });

    } catch (err) {
        console.error("CHECK WISHLIST ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
