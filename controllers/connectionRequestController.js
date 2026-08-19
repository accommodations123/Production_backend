import ConnectionRequest from "../model/ConnectionRequest.js";
import User from "../model/User.js";
import Host from "../model/Host.js";
import Property from "../model/Property.js";
import BuySellListing from "../model/BuySellListing.js";
import TravelTrip from "../model/travel/TravelTrip.js";
import Event from "../model/Events.models.js";
import { ProfessionalProfile } from "../model/people/People.models.js";
import { notifyAndEmail } from "../services/notificationDispatcher.js";
/* =====================================================================
   Connection Requests Controller (Accommodations, Buy/Sell, Travel, Events, People)
   ===================================================================== */
/**
 * Resolves any item/host/profile reference to the canonical User.id
 */
const resolveCanonicalUserId = async (providedId, itemId, itemType) => {
  let targetId = providedId;
  // 1. Resolve owner from item record across all modules
  if (itemId && itemType) {
    try {
      if (itemType === "accommodations" || itemType === "property") {
        const prop = await Property.get(itemId);
        if (prop) {
          targetId = prop.user_id || prop.host_id || prop.Host?.user_id || prop.Host?.id || targetId;
        }
      } else if (itemType === "buysell") {
        const item = await BuySellListing.get(itemId);
        if (item) {
          targetId = item.seller_id || item.user_id || item.sellerId || targetId;
        }
      } else if (itemType === "travel" || itemType === "trip") {
        const trip = await TravelTrip.get(itemId);
        if (trip) {
          targetId = trip.user_id || trip.userId || trip.user?.id || targetId;
        }
      } else if (itemType === "events" || itemType === "event") {
        const ev = await Event.get(itemId);
        if (ev) {
          targetId = ev.host_id || ev.user_id || ev.host?.user_id || targetId;
        }
      } else if (itemType === "people") {
        const prof = await ProfessionalProfile.get(itemId);
        if (prof && prof.user_id) {
          targetId = prof.user_id;
        }
      }
    } catch (e) {
      console.warn("âš ï¸ Item owner resolution warning:", e.message);
    }
  }
  if (!targetId) return null;
  const strId = String(targetId);
  // 2. Direct User lookup
  try {
    const directUser = await User.get(strId);
    if (directUser) return directUser.id;
  } catch (e) { }
  // 3. Host lookup -> resolve user_id
  try {
    const hostRecord = await Host.get(strId);
    if (hostRecord && hostRecord.user_id) {
      return hostRecord.user_id;
    }
  } catch (e) { }
  // 4. ProfessionalProfile lookup -> resolve user_id
  try {
    const profileRecord = await ProfessionalProfile.get(strId);
    if (profileRecord && profileRecord.user_id) {
      return profileRecord.user_id;
    }
  } catch (e) { }
  return strId;
};
/**
 * Send Connection Request
 * POST /connection-requests
 */
