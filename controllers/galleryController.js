import pool from "../config/db.js";

export const getLatestGalleryItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*, e.title as event_title
       FROM gallery g
       LEFT JOIN events e ON g.event_id = e.id
       ORDER BY g.uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery items" });
  }
};
