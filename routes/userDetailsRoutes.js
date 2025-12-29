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
  updateUserDetailsByRegistration
);

export default router;
