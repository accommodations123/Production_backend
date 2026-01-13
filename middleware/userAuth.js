import jwt from "jsonwebtoken";
import User from "../model/User.js";
import { getCache, setCache } from "../services/cacheService.js";

export default async function userAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || decoded.role !== "user")
      return res.status(403).json({ message: "Access denied" });

    const userId = Number(decoded.id);

    // 1️⃣ Try cache
    const cachedUser = await getCache(`user:${userId}`);
    if (cachedUser?.verified === true) {
      req.user = cachedUser;
      return next();
    }

    // 2️⃣ Load from DB
    const dbUser = await User.findByPk(userId, {
      attributes: ["id", "email", "name", "profile_image", "verified", "role"]
    });

    if (!dbUser) return res.status(401).json({ message: "User not found" });
    if (!dbUser.verified) return res.status(401).json({ message: "Verify OTP first" });

    const userJson = dbUser.toJSON();

    // 3️⃣ Cache full user
    await setCache(`user:${userId}`, userJson, 600);

    req.user = userJson;
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    return res.status(401).json({ message: "Session expired" });
  }
}
