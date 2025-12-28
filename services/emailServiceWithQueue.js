/**
 * Email Service with Queue Support
 * Provides a unified interface for sending emails either directly or via queue
 * Import and use these functions instead of the original emailService functions
 */

import * as originalEmailService from "./emailService.js";
import { queueEmail, queueHighPriorityEmail } from "./emailQueue.js";

/**
 * Generic email sender
 * Can send directly or queue based on options
 */
export async function sendEmail({ to, subject, html, text }, options = {}) {
  return originalEmailService.transporter.sendMail({
    from: `"Sangli Skating Academy" <${
      originalEmailService.SMTP_CONFIG?.user || "noreply@sangliskating.com"
    }>`,
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send Welcome Email (Queued)
 * @param {Object} userDetails - User details
 * @param {boolean} immediate - If true, send immediately without queueing
 */
export async function sendWelcomeEmail(userDetails, immediate = false) {
  const { username, email } = userDetails;

  if (immediate) {
    return originalEmailService.sendWelcomeEmail(userDetails);
  }

  // Queue the email
  const emailHTML = await generateWelcomeEmailHTML(userDetails);

  return queueEmail({
    to: email,
    subject: `Welcome to Sangli Skating Academy, ${username}!`,
    html: emailHTML,
  });
}

/**
 * Send Registration Confirmation Email (High Priority - Queued)
 * @param {Object} registrationData - Registration details
 * @param {boolean} immediate - If true, send immediately
 */
export async function sendRegistrationConfirmationEmail(
  registrationData,
  immediate = false
) {
  const { userEmail } = registrationData;

  if (immediate) {
    return originalEmailService.sendRegistrationConfirmationEmail(
      registrationData
    );
  }

  // Queue as high priority (payment-related)
  const emailHTML = await generateRegistrationConfirmationHTML(
    registrationData
  );

  return queueHighPriorityEmail({
    to: userEmail,
    subject: "Registration Confirmation - Sangli Skating Academy",
    html: emailHTML,
  });
}

/**
 * Send Club Registration Success Email (High Priority - Queued)
 * @param {Object} registrationData - Club registration details
 * @param {boolean} immediate - If true, send immediately
 */
export async function sendClubRegistrationSuccessEmail(
  registrationData,
  immediate = false
) {
  const { email } = registrationData;

  if (immediate) {
    return originalEmailService.sendClubRegistrationSuccessEmail(
      registrationData
    );
  }

  // Queue as high priority (payment-related)
  const emailHTML = await generateClubRegistrationHTML(registrationData);

  return queueHighPriorityEmail({
    to: email,
    subject: "Club Registration Successful - Sangli Skating Academy",
    html: emailHTML,
  });
}

/**
 * Send Contact Form Notification (Low Priority - Queued)
 * @param {Object} contactData - Contact form data
 * @param {boolean} immediate - If true, send immediately
 */
export async function sendContactFormNotification(
  contactData,
  immediate = false
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sangliskating.com";
  const { name, email, subject, message } = contactData;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #667eea; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #667eea; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Contact Form Submission</h2>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Name:</div>
            <div>${name}</div>
          </div>
          <div class="field">
            <div class="label">Email:</div>
            <div>${email}</div>
          </div>
          <div class="field">
            <div class="label">Subject:</div>
            <div>${subject}</div>
          </div>
          <div class="field">
            <div class="label">Message:</div>
            <div>${message}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  if (immediate) {
    return sendEmail({
      to: adminEmail,
      subject: `New Contact: ${subject}`,
      html: emailHTML,
    });
  }

  return queueEmail(
    {
      to: adminEmail,
      subject: `New Contact: ${subject}`,
      html: emailHTML,
    },
    { priority: -5 }
  ); // Low priority
}

/**
 * Send admin notification for event registration
 */
export async function sendEventRegistrationAdminNotification(
  registrationData,
  immediate = false
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sangliskating.com";

  if (immediate) {
    return originalEmailService.sendEventRegistrationAdminNotification?.(
      registrationData
    );
  }

  const { eventTitle, userName, userEmail, teamName, registrationId } =
    registrationData;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>🎉 New Event Registration</h2>
      <p><strong>Event:</strong> ${eventTitle}</p>
      <p><strong>Participant:</strong> ${userName} (${userEmail})</p>
      ${teamName ? `<p><strong>Team:</strong> ${teamName}</p>` : ""}
      <p><strong>Registration ID:</strong> #${registrationId}</p>
    </body>
    </html>
  `;

  return queueEmail({
    to: adminEmail,
    subject: `New Registration: ${eventTitle}`,
    html: emailHTML,
  });
}

/**
 * Send admin notification for club registration
 */
export async function sendClubRegistrationAdminNotification(
  registrationData,
  immediate = false
) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@sangliskating.com";

  if (immediate) {
    return originalEmailService.sendClubRegistrationAdminNotification?.(
      registrationData
    );
  }

  const { name, email, membership_type, amount } = registrationData;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <h2>💪 New Club Membership</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Membership Type:</strong> ${membership_type}</p>
      <p><strong>Amount:</strong> ₹${amount}</p>
    </body>
    </html>
  `;

  return queueEmail({
    to: adminEmail,
    subject: `New Club Member: ${name}`,
    html: emailHTML,
  });
}

// ====================
// HTML Generators (stub implementations - reuse from original service)
// ====================

async function generateWelcomeEmailHTML(userDetails) {
  // For now, directly call the original function to get the HTML
  // In production, you'd extract the HTML generation logic
  const mockTransporter = {
    sendMail: async (options) => options.html,
  };

  // Just return a simple HTML for now - in production integrate with original templates
  const { username, email, role } = userDetails;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Sangli Skating Academy!</h1>
        </div>
        <div class="content">
          <h2>Hello ${username}!</h2>
          <p>Thank you for registering with Sangli Skating Academy. We're excited to have you join our skating community!</p>
          <p><strong>Your Account Details:</strong></p>
          <ul>
            <li>Username: ${username}</li>
            <li>Email: ${email}</li>
            <li>Role: ${role || "user"}</li>
          </ul>
          <p>You can now browse upcoming events, register for competitions, and stay updated with our latest activities.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }" class="button">Visit Our Website</a>
          </p>
          <p>If you have any questions, feel free to contact us!</p>
          <p>Best regards,<br>Sangli Skating Academy Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateRegistrationConfirmationHTML(registrationData) {
  const { userEmail, eventTitle, userName, teamName, registrationId } =
    registrationData;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Registration Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${userName}!</h2>
          <p>Your registration has been confirmed successfully!</p>
          <div class="info-box">
            <p><strong>Event:</strong> ${eventTitle}</p>
            ${teamName ? `<p><strong>Team Name:</strong> ${teamName}</p>` : ""}
            <p><strong>Registration ID:</strong> #${registrationId}</p>
          </p>
          <p>We look forward to seeing you at the event!</p>
          <p>Best regards,<br>Sangli Skating Academy Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function generateClubRegistrationHTML(registrationData) {
  const { name, email, membership_type, amount } = registrationData;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; color: #155724; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Club Membership Confirmed!</h1>
        </div>
        <div class="content">
          <div class="success">
            <h2>Welcome to the club, ${name}!</h2>
            <p>Your ${membership_type} membership has been successfully activated.</p>
          </div>
          <p><strong>Membership Details:</strong></p>
          <ul>
            <li>Type: ${membership_type}</li>
            <li>Amount Paid: ₹${amount}</li>
          </ul>
          <p>Thank you for joining Sangli Skating Academy!</p>
          <p>Best regards,<br>Sangli Skating Academy Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Export original functions for backward compatibility (direct sending)
export { sendEmail as sendDirectEmail };

// Export original email service for cases where direct sending is needed
export * as OriginalEmailService from "./emailService.js";
