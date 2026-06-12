import { RateLimiterMemory } from "rate-limiter-flexible";

// 1. General Rate Limiter (100 requests per minute per IP)
const generalLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60
});

export const rateLimit = async (req, res, next) => {
  try {
    await generalLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ message: "Too many requests. Please try again later." });
  }
};

// 2. Post Rate Limiter (Max 10 posts per minute per user/IP)
const postLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60
});

export const postRateLimit = async (req, res, next) => {
  try {
    const key = req.user ? `post:${req.user.id}` : `post:${req.ip}`;
    await postLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ message: "You are posting too fast. Please wait a minute." });
  }
};

// 3. Resource Upload Rate Limiter (Max 5 resource uploads per minute per user/IP)
const resourceLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60
});

export const resourceRateLimit = async (req, res, next) => {
  try {
    const key = req.user ? `resource:${req.user.id}` : `resource:${req.ip}`;
    await resourceLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ message: "Too many resource uploads. Please wait a minute." });
  }
};

// 4. Event Join/Leave Limiter (Max 5 join/leave requests per minute per user/IP)
const eventLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60
});

export const eventJoinLimiter = async (req, res, next) => {
  try {
    const key = `event_join:${req.user?.id || req.ip}:${req.params.id}`;
    await eventLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ success: false, message: "Too many join/leave requests. Please try again later." });
  }
};

// 5. Admin Login Limiter (5 attempts / 15 min per IP+email)
const adminLoginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
  blockDuration: 15 * 60
});

export const adminLoginRateLimit = async (req, res, next) => {
  try {
    const email = req.body.email ? String(req.body.email).toLowerCase().trim() : "";
    const key = `admin_login:${email}_${req.ip}`;
    await adminLoginLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ message: "Too many login attempts. Account is temporarily locked. Try again in 15 minutes." });
  }
};

// 6. Send OTP Rate Limiter (1 request / 60s per email+IP, max 5/hour)
const otpSendMinLimiter = new RateLimiterMemory({
  points: 1,
  duration: 60
});

const otpSendHourLimiter = new RateLimiterMemory({
  points: 5,
  duration: 3600
});

export const otpSendRateLimit = async (req, res, next) => {
  try {
    const email = req.body.email ? String(req.body.email).toLowerCase().trim() : "";
    const key = `otp_send:${email}_${req.ip}`;
    
    // Check 60s limit
    await otpSendMinLimiter.consume(key, 1);
    // Check hour limit
    try {
      await otpSendHourLimiter.consume(key, 1);
    } catch {
      await otpSendMinLimiter.reward(key, 1).catch(() => {});
      return res.status(429).json({ message: "Too many OTP requests. Max 5 requests per hour." });
    }
    next();
  } catch {
    return res.status(429).json({ message: "Please wait 60 seconds before requesting another OTP." });
  }
};

// 7. Creation Rate Limiter (Max 10 mutation requests per hour per user/IP)
const creationLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600
});

export const creationRateLimit = async (req, res, next) => {
  try {
    const key = req.user ? `creation:${req.user.id}` : `creation:${req.ip}`;
    await creationLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ message: "You have exceeded the creation limit of 10 requests per hour." });
  }
};

// 8. Contact Rate Limiter (Max 3 contact submissions per hour per IP)
const contactLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600
});

export const contactRateLimit = async (req, res, next) => {
  try {
    const key = `contact:${req.ip}`;
    await contactLimiter.consume(key, 1);
    next();
  } catch {
    return res.status(429).json({ message: "Too many contact submissions. Max 3 submissions per hour." });
  }
};
