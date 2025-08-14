import express from "express";
import pool from "../../config/db.js";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";

const router = express.Router();

// Admin: Get all class registrations
router.get("/all", auth, adminOnly, async (req, res) => {
  try {
    const classRegs = await pool.query(`
      SELECT cr.id, cr.full_name, cr.phone_number, cr.email, cr.age, cr.gender, 
             cr.razorpay_order_id, cr.razorpay_payment_id, cr.amount, cr.status, 
             cr.issue_date, cr.end_date, cr.created_at, 
             u.username as user_name
      FROM class_registrations cr
      LEFT JOIN users u ON cr.user_id = u.id
      ORDER BY cr.created_at DESC
    `);
    return res.json(classRegs.rows);
  } catch (err) {
    console.error("getAllClassRegistrations error:", err);
    res.status(500).json({ error: "Failed to fetch class registrations." });
  }
});

export default router;
