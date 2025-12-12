import jwt from "jsonwebtoken";
import User from "../model/User.js";

import { getCache, setCache } from "../services/cacheService.js";

export default async function userAuth(req, res, next) {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure token belongs to a user
    if (!decoded || decoded.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = decoded.id;

    // Check Redis cache first
    let user = await getCache(`user:${userId}`);

    if (!user) {
      user = await User.findByPk(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Cache user for 10 minutes
      await setCache(`user:${userId}`, user, 600);
    }

    // OTP verification check
    if (!user.verified) {
      return res.status(401).json({ message: "Please verify your OTP first" });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
