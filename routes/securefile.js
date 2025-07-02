import express from "express";
import path from "path";
import fs from "fs";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET /api/admin/secure-file/:filename (user can only access their own file)
router.get("/:filename", auth, (req, res) => {
  const { filename } = req.params;
  const user = req.user; // from auth middleware

  // Only allow if filename starts with user id (e.g. `${user.id}-...`)
  if (!filename.startsWith(user.id + "-")) {
    return res
      .status(403)
      .send("Forbidden: You can only access your own Aadhaar file.");
  }

  const filePath = path.join(process.cwd(), "uploads", "aadhaar", filename);
  if (fs.existsSync(filePath)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

export default router;