export const sendConnectionRequest = async (req, res) => {
  try {
    const requesterId = String(req.user.id);
    const {
      targetUserId,
      targetName,
      itemId,
      itemTitle,
      itemType,
      requesterEmail,
      requesterPhone
    } = req.body;
    const canonicalTargetUserId = await resolveCanonicalUserId(targetUserId, itemId, itemType);
    if (!canonicalTargetUserId) {
      return res.status(400).json({ success: false, message: "Target owner could not be resolved." });
    }
    if (String(canonicalTargetUserId) === requesterId) {
      return res.status(400).json({ success: false, message: "Cannot send connection request to yourself" });
    }
    let nameToSave = req.user?.full_name || req.user?.name || req.user?.first_name || req.body?.requesterName || "";
    if (/^user(\s*\d*)?$/i.test(nameToSave.trim())) {
      nameToSave = "";
    }
    // Check duplicate specifically for THIS itemId and target user
    const existing = await ConnectionRequest.scan()
      .filter("requesterId").eq(requesterId)
      .and()
      .filter("targetUserId").eq(canonicalTargetUserId)
      .exec();
    const existingMatch = Array.from(existing || []).find(r =>
      itemId ? String(r.itemId) === String(itemId) : !r.itemId
    );
    if (existingMatch) {
      // âœ… Reactivate if previously declined or soft-deleted
      if (existingMatch.status === "declined" || existingMatch.isDeleted) {
        existingMatch.status = "pending";
        existingMatch.isDeleted = false;
        existingMatch.deletedAt = "";
        if (nameToSave) existingMatch.requesterName = nameToSave;
        if (requesterEmail) existingMatch.requesterEmail = requesterEmail;
        if (requesterPhone) existingMatch.requesterPhone = requesterPhone;
        await existingMatch.save();
        try {
          const targetUserRec = await User.get(canonicalTargetUserId);
          const requesterDisplayName = nameToSave || req.user?.full_name || req.user?.name || "A member";
          const verticalLabel = itemType ? itemType.charAt(0).toUpperCase() + itemType.slice(1) : "Listing";
          notifyAndEmail({
            userId: canonicalTargetUserId,
            email: targetUserRec?.email || "",
            type: "CONNECTION_REQUEST_RECEIVED",
            title: `New ${verticalLabel} Connection Request`,
            message: `${requesterDisplayName} sent you a connection request for "${itemTitle || "your listing"}".`,
            metadata: {
              requestId: existingMatch.id,
              requesterId,
              requesterName: requesterDisplayName,
              itemId: itemId || "",
              itemTitle: itemTitle || "Listing",
              itemType: itemType || "accommodations"
            }
          }).catch((e) => console.warn("âš ï¸ Notification send error:", e.message));
        } catch (e) { }
        return res.status(200).json({
          success: true,
          message: "Connection request sent successfully",
          data: existingMatch
        });
      }
      return res.json({
        success: true,
        message: "Connection request already exists",
        data: existingMatch
      });
    }
    const newRequest = await ConnectionRequest.create({
      targetUserId: canonicalTargetUserId,
      targetName: targetName || "Host / Seller / Member",
      requesterId,
      requesterName: nameToSave,
      requesterEmail: requesterEmail || req.user?.email || "",
      requesterPhone: requesterPhone || "",
      itemId: itemId || "",
      itemTitle: itemTitle || "Listing",
      itemType: itemType || "accommodations",
      status: "pending",
      isDeleted: false,
      deletedAt: ""
    });
    try {
      const targetUserRec = await User.get(canonicalTargetUserId);
      const requesterDisplayName = nameToSave || req.user?.full_name || req.user?.name || "A member";
      const verticalLabel = itemType ? itemType.charAt(0).toUpperCase() + itemType.slice(1) : "Listing";
      notifyAndEmail({
        userId: canonicalTargetUserId,
        email: targetUserRec?.email || "",
        type: "CONNECTION_REQUEST_RECEIVED",
        title: `New ${verticalLabel} Connection Request`,
        message: `${requesterDisplayName} sent you a connection request for "${itemTitle || "your listing"}".`,
        metadata: {
          requestId: newRequest.id,
          requesterId,
          requesterName: requesterDisplayName,
          itemId: itemId || "",
          itemTitle: itemTitle || "Listing",
          itemType: itemType || "accommodations"
        }
      }).catch((e) => console.warn("âš ï¸ Notification send error:", e.message));
    } catch (e) { }
    return res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      data: newRequest
    });
  } catch (error) {
    console.error("Error sending connection request:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to send request" });
  }
};
/**
 * Get Incoming Connection Requests for current user
 * GET /connection-requests/incoming
 */
