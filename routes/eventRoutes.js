import express from "express";
import { getEvents, getEventById } from "../controllers/eventController.js";

const router = express.Router();

// @route   GET /api/events
router.get("/", getEvents);

// @route   GET /api/events/:id
router.get("/:id", getEventById);

export default router;
