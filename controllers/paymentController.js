import pool from "../config/db.js";
import razorpay, { verifyRazorpaySignature } from "../utils/razorpay.js";
import {
  sendRegistrationConfirmationEmail,
  sendEventRegistrationAdminNotification,
} from "../services/emailServiceWithQueue.js";

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, phone } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount required" });
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {},
    };
    if (phone) {
      options.notes.phone = phone;
    }
    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create order", details: err.message });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    registrationId,
  } = req.body;
  if (!registrationId || isNaN(Number(registrationId))) {
    return res
      .status(400)
      .json({ success: false, error: "Missing or invalid registrationId" });
  }

  // Verify payment signature using centralized function
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (isValid) {
    try {
      // Fetch the registration fee (in rupees) from the registration row
      const regResult = await pool.query(
        `SELECT r.id, r.event_id, e.price_per_person, e.price_per_team, r.registration_type
         FROM registrations r
         JOIN events e ON r.event_id = e.id
         WHERE r.id = $1`,
        [registrationId]
      );
      if (!regResult.rows.length) {
        return res
          .status(404)
          .json({ success: false, error: "Registration not found" });
      }
      const reg = regResult.rows[0];
      let amount = 0;
      if (reg.registration_type === "individual") {
        amount = Number(reg.price_per_person) || 0;
      } else if (reg.registration_type === "team") {
        amount = Number(reg.price_per_team) || 0;
      }
      // 1. Insert payment record with correct amount
      await pool.query(
        `INSERT INTO payments (registration_id, razorpay_order_id, razorpay_payment_id, amount, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          registrationId,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          "success",
        ]
      );
      // 2. Update registration status
      await pool.query(
        `UPDATE registrations SET status = 'confirmed' WHERE id = $1`,
        [registrationId]
      );

      // 3. Send registration confirmation email after successful payment
      try {
        console.log(
          `📧 Fetching email data for registration ${registrationId}...`
        );

        // Get complete registration and user details for email
        const emailDataResult = await pool.query(
          `SELECT 
            r.id as registration_id,
            r.registration_type,
            r.created_at as registration_date,
            u.username,
            u.email as user_email,
            u.phone as user_phone,
            e.title as event_name,
            e.title as event_title,
            e.start_date,
            e.start_time,
            e.location,
            e.description,
            e.price_per_person,
            e.price_per_team,
            t.name as team_name,
            t.members as team_members,
            p.razorpay_payment_id,
            p.razorpay_order_id,
            p.amount as payment_amount,
            ud.event_category as user_event_category
          FROM registrations r
          JOIN users u ON r.user_id = u.id
          JOIN events e ON r.event_id = e.id
          LEFT JOIN teams t ON r.team_id = t.id
          LEFT JOIN payments p ON p.registration_id = r.id
          LEFT JOIN user_details ud ON r.user_details_id = ud.id
          WHERE r.id = $1 AND p.status = 'success'
          ORDER BY p.created_at DESC
          LIMIT 1`,
          [registrationId]
        );

        console.log(`📧 Email data rows found: ${emailDataResult.rows.length}`);

        if (emailDataResult.rows.length > 0) {
          const emailData = emailDataResult.rows[0];
          console.log(`📧 Sending emails for event: ${emailData.event_name}`);
          console.log(`📧 User email: ${emailData.user_email}`);

          // Parse team members if exists
          let teamMembersForEmail = [];
          if (emailData.team_members) {
            try {
              teamMembersForEmail = JSON.parse(emailData.team_members);
            } catch (error) {
              console.error("Error parsing team members for email:", error);
              teamMembersForEmail = [];
            }
          }

          // Parse user event category if exists
          let userEventCategory = [];
          if (emailData.user_event_category) {
            try {
              userEventCategory = JSON.parse(emailData.user_event_category);
            } catch (error) {
              console.error(
                "Error parsing user event category for email:",
                error
              );
              userEventCategory = [];
            }
          }

          // Send confirmation email with payment details
          sendRegistrationConfirmationEmail({
            userEmail: emailData.user_email,
            userName: emailData.username,
            eventName: emailData.event_name || emailData.event_title,
            eventStartDate: emailData.start_date,
            eventStartTime: emailData.start_time,
            eventLocation: emailData.location,
            eventDescription: emailData.description,
            eventPricePerPerson: emailData.price_per_person,
            eventPricePerTeam: emailData.price_per_team,
            registrationType: emailData.registration_type,
            teamName: emailData.team_name,
            teamMembers: teamMembersForEmail,
            registrationDate: emailData.registration_date,
            // Payment details
            paymentId: emailData.razorpay_payment_id,
            orderId: emailData.razorpay_order_id,
            paidAmount: emailData.payment_amount,
            paymentDate: new Date().toISOString(),
            // User selected event category
            userEventCategory: userEventCategory,
          })
            .then(() => {
              console.log("✅ User confirmation email sent successfully");
            })
            .catch((error) => {
              console.error(
                "❌ Failed to send registration confirmation email:",
                error.message
              );
              // Don't fail the payment verification if email fails
            });

          console.log("📧 Preparing to send admin notification...");

          // Send admin notification for event registration
          sendEventRegistrationAdminNotification({
            userName: emailData.username,
            userEmail: emailData.user_email,
            userPhone: emailData.user_phone || "N/A",
            eventName: emailData.event_name || emailData.event_title,
            eventStartDate: emailData.start_date,
            eventLocation: emailData.location,
            registrationType: emailData.registration_type,
            teamName: emailData.team_name,
            teamMembers: teamMembersForEmail,
            paymentAmount: emailData.payment_amount,
            paymentId: emailData.razorpay_payment_id,
            orderId: emailData.razorpay_order_id,
            registrationDate: emailData.registration_date,
            userEventCategory: userEventCategory,
          })
            .then(() => {
              console.log("✅ Admin notification sent successfully");
            })
            .catch((error) => {
              console.error(
                "❌ Failed to send admin notification:",
                error.message
              );
              console.error("Full error:", error);
              // Don't fail the payment verification if admin email fails
            });
        } else {
          // No email data found - log error for debugging
          console.error(
            `No email data found for registration ${registrationId}`
          );
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError.message);
        // Don't fail the payment if email fails
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: "DB update failed",
        details: err.message,
      });
    }
  } else {
    // Optionally, insert a failed payment record
    if (registrationId && !isNaN(Number(registrationId))) {
      await pool.query(
        `INSERT INTO payments (registration_id, razorpay_order_id, razorpay_payment_id, amount, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [registrationId, razorpay_order_id, razorpay_payment_id, 0, "failed"]
      );
    }
    return res.status(400).json({ success: false, error: "Invalid signature" });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       ORDER BY p.created_at DESC`
    );
    res.json({ payments: result.rows });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payments", details: err.message });
  }
};
export const getPaymentById = async (req, res) => {
  const { id } = req.params;
  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: "Invalid payment ID" });
  }
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json({ payment: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payment", details: err.message });
  }
};
export const getPaymentByRegistrationId = async (req, res) => {
  const { registrationId } = req.params;
  if (!registrationId || isNaN(Number(registrationId))) {
    return res.status(400).json({ error: "Invalid registration ID" });
  }
  try {
    const result = await pool.query(
      `SELECT p.*, r.event_id, r.registration_type, r.status AS registration_status, e.title AS event_title
       FROM payments p
       JOIN registrations r ON p.registration_id = r.id
       JOIN events e ON r.event_id = e.id
       WHERE p.registration_id = $1
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [registrationId]
    );
    if (!result.rows.length) {
      return res
        .status(404)
        .json({ error: "Payment not found for this registration" });
    }
    res.json({ payment: result.rows[0] });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch payment", details: err.message });
  }
};
