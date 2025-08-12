import express from "express";
import {
  registerForClass,
  createClubOrder,
  verifyClubPayment,
} from "../controllers/clubController.js";

const router = express.Router();

// POST /api/club/register - Register for a class
router.post("/register", registerForClass);

// POST /api/club/order - Create Razorpay order for club/class registration
router.post("/order", createClubOrder);

// POST /api/club/verify - Verify Razorpay payment for club/class registration
router.post("/verify", verifyClubPayment);

export default router;
