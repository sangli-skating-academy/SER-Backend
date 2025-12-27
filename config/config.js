import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Server Configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  BASE_URL: process.env.BASE_URL || "http://localhost:5000",
};

// Database Configuration
export const DATABASE_CONFIG = {
  connectionString: process.env.DATABASE_URL,
};

// JWT Configuration
export const JWT_CONFIG = {
  SESSION_SECRET: process.env.SESSION_SECRET,
};

// SMTP Email Configuration
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
};

// Cloudinary Configuration
export const CLOUDINARY_CONFIG = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  key_id: process.env.RAZORPAY_ID_KEY,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
};

// Admin Email Configuration
export const ADMIN_CONFIG = {
  eventCleanupEmails: process.env.EVENT_CLEANUP_EMAILS
    ? process.env.EVENT_CLEANUP_EMAILS.split(",").map((email) => email.trim())
    : [],
};

// CORS Configuration
export const CORS_CONFIG = {
  allowedOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : ["http://localhost:5173"],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true,
};

// Validate required environment variables
export function validateConfig() {
  const required = {
    SESSION_SECRET: JWT_CONFIG.SESSION_SECRET,
    DATABASE_URL: DATABASE_CONFIG.connectionString,
    SMTP_USER: SMTP_CONFIG.user,
    SMTP_PASS: SMTP_CONFIG.pass,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
