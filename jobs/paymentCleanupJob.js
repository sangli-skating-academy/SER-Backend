import cron from "node-cron";
import nodemailer from "nodemailer";
import pool from "../config/db.js";
import { SMTP_CONFIG, ADMIN_CONFIG, SERVER_CONFIG } from "../config/config.js";

// Email configuration
const transporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port,
  secure: SMTP_CONFIG.secure,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});

// Function to clean up old failed/pending payments
async function cleanupOldPayments() {
  try {
    console.log("🔍 Checking for old failed/pending payments...");

    // Find payments that are failed or pending for more than 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const selectQuery = `
      SELECT p.id, p.registration_id, p.razorpay_order_id, p.razorpay_payment_id, 
             p.amount, p.status, p.created_at,
             r.user_id, r.event_id
      FROM payments p
      LEFT JOIN registrations r ON p.registration_id = r.id
      WHERE p.status IN ('failed', 'pending')
        AND p.created_at < $1
      ORDER BY p.created_at ASC
    `;

    const result = await pool.query(selectQuery, [sixtyDaysAgo]);
    const oldPayments = result.rows;

    if (oldPayments.length === 0) {
      console.log("✅ No old failed/pending payments to clean up");
      return;
    }

    console.log(
      `📋 Found ${oldPayments.length} failed/pending payments older than 60 days`
    );

    // Create archive table if it doesn't exist
    await createPaymentArchiveTableIfNotExists();

    // Archive old payments
    for (const payment of oldPayments) {
      await archivePayment(payment);
    }

    // Delete archived payments from main table
    const paymentIds = oldPayments.map((p) => p.id);
    await pool.query(`DELETE FROM payments WHERE id = ANY($1)`, [paymentIds]);

    console.log(
      `🗄️ Successfully archived and removed ${oldPayments.length} old payments`
    );

    // Send notification email to admin
    if (oldPayments.length > 0) {
      await sendPaymentCleanupNotification(oldPayments);
    }
  } catch (error) {
    console.error("❌ Error cleaning up old payments:", error.message);
    await sendErrorNotification(error);
  }
}

// Create archive table if it doesn't exist
async function createPaymentArchiveTableIfNotExists() {
  const createArchiveTableQuery = `
    CREATE TABLE IF NOT EXISTS payments_archive (
      id SERIAL PRIMARY KEY,
      original_id INT NOT NULL,
      registration_id INT,
      razorpay_order_id VARCHAR(100),
      razorpay_payment_id VARCHAR(100),
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ,
      archived_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      user_id INT,
      event_id INT
    );
  `;

  await pool.query(createArchiveTableQuery);
}

// Archive a single payment
async function archivePayment(payment) {
  const archiveQuery = `
    INSERT INTO payments_archive 
    (original_id, registration_id, razorpay_order_id, razorpay_payment_id, 
     amount, status, created_at, user_id, event_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `;

  await pool.query(archiveQuery, [
    payment.id,
    payment.registration_id,
    payment.razorpay_order_id,
    payment.razorpay_payment_id,
    payment.amount,
    payment.status,
    payment.created_at,
    payment.user_id,
    payment.event_id,
  ]);
}

// Send cleanup notification email
async function sendPaymentCleanupNotification(archivedPayments) {
  if (!ADMIN_CONFIG.eventCleanupEmails.length) {
    console.log(
      "⚠️ No admin email configured for payment cleanup notifications"
    );
    return;
  }

  const adminEmails = ADMIN_CONFIG.eventCleanupEmails;

  // Calculate totals
  const failedPayments = archivedPayments.filter((p) => p.status === "failed");
  const pendingPayments = archivedPayments.filter(
    (p) => p.status === "pending"
  );
  const totalAmount = archivedPayments.reduce(
    (sum, p) => sum + parseFloat(p.amount),
    0
  );

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Records Cleanup Report</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
        .stat-card { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { color: #6c757d; font-size: 14px; }
        .payment { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
        .payment h4 { margin: 0 0 10px 0; color: #495057; }
        .payment p { margin: 5px 0; }
        .label { font-weight: bold; color: #6c757d; }
        .status-failed { color: #dc3545; }
        .status-pending { color: #ffc107; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6; color: #6c757d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Payment Records Cleanup Report</h1>
          <p>Automated archival of failed/pending payments older than 60 days</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <div class="stats">
            <div class="stat-card">
              <div class="stat-value">${archivedPayments.length}</div>
              <div class="stat-label">Total Archived</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${failedPayments.length}</div>
              <div class="stat-label">Failed Payments</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${pendingPayments.length}</div>
              <div class="stat-label">Pending Payments</div>
            </div>
          </div>
          <p><strong>Total amount:</strong> ₹${totalAmount.toFixed(2)}</p>
          <p><strong>Cleanup date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Retention policy:</strong> Failed/Pending payments older than 60 days</p>
        </div>

        <h3>Archived Payments (First 20):</h3>
        ${archivedPayments
          .slice(0, 20)
          .map(
            (payment) => `
          <div class="payment">
            <h4>Payment ID: ${payment.id} - <span class="status-${
              payment.status
            }">${payment.status.toUpperCase()}</span></h4>
            <p><span class="label">Amount:</span> ₹${payment.amount}</p>
            <p><span class="label">Razorpay Order ID:</span> ${
              payment.razorpay_order_id || "N/A"
            }</p>
            <p><span class="label">Registration ID:</span> ${
              payment.registration_id || "N/A"
            }</p>
            <p><span class="label">Created:</span> ${new Date(
              payment.created_at
            ).toLocaleString()}</p>
            <p><span class="label">Age:</span> ${Math.floor(
              (Date.now() - new Date(payment.created_at)) /
                (1000 * 60 * 60 * 24)
            )} days</p>
          </div>
        `
          )
          .join("")}
        
        ${
          archivedPayments.length > 20
            ? `<p><em>... and ${
                archivedPayments.length - 20
              } more payments</em></p>`
            : ""
        }

        <div class="footer">
          <p>This is an automated message from Sai Skating Academy.</p>
          <p>Failed and pending payment records are automatically archived after 60 days.</p>
          <p>Archived records are stored in the payments_archive table for audit purposes.</p>
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
    subject: `Payment Records Cleanup - ${archivedPayments.length} Payments Archived`,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📧 Payment cleanup notification sent to admins");
  } catch (error) {
    console.error(
      "❌ Failed to send payment cleanup notification:",
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
      <h2 style="color: #dc3545;">Payment Cleanup Error</h2>
      <p><strong>Error occurred during payment records cleanup:</strong></p>
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
    subject: "⚠️ Payment Cleanup Error",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (mailError) {
    console.error("Failed to send error notification:", mailError.message);
  }
}

// Schedule the cleanup job to run weekly on Sundays at 5:00 AM
// Cron format: minute hour day month weekday
const schedulePaymentCleanup = () => {
  // Run at 5:00 AM every Sunday (weekday 0)
  cron.schedule("0 5 * * 0", async () => {
    console.log("\n=== Payment Records Cleanup Job Started ===");
    await cleanupOldPayments();
    console.log("=== Payment Records Cleanup Job Completed ===\n");
  });

  console.log(
    "✅ Payment cleanup job scheduled (weekly on Sundays at 5:00 AM)"
  );

  // For development: Run immediately on startup if in dev mode
  if (SERVER_CONFIG.nodeEnv === "development") {
    console.log(
      "🔧 Development mode: Running initial payment cleanup check..."
    );
    cleanupOldPayments();
  }
};

export default schedulePaymentCleanup;
