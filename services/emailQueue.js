/**
 * Email Queue Service
 * Uses pg-boss for PostgreSQL-based job queue
 * Handles email sending asynchronously with automatic retries
 */

import { PgBoss } from "pg-boss";
import { DATABASE_CONFIG } from "../config/config.js";

let boss = null;

/**
 * Initialize the email queue
 * Call this once on server startup
 */
export async function initializeEmailQueue() {
  try {
    boss = new PgBoss({
      connectionString: DATABASE_CONFIG.connectionString,
      retryLimit: 3, // Retry failed jobs 3 times
      retryDelay: 60, // Wait 60 seconds between retries
      retryBackoff: true, // Exponential backoff
      expireInHours: 48, // Jobs expire after 48 hours
      archiveCompletedAfterSeconds: 86400, // Archive completed jobs after 24 hours
    });

    boss.on("error", (error) => {
      console.error("❌ Email queue error:", error);
    });

    await boss.start();
    console.log("✅ Email queue initialized (pg-boss)");

    // Create the send-email queue explicitly to avoid "queue does not exist" errors
    await boss.createQueue("send-email");
    console.log("✅ Email queue 'send-email' created");

    return boss;
  } catch (error) {
    console.error("❌ Failed to initialize email queue:", error);
    throw error;
  }
}

/**
 * Get the email queue instance
 */
export function getEmailQueue() {
  if (!boss) {
    throw new Error(
      "Email queue not initialized. Call initializeEmailQueue() first."
    );
  }
  return boss;
}

/**
 * Queue an email for sending
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - Email HTML content
 * @param {string} emailData.text - Email plain text content (optional)
 * @param {Object} options - Queue options
 * @returns {Promise<string>} Job ID
 */
export async function queueEmail(emailData, options = {}) {
  try {
    const queue = getEmailQueue();

    const jobOptions = {
      priority: options.priority || 0, // Higher number = higher priority
      retryLimit: options.retryLimit || 3,
      retryDelay: options.retryDelay || 60,
      expireInHours: options.expireInHours || 48,
      singletonKey: options.singletonKey, // Prevent duplicate jobs
    };

    const jobId = await queue.send("send-email", emailData, jobOptions);

    console.log(
      `📧 Email queued: ${jobId} (to: ${emailData.to}, subject: ${emailData.subject})`
    );

    return jobId;
  } catch (error) {
    console.error("❌ Failed to queue email:", error);
    throw error;
  }
}

/**
 * Queue a high-priority email (e.g., payment confirmation)
 */
export async function queueHighPriorityEmail(emailData) {
  return queueEmail(emailData, { priority: 10 });
}

/**
 * Queue a low-priority email (e.g., newsletters)
 */
export async function queueLowPriorityEmail(emailData) {
  return queueEmail(emailData, { priority: -10 });
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  try {
    const queue = getEmailQueue();
    const queueSize = await queue.getQueueSize("send-email");

    return {
      queueName: "send-email",
      queueSize,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("❌ Failed to get queue stats:", error);
    return null;
  }
}

/**
 * Stop the email queue gracefully
 * Call this on server shutdown
 */
export async function stopEmailQueue() {
  try {
    if (boss) {
      await boss.stop();
      console.log("✅ Email queue stopped gracefully");
    }
  } catch (error) {
    console.error("❌ Error stopping email queue:", error);
  }
}

export default {
  initializeEmailQueue,
  getEmailQueue,
  queueEmail,
  queueHighPriorityEmail,
  queueLowPriorityEmail,
  getQueueStats,
  stopEmailQueue,
};
