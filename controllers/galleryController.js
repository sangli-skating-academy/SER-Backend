import pool from "../config/db.js";

// Fetch latest gallery items according to the new DB schema (gallery table)
export const getLatestGalleryItems = async (req, res) => {
  try {
    // The new schema: gallery table has id, title, image_url, event_name, date, uploaded_at
    const result = await pool.query(
      `SELECT id, title, image_url, event_name, image_location, date, uploaded_at
       FROM gallery
       ORDER BY date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch gallery items" });
  }
};
