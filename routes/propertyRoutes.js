import express from "express";
import {
  createDraft,
  saveBasicInfo,
  saveAddress,
  saveMedia,
  saveVideo,
  saveAmenities,
  saveRules,
  saveLegalDocs,
  savePricing,
  submitProperty,
  getMyListings,
  getApprovedListings,
  getPropertyById,
  getAllPropertiesWithHosts
} from "../controllers/propertyController.js";
import userauth from "../middleware/userAuth.js";
import { upload } from '../middleware/upload.js'
import {uploadDocs} from '../middleware/upload.js'
import {uploadVideo} from '../middleware/upload.js'
const router = express.Router();

router.post(
  "/upload",
  userauth,
  upload.array("images", 10),    // IMPORTANT: field name = "images"
  (req, res) => {
    const urls = req.files.map(file => file.location);
    res.json({ success: true, urls });
  }
);


// Host Flow
router.post("/create-draft", userauth, createDraft);
router.put("/basic-info/:id", userauth, saveBasicInfo);
router.put("/address/:id", userauth, saveAddress);
router.put("/media/:id", userauth, upload.array("photo" , 10), saveMedia);
router.put("/media/video/:id", userauth, uploadVideo.single("video"), saveVideo);
router.put("/amenities/:id", userauth, saveAmenities);
router.put("/rules/:id", userauth, saveRules);
router.put("/legal/:id",userauth,uploadDocs.array("legalDocs", 10),saveLegalDocs);
router.put("/pricing/:id", userauth, savePricing);
router.put("/submit/:id", userauth, submitProperty);

// Host Listings
router.get("/my-listings", userauth, getMyListings);

// Public Listings
router.get("/approved", getApprovedListings);
router.get("/all", getAllPropertiesWithHosts);

// Always keep this last
router.get("/:id", getPropertyById);

export default router;
