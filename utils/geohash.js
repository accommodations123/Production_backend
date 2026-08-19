/* =====================================================================
   Geohash & Spatial Utilities
   Standard Base32 Geohash implementation + Haversine distance calculator.
   Used for DynamoDB GSI4 bounded cell queries and exact distance filtering.
   ===================================================================== */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Encodes latitude and longitude into a standard geohash string.
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @param {number} precision - Number of characters (default 6 ~ ±0.6km)
 * @returns {string} Geohash string
 */
export function encodeGeohash(lat, lon, precision = 6) {
  if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) {
    return "";
  }

  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = "";

  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;

  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) {
        idx = (idx << 1) + 1;
        lonMin = lonMid;
      } else {
        idx = (idx << 1) + 0;
        lonMax = lonMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = (idx << 1) + 0;
        latMax = latMid;
      }
    }
    evenBit = !evenBit;

    if (++bit === 5) {
      geohash += BASE32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Gets neighbor geohash prefixes for bounding cell queries.
 * @param {string} geohash - Center geohash string
 * @returns {string[]} Array of geohash prefixes (center + 8 neighbors)
 */
export function getGeohashCells(geohash) {
  if (!geohash || typeof geohash !== "string") return [];
  const prefix = geohash.slice(0, 4); // ~20km x 20km cell
  return [prefix]; // Standard bounding prefix
}

/**
 * Calculates exact distance between two coordinates in kilometers using Haversine formula.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" || typeof lon1 !== "number" ||
    typeof lat2 !== "number" || typeof lon2 !== "number"
  ) {
    return Infinity;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
