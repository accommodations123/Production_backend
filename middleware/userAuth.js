import jwt from "jsonwebtoken";
import User from "../model/User.js";
import { getCache, setCache } from "../services/cacheService.js";

export default async function userAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id || decoded.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = decoded.id;
    const cacheKey = `user:auth:${userId}`;

    // 1️⃣ Try Redis
    let user = await getCache(cacheKey);

    if (!user) {
      // 2️⃣ Fallback to DB (authoritative)
      const dbUser = await User.findByPk(userId, {
        attributes: ["id", "verified"]
      });

      if (!dbUser) {
        return res.status(401).json({ message: "User not found" });
      }

      user = {
        id: dbUser.id,
        verified: dbUser.verified,
        role: "user"
      };

      // 3️⃣ Cache briefly
      await setCache(cacheKey, user, 90); // 90 seconds
    }

    if (!user.verified) {
      return res.status(401).json({ message: "Please verify your OTP first" });
    }

    req.user = {
      id: user.id,
      role: user.role
    };

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
