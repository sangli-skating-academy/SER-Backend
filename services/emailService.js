import nodemailer from "nodemailer";

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

// Verify email connection on startup
(async () => {
  try {
    await transporter.verify();
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
        .role-badge {
          display: inline-block;
          background: #4CAF50;
          color: white;
          padding: 5px 15px;
          border-radius: 15px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
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
            <p>Your account has been successfully created with the role: <span class="role-badge">${role}</span></p>
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
              <div class="feature-icon">🏆</div>
              <div>
                <strong>Track Progress</strong><br>
                <small>Monitor your skating journey and achievements</small>
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
            <a href="${
              process.env.BASE_URL || "https://your-domain.com"
            }" class="cta-button">
              🚀 Explore Your Dashboard
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
          <p>📧 Email: saiskating2200@gmail.com | 📱 Phone: +91-XXXXXXXXXX</p>
          <p>🌐 Website: ${
            process.env.BASE_URL || "https://your-domain.com"
          }</p>
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
    
    Visit your dashboard: ${process.env.BASE_URL || "https://your-domain.com"}
    
    Getting Started Tips:
    - Complete your profile for a better experience
    - Check out our upcoming events
    - Join our community and start your skating journey
    - Contact us if you need any assistance
    
    Ready to glide into adventure?
    
    Best regards,
    Sangli Skating Academy Team
    
    Email: saiskating2200@gmail.com
    Website: ${process.env.BASE_URL || "https://your-domain.com"}
  `;

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy",
      address: process.env.SMTP_USER,
    },
    to: email,
    subject: "🛼 Welcome to Sangli Skating Academy - Let's Start Skating! 🛼",
    text: textContent,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `❌ Failed to send welcome email to ${email}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
};

// Send registration confirmation email
export const sendRegistrationConfirmationEmail = async (
  registrationDetails
) => {
  const {
    userEmail,
    userName,
    eventName,
    eventStartDate,
    eventEndDate,
    eventLocation,
    registrationType,
    teamName,
    teamMembers,
    registrationDate,
    eventDescription,
    eventFees,
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
      <title>Registration Confirmation - ${eventName}</title>
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
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .success-badge {
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          border-radius: 50px;
          padding: 10px 20px;
          margin: 15px 0;
          display: inline-block;
          font-size: 16px;
          font-weight: bold;
        }
        .content {
          padding: 30px;
        }
        .confirmation-box {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .event-details {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: bold;
          color: #495057;
          flex: 1;
        }
        .detail-value {
          flex: 2;
          text-align: right;
          color: #212529;
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
          padding: 20px;
          margin: 20px 0;
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
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .emoji-large {
          font-size: 32px;
          margin: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji-large">🎉</div>
          <h1>Registration Confirmed!</h1>
          <div class="success-badge">✅ Successfully Registered</div>
          <p>Your spot is secured for this amazing skating event</p>
        </div>
        
        <div class="content">
          <div class="confirmation-box">
            <h2>🛼 Hello ${userName}!</h2>
            <p><strong>Congratulations!</strong> Your registration for <strong>${eventName}</strong> has been confirmed.</p>
            <p>Registration Type: <strong>${registrationType.toUpperCase()}</strong></p>
            ${teamName ? `<p>Team Name: <strong>${teamName}</strong></p>` : ""}
          </div>

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
              <div class="detail-label">🏁 End Date:</div>
              <div class="detail-value">${formatDate(eventEndDate)}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">💰 Event Fees:</div>
              <div class="detail-value">₹${eventFees || "Free"}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">📝 Registration Date:</div>
              <div class="detail-value">${formatDate(registrationDate)}</div>
            </div>
          </div>

          ${
            eventDescription
              ? `
            <div style="background: #e7f3ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
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
            <p><strong>📧 Email:</strong> saiskating2200@gmail.com</p>
            <p><strong>📱 Phone:</strong> +91-XXXXXXXXXX</p>
            <p><strong>🌐 Website:</strong> ${
              process.env.BASE_URL || "https://your-domain.com"
            }</p>
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
    
    Congratulations! Your registration for "${eventName}" has been confirmed.
    
    Registration Details:
    - Registration Type: ${registrationType.toUpperCase()}
    ${teamName ? `- Team Name: ${teamName}` : ""}
    - Event Name: ${eventName}
    - Location: ${eventLocation || "TBA"}
    - Start Date: ${formatDate(eventStartDate)}
    - End Date: ${formatDate(eventEndDate)}
    - Event Fees: ₹${eventFees || "Free"}
    - Registration Date: ${formatDate(registrationDate)}
    
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
    Email: saiskating2200@gmail.com
    Phone: +91-XXXXXXXXXX
    Website: ${process.env.BASE_URL || "https://your-domain.com"}
    
    Get ready to roll and have an amazing time!
    
    Best regards,
    Sangli Skating Academy Team
  `;

  const mailOptions = {
    from: {
      name: "Sangli Skating Academy",
      address: process.env.SMTP_USER,
    },
    to: userEmail,
    subject: `🎉 Registration Confirmed: ${eventName} - Sangli Skating Academy`,
    text: textContent,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(
      `✅ Registration confirmation email sent to ${userEmail} for event: ${eventName}`
    );
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(
      `❌ Failed to send registration email to ${userEmail}:`,
      error.message
    );
    return { success: false, error: error.message };
  }
};

export default {
  sendWelcomeEmail,
  sendRegistrationConfirmationEmail,
};
