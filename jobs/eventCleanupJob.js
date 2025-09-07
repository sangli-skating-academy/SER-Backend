import cron from "node-cron";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import pool from "../config/db.js";

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to convert data to CSV format
function convertToCSV(data) {
  if (!data.length) return "";

  // Fields to exclude from export
  const excludeFields = [
    "user_id",
    "team_id",
    "event_id",
    "user_details_id",
    "event_location",
    "event_start_date",
    "event_hashtags",
    "live",
    "user_role",
  ];

  // Get all unique keys and exclude unwanted fields
  const allKeys = Array.from(
    data.reduce((set, row) => {
      Object.keys(row).forEach((k) => {
        if (!excludeFields.includes(k)) {
          set.add(k);
        }
      });
      return set;
    }, new Set())
  );

  // CSV header
  const header = allKeys.join(",");

  // CSV rows
  const rows = data.map((row) =>
    allKeys
      .map((k) => {
        let val = row[k];
        if (val === null || val === undefined) return "";

        // Handle team members array properly
        if (k === "team_members" && Array.isArray(val)) {
          val = val
            .map((member) => {
              if (typeof member === "object" && member !== null) {
                const name = `${member.first_name || member.firstName || ""} ${
                  member.last_name || member.lastName || ""
                }`.trim();

                const username = member.username || member.user_name || "";
                const email = member.email || "";
                const fullName = member.full_name || member.fullName || "";
                const memberName = member.name || "";

                return (
                  name ||
                  fullName ||
                  memberName ||
                  username ||
                  email ||
                  `Member ${member.id || member.user_id || "Unknown"}`
                );
              }
              return String(member);
            })
            .join("; ");
        }
        // Handle other arrays
        else if (Array.isArray(val)) {
          val = val.join("; ");
        }
        // Handle objects
        else if (typeof val === "object" && val !== null) {
          val = JSON.stringify(val);
        }

        val = String(val).replace(/"/g, '""');
        if (val.includes(",") || val.includes("\n") || val.includes('"')) {
          return `"${val}"`;
        }
        return val;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

// Function to get events ready for cleanup (events that have been inactive for more than 1 day)
async function getEventsForCleanup() {
  const query = `
    SELECT * FROM events 
    WHERE live = false 
    AND start_date < CURRENT_DATE - INTERVAL '1 day'
    ORDER BY start_date ASC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching events for cleanup:", error);
    throw error;
  }
}

// Function to get registrations for an event
async function getEventRegistrations(eventId) {
  const query = `
    SELECT 
      r.id as registration_id,
      r.registration_type,
      r.status,
      r.created_at as registration_date,
      
      -- User information
      u.username,
      u.email as user_email,
      u.phone as user_phone,
      u.role as user_role,
      
      -- User details
      ud.first_name,
      ud.middle_name,
      ud.last_name,
      ud.coach_name,
      ud.club_name,
      ud.gender,
      ud.age_group,
      ud.district,
      ud.state,
      ud.date_of_birth,
      ud.category,
      ud.skate_category,
      ud.aadhaar_number,
      ud.event_category,
      
      -- Event information
      e.title as event_title,
      e.description as event_description,
      e.location as event_location,
      e.start_date as event_start_date,
      e.start_time as event_start_time,
      e.gender as event_gender,
      e.age_group as event_age_group,
      e.is_team_event,
      e.price_per_person,
      e.price_per_team,
      e.hashtags as event_hashtags,
      e.live,
      
      -- Team information (if applicable)
      t.name as team_name,
      t.members as team_members,
      
      -- Payment information
      p.amount as payment_amount,
      p.status as payment_status,
      p.razorpay_payment_id
      
    FROM registrations r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN user_details ud ON r.user_details_id = ud.id
    LEFT JOIN events e ON r.event_id = e.id
    LEFT JOIN teams t ON r.team_id = t.id
    LEFT JOIN payments p ON p.registration_id = r.id
    WHERE r.event_id = $1
    ORDER BY r.created_at ASC
  `;

  try {
    const result = await pool.query(query, [eventId]);
    return result.rows;
  } catch (error) {
    console.error("Error fetching event registrations:", error);
    throw error;
  }
}

// Function to send email with CSV attachment
async function sendEventDataEmail(eventData, csvData, recipients) {
  const csvFileName = `event_${eventData.id}_${eventData.title.replace(
    /[^a-zA-Z0-9]/g,
    "_"
  )}_${new Date().toISOString().slice(0, 10)}.csv`;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: recipients.join(", "),
    subject: `Event Data Export - ${eventData.title} (${eventData.start_date})`,
    html: `
      <h2>Event Data Export</h2>
      <p><strong>Event:</strong> ${eventData.title}</p>
      <p><strong>Date:</strong> ${eventData.start_date}</p>
      <p><strong>Location:</strong> ${eventData.location}</p>
      <p><strong>Export Date:</strong> ${new Date().toLocaleDateString()}</p>
      
      <p>Please find the attached CSV file containing all registration data for this event.</p>
      <p>This event has been automatically archived and all related data has been cleaned from the database.</p>
      
      <hr>
      <p><small>This email was automatically generated by the Event Management System.</small></p>
    `,
    attachments: [
      {
        filename: csvFileName,
        content: csvData,
        contentType: "text/csv",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent for event ${eventData.title}:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`Error sending email for event ${eventData.title}:`, error);
    throw error;
  }
}

// Function to clean up event data from database
async function cleanupEventData(eventId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete in correct order to respect foreign key constraints

    // 1. Delete payments
    await client.query(
      "DELETE FROM payments WHERE registration_id IN (SELECT id FROM registrations WHERE event_id = $1)",
      [eventId]
    );

    // 2. Delete registrations
    await client.query("DELETE FROM registrations WHERE event_id = $1", [
      eventId,
    ]);

    // 3. Delete user_details for this event
    await client.query("DELETE FROM user_details WHERE event_id = $1", [
      eventId,
    ]);

    // 4. Delete teams for this event
    await client.query("DELETE FROM teams WHERE event_id = $1", [eventId]);

    // 5. Delete gallery items for this event (if event_name matches)
    await client.query(
      "DELETE FROM gallery WHERE event_name = (SELECT title FROM events WHERE id = $1)",
      [eventId]
    );

    // 6. Finally, delete the event itself
    await client.query("DELETE FROM events WHERE id = $1", [eventId]);

    await client.query("COMMIT");
    console.log(`Successfully cleaned up all data for event ID: ${eventId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `Error cleaning up event data for event ID ${eventId}:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
}

// Main function to process events ready for cleanup
async function processEventsForCleanup() {
  try {
    console.log("Starting event data cleanup job...");

    const eventsForCleanup = await getEventsForCleanup();
    console.log(`Found ${eventsForCleanup.length} events ready for cleanup`);

    if (eventsForCleanup.length === 0) {
      console.log("No events ready for cleanup. Job completed.");
      return;
    }

    // Get email recipients from environment or use defaults
    const recipients = process.env.EVENT_CLEANUP_EMAILS
      ? process.env.EVENT_CLEANUP_EMAILS.split(",").map((email) => email.trim())
      : ["admin@example.com"]; // Default email

    for (const event of eventsForCleanup) {
      try {
        console.log(`Processing event: ${event.title} (ID: ${event.id})`);

        // 1. Get registrations
        const registrations = await getEventRegistrations(event.id);
        console.log(
          `Found ${registrations.length} registrations for event ${event.id}`
        );

        // 2. Convert to CSV
        const csvData = convertToCSV(registrations);

        // 3. Send email with CSV
        if (registrations.length > 0) {
          await sendEventDataEmail(event, csvData, recipients);
          console.log(`Email sent for event: ${event.title}`);
        }

        // 4. Clean up database (wait a bit to ensure email is sent)
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
        await cleanupEventData(event.id);
        console.log(`Cleanup completed for event: ${event.title}`);
      } catch (error) {
        console.error(
          `Error processing event ${event.title} (ID: ${event.id}):`,
          error
        );
        // Continue with next event even if one fails
      }
    }

    console.log("Event data cleanup job completed successfully");
  } catch (error) {
    console.error("Error in processEventsForCleanup:", error);
  }
}

// Schedule the job to run daily at 3:00 AM (after event status job)
const scheduleEventCleanup = () => {
  console.log("Scheduling event data cleanup job to run daily at 3:00 AM");

  // Run every day at 3:00 AM
  cron.schedule(
    "0 3 * * *",
    () => {
      console.log("Running scheduled event data cleanup job...");
      processEventsForCleanup();
    },
    {
      timezone: "Asia/Kolkata", // Adjust timezone as needed
    }
  );

  // Optional: Run immediately on startup for testing (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log(
      "Development mode: Running event cleanup job immediately for testing..."
    );
    setTimeout(() => {
      processEventsForCleanup();
    }, 7000); // Run after 7 seconds (after status job)
  }
};

export {
  scheduleEventCleanup,
  processEventsForCleanup, // Export for manual testing
  getEventsForCleanup,
};
