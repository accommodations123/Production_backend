import ApprovedHost from "../model/Approved.js";
import Property from "../model/Property.js";
import Host from "../model/Host.js";
import User from "../model/User.js";
import { Op, Sequelize } from "sequelize";
import { getCache, setCache } from "../services/cacheService.js";

/* ───────────────── UTILITIES ───────────────── */

const normalize = (v) => {
  if (!v || typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return s.length ? s : null;
};

const safe = (v) => (v ? v : "all");

/* ───────────────── ADMIN SNAPSHOT LIST ───────────────── */

export const getApprovedList = async (req, res) => {
  console.log("➡️ [getApprovedList] HIT");

  try {
    console.log("🧾 Headers:", {
      country: req.headers["x-country"],
      state: req.headers["x-state"],
      city: req.headers["x-city"],
      zip: req.headers["x-zip-code"]
    });

    const country = normalize(req.headers["x-country"] || req.query.country);
    const state   = normalize(req.headers["x-state"] || req.query.state);
    const city    = normalize(req.headers["x-city"] || req.query.city);
    const zip     = normalize(req.headers["x-zip-code"] || req.query.zip_code);

    console.log("📍 Normalized filters:", { country, state, city, zip });

    const cacheKey =
      `approved_snapshot_list:${safe(country)}:${safe(state)}:${safe(city)}:${safe(zip)}`;

    console.log("🧠 Cache key:", cacheKey);

    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("⚡ Cache HIT");
      return res.json({ success: true, data: cached });
    }

    console.log("❌ Cache MISS – querying DB");

    /* ───────── JSON FILTERS ───────── */

    const conditions = [];

    const jsonEq = (path, value) => {
      console.log("🔎 JSON filter:", path, "=", value);
      return Sequelize.where(
        Sequelize.fn(
          "JSON_UNQUOTE",
          Sequelize.fn(
            "JSON_EXTRACT",
            Sequelize.col("approved_hosts.property_snapshot"),
            path
          )
        ),
        value
      );
    };

    if (country) conditions.push(jsonEq("$.country", country));
    if (state)   conditions.push(jsonEq("$.state", state));
    if (city)    conditions.push(jsonEq("$.city", city));
    if (zip)     conditions.push(jsonEq("$.zip_code", zip));

    const where = conditions.length ? { [Op.and]: conditions } : {};

    console.log("🧩 Sequelize WHERE:", JSON.stringify(where));

    console.log("🚀 Executing ApprovedHost.findAll()");
    const list = await ApprovedHost.findAll({
      where,
      order: [["created_at", "DESC"]]
    });

    console.log("📦 DB rows fetched:", list.length);

    const formatted = list.map((item, i) => {
      if (i === 0) {
        console.log("🧪 Sample row snapshot:", item.property_snapshot);
      }

      return {
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
        ownerPhone: item.host_snapshot?.phone ?? null,
        approvedAt: item.approved_at
      };
    });

    console.log("💾 Caching result:", formatted.length);
    await setCache(cacheKey, formatted, 300);

    console.log("✅ getApprovedList SUCCESS");
    return res.json({ success: true, data: formatted });

  } catch (err) {
    console.error("❌ getApprovedList ERROR");
    console.error(err); // IMPORTANT: full stack trace
    return res.status(500).json({ message: "Server error" });
  }
};

/* ───────────────── LIVE APPROVED + HOST DETAILS ───────────────── */

export const getApprovedWithHosts = async (req, res) => {
  console.log("➡️ [getApprovedWithHosts] HIT");

  try {
    const country  = req.headers["x-country"] || req.query.country || null;
    const state    = req.headers["x-state"] || req.query.state || null;
    const city     = req.headers["x-city"] || req.query.city || null;
    const zip_code = req.headers["x-zip-code"] || req.query.zip_code || null;

    console.log("📍 Filters:", { country, state, city, zip_code });

    const cacheKey =
      `approved_properties_with_hosts:${country || "all"}:${state || "all"}:${city || "all"}:${zip_code || "all"}`;

    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("⚡ Cache HIT");
      return res.json({ success: true, data: cached });
    }

    console.log("❌ Cache MISS – querying Property");

    const where = {
      status: "approved",
      is_deleted: false,
      is_expired: false,
      listing_expires_at: {
        [Op.gt]: new Date()
      }
    };

    if (country) where.country = country;
    if (state) where.state = state;
    if (city) where.city = city;
    if (zip_code) where.zip_code = zip_code;

    console.log("🧩 Property WHERE:", where);

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

    console.log("📦 Properties fetched:", properties.length);

    const plain = properties.map(p => p.toJSON());

    await setCache(cacheKey, plain, 300);

    console.log("✅ getApprovedWithHosts SUCCESS");
    return res.json({ success: true, data: plain });

  } catch (err) {
    console.error("❌ getApprovedWithHosts ERROR");
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
