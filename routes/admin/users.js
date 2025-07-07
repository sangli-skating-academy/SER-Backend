import express from "express";
import pool from "../../config/db.js";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";

const router = express.Router();

// @route   GET /api/users (admin only)
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, phone, role, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch users.", details: err.message });
  }
});

export default router;
