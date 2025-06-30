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
      "INSERT INTO registrations (user_id, team_id, event_id, registration_type, status, user_details_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [userId, teamId, eventId, registrationType, "pending", null] // user_details_id will be updated below
    );
    const registrationId = regRes.rows[0].id;

    // Insert user details (per event, per user)
    // Ensure user_details table has UNIQUE (user_id, event_id) in DB
    const detailsRes = await pool.query(
      `INSERT INTO user_details (user_id, event_id, coach_name, club_name, gender, age_group, first_name, middle_name, last_name, district, date_of_birth, category, aadhaar_number, aadhaar_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT ON CONSTRAINT user_details_user_id_event_id_key DO UPDATE SET
         coach_name=EXCLUDED.coach_name, club_name=EXCLUDED.club_name, gender=EXCLUDED.gender, age_group=EXCLUDED.age_group, first_name=EXCLUDED.first_name, middle_name=EXCLUDED.middle_name, last_name=EXCLUDED.last_name, district=EXCLUDED.district, date_of_birth=EXCLUDED.date_of_birth, category=EXCLUDED.category, aadhaar_number=EXCLUDED.aadhaar_number, aadhaar_image=EXCLUDED.aadhaar_image
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
        userDetails.date_of_birth || userDetails.dob,
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
    const regs = await pool.query(
      `SELECT r.*, e.title as event_name, e.is_team_event, t.name as team_name
       FROM registrations r
       LEFT JOIN events e ON r.event_id = e.id
       LEFT JOIN teams t ON r.team_id = t.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json(regs.rows);
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

// Get all registrations (admin only)
export async function getAllRegistrations(req, res) {
  try {
    if (req.user.role === "admin") {
      const regs = await pool.query(`
        SELECT r.*, 
               u.username, u.full_name, u.email, u.phone, u.role as user_role, u.gender as user_gender, u.date_of_birth as user_dob,
               e.title as event_title, e.location as event_location, e.start_date as event_start_date, e.hashtags as event_hashtags,
               ud.id as user_details_id, ud.coach_name, ud.club_name, ud.gender as details_gender, ud.age_group, ud.first_name, ud.middle_name, ud.last_name, ud.district, ud.date_of_birth as details_dob, ud.category as details_category, ud.aadhaar_number, ud.aadhaar_image,
               p.id as payment_id, p.amount as payment_amount, p.status as payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.created_at as payment_created_at
        FROM registrations r
        LEFT JOIN users u ON r.user_id = u.id
        LEFT JOIN events e ON r.event_id = e.id
        LEFT JOIN user_details ud ON ud.user_id = r.user_id AND ud.event_id = r.event_id
        LEFT JOIN payments p ON p.registration_id = r.id
        ORDER BY r.created_at DESC
      `);
      return res.json({ registrations: regs.rows });
    }
    return res.status(403).json({ error: "Access denied." });
  } catch (err) {
    console.error("getAllRegistrations error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch registrations.", details: err.message });
  }
}
