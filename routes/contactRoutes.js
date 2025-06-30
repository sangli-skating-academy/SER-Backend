import express from "express";
import {
  createContactMessage,
  getAllContactMessages,
} from "../controllers/contactController.js";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/admin.js";
const router = express.Router();

// POST /api/contact
router.post("/", createContactMessage);

router.get("/all", auth, adminOnly, getAllContactMessages);
export default router;
