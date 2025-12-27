import Razorpay from "razorpay";
import crypto from "crypto";
import { RAZORPAY_CONFIG } from "../config/config.js";

// Create centralized Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_CONFIG.key_id,
  key_secret: RAZORPAY_CONFIG.key_secret,
});

export default razorpayInstance;

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay order ID
 * @param {string} paymentId - Razorpay payment ID
 * @param {string} signature - Razorpay signature
 * @returns {boolean} True if signature is valid
 */
export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const text = `${orderId}|${paymentId}`;
  const hmac = crypto.createHmac("sha256", RAZORPAY_CONFIG.key_secret);
  hmac.update(text);
  const generatedSignature = hmac.digest("hex");
  return generatedSignature === signature;
}

/**
 * Get Razorpay key ID for frontend
 * @returns {string} Razorpay key ID
 */
export function getRazorpayKeyId() {
  return RAZORPAY_CONFIG.key_id;
}