export const getIncomingRequests = async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const targetIds = [currentUserId];
    try {
      const hosts = await Host.scan().filter("user_id").eq(currentUserId).exec();
      if (hosts && hosts.length > 0) {
        hosts.forEach(h => targetIds.push(h.id));
      }
    } catch (e) { }
    try {
      const profiles = await ProfessionalProfile.scan().filter("user_id").eq(currentUserId).exec();
      if (profiles && profiles.length > 0) {
        profiles.forEach(p => targetIds.push(p.id));
      }
    } catch (e) { }
    let allRequests = [];
    for (const tid of targetIds) {
      try {
        const batch = await ConnectionRequest.scan().filter("targetUserId").eq(String(tid)).exec();
        if (batch && batch.length > 0) {
          allRequests.push(...batch);
        }
      } catch (e) { }
    }
    const uniqueMap = new Map();
    allRequests.forEach(r => uniqueMap.set(r.id, r));
    // Exclude soft-deleted requests from the incoming list
    const activeRequests = Array.from(uniqueMap.values()).filter(r => !r.isDeleted);
    const sorted = activeRequests.sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    const enrichedData = await Promise.all(
      sorted.map(async (r) => {
        const plain = typeof r.toJSON === "function" ? r.toJSON() : { ...r };
        if (plain.requesterId) {
          try {
            const reqUser = await User.get(plain.requesterId);
            if (reqUser) {
              const dbName = reqUser.full_name || reqUser.name || reqUser.first_name || "";
              if (dbName) {
                plain.requesterName = dbName;
              } else if (plain.requesterName && /^user(\s*\d*)?$/i.test(plain.requesterName.trim())) {
                plain.requesterName = "";
              }
              plain.requesterAvatar = reqUser.profile_image || reqUser.avatar || "";
            }
          } catch (e) { }
        }
        if (plain.requesterName && /^user(\s*\d*)?$/i.test(plain.requesterName.trim())) {
          plain.requesterName = "";
        }
        // Fetch real item title if missing or generic across all modules
        if (plain.itemId && (!plain.itemTitle || plain.itemTitle === "Listing" || plain.itemTitle === "Professional Profile")) {
          try {
            const itemType = plain.itemType;
            if (itemType === "accommodations" || itemType === "property") {
              const prop = await Property.get(plain.itemId);
              if (prop) plain.itemTitle = prop.title || prop.name || plain.itemTitle;
            } else if (itemType === "buysell") {
              const item = await BuySellListing.get(plain.itemId);
              if (item) plain.itemTitle = item.title || item.name || plain.itemTitle;
            } else if (itemType === "travel" || itemType === "trip") {
              const trip = await TravelTrip.get(plain.itemId);
              if (trip) plain.itemTitle = trip.title || (trip.from_city && trip.to_city ? `${trip.from_city} â†’ ${trip.to_city} Trip` : plain.itemTitle);
            } else if (itemType === "events" || itemType === "event") {
              const ev = await Event.get(plain.itemId);
              if (ev) plain.itemTitle = ev.title || ev.name || plain.itemTitle;
            } else if (itemType === "people") {
              const prof = await ProfessionalProfile.get(plain.itemId);
              if (prof) plain.itemTitle = prof.title || prof.name || plain.itemTitle;
            }
          } catch (e) { }
        }
        // Privacy: Only expose contact details if request is accepted
        if (plain.status !== "accepted") {
          plain.requesterEmail = "";
          plain.requesterPhone = "";
        } else {
          if (!plain.requesterEmail || !plain.requesterPhone) {
            try {
              const reqUser = await User.get(plain.requesterId);
              if (reqUser) {
                if (!plain.requesterEmail) plain.requesterEmail = reqUser.email || "";
                if (!plain.requesterPhone) plain.requesterPhone = reqUser.phone || "";
              }
            } catch (e) { }
          }
        }
        return plain;
      })
    );
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = (page - 1) * limit;
    const paginatedData = enrichedData.slice(offset, offset + limit);
    const totalPages = Math.ceil(enrichedData.length / limit) || 1;
    return res.json({
      success: true,
      count: enrichedData.length,
      page,
      limit,
      totalPages,
      data: paginatedData
    });
  } catch (error) {
    console.error("Error fetching incoming connection requests:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch incoming requests" });
  }
};
/**
 * Get Connection Status between current user and target user/item
 * GET /connection-requests/status/:targetUserId
 */
