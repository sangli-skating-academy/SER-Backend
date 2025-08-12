import express from "express";
import {
  registerForClass,
  createClubOrder,
  verifyClubPayment,
  getUserMemberships,
} from "../controllers/clubController.js";

const router = express.Router();

// POST /api/club/register - Register for a class
router.post("/register", registerForClass);

// POST /api/club/order - Create Razorpay order for club/class registration
router.post("/order", createClubOrder);

// POST /api/club/verify - Verify Razorpay payment for club/class registration
router.post("/verify", verifyClubPayment);

// GET /api/club/membership/:userId - Get memberships for a user
router.get("/membership/:userId", getUserMemberships);

export default router;
