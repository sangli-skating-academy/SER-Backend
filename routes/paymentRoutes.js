import express from "express";
import {
  createOrder,
  verifyPayment,
  getAllPayments,
  getPaymentById,
  getPaymentByRegistrationId,
} from "../controllers/paymentController.js";
import { paymentLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Create Razorpay order
// Apply rate limiting to prevent payment abuse (10 per hour)
router.post("/order", paymentLimiter, createOrder);

// Verify payment
router.post("/verify", verifyPayment);

// Get all payments
router.get("/", getAllPayments);

// Get payment by ID
router.get("/:id", getPaymentById);

// Get payment by registration ID
router.get("/by-registration/:registrationId", getPaymentByRegistrationId);
export default router;
