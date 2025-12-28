import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";
import { SERVER_CONFIG, CORS_CONFIG, validateConfig } from "./config/config.js";

import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import registrationRoutes from "./routes/registrationRoutes.js";
import userDetailsRoutes from "./routes/userDetailsRoutes.js";
import secureFile from "./routes/securefile.js";
import galleryRoutes from "./routes/galleryRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import clubRoutes from "./routes/clubRoutes.js";

import adminAllRegistrationRoutes from "./routes/admin/registrations.js";
import adminGalleryRoutes from "./routes/admin/gallery.js";
import adminSecureFileRoutes from "./routes/admin/secureFile.js";
import adminContactRoutes from "./routes/admin/contact.js";
import adminGetUsers from "./routes/admin/users.js";
import adminEventRoutes from "./routes/admin/events.js";
import adminClassRegistrationRoutes from "./routes/admin/classRegistrations.js";
import adminEventCleanupRoutes from "./routes/admin/eventCleanup.js";
import adminClassCleanupRoutes from "./routes/admin/classCleanup.js";

import errorHandler from "./middleware/errorHandler.js";
import healthCheck from "./routes/healthRoute.js";
import { generalLimiter } from "./middleware/rateLimiter.js";

// Import and start scheduled jobs
import { scheduleEventStatusUpdate } from "./jobs/eventStatusJob.js";
import { scheduleEventCleanup } from "./jobs/eventCleanupJob.js";
import { scheduleClassRegistrationCleanup } from "./jobs/classRegistrationCleanupJob.js";
import scheduleContactCleanup from "./jobs/contactCleanupJob.js";
import schedulePaymentCleanup from "./jobs/paymentCleanupJob.js";

// Import email queue services
import { initializeEmailQueue, stopEmailQueue } from "./services/emailQueue.js";
import { startEmailWorker } from "./jobs/emailWorker.js";

// Validate required environment variables
validateConfig();

const app = express();
const PORT = SERVER_CONFIG.PORT;

// Security & Logging Middlewares
app.use(helmet());
app.use(morgan("dev"));

// Add this CSP middleware after helmet, before routes
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "img-src 'self' https://res.cloudinary.com data:; " +
      "base-uri 'self'; " +
      "font-src 'self' https: data:; " +
      "form-action 'self'; " +
      "frame-ancestors 'self'; " +
      "object-src 'none'; " +
      "script-src 'self'; " +
      "script-src-attr 'none'; " +
      "style-src 'self' https: 'unsafe-inline'; " +
      "upgrade-insecure-requests"
  );
  next();
});

app.use(
  cors({
    origin: CORS_CONFIG.allowedOrigins,
    methods: CORS_CONFIG.methods,
    credentials: CORS_CONFIG.credentials,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Rate Limiting - Apply to all API routes
// Protects against brute force, spam, and DDoS attacks
app.use("/api/", generalLimiter);

// Public gallery images (non-sensitive) with CORP header
app.use(
  "/uploads/events",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve(process.cwd(), "uploads/events"))
);
app.use(
  "/uploads/gallery",
  (req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.resolve(process.cwd(), "uploads/gallery"))
);

// Public API Routes
app.get("/", (req, res) => {
  res.send("Sport event registration Backend Running! 🛡️");
});
// Health check routes
app.use("/api", healthCheck);

// API Routes
// All user routes are protected by auth middleware
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/user-details", userDetailsRoutes);
app.use("/api/secure-file", secureFile); // Secure file routes (for users)
app.use("/api/gallery", galleryRoutes);
app.use("/api/teams", teamRoutes); // Team routes
app.use("/api/payment", paymentRoutes); // Payment routes for Razorpay integration
app.use("/api/club", clubRoutes); // Club registration routes

// Admin-only API Routes (all protected by auth & adminOnly)
app.use("/api/admin/users", adminGetUsers); //Admin get all users data
app.use("/api/admin/gallery", adminGalleryRoutes); // Admin gallery routes
app.use("/api/admin/secure-file", adminSecureFileRoutes); // Admin secure file routes
app.use("/api/admin/contact", adminContactRoutes); // Admin contact route
app.use("/api/admin/registrations", adminAllRegistrationRoutes); // Admin registrations route
app.use("/api/admin/events", adminEventRoutes); // Admin event routes
app.use("/api/admin/class-registrations", adminClassRegistrationRoutes); // Admin class registration routes
app.use("/api/admin/event-cleanup", adminEventCleanupRoutes); // Admin event cleanup routes
app.use("/api/admin/class-cleanup", adminClassCleanupRoutes); // Admin class cleanup routes

// 404 handler for unknown API routes
app.use((req, res, next) => {
  res.status(404).json({ message: "API route not found" });
});
app.use(errorHandler);

// Initialize email queue and worker before starting server
async function startServer() {
  try {
    // Initialize email queue
    await initializeEmailQueue();

    // Start email worker
    await startEmailWorker();

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      // Start scheduled jobs
      scheduleEventStatusUpdate();
      console.log("Event status update job scheduled successfully");

      scheduleEventCleanup();
      console.log("Event cleanup job scheduled successfully");

      scheduleClassRegistrationCleanup();
      console.log("Class registration cleanup job scheduled successfully");

      scheduleContactCleanup();
      console.log("Contact messages cleanup job scheduled successfully");

      schedulePaymentCleanup();
      console.log("Payment cleanup job scheduled successfully");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await stopEmailQueue();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  await stopEmailQueue();
  process.exit(0);
});

// Start the server
startServer();
