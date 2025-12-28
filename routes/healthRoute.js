import express from "express";
import pool from "../config/db.js";
import cloudinary from "../utils/cloudinary.js";
import nodemailer from "nodemailer";
import { SMTP_CONFIG } from "../config/config.js";

const router = express.Router();

// Basic health check (fast, for load balancers)
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Detailed health check (with dependency checks)
router.get("/health/detailed", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    checks: {
      database: { status: "unknown" },
      cloudinary: { status: "unknown" },
      email: { status: "unknown" },
    },
  };

  // Check database
  try {
    await pool.query("SELECT 1");
    health.checks.database = {
      status: "healthy",
      responseTime: "< 50ms",
    };
  } catch (error) {
    health.checks.database = {
      status: "unhealthy",
      error: error.message,
    };
    health.status = "degraded";
  }

  // Check Cloudinary
  try {
    await cloudinary.api.ping();
    health.checks.cloudinary = {
      status: "healthy",
    };
  } catch (error) {
    health.checks.cloudinary = {
      status: "unhealthy",
      error: error.message,
    };
    health.status = "degraded";
  }

  // Check email service
  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      secure: SMTP_CONFIG.secure,
      auth: {
        user: SMTP_CONFIG.user,
        pass: SMTP_CONFIG.pass,
      },
    });
    await transporter.verify();
    health.checks.email = {
      status: "healthy",
    };
  } catch (error) {
    health.checks.email = {
      status: "unhealthy",
      error: error.message,
    };
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
