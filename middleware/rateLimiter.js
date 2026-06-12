// Rate Limiters bypassed for testing/development
export const rateLimit = (req, res, next) => next();
export const postRateLimit = (req, res, next) => next();
export const resourceRateLimit = (req, res, next) => next();
export const eventJoinLimiter = (req, res, next) => next();
export const adminLoginRateLimit = (req, res, next) => next();
export const otpSendRateLimit = (req, res, next) => next();
export const creationRateLimit = (req, res, next) => next();
export const contactRateLimit = (req, res, next) => next();
