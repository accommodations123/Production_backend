import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache } from "../services/cacheService.js";

// GET approved snapshot list
export const getApprovedList = async (req, res) => {
  try {
    const country = normalize(req.headers["x-country"] || req.query.country);
    const state = normalize(req.headers["x-state"] || req.query.state);
    const city = normalize(req.headers["x-city"] || req.query.city);
    const zip_code = normalize(req.headers["x-zip-code"] || req.query.zip_code);

    const cacheKey =
      `approved_snapshot_list:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = {};
    if (country) where["property_snapshot.country"] = country;
    if (state) where["property_snapshot.state"] = state;
    if (city) where["property_snapshot.city"] = city;
    if (zip_code) where["property_snapshot.zip_code"] = zip_code;

    const list = await ApprovedHost.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });

    const formatted = list.map(item => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title,
      country: item.property_snapshot?.country,
      state: item.property_snapshot?.state,
      city: item.property_snapshot?.city,
      zip_code: item.property_snapshot?.zip_code,
      street_address: item.property_snapshot?.street_address,
      pricePerNight: item.property_snapshot?.price_per_night,
      photos: item.property_snapshot?.photos,
      ownerName: item.host_snapshot?.full_name,
      ownerEmail: item.host_snapshot?.email,
      ownerPhone: item.host_snapshot?.phone
    }));

    await setCache(cacheKey, formatted, 300);

    return res.json({ success: true, data: formatted });

  } catch (error) {
    console.log("APPROVED LIST ERROR", error);
    return res.status(500).json({ message: "Server error" });
  }
};




// GET approved properties with live host details
export const getApprovedWithHosts = async (req, res) => {
  try {
    console.log("➡️ getApprovedWithHosts HIT");

    const country = req.headers["x-country"] || req.query.country || null;
    const state = req.headers["x-state"] || req.query.state || null;
    const city = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;

    const cacheKey =
      `approved_properties_with_hosts:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = { status: "approved" };
    if (country) where.country = country;
    if (state) where.state = state;
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    const properties = await Property.findAll({
      where,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Host,
          attributes: [
            "id",
            "full_name",
            "status",
            "phone",
            "country",
            "state",
            "city"
          ],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    const plain = properties.map(p => p.toJSON());

    await setCache(cacheKey, plain, 300);

    return res.json({ success: true, data: plain });

  } catch (err) {
    console.error("GET APPROVED W HOSTS ERROR:", err);
    return res.status(500).json({ message: "server error" });
  }
};

