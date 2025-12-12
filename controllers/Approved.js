import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";

import { getCache, setCache } from "../services/cacheService.js";

// GET approved snapshot list
export const getApprovedList = async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await getCache("approved_snapshot_list");
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const list = await ApprovedHost.findAll({
      order: [["createdAt", "DESC"]]
    });

    const formatted = list.map(item => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title,
      city: item.property_snapshot?.city,
      country: item.property_snapshot?.country,
      pricePerNight: item.property_snapshot?.price_per_night,
      photos: item.property_snapshot?.photos,

      ownerName: item.host_snapshot?.full_name,
      ownerEmail: item.host_snapshot?.email,
      ownerPhone: item.host_snapshot?.phone
    }));

    // Cache result for 5 minutes
    await setCache("approved_snapshot_list", formatted, 300);

    return res.json({ success: true, data: formatted });

  } catch (error) {
    console.log("APPROVED LIST ERROR", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET approved properties with live host details
export const getApprovedWithHosts = async (req, res) => {
  try {
    // Check Redis cache first
    const cached = await getCache("approved_properties_with_hosts");
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const properties = await Property.findAll({
      where: { status: "approved" },
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

    // Cache for 5 minutes
    await setCache("approved_properties_with_hosts", properties, 300);

    return res.json({ success: true, data: properties });

  } catch (err) {
    console.log("GET APPROVED W HOSTS ERROR", err);
    return res.status(500).json({ message: "server error" });
  }
};
