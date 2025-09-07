import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import helmet from "helmet";
import morgan from "morgan";

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

// Import and start scheduled jobs
import { scheduleEventStatusUpdate } from "./jobs/eventStatusJob.js";
import { scheduleEventCleanup } from "./jobs/eventCleanupJob.js";
import { scheduleClassRegistrationCleanup } from "./jobs/classRegistrationCleanupJob.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Logging Middlewares
app.use(helmet());
app.use(morgan("dev"));

// Add this CSP middleware after helmet, before routes
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' https://ser-frontend-livid.vercel.app data:; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests"
  );
  next();
});

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",
  "https://www.sangliskating.com",
  "https://ser-frontend-livid.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start scheduled jobs
  scheduleEventStatusUpdate();
  console.log("Event status update job scheduled successfully");

  scheduleEventCleanup();
  console.log("Event cleanup job scheduled successfully");

  scheduleClassRegistrationCleanup();
  console.log("Class registration cleanup job scheduled successfully");
});
