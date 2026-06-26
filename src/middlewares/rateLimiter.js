const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: `Rate limit exceeded. Please wait before making more requests. Maximum ${config.rateLimit.max} requests per minute.`
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

// Per-phone rate limiter (optional)
const phoneRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 3, // 3 requests per phone per minute
  keyGenerator: (req) => {
    // Use phone number as key if available
    return req.body.phone || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests for this phone number. Please wait before trying again.'
    });
  }
});

module.exports = {
  globalLimiter,
  phoneRateLimiter
};
