import pool from "../config/db.js";

// PATCH /api/teams/:teamId/members
export const updateTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  const { members } = req.body;
  if (!Array.isArray(members)) {
    return res.status(400).json({ error: "Members must be an array." });
  }
  try {
    await pool.query("UPDATE teams SET members = $1 WHERE id = $2", [
      JSON.stringify(members),
      teamId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating team members:", err);
    res.status(500).json({ error: "Failed to update team members." });
  }
};
