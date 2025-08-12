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

// DELETE /api/admin/contact/:id (admin only)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM contact_messages WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Message not found" });
    }
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

export default router;
