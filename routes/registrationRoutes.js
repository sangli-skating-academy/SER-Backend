// Registration routes for event registration (individual/team)
import express from "express";
const router = express.Router();
import multer from "multer";
import {
  registerForEvent,
  getUserRegistrations,
  cancelRegistration,
} from "../controllers/registrationController.js";
import auth from "../middleware/auth.js";
import fs from "fs";
import path from "path";

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
    const db = (await import("../config/db.js")).default;

    // Only allow deleting own registration
    const regRes = await db.query(
      "SELECT * FROM registrations WHERE id = $1 AND user_id = $2",
      [registrationId, userId]
    );
    if (!regRes.rows.length) {
      return res.status(404).json({ error: "Registration not found." });
    }

    // Fetch user_details_id
    const userDetailsId = regRes.rows[0].user_details_id;
    if (userDetailsId) {
      // Get Aadhaar image path
      const detailsRes = await db.query(
        "SELECT aadhaar_image FROM user_details WHERE id = $1",
        [userDetailsId]
      );
      const aadhaarImagePath = detailsRes.rows[0]?.aadhaar_image;
      if (aadhaarImagePath && fs.existsSync(aadhaarImagePath)) {
        try {
          fs.unlinkSync(aadhaarImagePath);
        } catch (err) {
          console.error("Failed to delete Aadhaar image:", err);
        }
      }
      // Optionally delete user_details row
      await db.query("DELETE FROM user_details WHERE id = $1", [userDetailsId]);
    }

    // Delete registration
    await db.query("DELETE FROM registrations WHERE id = $1", [registrationId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete registration." });
  }
});

export default router;
