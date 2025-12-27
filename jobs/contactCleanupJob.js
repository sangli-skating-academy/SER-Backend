import cron from "node-cron";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { SMTP_CONFIG, ADMIN_CONFIG, SERVER_CONFIG } from "../config/config.js";

// Email configuration
const transporter = nodemailer.createTransporter({
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port,
  secure: SMTP_CONFIG.secure,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});

// Function to clean up old contact messages
async function cleanupOldContactMessages() {
  try {
    console.log("🔍 Checking for old contact messages...");

    // Find contact messages older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const selectQuery = `
      SELECT id, name, email, subject, created_at 
      FROM contact_messages 
      WHERE created_at < $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(selectQuery, [threeMonthsAgo]);
    const oldMessages = result.rows;

    if (oldMessages.length === 0) {
      console.log("✅ No old contact messages to clean up");
      return;
    }

    console.log(
      `📋 Found ${oldMessages.length} contact messages older than 3 months`
    );

    // Delete old messages
    const deleteQuery = `
      DELETE FROM contact_messages 
      WHERE created_at < $1
      RETURNING id
    `;

    const deleteResult = await pool.query(deleteQuery, [threeMonthsAgo]);
    const deletedCount = deleteResult.rows.length;

    console.log(`🗑️ Successfully deleted ${deletedCount} old contact messages`);

    // Send notification email to admin
    if (deletedCount > 0) {
      await sendContactCleanupNotification(oldMessages);
    }
  } catch (error) {
    console.error("❌ Error cleaning up contact messages:", error.message);
    await sendErrorNotification(error);
  }
}

// Send cleanup notification email
async function sendContactCleanupNotification(deletedMessages) {
  if (!ADMIN_CONFIG.eventCleanupEmails.length) {
    console.log(
      "⚠️ No admin email configured for contact cleanup notifications"
    );
    return;
  }

  const adminEmails = ADMIN_CONFIG.eventCleanupEmails;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Contact Messages Cleanup Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .message { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .message h4 { margin: 0 0 10px 0; color: #495057; }
        .message p { margin: 5px 0; }
        .label { font-weight: bold; color: #6c757d; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6; color: #6c757d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗑️ Contact Messages Cleanup Report</h1>
          <p>Automated cleanup of messages older than 3 months</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>Total messages deleted:</strong> ${
            deletedMessages.length
          }</p>
          <p><strong>Cleanup date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Retention policy:</strong> Messages older than 3 months</p>
        </div>

        <h3>Deleted Messages:</h3>
        ${deletedMessages
          .slice(0, 20)
          .map(
            (msg) => `
          <div class="message">
            <h4>${msg.subject}</h4>
            <p><span class="label">From:</span> ${msg.name} (${msg.email})</p>
            <p><span class="label">Received:</span> ${new Date(
              msg.created_at
            ).toLocaleDateString()}</p>
            <p><span class="label">Message ID:</span> ${msg.id}</p>
          </div>
        `
          )
          .join("")}
        
        ${
          deletedMessages.length > 20
            ? `<p><em>... and ${
                deletedMessages.length - 20
              } more messages</em></p>`
            : ""
        }

        <div class="footer">
          <p>This is an automated message from Sai Skating Academy.</p>
          <p>Contact messages are automatically deleted after 3 months to maintain database efficiency.</p>
          ${
            SERVER_CONFIG.nodeEnv === "production"
              ? "<p><strong>Environment:</strong> Production</p>"
              : "<p><strong>Environment:</strong> Development</p>"
          }
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: SMTP_CONFIG.from,
    to: adminEmails,
    subject: `Contact Messages Cleanup - ${deletedMessages.length} Messages Deleted`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Contact cleanup notification sent to admins");
  } catch (error) {
    console.error(
      "❌ Failed to send contact cleanup notification:",
      error.message
    );
  }
}

// Send error notification
async function sendErrorNotification(error) {
  if (!ADMIN_CONFIG.eventCleanupEmails.length) {
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #dc3545;">Contact Messages Cleanup Error</h2>
      <p><strong>Error occurred during contact messages cleanup:</strong></p>
      <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px;">${
        error.message
      }</pre>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <p style="color: #6c757d; margin-top: 30px;">Please check the server logs for more details.</p>
    </body>
    </html>
  `;

  const mailOptions = {
    from: SMTP_CONFIG.from,
    to: ADMIN_CONFIG.eventCleanupEmails,
    subject: "⚠️ Contact Messages Cleanup Error",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (mailError) {
    console.error("Failed to send error notification:", mailError.message);
  }
}

// Schedule the cleanup job to run daily at 4:00 AM
// Cron format: minute hour day month weekday
const scheduleContactCleanup = () => {
  // Run at 4:00 AM every day
  cron.schedule("0 4 * * *", async () => {
    console.log("\n=== Contact Messages Cleanup Job Started ===");
    await cleanupOldContactMessages();
    console.log("=== Contact Messages Cleanup Job Completed ===\n");
  });

  console.log("✅ Contact messages cleanup job scheduled (daily at 4:00 AM)");

  // For development: Run immediately on startup if in dev mode
  if (SERVER_CONFIG.nodeEnv === "development") {
    console.log(
      "🔧 Development mode: Running initial contact cleanup check..."
    );
    cleanupOldContactMessages();
  }
};

export default scheduleContactCleanup;
