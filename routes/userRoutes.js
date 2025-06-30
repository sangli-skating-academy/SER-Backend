import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  getAllUsers,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/admin.js";

const router = express.Router();

// @route   POST /api/users/register
router.post("/register", registerUser);

// @route   POST /api/users/login
router.post("/login", loginUser);

// @route   GET /api/users/me
router.get("/me", auth, getMe);

// @route   PATCH /api/users/me
router.patch("/me", auth, updateMe);

// @route   GET /api/users (admin only)
router.get("/", auth, adminOnly, getAllUsers);

export default router;