export const getConnectionStatus = async (req, res) => {
  try {
    const requesterId = String(req.user.id);
    const { targetUserId } = req.params;
    const { itemId, itemType } = req.query;
    const canonicalTargetUserId = await resolveCanonicalUserId(targetUserId, itemId, itemType);
    if (!canonicalTargetUserId) {
      return res.json({ success: true, status: "none" });
    }
    if (String(canonicalTargetUserId) === requesterId) {
      return res.json({ success: true, status: "self" });
    }
    const existing = await ConnectionRequest.scan()
      .filter("requesterId").eq(requesterId)
      .and()
      .filter("targetUserId").eq(canonicalTargetUserId)
      .exec();
    const existingList = Array.from(existing || []);
    if (existingList.length > 0) {
      const match = itemId
        ? existingList.find(r => String(r.itemId) === String(itemId) && !r.isDeleted)
        : existingList.find(r => !r.isDeleted);
      if (match) {
        const plainMatch = JSON.parse(JSON.stringify(match));
        if (plainMatch.status === "accepted") {
          try {
            const targetUserRec = await User.get(canonicalTargetUserId);
            const targetHostRecs = await Host.scan().filter("user_id").eq(canonicalTargetUserId).exec();
            const targetHost = targetHostRecs?.[0];
            plainMatch.targetEmail = targetHost?.email || targetUserRec?.email || "";
            plainMatch.targetPhone = targetHost?.phone || targetHost?.whatsapp || targetUserRec?.phone || "";
            plainMatch.targetWhatsapp = targetHost?.whatsapp || targetHost?.phone || targetUserRec?.phone || "";
            plainMatch.targetInstagram = targetHost?.instagram || "";
            plainMatch.targetFacebook = targetHost?.facebook || "";
          } catch (e) { }
        }
        return res.json({
          success: true,
          status: plainMatch.status || "pending",
          data: plainMatch
        });
      }
    }
    return res.json({ success: true, status: "none" });
  } catch (error) {
    console.error("Error checking connection status:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to check status" });
  }
};
/**
 * Update Connection Request Status (Accept / Decline with Soft Delete)
 * PATCH /connection-requests/:id/status
 */
export const updateRequestStatus = async (req, res) => {
  try {
    const currentUserId = String(req.user.id);
    const { id } = req.params;
    const { status } = req.body;
    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }
    const requestItem = await ConnectionRequest.get(id);
    if (!requestItem) {
      return res.status(404).json({ success: false, message: "Connection request not found" });
    }
    const reqTargetId = String(requestItem.targetUserId);
    let authorized = reqTargetId === currentUserId;
    if (!authorized) {
      try {
        const hostRec = await Host.get(reqTargetId);
        if (hostRec && String(hostRec.user_id) === currentUserId) {
          authorized = true;
        }
      } catch (e) { }
    }
    if (!authorized) {
      return res.status(403).json({ success: false, message: "Not authorized to update this request" });
    }
    requestItem.status = status;
    // Soft delete on decline
    if (status === "declined") {
      requestItem.isDeleted = true;
      requestItem.deletedAt = new Date().toISOString();
    } else {
      requestItem.isDeleted = false;
      requestItem.deletedAt = "";
    }
    await requestItem.save();
    try {
      const requesterUserRec = await User.get(requestItem.requesterId);
      const isAccepted = status === "accepted";
      const targetDisplayName = req.user?.name || req.user?.full_name || requestItem.targetName || "The owner";
      const verticalLabel = requestItem.itemType ? requestItem.itemType.charAt(0).toUpperCase() + requestItem.itemType.slice(1) : "Listing";
      notifyAndEmail({
        userId: requestItem.requesterId,
        email: requesterUserRec?.email || requestItem.requesterEmail || "",
        type: isAccepted ? "CONNECTION_REQUEST_ACCEPTED" : "CONNECTION_REQUEST_DECLINED",
        title: isAccepted ? `${verticalLabel} Request Accepted!` : `${verticalLabel} Request Declined`,
        message: isAccepted
          ? `${targetDisplayName} accepted your connection request for "${requestItem.itemTitle || "listing"}". Direct contact details are now unlocked!`
          : `${targetDisplayName} declined your connection request for "${requestItem.itemTitle || "listing"}".`,
        metadata: {
          requestId: requestItem.id,
          status,
          targetUserId: currentUserId,
          targetName: targetDisplayName,
          itemId: requestItem.itemId,
          itemTitle: requestItem.itemTitle,
          itemType: requestItem.itemType
        }
      }).catch((e) => console.warn("âš ï¸ Notification status update error:", e.message));
    } catch (e) { }
    return res.json({
      success: true,
      message: `Request status updated to ${status}`,
      data: requestItem
    });
  } catch (error) {
    console.error("Error updating connection request status:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update request status" });
  }
};
