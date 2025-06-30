import express from "express";
import path from "path";
import fs from "fs";
import auth from "../middleware/auth.js";

const router = express.Router();

// GET /api/secure-file/:filename
router.get("/:filename", auth, (req, res) => {
  const { filename } = req.params;
  // Optionally: add more checks to ensure user is authorized for this file
  const filePath = path.join(process.cwd(), "uploads", "aadhaar", filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

export default router;
