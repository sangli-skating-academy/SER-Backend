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

// Create Razorpay order for club/class registration
export const createClubOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, phone } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount required" });
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: receipt || `club_rcpt_${Date.now()}`,
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

// Verify Razorpay payment for club/class registration
export const verifyClubPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationId,
  } = req.body;
  // registrationId is the class_registrations id
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
      // Fetch the registration row
      const regResult = await pool.query(
        `SELECT id FROM class_registrations WHERE id = $1`,
        [registrationId]
      );
      if (!regResult.rows.length) {
        return res
          .status(404)
          .json({ success: false, error: "Registration not found" });
      }
      // Update payment details and status in class_registrations
      await pool.query(
        `UPDATE class_registrations SET razorpay_order_id = $1, razorpay_payment_id = $2, status = 'success' WHERE id = $3`,
        [razorpay_order_id, razorpay_payment_id, registrationId]
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
    // On failed payment, update status to failed
    if (registrationId && !isNaN(Number(registrationId))) {
      await pool.query(
        `UPDATE class_registrations SET status = 'failed' WHERE id = $1`,
        [registrationId]
      );
    }
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }
};

export const registerForClass = async (req, res) => {
  try {
    const {
      user_id,
      full_name,
      phone_number,
      email,
      age,
      gender,
      razorpay_order_id,
      razorpay_payment_id,
      amount,
      status,
      issue_date,
      end_date,
    } = req.body;
    if (!user_id || !full_name || !phone_number || !email || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const result = await pool.query(
      `INSERT INTO class_registrations (user_id, full_name, phone_number, email, age, gender, razorpay_order_id, razorpay_payment_id, amount, status, issue_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        user_id,
        full_name,
        phone_number,
        email,
        age,
        gender,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        status || "success",
        issue_date,
        end_date,
      ]
    );
    res.status(201).json({ registration: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

export const getUserMemberships = async (req, res) => {
  const userId = req.params.userId;
  try {
    const result = await pool.query(
      `SELECT * FROM class_registrations WHERE user_id = $1 AND status = 'success' ORDER BY issue_date DESC`,
      [userId]
    );
    // Return empty array instead of 404 when no memberships found
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch memberships",
      details: err.message,
    });
  }
};
