import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { getRedisClient, getRedisConnected } from "../services/cacheService.js";

const isDev = process.env.NODE_ENV !== "production";
const disableLimiter = process.env.DISABLE_RATE_LIMITER === "true";

// Helper to create rate limiter instances dynamically based on Redis status
const createLimiterInstance = (points = 15, duration = 60) => {
  const opts = {
    points,
    duration,
  };

  const isRedisConnected = getRedisConnected();
  const redisClient = getRedisClient();

  if (isRedisConnected && redisClient) {
    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "rl:",
      ...opts
    });
  }
  return new RateLimiterMemory(opts);
};

// Generic middleware factory
const makeRateLimiterMiddleware = (limiterName, points = 15, duration = 60, keyResolver = (req) => req.ip) => {
  let limiter = null;

  return async (req, res, next) => {
    // Development/testing bypass switch
    if (disableLimiter || (isDev && process.env.ENABLE_LIMITERS_IN_DEV !== "true")) {
      return next();
    }

    try {
      // Lazily instantiate to ensure Redis status is correctly detected after connection
      if (!limiter) {
        limiter = createLimiterInstance(points, duration);
      }

      const key = `${limiterName}:${keyResolver(req)}`;
      await limiter.consume(key);
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

