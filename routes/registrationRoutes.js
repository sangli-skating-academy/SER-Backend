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
import { registrationLimiter } from "../middleware/rateLimiter.js";
// Multer config for Aadhaar image upload
// Use memoryStorage for Render (ephemeral filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// Register for event (individual or team)
// Apply rate limiting to prevent spam registrations (5 per hour)
router.post(
  "/",
  auth,
  registrationLimiter,
  upload.single("aadhaarImage"),
  (err, req, res, next) => {
    // Handle multer errors
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: "File too large",
          message:
            "Aadhaar image must be less than 5MB. Please upload a smaller file.",
        });
      }
      return res.status(400).json({
        error: "File upload error",
        message: err.message,
      });
    } else if (err) {
      // Handle other errors (like file type validation)
      return res.status(400).json({
        error: "Invalid file",
        message: err.message || "Only image files are allowed",
      });
    }
    next();
  },
  registerForEvent
);

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
