import Host from "../model/Host.js";
import User from "../model/User.js";

/**
 * Splits an array into chunks of a given size.
 */
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fetches multiple hosts in batches of 100 (DynamoDB limit).
 * @param {string[]} hostIds - Array of host IDs
 * @returns {Promise<any[]>} Array of host objects
 */
export const batchGetHosts = async (hostIds) => {
  if (!hostIds || hostIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(hostIds)).filter(Boolean);
  const chunks = chunkArray(uniqueIds, 100);
  const results = [];
  
  for (const chunk of chunks) {
    try {
      const batch = await Host.batchGet(chunk);
      results.push(...batch);
    } catch (err) {
      console.error("❌ Error batch fetching hosts:", err);
      // Fallback: fetch sequentially to prevent crashing the batch flow
      for (const id of chunk) {
        try {
          const host = await Host.get(id);
          if (host) results.push(host);
        } catch (singleErr) {
          console.error(`❌ Fallback failed for host ID ${id}:`, singleErr);
        }
      }
    }
  }
  
  return results.filter(Boolean);
};

/**
 * Fetches multiple users in batches of 100 (DynamoDB limit).
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<any[]>} Array of user objects
 */
export const batchGetUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  const chunks = chunkArray(uniqueIds, 100);
  const results = [];
  
  for (const chunk of chunks) {
    try {
      const batch = await User.batchGet(chunk);
      results.push(...batch);
    } catch (err) {
      console.error("❌ Error batch fetching users:", err);
      // Fallback: fetch sequentially
      for (const id of chunk) {
        try {
          const user = await User.get(id);
          if (user) results.push(user);
        } catch (singleErr) {
          console.error(`❌ Fallback failed for user ID ${id}:`, singleErr);
        }
      }
    }
  }
  
  return results.filter(Boolean);
};
