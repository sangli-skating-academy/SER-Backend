/**
 * Email Worker
 * Processes queued email jobs from pg-boss
 * Handles actual email sending with error handling and logging
 */

import { getEmailQueue } from "../services/emailQueue.js";
import { sendDirectEmail } from "../services/emailServiceWithQueue.js";

/**
 * Start the email worker
 * Listens for queued email jobs and processes them
 */
export async function startEmailWorker() {
  try {
    const queue = getEmailQueue();

    // Define the work handler for send-email jobs
    await queue.work(
      "send-email",
      {
        teamSize: 5, // Process up to 5 emails concurrently
        teamConcurrency: 1, // Each worker processes 1 job at a time
      },
      async (job) => {
        const { to, subject, html, text } = job.data;
        const jobId = job.id;

        console.log(`📧 Processing email job ${jobId}: ${subject} -> ${to}`);

        try {
          // Send the email using the email service
          await sendDirectEmail({
            to,
            subject,
            html,
            text,
          });

          console.log(
            `✅ Email sent successfully (job ${jobId}): ${subject} -> ${to}`
          );

          // Return success (job will be marked as complete)
          return {
            success: true,
            sentAt: new Date(),
            recipient: to,
            subject,
          };
        } catch (error) {
          console.error(
            `❌ Failed to send email (job ${jobId}):`,
            error.message
          );

          // Throw error to trigger retry
          throw new Error(`Email sending failed: ${error.message}`);
        }
      }
    );

    console.log("✅ Email worker started (processing 'send-email' jobs)");
  } catch (error) {
    console.error("❌ Failed to start email worker:", error);
    throw error;
  }
}

/**
 * Monitor email queue status
 * Can be called periodically to check queue health
 */
export async function monitorEmailQueue() {
  try {
    const queue = getEmailQueue();

    const queueSize = await queue.getQueueSize("send-email");
    const failed = await queue.getQueueSize("send-email", { state: "failed" });
    const active = await queue.getQueueSize("send-email", { state: "active" });

    console.log(`📊 Email Queue Status:
      - Pending: ${queueSize}
      - Active: ${active}
      - Failed: ${failed}
    `);

    // Alert if there are too many failed jobs
    if (failed > 10) {
      console.warn(`⚠️ High number of failed email jobs: ${failed}`);
      // Could send alert email to admin here
    }

    return { queueSize, failed, active };
  } catch (error) {
    console.error("❌ Failed to monitor email queue:", error);
    return null;
  }
}

/**
 * Handle failed email jobs
 * This is called after all retries have been exhausted
 */
export async function handleFailedEmails() {
  try {
    const queue = getEmailQueue();

    await queue.onComplete("send-email", async (job) => {
      if (job.state === "failed") {
        console.error(
          `❌ Email job ${job.id} failed permanently after all retries`
        );
        console.error(`Details:`, job.data);

        // Log to database or send alert to admin
        // You could store failed emails in a separate table for manual retry

        // Example: Log to file or database
        // await logFailedEmail(job);
      }
    });

    console.log("✅ Failed email handler registered");
  } catch (error) {
    console.error("❌ Failed to register failed email handler:", error);
  }
}

export default {
  startEmailWorker,
  monitorEmailQueue,
  handleFailedEmails,
};
