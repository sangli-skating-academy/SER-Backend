import express from "express";
import {
  createOrder,
  verifyPayment,
  getAllPayments,
  getPaymentById,
  getPaymentByRegistrationId,
} from "../controllers/paymentController.js";

const router = express.Router();

// Create Razorpay order
router.post("/order", createOrder);

// Verify payment
router.post("/verify", verifyPayment);

// Get all payments
router.get("/", getAllPayments);

// Get payment by ID
router.get("/:id", getPaymentById);

// Get payment by registration ID
router.get("/by-registration/:registrationId", getPaymentByRegistrationId);
export default router;
