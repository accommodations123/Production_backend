import Property from "../model/Property.js";

// CREATE DRAFT LISTING
export const createDraft = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, propertyType, privacyType } = req.body;

    if (!categoryId || !propertyType || !privacyType) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const property = await Property.create({
      user_id: userId,
      category_id: categoryId,
      property_type: propertyType,
      privacy_type: privacyType,
      status: "draft"
    });

    res.json({
      success: true,
      propertyId: property.id,
      message: "Draft created successfully."
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// BASIC INFO
export const saveBasicInfo = async (req, res) => {
  try {
    const [updated] = await Property.update(
      {
        guests: req.body.guests,
        bedrooms: req.body.bedrooms,
        bathrooms: req.body.bathrooms,
        pets_allowed: req.body.petsAllowed,
        area: req.body.area
      },
      { where: { id: req.params.id }, returning: true }
    );

    const property = await Property.findByPk(req.params.id);
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADDRESS
export const saveAddress = async (req, res) => {
  try {
    await Property.update(
      {
        country: req.body.country,
        city: req.body.city,
        address: req.body.address
      },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// MEDIA (PHOTOS)
export const saveMedia = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const newUrls = req.files.map(file => file.location);

    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    const oldPhotos = property.photos || [];
    property.photos = [...oldPhotos, ...newUrls];

    await property.save();

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const saveVideo = async (req, res) => {
  try {
    const url = req.file.location;

    await Property.update(
      { video: url },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// AMENITIES
export const saveAmenities = async (req, res) => {
  try {
    await Property.update(
      { amenities: req.body.amenities || [] },
      { where: { id: req.params.id } }
    );
    const property = await Property.findByPk(req.params.id);
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// RULES
export const saveRules = async (req, res) => {
  try {
    await Property.update(
      { rules: req.body.rules || [] },
      { where: { id: req.params.id } }
    );
    const property = await Property.findByPk(req.params.id);
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// LEGAL DOCS
export const saveLegalDocs = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No documents uploaded" });
    }

    const newUrls = req.files.map(file => file.location);

    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    const oldDocs = property.legal_docs || [];
    property.legal_docs = [...oldDocs, ...newUrls];

    await property.save();

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// PRICING
export const savePricing = async (req, res) => {
  try {
    await Property.update(
      {
        price_per_hour: req.body.pricePerHour,
        price_per_night: req.body.pricePerNight,
        price_per_month: req.body.pricePerMonth,
        currency: req.body.currency
      },
      { where: { id: req.params.id } }
    );

    const property = await Property.findByPk(req.params.id);
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// SUBMIT TO ADMIN
export const submitProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: "Not found" });

    property.status = "pending";
    await property.save();

    res.json({ success: true, message: "Submitted to admin" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET HOST LISTINGS
export const getMyListings = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { user_id: req.user.id }
    });

    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// FRONTEND APPROVED LISTINGS
export const getApprovedListings = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { status: "approved" }
    });
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
