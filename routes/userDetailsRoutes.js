import express from "express";
const router = express.Router();
import {
  getUserDetailsByRegistration,
  updateUserDetailsByRegistration,
} from "../controllers/userDetailsController.js";
import auth from "../middleware/auth.js";

// Get user_details for a registration
router.get("/:registrationId", auth, getUserDetailsByRegistration);
// Update user_details for a registration
router.patch("/:registrationId", auth, updateUserDetailsByRegistration);

export default router;
