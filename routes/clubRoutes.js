import express from "express";
import {
  registerForClass,
  createClubOrder,
  verifyClubPayment,
  getUserMemberships,
} from "../controllers/clubController.js";
import {
  paymentLimiter,
  registrationLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /api/club/register - Register for a class
// Apply rate limiting to prevent spam registrations (5 per hour)
router.post("/register", registrationLimiter, registerForClass);

// POST /api/club/order - Create Razorpay order for club/class registration
// Apply rate limiting to prevent payment abuse (10 per hour)
router.post("/order", paymentLimiter, createClubOrder);

// POST /api/club/verify - Verify Razorpay payment for club/class registration
router.post("/verify", verifyClubPayment);

// GET /api/club/membership/:userId - Get memberships for a user
router.get("/membership/:userId", getUserMemberships);

export default router;
