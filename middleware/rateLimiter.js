import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { getRedisClient, getRedisConnected } from "../services/cacheService.js";

const isDev = process.env.NODE_ENV !== "production";
const disableLimiter = process.env.DISABLE_RATE_LIMITER === "true";

// Generic middleware factory with dynamic Redis/Memory routing
const makeRateLimiterMiddleware = (limiterName, points = 15, duration = 60, keyResolver = (req) => req.ip) => {
  let redisLimiter = null;
  let memoryLimiter = null;

  return async (req, res, next) => {
    // Development/testing bypass switch
    if (disableLimiter || (isDev && process.env.ENABLE_LIMITERS_IN_DEV !== "true")) {
      return next();
    }

    try {
      const isRedisConnected = getRedisConnected();
      const redisClient = getRedisClient();
      let activeLimiter;

      if (isRedisConnected && redisClient) {
        if (!redisLimiter) {
          redisLimiter = new RateLimiterRedis({
            storeClient: redisClient,
            keyPrefix: `rl:${limiterName}:`,
            points,
            duration,
          });
        }
        activeLimiter = redisLimiter;
      } else {
        if (!memoryLimiter) {
          memoryLimiter = new RateLimiterMemory({
            points,
            duration,
          });
        }
        activeLimiter = memoryLimiter;
      }

      const key = keyResolver(req);
      await activeLimiter.consume(key);
      next();
    } catch (rejRes) {
      const retrySecs = rejRes.msBeforeNext ? Math.ceil(rejRes.msBeforeNext / 1000) : 60;
      res.set("Retry-After", String(retrySecs));
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfterSeconds: retrySecs
      });
    }
  };
};

export const rateLimit = makeRateLimiterMiddleware("rateLimit", 15, 60);
export const postRateLimit = makeRateLimiterMiddleware("postLimit", 15, 60, (req) => req.user?.id || req.ip);
export const resourceRateLimit = makeRateLimiterMiddleware("resourceLimit", 15, 60, (req) => req.user?.id || req.ip);
export const eventJoinLimiter = makeRateLimiterMiddleware("eventJoinLimit", 15, 60, (req) => `${req.user?.id || req.ip}:${req.params.id || ""}`);
export const adminLoginRateLimit = makeRateLimiterMiddleware("adminLoginLimit", 15, 60);
export const otpSendRateLimit = makeRateLimiterMiddleware("otpSendLimit", 15, 60);
export const creationRateLimit = makeRateLimiterMiddleware("creationLimit", 15, 60, (req) => req.user?.id || req.ip);
export const contactRateLimit = makeRateLimiterMiddleware("contactLimit", 15, 60);

