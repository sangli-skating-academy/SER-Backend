/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse, brute force attacks, and spam
 *
 * Rate Limits:
 * - General API: 100 requests per 15 minutes
 * - Authentication: 5 attempts per 15 minutes
 * - Contact Form: 3 submissions per hour
 * - Payment Creation: 10 requests per hour
 */

import rateLimit from "express-rate-limit";

/**
 * General Rate Limiter
 * Applied to all API routes
 * Prevents general API abuse
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many requests from this IP, please try again after 15 minutes.",
    });
  },
});

/**
 * Strict Authentication Rate Limiter
 * Applied to login and register endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many login attempts from this IP. Please try again after 15 minutes.",
    });
  },
});

/**
 * Contact Form Rate Limiter
 * Prevents spam on contact form
 */
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 submissions per hour
  message: {
    success: false,
    message: "Too many contact form submissions, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "You have reached the maximum number of contact form submissions. Please try again after 1 hour.",
    });
  },
});

/**
 * Payment Creation Rate Limiter
 * Prevents abuse of payment endpoints
 * Applied to payment order creation endpoints
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    success: false,
    message: "Too many payment requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many payment requests from this IP. Please try again after 1 hour.",
    });
  },
});

/**
 * Admin Operations Rate Limiter
 * Applied to admin-specific operations (create, update, delete)
 * More relaxed than auth limiter but still protective
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: "Too many admin operations, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many admin operations from this IP. Please try again after 15 minutes.",
    });
  },
});

/**
 * Registration Rate Limiter
 * Applied to event and class registration endpoints
 * Prevents spam registrations
 */
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registrations per hour
  message: {
    success: false,
    message: "Too many registration attempts, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        "Too many registration attempts from this IP. Please try again after 1 hour.",
    });
  },
});
