import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateMe,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// @route   POST /api/users/register
// Apply strict rate limiting to prevent brute force attacks
router.post("/register", authLimiter, registerUser);

// @route   POST /api/users/login
// Apply strict rate limiting to prevent brute force attacks
router.post("/login", authLimiter, loginUser);

// @route   POST /api/users/logout
router.post("/logout", logoutUser);

// @route   GET /api/users/me
router.get("/me", auth, getMe);

// @route   PATCH /api/users/me
router.patch("/me", auth, updateMe);

export default router;
