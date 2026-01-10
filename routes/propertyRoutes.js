import express from "express";
import {
  createDraft,
  saveBasicInfo,
  saveAddress,
  saveMedia,
  saveVideo,
  saveAmenities,
  saveRules,
  // saveLegalDocs,
  savePricing,
  submitProperty,
  getMyListings,
  softDeleteProperty,
  getApprovedListings,
  getPropertyById,
  getAllPropertiesWithHosts
} from "../controllers/propertyController.js";
import userauth from "../middleware/userAuth.js";
import {uploadPropertyImages,uploadPropertyDocs,uploadPropertyVideos} from "../middleware/uploads/property.upload.js";
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'
import {loadProperty } from "../middleware/loadProperty.js"
import { hostOnly } from "../middleware/hostOnly.js";
const router = express.Router();

// router.post(
//   "/upload",
//   userauth,
//   upload.array("images", 10),    // IMPORTANT: field name = "images"
//   (req, res) => {
//     const urls = req.files.map(file => file.location);
//     res.json({ success: true, urls });
//   }
// );


// Host Flow
router.post("/create-draft", userauth, createDraft);
router.put("/basic-info/:id", userauth, hostOnly,loadProperty, saveBasicInfo);
router.put("/address/:id", userauth,hostOnly,loadProperty, saveAddress);
router.put("/media/:id", userauth,hostOnly,loadProperty, uploadPropertyImages.array("photo" , 10),multerErrorHandler, saveMedia);
router.put("/media/video/:id", userauth,hostOnly,loadProperty, uploadPropertyVideos.single("video"),multerErrorHandler, saveVideo);
router.put("/amenities/:id", userauth,hostOnly,loadProperty, saveAmenities);
router.put("/rules/:id", userauth,hostOnly,loadProperty, saveRules);
// router.put("/legal/:id",userauth,uploadPropertyDocs.array("legalDocs", 10),multerErrorHandler,saveLegalDocs);
router.put("/pricing/:id", userauth,hostOnly,loadProperty, savePricing);
router.put("/submit/:id", userauth,hostOnly,loadProperty, submitProperty);

// Host Listings
router.get("/my-listings", userauth,hostOnly, getMyListings);
router.delete("/delete/:id", userauth,hostOnly,loadProperty, softDeleteProperty);

// Public Listings
router.get("/approved", getApprovedListings);
router.get("/all", getAllPropertiesWithHosts);

// Always keep this last
router.get("/:id", getPropertyById); 

export default router;
