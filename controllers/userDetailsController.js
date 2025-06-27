import pool from "../config/db.js";

// Get user_details for a registration (by registrationId)
export const getUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;
  try {
    const result = await pool.query(
      `SELECT ud.* FROM user_details ud
       JOIN registrations r ON ud.id = r.user_details_id
       WHERE r.id = $1`,
      [registrationId]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User details not found for this registration." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user_details for a registration (by registrationId)
export const updateUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;
  const fields = req.body;
  try {
    // Get user_details_id for this registration
    const regResult = await pool.query(
      "SELECT user_details_id FROM registrations WHERE id = $1",
      [registrationId]
    );
    if (regResult.rows.length === 0 || !regResult.rows[0].user_details_id) {
      return res
        .status(404)
        .json({ message: "User details not found for this registration." });
    }
    const userDetailsId = regResult.rows[0].user_details_id;
    // Build dynamic update query
    const setClause = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 2}`)
      .join(", ");
    const values = [userDetailsId, ...Object.values(fields)];
    const updateQuery = `UPDATE user_details SET ${setClause} WHERE id = $1 RETURNING *`;
    const updateResult = await pool.query(updateQuery, values);
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error("Error updating user details:", err);
    res.status(500).json({ message: "Server error" });
  }
};
