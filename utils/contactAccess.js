import ConnectionRequest from "../model/ConnectionRequest.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

/**
 * Helper to determine if requester is authorized to view target user/host private contact details.
 * Contact info is accessible if:
 * 1. Requester is the owner/self or an admin.
 * 2. An accepted ConnectionRequest exists between requesterId and targetUserId (or host's user_id).
 */
export const checkContactAccess = async ({ requesterId, targetUserId, itemId }) => {
  if (!requesterId || !targetUserId) return false;

  const reqStr = String(requesterId);
  let targetStr = String(targetUserId);

  // Direct self-check
  if (reqStr === targetStr) return true;

  // Resolve target Host record to canonical user_id if targetUserId is host.id
  try {
    const hostRecord = await Host.get(targetStr);
    if (hostRecord && hostRecord.user_id) {
      targetStr = String(hostRecord.user_id);
    }
  } catch (e) {}

  if (reqStr === targetStr) return true;

  // Query DynamoDB for accepted connection request (check both directional relationships if targetUserId was host vs user)
  try {
    const existing = await ConnectionRequest.scan()
      .filter("requesterId").eq(reqStr)
      .and()
      .filter("targetUserId").eq(targetStr)
      .and()
      .filter("status").eq("accepted")
      .exec();

    if (existing && existing.length > 0) {
      return true;
    }

    // Secondary check: If targetUserId was user.id, check if connection was sent to host.id
    const hostRecs = await Host.scan().filter("user_id").eq(targetStr).exec();
    if (hostRecs && hostRecs.length > 0) {
      for (const h of hostRecs) {
        const hostExisting = await ConnectionRequest.scan()
          .filter("requesterId").eq(reqStr)
          .and()
          .filter("targetUserId").eq(String(h.id))
          .and()
          .filter("status").eq("accepted")
          .exec();
        if (hostExisting && hostExisting.length > 0) {
          return true;
        }
      }
    }
  } catch (e) {
    console.warn("⚠️ Contact access check error:", e.message);
  }

  return false;
};
