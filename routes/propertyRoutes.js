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
  softDeleteProperty,
  getApprovedListings,
  getPropertyById,
  getAllPropertiesWithHosts
} from "../controllers/propertyController.js";
import userauth from "../middleware/userAuth.js";
import {uploadPropertyImages,uploadPropertyDocs,uploadPropertyVideos} from "../middleware/uploads/property.upload.js";
import {multerErrorHandler} from '../middleware/uploads/multerErrorHandler.js'
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
router.put("/basic-info/:id", userauth, saveBasicInfo);
router.put("/address/:id", userauth, saveAddress);
router.put("/media/:id", userauth, uploadPropertyImages.array("photo" , 10),multerErrorHandler, saveMedia);
router.put("/media/video/:id", userauth, uploadPropertyVideos.single("video"),multerErrorHandler, saveVideo);
router.put("/amenities/:id", userauth, saveAmenities);
router.put("/rules/:id", userauth, saveRules);
router.put("/legal/:id",userauth,uploadPropertyDocs.array("legalDocs", 10),multerErrorHandler,saveLegalDocs);
router.put("/pricing/:id", userauth, savePricing);
router.put("/submit/:id", userauth, submitProperty);

// Host Listings
router.get("/my-listings", userauth, getMyListings);
router.delete("/delete/:id", userauth, softDeleteProperty);

// Public Listings
router.get("/approved", getApprovedListings);
router.get("/all", getAllPropertiesWithHosts);

// Always keep this last
router.get("/:id", getPropertyById); 

export default router;
