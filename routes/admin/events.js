import pool from "../../config/db.js";
import express from "express";
import auth from "../../middleware/auth.js";
import adminAuth from "../../middleware/admin.js";
const router = express.Router();

// PATCH /api/admin/events/:eventId
router.patch("/:eventId", auth, adminAuth, async (req, res) => {
  const { eventId } = req.params;
  const updateFields = req.body;

  // Only allow certain fields to be updated
  const allowedFields = [
    "title",
    "description",
    "location",
    "start_date",
    "gender",
    "age_group",
    "is_team_event",
    "price_per_person",
    "price_per_team",
    "max_team_size",
    "image_url",
    "hashtags",
    "is_featured",
    "rules_and_guidelines",
  ];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const key of allowedFields) {
    if (updateFields[key] !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updateFields[key]);
      idx++;
    }
  }

  if (setClauses.length === 0) {
    return res.status(400).json({ error: "No valid fields to update." });
  }

  values.push(eventId);

  try {
    const result = await pool.query(
      `UPDATE events SET ${setClauses.join(
        ", "
      )} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    res.json({ success: true, event: result.rows[0] });
  } catch (err) {
    console.error("Error updating event:", err);
    res.status(500).json({ error: "Failed to update event." });
  }
});

export default router;
