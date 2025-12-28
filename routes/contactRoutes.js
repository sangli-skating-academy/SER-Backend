import express from "express";
import { createContactMessage } from "../controllers/contactController.js";
import { contactLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// POST /api/contact
// Apply rate limiting to prevent spam (3 submissions per hour)
router.post("/", contactLimiter, createContactMessage);

export default router;
