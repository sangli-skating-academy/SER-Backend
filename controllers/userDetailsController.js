import pool from "../config/db.js";

// Get user_details for a registration (by registrationId)
export const getUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;
  try {
    // Join user_details, registrations, teams, and events
    const result = await pool.query(
      `SELECT ud.*, r.team_id, t.name as team_name, t.members as team_members, e.is_team_event
       FROM user_details ud
       JOIN registrations r ON ud.id = r.user_details_id
       LEFT JOIN teams t ON r.team_id = t.id
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [registrationId]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User details not found for this registration." });
    }
    const row = result.rows[0];
    let team = null;
    if (row.is_team_event && row.team_id) {
      let members = [];
      if (row.team_members) {
        if (typeof row.team_members === "string") {
          try {
            members = JSON.parse(row.team_members);
          } catch {
            members = [];
          }
        } else if (
          Array.isArray(row.team_members) ||
          typeof row.team_members === "object"
        ) {
          members = row.team_members;
        }
      }
      team = {
        id: row.team_id,
        name: row.team_name,
        members,
      };
    }
    // Remove team fields from user_details object
    const {
      team_id,
      team_name,
      team_members,
      is_team_event,
      ...userDetails
    } = row;
    res.json({ ...userDetails, team });
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
