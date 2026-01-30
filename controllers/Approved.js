import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { Op, Sequelize } from "sequelize";
import { getCache, setCache } from "../services/cacheService.js";



/* ─────────────────────────────
   UTILS
───────────────────────────── */
const normalize = (value) => {
  if (!value || typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v.length ? v : null;
};

const safe = (v) => v ?? "all";

/* ─────────────────────────────
   GET APPROVED SNAPSHOT LIST
───────────────────────────── */
export const getApprovedList = async (req, res) => {
  try {
    const country = normalize(req.headers["x-country"] || req.query.country);
    const state = normalize(req.headers["x-state"] || req.query.state);
    const city = normalize(req.headers["x-city"] || req.query.city);
    const zip_code = normalize(req.headers["x-zip-code"] || req.query.zip_code);

    const cacheKey = `approved_snapshot_list:${safe(country)}:${safe(state)}:${safe(city)}:${safe(zip_code)}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const where = {};
    const and = [];

    if (country) {
      and.push(
        Sequelize.where(
          Sequelize.fn("JSON_EXTRACT", Sequelize.col("property_snapshot"), "$.country"),
          country
        )
      );
    }

    if (state) {
      and.push(
        Sequelize.where(
          Sequelize.fn("JSON_EXTRACT", Sequelize.col("property_snapshot"), "$.state"),
          state
        )
      );
    }

    if (city) {
      and.push(
        Sequelize.where(
          Sequelize.fn("JSON_EXTRACT", Sequelize.col("property_snapshot"), "$.city"),
          city
        )
      );
    }

    if (zip_code) {
      and.push(
        Sequelize.where(
          Sequelize.fn("JSON_EXTRACT", Sequelize.col("property_snapshot"), "$.zip_code"),
          zip_code
        )
      );
    }

    if (and.length) {
      where[Op.and] = and;
    }

    const list = await ApprovedHost.findAll({
      where,
      order: [["created_at", "DESC"]]
    });

    const formatted = list.map(item => ({
      propertyId: item.property_id,
      title: item.property_snapshot?.title ?? null,
      country: item.property_snapshot?.country ?? null,
      state: item.property_snapshot?.state ?? null,
      city: item.property_snapshot?.city ?? null,
      zip_code: item.property_snapshot?.zip_code ?? null,
      street_address: item.property_snapshot?.street_address ?? null,
      pricePerNight: item.property_snapshot?.price_per_night ?? null,
      photos: item.property_snapshot?.photos ?? [],
      ownerName: item.host_snapshot?.full_name ?? null,
      ownerEmail: item.host_snapshot?.email ?? null,
      ownerPhone: item.host_snapshot?.phone ?? null
    }));

    await setCache(cacheKey, formatted, 300);

    return res.json({ success: true, data: formatted });

  } catch (err) {
    console.error("APPROVED LIST ERROR:", err);
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

