import BuySellListing from "../model/BuySellListing .js";
import { Op } from "sequelize";

/* =========================
   CREATE LISTING
   (User)
========================= */
export const createBuySellListing = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;

    const {
      title,
      category,
      subcategory,
      price,
      description,
      country,
      city,
      zip_code,
      name,
      phone
    } = req.body;

    if (
      !title ||
      !category ||
      !price ||
      !description ||
      !country ||
      !city ||
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
      city,
      zip_code: zip_code || null,
      name,
      email :userEmail,
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
    return res.status(500).json({
      message: "Failed to create listing"
    });
  }
};


/* =========================
   GET ACTIVE LISTINGS
   (Public)
========================= */
export const getActiveBuySellListings = async (req, res) => {
  try {
    const {country, category, city, zip_code, minPrice, maxPrice, search } = req.query;

    const where = { status: "active" };
    if(country) where.country = country;
    if(city) where.city = city;
    if(zip_code) where.zip_code = zip_code

    if (category) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const listings = await BuySellListing.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit: 50
    });

    return res.json({
      success: true,
      listings
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch listings"
    });
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

    await listing.update(req.body);

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
    const listings = await BuySellListing.findAll({
      where: { status: "pending" },
      order: [["created_at", "ASC"]]
    });

    return res.json({
      success: true,
      listings
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch pending listings"
    });
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

    return res.json({
      success: true,
      message: "Listing approved"
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to approve listing"
    });
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