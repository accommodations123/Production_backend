import express from "express";
import userAuth, { optionalUserAuth } from "../../middleware/userAuth.js";
import { uploadPeopleAvatar } from "../../middleware/upload.js";
import { multerErrorHandler } from "../../middleware/uploads/multerErrorHandler.js";
import {
  getPublicProfiles,
  searchProfiles,
  getPublicProfile,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  updateExperience,
  updateEducation,
  updateSkills,
  updatePortfolio,
  updateServices,
  toggleFollow,
  getFollowers,
  getFollowing,
  createReview,
  getReviews,
  reportProfile
} from "../../controllers/people/People.controllers.js";

const router = express.Router();

/* ─── PUBLIC ROUTES ─── */
router.get("/", getPublicProfiles);
router.get("/search", searchProfiles);
router.get("/profile/:id", optionalUserAuth, getPublicProfile);
router.get("/reviews/:profileId", optionalUserAuth, getReviews);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);

/* ─── AUTHENTICATED USER ROUTES ─── */
router.get("/me", userAuth, getMyProfile);
router.post("/", userAuth, createProfile);
router.put("/me", userAuth, updateProfile);
router.delete("/me", userAuth, deleteProfile);

router.post("/upload", userAuth, uploadPeopleAvatar.array("images", 5), multerErrorHandler, (req, res) => {
  try {
    const urls = (req.files || []).map((f) => f.location || f.key || (f.path ? f.path : ""));
    return res.status(200).json({ success: true, urls, url: urls[0] || "" });
  } catch (error) {
    console.error("People upload error:", error);
    return res.status(500).json({ success: false, message: "Upload failed" });
  }
});

router.put("/me/experience", userAuth, updateExperience);
router.put("/me/education", userAuth, updateEducation);
router.put("/me/skills", userAuth, updateSkills);
router.put("/me/portfolio", userAuth, updatePortfolio);
router.put("/me/services", userAuth, updateServices);

router.put("/profile/:id", userAuth, updateProfile);
router.delete("/profile/:id", userAuth, deleteProfile);

router.post("/follow/:targetUserId", userAuth, toggleFollow);
router.post("/reviews/:profileId", userAuth, createReview);
router.post("/report", userAuth, reportProfile);

export default router;
