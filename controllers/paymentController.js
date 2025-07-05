import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import pool from "../config/db.js";

dotenv.config();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_ID_KEY;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_SECRET_KEY;

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, phone } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount required" });
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {},
    };
    if (phone) {
      options.notes.phone = phone;
    }
    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create order", details: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationId,
  } = req.body;
  if (!registrationId || isNaN(Number(registrationId))) {
    return res
      .status(400)
      .json({ success: false, error: "Missing or invalid registrationId" });
  }
  const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest("hex");
  if (generatedSignature === razorpay_signature) {
    try {
      // Fetch the registration fee (in rupees) from the registration row
      const regResult = await pool.query(
        `SELECT r.id, r.event_id, e.price_per_person, e.price_per_team, r.registration_type
         FROM registrations r
         JOIN events e ON r.event_id = e.id
         WHERE r.id = $1`,
        [registrationId]
      );
      if (!regResult.rows.length) {
        return res
          .status(404)
          .json({ success: false, error: "Registration not found" });
      }
      const reg = regResult.rows[0];
      let amount = 0;
      if (reg.registration_type === "individual") {
        amount = Number(reg.price_per_person) || 0;
      } else if (reg.registration_type === "team") {
        amount = Number(reg.price_per_team) || 0;
      }
      // 1. Insert payment record with correct amount
      await pool.query(
        `INSERT INTO payments (registration_id, razorpay_order_id, razorpay_payment_id, amount, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          registrationId,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          "success",
        ]
      );
      // 2. Update registration status
      await pool.query(
        `UPDATE registrations SET status = 'confirmed' WHERE id = $1`,
        [registrationId]
      );
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "DB update failed",
        details: err.message,
      });
    }
  } else {
    // Optionally, insert a failed payment record
    if (registrationId && !isNaN(Number(registrationId))) {
      await pool.query(
        `INSERT INTO payments (registration_id, razorpay_order_id, razorpay_payment_id, amount, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [registrationId, razorpay_order_id, razorpay_payment_id, 0, "failed"]
      );
    }
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payments", details: err.message });
  }
};
export const getPaymentById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json({ payment: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payment", details: err.message });
  }
};
export const getPaymentByRegistrationId = async (req, res) => {
  const { registrationId } = req.params;
  if (!registrationId || isNaN(Number(registrationId))) {
    return res.status(400).json({ error: "Invalid registration ID" });
  }
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       WHERE p.registration_id = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [registrationId]
    );
    if (!result.rows.length) {
      return res
        .status(404)
        .json({ error: "Payment not found for this registration" });
    }
    res.json({ payment: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payment", details: err.message });
  }
};
