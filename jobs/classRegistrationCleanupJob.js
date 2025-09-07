import cron from "node-cron";
import nodemailer from "nodemailer";
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

// Function to process expired class registrations
async function processExpiredClassRegistrations() {
  let expiredRegistrations = [];

  try {
    console.log("🔍 Checking for expired class registrations...");

    // Find class registrations that have ended (end_date <= today)
    const expiredQuery = `
      SELECT id, user_id, full_name, email, phone_number, amount, 
             issue_date, end_date, created_at
      FROM class_registrations 
      WHERE end_date <= CURRENT_DATE 
        AND status = 'success'
      ORDER BY end_date ASC
    `;

    const expiredResult = await pool.query(expiredQuery);
    expiredRegistrations = expiredResult.rows;

    if (expiredRegistrations.length === 0) {
      console.log("✅ No expired class registrations found");
      return;
    }

    console.log(
      `📋 Found ${expiredRegistrations.length} expired class registrations`
    );

    // Archive expired registrations (create archive table if needed)
    await createArchiveTableIfNotExists();

    // Move expired registrations to archive
    for (const registration of expiredRegistrations) {
      await archiveClassRegistration(registration);
    }

    // Delete archived registrations from main table
    const registrationIds = expiredRegistrations.map((reg) => reg.id);
    await pool.query(`DELETE FROM class_registrations WHERE id = ANY($1)`, [
      registrationIds,
    ]);

    console.log(
      `🗄️ Successfully archived and removed ${expiredRegistrations.length} expired class registrations`
    );

    // Send notification email to admin
    await sendClassCleanupNotification(expiredRegistrations);
  } catch (error) {
    console.error(
      "❌ Error processing expired class registrations:",
      error.message
    );

    // Send error notification
    await sendErrorNotification(error, expiredRegistrations.length);
  }
}

// Create archive table if it doesn't exist
async function createArchiveTableIfNotExists() {
  const createArchiveTableQuery = `
    CREATE TABLE IF NOT EXISTS class_registrations_archive (
      id SERIAL PRIMARY KEY,
      original_id INT NOT NULL,
      user_id INT,
      full_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      age INT,
      gender VARCHAR(10),
      razorpay_order_id VARCHAR(100),
      razorpay_payment_id VARCHAR(100),
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL,
      issue_date DATE,
      end_date DATE,
      created_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await pool.query(createArchiveTableQuery);
}

// Archive a single class registration
async function archiveClassRegistration(registration) {
  const archiveQuery = `
    INSERT INTO class_registrations_archive 
    (original_id, user_id, full_name, phone_number, email, age, gender, 
     razorpay_order_id, razorpay_payment_id, amount, status, issue_date, end_date, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  `;

  await pool.query(archiveQuery, [
    registration.id,
    registration.user_id,
    registration.full_name,
    registration.phone_number,
    registration.email,
    registration.age,
    registration.gender,
    registration.razorpay_order_id,
    registration.razorpay_payment_id,
    registration.amount,
    registration.status,
    registration.issue_date,
    registration.end_date,
    registration.created_at,
  ]);
}

// Send cleanup notification email
async function sendClassCleanupNotification(expiredRegistrations) {
  if (!process.env.EVENT_CLEANUP_EMAILS) {
    console.log("⚠️ No admin email configured for class cleanup notifications");
    return;
  }

  const adminEmails = process.env.EVENT_CLEANUP_EMAILS.split(",").map((email) =>
    email.trim()
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Class Registration Cleanup Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .registration { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗄️ Class Registration Cleanup Report</h1>
          <p>Automated cleanup completed successfully</p>
        </div>
        
        <div class="summary">
          <h3>📊 Summary</h3>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString(
            "en-IN"
          )}</p>
          <p><strong>Expired Registrations Processed:</strong> ${
            expiredRegistrations.length
          }</p>
          <p><strong>Status:</strong> ✅ Successfully archived and removed</p>
        </div>
        
        <h3>📋 Processed Registrations:</h3>
        ${expiredRegistrations
          .map(
            (reg) => `
          <div class="registration">
            <h4>${reg.full_name}</h4>
            <p><strong>Email:</strong> ${reg.email}</p>
            <p><strong>Phone:</strong> ${reg.phone_number}</p>
            <p><strong>Amount:</strong> ₹${reg.amount}</p>
            <p><strong>Class Period:</strong> ${reg.issue_date} to ${
              reg.end_date
            }</p>
            <p><strong>Registration Date:</strong> ${new Date(
              reg.created_at
            ).toLocaleDateString("en-IN")}</p>
          </div>
        `
          )
          .join("")}
        
        <div class="footer">
          <p>This is an automated system notification from Sangli Skating Academy</p>
          <p>Class Registration Cleanup Job - ${new Date().toLocaleString(
            "en-IN"
          )}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Class Registration Cleanup Report
    
    Date: ${new Date().toLocaleDateString("en-IN")}
    Expired Registrations Processed: ${expiredRegistrations.length}
    Status: Successfully archived and removed
    
    Processed Registrations:
    ${expiredRegistrations
      .map(
        (reg) => `
    - ${reg.full_name} (${reg.email})
      Phone: ${reg.phone_number}
      Amount: ₹${reg.amount}
      Class Period: ${reg.issue_date} to ${reg.end_date}
      Registration Date: ${new Date(reg.created_at).toLocaleDateString("en-IN")}
    `
      )
      .join("\n")}
    
    This is an automated system notification from Sangli Skating Academy
    Class Registration Cleanup Job - ${new Date().toLocaleString("en-IN")}
  `;

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy - System",
      address: process.env.SMTP_USER,
    },
    to: adminEmails,
    subject: `🗄️ Class Registration Cleanup Report - ${expiredRegistrations.length} registrations processed`,
    text: textContent,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `✅ Class cleanup notification sent to ${adminEmails.join(", ")}`
    );
  } catch (error) {
    console.error(
      "❌ Failed to send class cleanup notification:",
      error.message
    );
  }
}

// Send error notification email
async function sendErrorNotification(error, registrationCount) {
  if (!process.env.EVENT_CLEANUP_EMAILS) return;

  const adminEmails = process.env.EVENT_CLEANUP_EMAILS.split(",").map((email) =>
    email.trim()
  );

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy - System Alert",
      address: process.env.SMTP_USER,
    },
    to: adminEmails,
    subject: "🚨 Class Registration Cleanup Job Failed",
    text: `
      Class Registration Cleanup Job Error
      
      Date: ${new Date().toLocaleString("en-IN")}
      Error: ${error.message}
      Registrations being processed: ${registrationCount}
      
      Please check the server logs for more details.
      
      This is an automated system alert from Sangli Skating Academy
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Error notification sent to admins");
  } catch (emailError) {
    console.error("❌ Failed to send error notification:", emailError.message);
  }
}

// Schedule the cleanup job
export function scheduleClassRegistrationCleanup() {
  // Run daily at 4:00 AM (1 hour after event cleanup)
  const scheduleTime = "0 4 * * *";

  console.log(
    "Scheduling class registration cleanup job to run daily at 4:00 AM"
  );

  cron.schedule(scheduleTime, async () => {
    console.log("🕐 Running class registration cleanup job...");
    await processExpiredClassRegistrations();
  });

  // For development/testing - run immediately if NODE_ENV is development
  if (process.env.NODE_ENV === "development") {
    console.log(
      "🧪 Development mode: Running class registration cleanup immediately for testing"
    );
    setTimeout(async () => {
      await processExpiredClassRegistrations();
    }, 5000); // Run after 5 seconds
  }
}

// Export for manual testing
export { processExpiredClassRegistrations };
