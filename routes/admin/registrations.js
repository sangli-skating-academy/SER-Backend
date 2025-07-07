import express from "express";
import pool from "../../config/db.js";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";

const router = express.Router();

// Admin: Get all registrations
router.get("/all", auth, adminOnly, async (req, res) => {
  try {
    const regs = await pool.query(`
      SELECT r.*, 
             u.username, u.email, u.phone, u.role as user_role,
             e.title as event_title, e.location as event_location, e.start_date as event_start_date, e.hashtags as event_hashtags,
             ud.id as user_details_id, ud.coach_name, ud.club_name, ud.gender as details_gender, ud.age_group, ud.first_name, ud.middle_name, ud.last_name, ud.district, ud.state, ud.date_of_birth as details_dob, ud.category as details_category, ud.aadhaar_number, ud.aadhaar_image,
             t.name as team_name, t.members as team_members,
             p.id as payment_id, p.amount as payment_amount, p.status as payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.created_at as payment_created_at
      FROM registrations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN events e ON r.event_id = e.id
      LEFT JOIN user_details ud ON ud.id = r.user_details_id
      LEFT JOIN teams t ON r.team_id = t.id
      LEFT JOIN payments p ON p.registration_id = r.id
      ORDER BY r.created_at DESC
    `);
    return res.json({ registrations: regs.rows });
  } catch (err) {
    console.error("getAllRegistrations error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch registrations.", details: err.message });
  }
});

export default router;
