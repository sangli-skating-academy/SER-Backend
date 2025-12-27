import nodemailer from "nodemailer";
import { SMTP_CONFIG, SERVER_CONFIG } from "../config/config.js";

// Email configuration
const transporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port,
  secure: SMTP_CONFIG.secure, // true for 465, false for other ports
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
  tls: {
    rejectUnauthorized: true,
  },
  connectionTimeout: 20000, // 20 seconds timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
  debug: SERVER_CONFIG.NODE_ENV === "development", // Enable debug in development
  logger: SERVER_CONFIG.NODE_ENV === "development", // Enable logging in development
});

// Verify email connection on startup (non-blocking)
(async () => {
  try {
    const verifyWithTimeout = Promise.race([
      transporter.verify(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Verification timeout")), 5000)
      ),
    ]);

    await verifyWithTimeout;
    console.log("✅ Email service is ready");
  } catch (error) {
    console.error("❌ Email service failed:", error.message);
  }
})();

// Send welcome email for user registration
export const sendWelcomeEmail = async (userDetails) => {
  const { username, email, role } = userDetails;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Sangli Skating Academy</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 0;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .welcome-message {
          background: #f8f9ff;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .feature-list {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin: 15px 0;
          padding: 10px;
          background: #f9f9f9;
          border-radius: 5px;
        }
        .feature-icon {
          background: #667eea;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          font-weight: bold;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
          transition: transform 0.3s;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
        .footer {
          background: #333;
          color: white;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }
        .skating-emoji {
          font-size: 24px;
          margin: 0 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛼 Welcome to Sangli Skating Academy! 🛼</h1>
          <p>Your journey to skating excellence begins now</p>
        </div>
        
        <div class="content">
          <div class="welcome-message">
            <h2>Hello ${username}! 👋</h2>
            <p>Welcome to the <strong>Sangli Skating Academy</strong> family! We're thrilled to have you join our community of passionate skaters.</p>
            <p>Your account has been successfully created.</p>
          </div>

          <div class="feature-list">
            <h3>🎯 What You Can Do Now:</h3>
            
            <div class="feature-item">
              <div class="feature-icon">📅</div>
              <div>
                <strong>Browse Events</strong><br>
                <small>Discover upcoming skating events, competitions, and workshops</small>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📝</div>
              <div>
                <strong>Register for Classes</strong><br>
                <small>Join individual or team skating programs</small>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">📸</div>
              <div>
                <strong>View Gallery</strong><br>
                <small>Check out photos from our events and training sessions</small>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">💳</div>
              <div>
                <strong>Secure Payments</strong><br>
                <small>Easy and secure payment processing for registrations</small>
              </div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://www.sangliskating.com" class="cta-button">
              🚀 Explore The Site
            </a>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4>💡 Getting Started Tips:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Complete your profile for a better experience</li>
              <li>Check out our upcoming events</li>
              <li>Join our community and start your skating journey</li>
              <li>Contact us if you need any assistance</li>
            </ul>
          </div>

          <p style="text-align: center; color: #666; margin: 30px 0;">
            <span class="skating-emoji">⛸️</span>
            Ready to glide into adventure?
            <span class="skating-emoji">🛼</span>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Sangli Skating Academy</strong></p>
          <div style="margin: 15px 0; line-height: 1.8;">
            <p style="margin: 5px 0;">📧 <strong>Email:</strong> saiskating2200@gmail.com</p>
            <p style="margin: 5px 0;">📱 <strong>Contact:</strong></p>
            <p style="margin: 2px 0; padding-left: 20px;">+91 9595893434 (Mr. Suraj A. Shinde)</p>
            <p style="margin: 2px 0; padding-left: 20px;">+91 9595473434 (Mrs. Parveen S. Shinde)</p>
            <p style="margin: 5px 0;">🌐 <strong>Website:</strong> https://www.sangliskating.com</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Welcome to Sangli Skating Academy!
    
    Hello ${username}!
    
    Your account has been successfully created with the role: ${role}
    
    What You Can Do Now:
    - Browse upcoming skating events and competitions
    - Register for individual or team skating programs
    - Track your skating progress and achievements
    - View our gallery of events and training sessions
    - Make secure payments for registrations

    Visit Site: https://www.sangliskating.com

    Getting Started Tips:
    - Complete your profile for a better experience
    - Check out our upcoming events
    - Join our community and start your skating journey
    - Contact us if you need any assistance
    
    Ready to glide into adventure?
    
    Best regards,
    Sangli Skating Academy Team
    
    Contact Information:
    Email: saiskating2200@gmail.com
    Phone: +91 9595893434 (Mr. Suraj A. Shinde)
           +91 9595473434 (Mrs. Parveen S. Shinde)
    Website: https://www.sangliskating.com
  `;

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy",
      address: SMTP_CONFIG.user,
    },
    to: email,
    subject: "🛼 Welcome to Sangli Skating Academy - Let's Start Skating! 🛼",
    text: textContent,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `❌ Failed to send welcome email to ${email}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
};

// Send registration confirmation email with payment details and mobile responsive design
export const sendRegistrationConfirmationEmail = async (
  registrationDetails
) => {
  const {
    userEmail,
    userName,
    eventName,
    eventStartDate,
    eventStartTime,
    eventLocation,
    registrationType,
    teamName,
    teamMembers,
    registrationDate,
    eventDescription,
    eventPricePerPerson,
    eventPricePerTeam,
    // Payment details (added for post-payment email)
    paymentId,
    orderId,
    paidAmount,
    paymentDate,
    // User selected event category
    userEventCategory,
  } = registrationDetails;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Confirmed - ${eventName}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 0;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .success-badge {
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          border-radius: 50px;
          padding: 8px 16px;
          margin: 10px 0;
          display: inline-block;
          font-size: 14px;
          font-weight: bold;
        }
        .content {
          padding: 20px;
        }
        .confirmation-box {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          text-align: center;
        }
        .event-details {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }
        .detail-row {
          display: block;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #495057;
          display: block;
          margin-bottom: 4px;
        }
        .detail-value {
          color: #212529;
          display: block;
          word-break: break-word;
        }
        .payment-details {
          background: #e7f3ff;
          border: 2px solid #007bff;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }
        .payment-success {
          color: #28a745;
          font-weight: bold;
          text-align: center;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .team-members {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
        }
        .member-item {
          padding: 8px 0;
          border-bottom: 1px solid #ffd93d;
        }
        .member-item:last-child {
          border-bottom: none;
        }
        .important-info {
          background: #cce5ff;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin: 15px 0;
          border-radius: 5px;
        }
        .footer {
          background: #333;
          color: white;
          text-align: center;
          padding: 20px;
          font-size: 14px;
        }
        .contact-info {
          background: #f1f3f4;
          border-radius: 8px;
          padding: 15px;
          margin: 15px 0;
          text-align: center;
        }
        .emoji-large {
          font-size: 28px;
          margin: 8px;
        }
        
        /* Mobile Responsive Styles */
        @media only screen and (max-width: 600px) {
          .container {
            width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
          .header {
            padding: 15px !important;
          }
          .header h1 {
            font-size: 20px !important;
          }
          .content {
            padding: 15px !important;
          }
          .confirmation-box, .event-details, .payment-details, .team-members, .important-info, .contact-info {
            padding: 12px !important;
            margin: 12px 0 !important;
          }
          .detail-row {
            padding: 6px 0 !important;
          }
          .detail-label {
            font-size: 14px !important;
          }
          .detail-value {
            font-size: 14px !important;
          }
          .emoji-large {
            font-size: 24px !important;
            margin: 6px !important;
          }
          .success-badge {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
        
        @media only screen and (max-width: 480px) {
          .header h1 {
            font-size: 18px !important;
          }
          .content {
            padding: 10px !important;
          }
          .confirmation-box h2 {
            font-size: 18px !important;
          }
          .detail-label, .detail-value {
            font-size: 13px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji-large">🎉</div>
          <h1>Registration Confirmed!</h1>
          <div class="success-badge">✅ Successfully Registered & Paid</div>
          <p>Your spot is secured for this amazing skating event</p>
        </div>
        
        <div class="content">
          <div class="confirmation-box">
            <h2>🛼 Hello ${userName}!</h2>
            <p><strong>Congratulations!</strong> Your registration for <strong>${eventName}</strong> has been confirmed and payment received.</p>
            <p>Registration Type: <strong>${registrationType.toUpperCase()}</strong></p>
            ${teamName ? `<p>Team Name: <strong>${teamName}</strong></p>` : ""}
          </div>

          ${
            paymentId
              ? `
          <div class="payment-details">
            <div class="payment-success">💳 Payment Successful!</div>
            <h4>📄 Payment Details:</h4>
            
            <div class="detail-row">
              <div class="detail-label">💰 Amount Paid:</div>
              <div class="detail-value">₹${paidAmount}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">🆔 Payment ID:</div>
              <div class="detail-value">${paymentId}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">📋 Order ID:</div>
              <div class="detail-value">${orderId}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">📅 Payment Date:</div>
              <div class="detail-value">${formatDate(paymentDate)}</div>
            </div>
          </div>
          `
              : ""
          }

          <div class="event-details">
            <h3>📅 Event Details</h3>
            
            <div class="detail-row">
              <div class="detail-label">🏆 Event Name:</div>
              <div class="detail-value">${eventName}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">📍 Location:</div>
              <div class="detail-value">${eventLocation || "TBA"}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">🗓️ Start Date:</div>
              <div class="detail-value">${formatDate(eventStartDate)}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">⏰ Start Time:</div>
              <div class="detail-value">${eventStartTime || "TBD"}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">💰 Registration Fee:</div>
              <div class="detail-value">
                ${
                  registrationType === "individual"
                    ? `₹${eventPricePerPerson || "Free"}`
                    : `₹${eventPricePerTeam || "Free"}`
                }
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">📝 Registration Date:</div>
              <div class="detail-value">${formatDate(registrationDate)}</div>
            </div>

            ${
              userEventCategory && userEventCategory.length > 0
                ? `
            <div class="detail-row">
              <div class="detail-label">🏆 Selected Categories:</div>
              <div class="detail-value">${
                Array.isArray(userEventCategory)
                  ? userEventCategory.join(", ")
                  : userEventCategory
              }</div>
            </div>
            `
                : ""
            }
          </div>

          ${
            eventDescription
              ? `
            <div style="background: #e7f3ff; border-radius: 8px; padding: 15px; margin: 15px 0;">
              <h4>📖 Event Description:</h4>
              <p>${eventDescription}</p>
            </div>
          `
              : ""
          }

          ${
            teamMembers && teamMembers.length > 0
              ? `
            <div class="team-members">
              <h4>👥 Team Members:</h4>
              ${teamMembers
                .map(
                  (member, index) => `
                <div class="member-item">
                  <strong>${index + 1}. ${
                    member.full_name ||
                    member.first_name + " " + member.last_name ||
                    "Member " + (index + 1)
                  }</strong>
                  ${member.email ? `<br><small>📧 ${member.email}</small>` : ""}
                  ${member.phone ? `<br><small>📱 ${member.phone}</small>` : ""}
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }

          <div class="important-info">
            <h4>⚠️ Important Information:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Arrive 30 minutes early</strong> for registration and warm-up</li>
              <li><strong>Bring your own skating gear</strong> (if you have any)</li>
              <li><strong>Carry a water bottle</strong> and light snacks</li>
              <li><strong>Wear comfortable sportswear</strong></li>
              <li><strong>Follow all safety guidelines</strong> provided by instructors</li>
            </ul>
          </div>

          <div class="contact-info">
            <h4>📞 Need Help?</h4>
            <p>If you have any questions or need to make changes to your registration, please contact us:</p>
            <div style="text-align: left; margin: 15px 0;">
              <p style="margin: 8px 0;"><strong>📧 Email:</strong> saiskating2200@gmail.com</p>
              <p style="margin: 8px 0;"><strong>📱 Phone:</strong></p>
              <p style="margin: 3px 0; padding-left: 20px;">+91 9595893434 (Mr. Suraj A. Shinde)</p>
              <p style="margin: 3px 0; padding-left: 20px;">+91 9595473434 (Mrs. Parveen S. Shinde)</p>
              <p style="margin: 8px 0;"><strong>🌐 Website:</strong> https://www.sangliskating.com</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; color: #28a745; font-weight: bold;">
              🛼 Get ready to roll and have an amazing time! 🛼
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Sangli Skating Academy</strong></p>
          <p>Your trusted partner in skating excellence</p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            This is an automated confirmation email. Please save this for your records.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Registration Confirmation - ${eventName}
    
    Hello ${userName}!
    
    Congratulations! Your registration for "${eventName}" has been confirmed and payment received.
    
    Registration Details:
    - Registration Type: ${registrationType.toUpperCase()}
    ${teamName ? `- Team Name: ${teamName}` : ""}
    - Event Name: ${eventName}
    - Location: ${eventLocation || "TBA"}
    - Start Date: ${formatDate(eventStartDate)}
    - Start Time: ${eventStartTime || "TBD"}
    - Registration Fee: ${
      registrationType === "individual"
        ? `₹${eventPricePerPerson || "Free"}`
        : `₹${eventPricePerTeam || "Free"}`
    }
    - Registration Date: ${formatDate(registrationDate)}
    ${
      userEventCategory && userEventCategory.length > 0
        ? `- Selected Categories: ${
            Array.isArray(userEventCategory)
              ? userEventCategory.join(", ")
              : userEventCategory
          }`
        : ""
    }
    
    ${
      paymentId
        ? `
    Payment Details:
    - Amount Paid: ₹${paidAmount}
    - Payment ID: ${paymentId}
    - Order ID: ${orderId}
    - Payment Date: ${formatDate(paymentDate)}
    `
        : ""
    }
    
    ${
      teamMembers && teamMembers.length > 0
        ? `
    Team Members:
    ${teamMembers
      .map(
        (member, index) =>
          `${index + 1}. ${
            member.full_name ||
            member.first_name + " " + member.last_name ||
            "Member " + (index + 1)
          }`
      )
      .join("\n")}
    `
        : ""
    }
    
    Important Information:
    - Arrive 30 minutes early for registration and warm-up
    - Bring your own skating gear (if you have any)
    - Carry a water bottle and light snacks
    - Wear comfortable sportswear
    - Follow all safety guidelines provided by instructors
    
    Need Help?
    If you have any questions or need to make changes to your registration:
    
    Contact Information:
    Email: saiskating2200@gmail.com
    Phone: +91 9595893434 (Mr. Suraj A. Shinde)
           +91 9595473434 (Mrs. Parveen S. Shinde)
    Website: https://www.sangliskating.com
    
    Get ready to roll and have an amazing time!
    
    Best regards,
    Sangli Skating Academy Team
  `;

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy",
      address: SMTP_CONFIG.user,
    },
    to: userEmail,
    subject: `🎉 Registration Confirmed & Payment Received: ${eventName} - Sangli Skating Academy`,
    text: textContent,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `❌ Failed to send registration email to ${userEmail}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
};

// Send club/class registration success email after payment
export const sendClubRegistrationSuccessEmail = async (registrationData) => {
  try {
    const {
      email,
      full_name,
      phone_number,
      amount,
      issue_date,
      end_date,
      razorpay_payment_id,
      age,
      gender,
    } = registrationData;

    // Format dates for display
    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const issueFormatted = formatDate(issue_date);
    const endFormatted = formatDate(end_date);
    const paymentDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Class Registration Confirmed - Sangli Skating Academy</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 0;
          border-radius: 10px;
          box-shadow: 0 0 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 15px;
          display: block;
        }
        .content {
          padding: 30px;
        }
        .welcome-message {
          font-size: 18px;
          margin-bottom: 30px;
          color: #2c3e50;
        }
        .details-section {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .label {
          font-weight: bold;
          color: #495057;
          flex: 1;
        }
        .value {
          color: #212529;
          flex: 2;
          text-align: right;
        }
        .amount-highlight {
          font-size: 20px;
          font-weight: bold;
          color: #28a745;
        }
        .next-steps {
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
        }
        .next-steps h3 {
          color: #1976d2;
          margin-top: 0;
        }
        .steps-list {
          list-style: none;
          padding: 0;
        }
        .steps-list li {
          padding: 8px 0;
          display: flex;
          align-items: center;
        }
        .steps-list li:before {
          content: "✅";
          margin-right: 10px;
          font-size: 16px;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .footer {
          background: #343a40;
          color: white;
          padding: 25px;
          text-align: center;
        }
        .contact-info {
          margin: 15px 0;
        }
        .contact-info p {
          margin: 5px 0;
        }
        .disclaimer {
          font-size: 12px;
          color: #adb5bd;
          margin-top: 20px;
          line-height: 1.4;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 5px;
          }
          .header {
            padding: 20px;
          }
          .header h1 {
            font-size: 24px;
          }
          .content {
            padding: 20px;
          }
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          .value {
            text-align: left;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="success-icon">🎉</span>
          <h1>Registration Successful!</h1>
          <p>Welcome to Sangli Skating Academy</p>
        </div>
        
        <div class="content">
          <div class="welcome-message">
            Hello <strong>${full_name}</strong>!<br>
            Congratulations! Your skating class registration and payment have been successfully processed. We're thrilled to have you join our skating community!
          </div>
          
          <div class="details-section">
            <h3 style="margin-top: 0; color: #495057;">📋 Registration Details</h3>
            
            <div class="detail-row">
              <span class="label">Full Name:</span>
              <span class="value">${full_name}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Email:</span>
              <span class="value">${email}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Phone Number:</span>
              <span class="value">${phone_number}</span>
            </div>
            
            ${
              age
                ? `
            <div class="detail-row">
              <span class="label">Age:</span>
              <span class="value">${age} years</span>
            </div>
            `
                : ""
            }
            
            ${
              gender
                ? `
            <div class="detail-row">
              <span class="label">Gender:</span>
              <span class="value">${gender}</span>
            </div>
            `
                : ""
            }
            
            <div class="detail-row">
              <span class="label">Amount Paid:</span>
              <span class="value amount-highlight">₹${amount}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Payment Date:</span>
              <span class="value">${paymentDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Membership Start:</span>
              <span class="value">${issueFormatted}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Membership End:</span>
              <span class="value">${endFormatted}</span>
            </div>
            
            <div class="detail-row">
              <span class="label">Payment ID:</span>
              <span class="value" style="font-family: monospace; font-size: 12px;">${razorpay_payment_id}</span>
            </div>
          </div>
          
          <div class="next-steps">
            <h3>🎯 What's Next?</h3>
            <ul class="steps-list">
              <li><strong>Visit our academy</strong> with this email confirmation</li>
              <li><strong>Bring safety gear:</strong> helmet, knee pads, elbow pads</li>
              <li><strong>Arrive 15 minutes early</strong> for your first class</li>
            </ul>
          </div>
          
          <div style="text-align: center;">
            <a href="https://www.sangliskating.com" class="cta-button">Visit Our Website</a>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">📝 Important Notes:</h4>
            <ul style="margin-bottom: 0; color: #856404;">
              <li>Please save this email as proof of payment</li>
              <li>Bring a water bottle and comfortable clothing</li>
              <li>Refunds are available as per our refund policy</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <h3 style="margin-top: 0;">📞 Contact Information</h3>
          <div class="contact-info">
           <div style="text-align: left; margin: 15px 0;">
              <p style="margin: 8px 0;"><strong>📧 Email:</strong> saiskating2200@gmail.com</p>
              <p style="margin: 8px 0;"><strong>📱 Phone:</strong></p>
              <p style="margin: 3px 0; padding-left: 20px;">+91 9595893434 (Mr. Suraj A. Shinde)</p>
              <p style="margin: 3px 0; padding-left: 20px;">+91 9595473434 (Mrs. Parveen S. Shinde)</p>
              <p style="margin: 8px 0;"><strong>🌐 Website:</strong> https://www.sangliskating.com</p>
            </div>
          </div>
          
          <div class="disclaimer">
            This is an automated email confirmation. Please do not reply to this email.
            For any queries, please contact us using the information provided above.
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `
🎉 REGISTRATION SUCCESSFUL! 🎉

Hello ${full_name}!

Congratulations! Your skating class registration and payment have been successfully processed.

REGISTRATION DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Full Name: ${full_name}
✓ Email: ${email}
✓ Phone: ${phone_number}
${age ? `✓ Age: ${age} years` : ""}
${gender ? `✓ Gender: ${gender}` : ""}
✓ Amount Paid: ₹${amount}
✓ Payment Date: ${paymentDate}
✓ Membership Start: ${issueFormatted}
✓ Membership End: ${endFormatted}
✓ Payment ID: ${razorpay_payment_id}

WHAT'S NEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Visit our academy with this email confirmation
🛡️ Bring safety gear: helmet, knee pads, elbow pads  
⏰ Arrive 15 minutes early for your first class
🌐 Check our website for schedules: www.sangliskating.com
💧 Bring water bottle and wear comfortable clothing

IMPORTANT NOTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Save this email as proof of payment
🗣️ Classes conducted in English and Marathi
💰 Refunds available as per our refund policy

CONTACT INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Sangli Skating Academy
📧 saiskating2200@gmail.com
📱 +91 9595893434 (Mr. Suraj A. Shinde), +91 9595473434 (Mrs. Parveen S. Shinde)
📍 Sangli, Maharashtra
🌐 www.sangliskating.com

This is an automated email. Please do not reply.
    `;

    // Email options
    const mailOptions = {
      from: `"Sangli Skating Academy" <${SMTP_CONFIG.user}>`,
      to: email,
      subject: `🎉 Registration Confirmed - Welcome to Sangli Skating Academy!`,
      text: textContent,
      html: htmlContent,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Club registration email sent to ${email}:`, info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      recipient: email,
    };
  } catch (error) {
    console.error("❌ Failed to send club registration email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send admin notification for new club registration
export const sendClubRegistrationAdminNotification = async (
  registrationData
) => {
  try {
    // Check if admin emails are configured
    if (!process.env.ADMIN_NOTIFICATION_EMAILS) {
      console.log(
        "⚠️ No admin notification emails configured for club registration"
      );
      return { success: false, error: "No admin emails configured" };
    }

    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS.split(",").map(
      (email) => email.trim()
    );

    const {
      full_name,
      email,
      phone_number,
      amount,
      issue_date,
      end_date,
      razorpay_payment_id,
      age,
      gender,
    } = registrationData;

    // Format dates
    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const issueFormatted = formatDate(issue_date);
    const endFormatted = formatDate(end_date);
    const registrationTime = new Date().toLocaleString("en-IN");

    // HTML email for admin
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .alert-badge { background: #dc3545; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .detail-table td { padding: 12px; border: 1px solid #ddd; }
        .detail-table td:first-child { background: #f8f9fa; font-weight: bold; width: 40%; }
        .amount-highlight { color: #28a745; font-weight: bold; font-size: 18px; }
        .action-section { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🆕 New Club Registration Alert</h1>
          <span class="alert-badge">PAYMENT SUCCESSFUL</span>
          <p>A new student has successfully registered and paid for classes!</p>
        </div>
        
        <div class="content">
          <h2>Student Registration Details:</h2>
          
          <table class="detail-table">
            <tr>
              <td>Student Name</td>
              <td><strong>${full_name}</strong></td>
            </tr>
            <tr>
              <td>Email Address</td>
              <td>${email}</td>
            </tr>
            <tr>
              <td>Phone Number</td>
              <td>${phone_number}</td>
            </tr>
            ${
              age
                ? `
            <tr>
              <td>Age</td>
              <td>${age} years</td>
            </tr>
            `
                : ""
            }
            ${
              gender
                ? `
            <tr>
              <td>Gender</td>
              <td>${gender}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td>Amount Paid</td>
              <td class="amount-highlight">₹${amount}</td>
            </tr>
            <tr>
              <td>Membership Start</td>
              <td>${issueFormatted}</td>
            </tr>
            <tr>
              <td>Membership End</td>
              <td>${endFormatted}</td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td style="font-family: monospace; font-size: 12px;">${razorpay_payment_id}</td>
            </tr>
            <tr>
              <td>Registration Time</td>
              <td>${registrationTime}</td>
            </tr>
          </table>
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">💡 Quick Stats:</h4>
            <p style="margin-bottom: 0; color: #856404;">
              <strong>Total Revenue Today:</strong> Check admin dashboard for updated totals<br>
              <strong>Payment Method:</strong> Razorpay (Online)<br>
              <strong>Status:</strong> ✅ Confirmed & Paid
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Sangli Skating Academy</strong> - Admin Notification System</p>
          <p>This is an automated notification. Check the admin dashboard for more details.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send to all admin emails
    const emailPromises = adminEmails.map((adminEmail) => {
      const mailOptions = {
        from: `"Sangli Skating Academy - System" <${SMTP_CONFIG.user}>`,
        to: adminEmail,
        subject: `🆕 New Registration: ${full_name} - ₹${amount} PAID`,
        html: htmlContent,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(
      `✅ Admin notification emails sent to: ${adminEmails.join(", ")}`
    );

    return {
      success: true,
      recipients: adminEmails,
    };
  } catch (error) {
    console.error("❌ Failed to send admin notification email:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send admin notification for new event registration
export const sendEventRegistrationAdminNotification = async (
  registrationData
) => {
  try {
    console.log(
      "📧 Attempting to send event registration admin notification..."
    );

    // Check if admin emails are configured
    if (!process.env.ADMIN_NOTIFICATION_EMAILS) {
      console.log(
        "⚠️ No admin notification emails configured for event registration"
      );
      return { success: false, error: "No admin emails configured" };
    }

    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS.split(",").map(
      (email) => email.trim()
    );

    console.log(`📧 Admin emails configured: ${adminEmails.join(", ")}`);

    const {
      userName,
      userEmail,
      userPhone,
      eventName,
      eventStartDate,
      eventLocation,
      registrationType,
      teamName,
      teamMembers,
      paymentAmount,
      paymentId,
      orderId,
      registrationDate,
      userEventCategory,
    } = registrationData;

    // Format dates
    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const eventDateFormatted = formatDate(eventStartDate);
    const registrationTime = formatDate(registrationDate || new Date());

    // Parse team members if it's a team registration
    let teamMembersHTML = "";
    if (registrationType === "team" && teamMembers && teamMembers.length > 0) {
      teamMembersHTML = `
        <tr>
          <td colspan="2" style="background: #fff3cd; padding: 15px;">
            <h4 style="margin-top: 0;">👥 Team Members (${
              teamMembers.length
            }):</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${teamMembers
                .map(
                  (member, idx) => `
                <li>
                  <strong>${
                    member.full_name ||
                    member.first_name + " " + member.last_name ||
                    "Member " + (idx + 1)
                  }</strong>
                  ${member.email ? `<br>📧 ${member.email}` : ""}
                  ${member.phone ? `<br>📱 ${member.phone}` : ""}
                </li>
              `
                )
                .join("")}
            </ul>
          </td>
        </tr>
      `;
    }

    // Parse user event categories
    let categoriesHTML = "";
    if (userEventCategory && userEventCategory.length > 0) {
      const categories = Array.isArray(userEventCategory)
        ? userEventCategory.join(", ")
        : userEventCategory;
      categoriesHTML = `
        <tr>
          <td>Selected Categories</td>
          <td><strong>${categories}</strong></td>
        </tr>
      `;
    }

    // HTML email for admin
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .alert-badge { background: #28a745; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
        .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .detail-table td { padding: 12px; border: 1px solid #ddd; }
        .detail-table td:first-child { background: #f8f9fa; font-weight: bold; width: 40%; }
        .amount-highlight { color: #28a745; font-weight: bold; font-size: 18px; }
        .event-highlight { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff; }
        .footer { background: #6c757d; color: white; padding: 15px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New Event Registration Alert</h1>
          <span class="alert-badge">PAYMENT SUCCESSFUL</span>
          <p>A participant has successfully registered and paid for an event!</p>
        </div>
        
        <div class="content">
          <div class="event-highlight">
            <h2 style="margin-top: 0; color: #007bff;">🏆 ${eventName}</h2>
            <p style="margin-bottom: 0;">
              📍 ${eventLocation || "Location TBA"}<br>
              📅 ${eventDateFormatted}
            </p>
          </div>

          <h3>Participant Details:</h3>
          
          <table class="detail-table">
            <tr>
              <td>Registration Type</td>
              <td><strong style="text-transform: uppercase;">${registrationType}</strong></td>
            </tr>
            ${
              teamName
                ? `
            <tr>
              <td>Team Name</td>
              <td><strong>${teamName}</strong></td>
            </tr>
            `
                : ""
            }
            <tr>
              <td>${
                registrationType === "team"
                  ? "Team Captain"
                  : "Participant Name"
              }</td>
              <td><strong>${userName}</strong></td>
            </tr>
            <tr>
              <td>Email Address</td>
              <td>${userEmail}</td>
            </tr>
            ${
              userPhone
                ? `
            <tr>
              <td>Phone Number</td>
              <td>${userPhone}</td>
            </tr>
            `
                : ""
            }
            ${categoriesHTML}
            ${teamMembersHTML}
            <tr>
              <td>Amount Paid</td>
              <td class="amount-highlight">₹${paymentAmount}</td>
            </tr>
            <tr>
              <td>Payment ID</td>
              <td style="font-family: monospace; font-size: 12px;">${paymentId}</td>
            </tr>
            <tr>
              <td>Order ID</td>
              <td style="font-family: monospace; font-size: 12px;">${orderId}</td>
            </tr>
            <tr>
              <td>Registration Time</td>
              <td>${registrationTime}</td>
            </tr>
          </table>
          
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #155724;">✅ Registration Status:</h4>
            <p style="margin-bottom: 0; color: #155724;">
              <strong>Payment Status:</strong> Confirmed & Paid<br>
              <strong>Registration Status:</strong> Active<br>
              <strong>Confirmation Email:</strong> Sent to participant
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Sangli Skating Academy</strong> - Admin Notification System</p>
          <p>This is an automated notification. Check the admin dashboard for complete event details.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Send to all admin emails
    const emailPromises = adminEmails.map((adminEmail) => {
      const mailOptions = {
        from: `"Sangli Skating Academy - System" <${SMTP_CONFIG.user}>`,
        to: adminEmail,
        subject: `🎉 New Event Registration: ${userName} - ${eventName} - ₹${paymentAmount} PAID`,
        html: htmlContent,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);
    console.log(
      `✅ Event registration admin notification sent to: ${adminEmails.join(
        ", "
      )}`
    );

    return {
      success: true,
      recipients: adminEmails,
    };
  } catch (error) {
    console.error(
      "❌ Failed to send event registration admin notification:",
      error.message
    );
    console.error("Full error details:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  sendWelcomeEmail,
  sendRegistrationConfirmationEmail,
  sendClubRegistrationSuccessEmail,
  sendClubRegistrationAdminNotification,
  sendEventRegistrationAdminNotification,
};
