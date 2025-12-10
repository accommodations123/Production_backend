import jwt from "jsonwebtoken";
import Admin from "../model/Admin.js";
import { getCache, setCache } from "../services/cacheService.js";

export default async function adminAuth(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const cacheKey = `admin:${decoded.id}`;

    // try redis first
    const cached = await getCache(cacheKey);
    if (cached) {
      req.admin = cached;
      return next();
    }

    // fallback to DB
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    // cache for next requests
    await setCache(cacheKey, admin, 300);

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid admin token" });
  }
}
