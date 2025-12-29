import express from "express";
import multer from "multer";
const router = express.Router();
import {
  getUserDetailsByRegistration,
  updateUserDetailsByRegistration,
} from "../controllers/userDetailsController.js";

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

import auth from "../middleware/auth.js";

// Get user_details for a registration
router.get("/:registrationId", auth, getUserDetailsByRegistration);
// Update user_details for a registration
router.patch(
  "/:registrationId",
  auth,
  upload.single("aadhaar_image"),
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
      return res.status(400).json({
        error: "Invalid file",
        message: err.message || "Only image files are allowed",
      });
    }
    next();
  },
  updateUserDetailsByRegistration
);

export default router;
