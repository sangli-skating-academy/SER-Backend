import pool from "../config/db.js";

// Get all events (optionally filter by age group, featured, etc.)
export const getEvents = async (req, res, next) => {
  try {
    let query = "SELECT * FROM events";
    const params = [];
    const { ageGroup, featured, includePast } = req.query;
    const conditions = [];

    if (ageGroup) {
      conditions.push("age_group = $" + (params.length + 1));
      params.push(ageGroup);
    }
    if (featured === "true") {
      conditions.push("is_featured = $" + (params.length + 1));
      params.push(true);
    }
    // Only show future events unless includePast=true
    if (includePast !== "true") {
      conditions.push("start_date >= CURRENT_DATE");
    }
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY start_date ASC";
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// Get a single event by ID
export const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM events WHERE id = $1", [
      id,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
