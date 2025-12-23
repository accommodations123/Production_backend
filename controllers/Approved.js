import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache } from "../services/cacheService.js";

// GET approved snapshot list
export const getApprovedList = async (req, res) => {
  try {
    const { country, city, zip_code } = req.query;

    const cacheKey = `approved_snapshot_list:${country || "all"}:${city || "all"}:${zip_code || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = {};
    if (country) where["property_snapshot.country"] = country;
    if (city) where["property_snapshot.city"] = city;
    if (zip_code) where["property_snapshot.zip_code"] = zip_code;

    const list = await ApprovedHost.findAll({
      where,
      order: [["createdAt", "DESC"]]
    });

    const formatted = list.map(item => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title,
      city: item.property_snapshot?.city,
      country: item.property_snapshot?.country,
      zip_code: item.property_snapshot?.zip_code,
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
    const { country, city, zip_code } = req.query;

    const cacheKey = `approved_properties_with_hosts:${country || "all"}:${city || "all"}:${zip_code || "all"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = { status: "approved" };
    if (country) where.country = country;
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    const properties = await Property.findAll({
      where,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: Host,
          attributes: ["id", "full_name", "status", "phone"],
          include: [
            {
              model: User,
              attributes: ["id", "email"]
            }
          ]
        }
      ]
    });

    await setCache(cacheKey, properties, 300);

    return res.json({ success: true, data: properties });

  } catch (err) {
    console.log("GET APPROVED W HOSTS ERROR", err);
    return res.status(500).json({ message: "server error" });
  }
};

