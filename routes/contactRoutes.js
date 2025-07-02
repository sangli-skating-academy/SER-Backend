import express from "express";
import { createContactMessage } from "../controllers/contactController.js";

const router = express.Router();

// POST /api/contact
router.post("/", createContactMessage);

export default router;
