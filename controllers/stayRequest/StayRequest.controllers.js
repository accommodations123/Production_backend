import stayRequestService from "../../services/stayRequest/StayRequestService.js";
import { logAudit } from "../../services/auditLogger.js";
import fs from "fs";
import path from "path";

function logDebug(msg, data) {
  try {
    fs.appendFileSync(
      path.join(process.cwd(), "debug.log"),
      `\n[${new Date().toISOString()}] ${msg}\n${JSON.stringify(data, null, 2)}\n`
    );
  } catch (err) {
    console.error("Failed to write to debug.log:", err);
  }
}

// ── GET PUBLIC STAY REQUESTS & SEARCH ────────────────────────────────────
export async function getPublicStayRequests(req, res) {
  try {
    const result = await stayRequestService.searchStayRequests(req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("❌ Error in getPublicStayRequests:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stay requests."
    });
  }
}

export async function searchStayRequests(req, res) {
  return getPublicStayRequests(req, res);
}

// ── GET STAY REQUEST BY ID ───────────────────────────────────────────────
export async function getStayRequestById(req, res) {
  try {
    const { id } = req.params;
    const requestDoc = await stayRequestService.getStayRequestById(id);

    if (!requestDoc) {
      return res.status(404).json({
        success: false,
        message: "Stay request not found."
      });
    }

    return res.status(200).json({ success: true, data: requestDoc });
  } catch (error) {
    console.error("❌ Error in getStayRequestById:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stay request detail."
    });
  }
}

// ── GET CURRENT USER STAY REQUESTS ───────────────────────────────────────
export async function getMyStayRequests(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const requests = await stayRequestService.getStayRequestsByUserId(userId);
    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("❌ Error in getMyStayRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user stay requests."
    });
  }
}

// ── CREATE STAY REQUEST ──────────────────────────────────────────────────
export async function createStayRequest(req, res) {
  logDebug("CREATE STAY REQUEST", { userId: req.user?.id || req.user?._id, body: req.body });
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const created = await stayRequestService.createStayRequest(userId, req.body);
    logDebug("CREATE STAY REQUEST SUCCESS", { requestId: created?.id });

    try {
      await logAudit(userId, "STAY_REQUEST_CREATED", { requestId: created?.id, title: created?.title }, req.ip);
    } catch (aErr) {
      console.warn("Audit log error:", aErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Stay request created successfully.",
      data: created
    });
  } catch (error) {
    console.error("❌ Error in createStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create stay request."
    });
  }
}

// ── UPDATE STAY REQUEST ──────────────────────────────────────────────────
export async function updateStayRequest(req, res) {
  logDebug("UPDATE STAY REQUEST", { userId: req.user?.id || req.user?._id, id: req.params.id, body: req.body });
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const updated = await stayRequestService.updateStayRequest(id, userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Stay request updated successfully.",
      data: updated
    });
  } catch (error) {
    console.error("❌ Error in updateStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update stay request."
    });
  }
}

// ── DELETE STAY REQUEST ──────────────────────────────────────────────────
export async function deleteStayRequest(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const result = await stayRequestService.deleteStayRequest(id, userId);
    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("❌ Error in deleteStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to delete stay request."
    });
  }
}

// ── HOST CREATE OFFER ───────────────────────────────────────────────────
export async function createStayOffer(req, res) {
  try {
    const hostUserId = req.user?.id || req.user?._id;
    const { id: requestId } = req.params;
    const { property_id, message, offered_price, currency, contact_phone, contact_email } = req.body;

    if (!hostUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const offer = await stayRequestService.addStayRequestOffer({
      requestId,
      hostUserId,
      propertyId: property_id,
      message,
      offeredPrice: offered_price,
      currency,
      contactPhone: contact_phone,
      contactEmail: contact_email
    });

    return res.status(201).json({
      success: true,
      message: "Stay offer sent to requester successfully.",
      data: offer
    });
  } catch (error) {
    console.error("❌ Error in createStayOffer:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit stay offer."
    });
  }
}

// ── GET OFFERS FOR REQUEST ───────────────────────────────────────────────
export async function getOffersForRequest(req, res) {
  try {
    const { id: requestId } = req.params;
    const offers = await stayRequestService.getOffersForRequest(requestId);
    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    console.error("❌ Error in getOffersForRequest:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch offers for stay request."
    });
  }
}

// ── GET HOST OFFERS ──────────────────────────────────────────────────────
export async function getMyOffers(req, res) {
  try {
    const hostUserId = req.user?.id || req.user?._id;
    if (!hostUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const offers = await stayRequestService.getOffersByHost(hostUserId);
    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    console.error("❌ Error in getMyOffers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch host stay offers."
    });
  }
}

// ── REPORT STAY REQUEST ──────────────────────────────────────────────────
export async function reportStayRequest(req, res) {
  try {
    const reporterUserId = req.user?.id || req.user?._id;
    const { reported_request_id, reason, details } = req.body;

    if (!reporterUserId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const report = await stayRequestService.reportStayRequest({
      reporterUserId,
      reportedRequestId: reported_request_id,
      reason,
      details
    });

    return res.status(201).json({
      success: true,
      message: "Stay request reported successfully.",
      data: report
    });
  } catch (error) {
    console.error("❌ Error in reportStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to submit stay request report."
    });
  }
}

// ── ADMIN CONTROLLERS ────────────────────────────────────────────────────
export async function getPendingStayRequests(req, res) {
  try {
    const pending = await stayRequestService.getPendingStayRequests();
    return res.status(200).json({ success: true, data: pending });
  } catch (error) {
    console.error("❌ Error in getPendingStayRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending stay requests."
    });
  }
}

export async function getAdminStayRequestStats(req, res) {
  try {
    const stats = await stayRequestService.getAdminStayRequestStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("❌ Error in getAdminStayRequestStats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stay request statistics."
    });
  }
}

export async function approveStayRequest(req, res) {
  try {
    const { id } = req.params;
    const approved = await stayRequestService.approveStayRequest(id);
    return res.status(200).json({
      success: true,
      message: "Stay request approved successfully.",
      data: approved
    });
  } catch (error) {
    console.error("❌ Error in approveStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to approve stay request."
    });
  }
}

export async function rejectStayRequest(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const rejected = await stayRequestService.rejectStayRequest(id, reason);
    return res.status(200).json({
      success: true,
      message: "Stay request rejected successfully.",
      data: rejected
    });
  } catch (error) {
    console.error("❌ Error in rejectStayRequest:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to reject stay request."
    });
  }
}

export async function getAdminStayRequestReports(req, res) {
  try {
    const reports = await stayRequestService.getAdminReports();
    return res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error("❌ Error in getAdminStayRequestReports:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stay request reports."
    });
  }
}

export default {
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
  reportStayRequest,
  getPendingStayRequests,
  getAdminStayRequestStats,
  approveStayRequest,
  rejectStayRequest,
  getAdminStayRequestReports
};
