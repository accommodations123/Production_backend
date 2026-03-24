import jwt from "jsonwebtoken";
import { getCache } from "../services/cacheService.js";

/* ============================================================
   OPTIONAL AUTH MIDDLEWARE (PRODUCTION SAFE)
   - Never blocks requests
   - Never trusts cache blindly
============================================================ */
export default async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.access_token;

    // 1️⃣ No token → guest
    if (!token) {
      req.user = null;
      return next();
    }

    // 2️⃣ If userAuth already set req.user, don't overwrite
    if (req.user?.id) {
      return next();
    }

    // 3️⃣ Verify token (access tokens only)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      req.user = null;
      return next();
    }

    // DynamoDB uses UUID strings — do NOT convert to Number
    const userId = String(decoded.id);

    // 4️⃣ Cache lookup (optimization only)
    const cachedUser = await getCache(`user:${userId}`);

    if (cachedUser && String(cachedUser.id) === userId) {
      // Trust only minimal, non-privileged fields
      req.user = {
        id: cachedUser.id,
        role: cachedUser.role || "user"
      };
    } else {
      // 5️⃣ Safe fallback (token is source of truth)
      req.user = {
        id: userId,
        role: decoded.role || "user"
      };
    }

    return next();
  } catch (err) {
    // Invalid / expired token → guest
    if (process.env.NODE_ENV !== "production") {
      console.warn("OptionalAuth token rejected:", err.message);
    }

    req.user = null;
    return next();
  }
}
