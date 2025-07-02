import express from "express";
import { updateTeamMembers } from "../controllers/teamController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// PATCH /api/teams/:teamId/members
router.patch("/:teamId/members", auth, updateTeamMembers);

export default router;
