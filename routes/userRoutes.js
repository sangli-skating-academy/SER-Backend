import express from "express";
import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// @route   POST /api/users/register
router.post("/register", registerUser);

// @route   POST /api/users/login
router.post("/login", loginUser);

// @route   GET /api/users/me
router.get("/me", auth, getMe);

export default router;
