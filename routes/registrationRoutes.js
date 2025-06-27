// Registration routes for event registration (individual/team)
import express from "express";
const router = express.Router();
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  registerForEvent,
  getUserRegistrations,
  cancelRegistration,
} from "../controllers/registrationController.js";
import auth from "../middleware/auth.js";

// Multer config for Aadhaar image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/aadhaar/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// Register for event (individual or team)
router.post("/", auth, upload.single("aadhaarImage"), registerForEvent);

// Get registrations for a user (for duplicate check)
router.get("/user/:userId", auth, getUserRegistrations);

// Get registrations for the logged-in user (dashboard)
router.get("/", auth, getUserRegistrations);

// Cancel a registration (dashboard)
router.patch("/:id/cancel", auth, cancelRegistration);

// Delete a registration (dashboard)
router.delete("/:id", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const registrationId = req.params.id;
    // Only allow deleting own registration
    const regRes = await import("../config/db.js").then(m => m.default.query(
      "SELECT * FROM registrations WHERE id = $1 AND user_id = $2",
      [registrationId, userId]
    ));
    if (!regRes.rows.length) {
      return res.status(404).json({ error: "Registration not found." });
    }
    await import("../config/db.js").then(m => m.default.query(
      "DELETE FROM registrations WHERE id = $1",
      [registrationId]
    ));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete registration." });
  }
});

export default router;
