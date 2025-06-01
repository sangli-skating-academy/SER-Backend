import express from "express";
import { registerUser, loginUser } from "../controllers/userController.js";

const router = express.Router();

// @route   POST /api/users/register
router.post("/register", registerUser);

// @route   POST /api/users/login
router.post("/login", loginUser);

export default router;
