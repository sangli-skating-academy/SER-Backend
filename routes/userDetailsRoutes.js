import express from "express";
import multer from "multer";
import path from "path";
const router = express.Router();
import {
  getUserDetailsByRegistration,
  updateUserDetailsByRegistration,
} from "../controllers/userDetailsController.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/aadhaar/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

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
