import express from "express";
import userAuth from "../../middleware/userAuth.js";
import {
  validateCreateStayRequest,
  validateUpdateStayRequest,
  validateStayRequestOffer,
  validateReportStayRequest
} from "../../validators/stayRequest/StayRequestValidator.js";
import {
  getPublicStayRequests,
  searchStayRequests,
  getStayRequestById,
  getMyStayRequests,
  createStayRequest,
  updateStayRequest,
  deleteStayRequest,
  createStayOffer,
  getOffersForRequest,
  getMyOffers,
  reportStayRequest
} from "../../controllers/stayRequest/StayRequest.controllers.js";

const router = express.Router();

/* ── PUBLIC ROUTES ────────────────────────────────────────── */
router.get("/", getPublicStayRequests);
router.get("/search", searchStayRequests);
router.get("/request/:id", getStayRequestById);
router.get("/offers/:id", getOffersForRequest);

/* ── AUTHENTICATED USER ROUTES (Seekers & Hosts) ─────────── */
router.get("/me", userAuth, getMyStayRequests);
router.get("/me/offers", userAuth, getMyOffers);

router.post("/", userAuth, validateCreateStayRequest, createStayRequest);
router.put("/:id", userAuth, validateUpdateStayRequest, updateStayRequest);
router.delete("/:id", userAuth, deleteStayRequest);

router.post("/:id/offers", userAuth, validateStayRequestOffer, createStayOffer);
router.post("/report", userAuth, validateReportStayRequest, reportStayRequest);

export default router;
