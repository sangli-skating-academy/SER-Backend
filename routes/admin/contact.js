import pool from "../../config/db.js";
import express from "express";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";
const router = express.Router();

// GET /api/admin/contact/all (admin only)
router.get("/all", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, subject, message, created_at FROM contact_messages ORDER BY created_at DESC"
    );
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;
