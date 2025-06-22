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
    const aadhaarImage = req.file ? req.file.path : null;

    // Check if event is team event
    const event = await pool.query("SELECT * FROM events WHERE id = $1", [
      eventId,
    ]);
    if (!event.rows.length)
      return res.status(404).json({ error: "Event not found" });
    const isTeamEvent = event.rows[0].is_team_event;

    // Individual: prevent duplicate registration
    if (registrationType === "individual") {
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

    // Team: allow coach to register multiple teams
    let teamId = null;
    if (isTeamEvent && registrationType === "team") {
      const teamRes = await pool.query(
        "INSERT INTO teams (name, captain_id, event_id, members) VALUES ($1, $2, $3, $4) RETURNING id",
        [teamName, userId, eventId, teamMembers]
      );
      teamId = teamRes.rows[0].id;
    }

    // Insert registration
    const regRes = await pool.query(
      "INSERT INTO registrations (user_id, team_id, event_id, registration_type, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, teamId, eventId, registrationType, "pending"]
    );
    const registrationId = regRes.rows[0].id;

    // Insert user details (if not already present)
    const detailsRes = await pool.query(
      "INSERT INTO user_details (user_id, coach_name, club_name, gender, age_group, first_name, middle_name, last_name, district, date_of_birth, category, aadhaar_number, aadhaar_image) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (user_id) DO UPDATE SET coach_name=EXCLUDED.coach_name, club_name=EXCLUDED.club_name, gender=EXCLUDED.gender, age_group=EXCLUDED.age_group, first_name=EXCLUDED.first_name, middle_name=EXCLUDED.middle_name, last_name=EXCLUDED.last_name, district=EXCLUDED.district, date_of_birth=EXCLUDED.date_of_birth, category=EXCLUDED.category, aadhaar_number=EXCLUDED.aadhaar_number, aadhaar_image=EXCLUDED.aadhaar_image RETURNING id",
      [
        userId,
        userDetails.coach_name,
        userDetails.club_name,
        userDetails.gender,
        userDetails.age_group,
        userDetails.first_name,
        userDetails.middle_name,
        userDetails.last_name,
        userDetails.district,
        userDetails.dob,
        userDetails.category,
        userDetails.aadhaar_number,
        aadhaarImage,
      ]
    );

    res.status(201).json({ id: registrationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed." });
  }
}

export async function getUserRegistrations(req, res) {
  try {
    const userId = req.params.userId;
    const regs = await pool.query(
      "SELECT * FROM registrations WHERE user_id = $1",
      [userId]
    );
    res.json(regs.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registrations." });
  }
}
