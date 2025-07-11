// Controller for event registration (individual/team)
import pool from "../config/db.js";
import path from "path";
import fs from "fs";

export async function registerForEvent(req, res) {
  try {
    const userId = req.user.id;
    const {
      eventId,
      registrationType, // 'individual' or 'team'
      teamName,
      teamMembers, // JSON stringified array for team
      ...userDetails
    } = req.body;

    // Aadhaar image renaming logic
    let aadhaarImage = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const randomStr = Math.random().toString(36).substring(2, 10);
      const newFilename = `${userId}-${randomStr}-${Date.now()}${ext}`;
      const destPath = path.join(path.dirname(req.file.path), newFilename);
      fs.renameSync(req.file.path, destPath);
      aadhaarImage = destPath;
    }

    // Check if event is team event
    const event = await pool.query("SELECT * FROM events WHERE id = $1", [
      eventId,
    ]);
    if (!event.rows.length)
      return res.status(404).json({ error: "Event not found" });
    const isTeamEvent = event.rows[0].is_team_event;

    // Individual: prevent duplicate registration (except for coaches)
    if (registrationType === "individual") {
      // Allow coaches to register multiple times for the same event
      const userRoleRes = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [userId]
      );
      const userRole = userRoleRes.rows[0]?.role;
      if (userRole !== "coach") {
        const existing = await pool.query(
          "SELECT * FROM registrations WHERE user_id = $1 AND event_id = $2",
          [userId, eventId]
        );
        if (existing.rows.length) {
          return res
            .status(400)
            .json({ error: "Already registered for this event." });
        }
      }
    }

    // Team: allow coach to register multiple teams
    let teamId = null;
    if (isTeamEvent && registrationType === "team") {
      // Support both camelCase and snake_case for team name
      const team_name = teamName || userDetails.team_name;
      if (!team_name) {
        return res.status(400).json({ error: "Team name is required." });
      }
      // Ensure teamMembers is a valid JSON string
      let members = teamMembers || userDetails.team_members;
      if (!members) {
        return res.status(400).json({ error: "Team members are required." });
      }
      if (typeof members === "string") {
        try {
          members = JSON.parse(members);
        } catch {
          return res
            .status(400)
            .json({ error: "Invalid team members format." });
        }
      }
      // Always store as JSON string
      const membersJson = JSON.stringify(members);
      const teamRes = await pool.query(
        "INSERT INTO teams (name, captain_id, event_id, members) VALUES ($1, $2, $3, $4) RETURNING id",
        [team_name, userId, eventId, membersJson]
      );
      teamId = teamRes.rows[0].id;
    }

    // Insert registration
    const regRes = await pool.query(
      "INSERT INTO registrations (user_id, team_id, event_id, registration_type, status, user_details_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [userId, teamId, eventId, registrationType, "pending", null] // user_details_id will be updated below
    );
    const registrationId = regRes.rows[0].id;

    // Insert user details (per registration, not per user/event)
    // Always insert a new user_details row for every registration
    const detailsRes = await pool.query(
      `INSERT INTO user_details (user_id, event_id, coach_name, club_name, gender, age_group, first_name, middle_name, last_name, district,  state, date_of_birth, category, aadhaar_number, aadhaar_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        userId,
        eventId,
        userDetails.coach_name,
        userDetails.club_name,
        userDetails.gender,
        userDetails.age_group,
        userDetails.first_name,
        userDetails.middle_name,
        userDetails.last_name,
        userDetails.district,
        userDetails.state,
        userDetails.date_of_birth,
        userDetails.category,
        userDetails.aadhaar_number,
        aadhaarImage,
      ]
    );
    const userDetailsId = detailsRes.rows[0].id;
    // Update registration with user_details_id
    await pool.query(
      "UPDATE registrations SET user_details_id = $1 WHERE id = $2",
      [userDetailsId, registrationId]
    );

    res.status(201).json({ id: registrationId });
  } catch (err) {
    console.error("Registration error details:", err);
    res
      .status(500)
      .json({ error: "Registration failed.", details: err.message });
  }
}

// Get registrations for the logged-in user (dashboard)
export async function getUserRegistrations(req, res) {
  try {
    const userId = req.user.id; // Use authenticated user's id
    const userRoleRes = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );
    const userRole = userRoleRes.rows[0]?.role;
    const regs = await pool.query(
      `SELECT r.*, e.title as event_name, e.is_team_event, t.name as team_name, t.members as team_members
       FROM registrations r
       LEFT JOIN events e ON r.event_id = e.id
       LEFT JOIN teams t ON r.team_id = t.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    let rows = regs.rows;
    // For coaches, do not filter out duplicate registrations
    if (userRole !== "coach") {
      // For non-coaches, only show the latest registration per event
      const seen = new Set();
      rows = rows.filter((row) => {
        if (seen.has(row.event_id)) return false;
        seen.add(row.event_id);
        return true;
      });
    }
    // Parse team members JSON for each registration if present
    rows = rows.map((row) => {
      if (row.team_members) {
        try {
          row.team_members = JSON.parse(row.team_members);
        } catch {
          row.team_members = [];
        }
      }
      return row;
    });
    res.json(rows);
  } catch (err) {
    console.error("getUserRegistrations error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch registrations.", details: err.message });
  }
}

// Cancel a registration (dashboard)
export async function cancelRegistration(req, res) {
  try {
    const userId = req.user.id;
    const registrationId = req.params.id;
    // Only allow cancelling own registration
    const regRes = await pool.query(
      "SELECT * FROM registrations WHERE id = $1 AND user_id = $2",
      [registrationId, userId]
    );
    if (!regRes.rows.length) {
      return res.status(404).json({ error: "Registration not found." });
    }
    // Only allow cancelling if status is pending or confirmed
    if (!["pending", "confirmed"].includes(regRes.rows[0].status)) {
      return res
        .status(400)
        .json({ error: "Cannot cancel this registration." });
    }
    await pool.query(
      "UPDATE registrations SET status = 'cancelled' WHERE id = $1",
      [registrationId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel registration." });
  }
}
