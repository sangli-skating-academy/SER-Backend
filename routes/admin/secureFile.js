import express from "express";
import path from "path";
import fs from "fs";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";

const router = express.Router();

// GET /api/admin/secure-file/:filename (admin only)
router.get("/:filename", auth, adminOnly, (req, res) => {
  const { filename } = req.params;
  // Only admin can access any aadhaar file
  const filePath = path.join(process.cwd(), "uploads", "aadhaar", filename);
  if (fs.existsSync(filePath)) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

export default router;
