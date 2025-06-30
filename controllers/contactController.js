import pool from "../config/db.js";

export const createContactMessage = async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ error: "Name, email, subject, and message are required." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO contact_messages (name, email, phone, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, phone || null, subject, message]
    );
    res.status(201).json({ message: "Message received", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
};

// GET /api/contact-messages (admin only)
export const getAllContactMessages = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, phone, subject, message, created_at FROM contact_messages ORDER BY created_at DESC"
    );
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Database error", details: err.message });
  }
};
