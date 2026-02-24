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

    const ADMIN_ROLES = ["super_admin", "admin", "recruiter"];
    if (!decoded || !ADMIN_ROLES.includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const adminId = decoded.id;

    // Try Redis cache first
    let admin = await getCache(`admin:${adminId}`);

    if (!admin) {
      admin = await Admin.findByPk(adminId);

      if (!admin) {
        return res.status(401).json({ message: "Admin not found" });
      }

      // Cache admin for 10 minutes
      await setCache(`admin:${adminId}`, admin, 600);
    }

    req.admin = admin;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
