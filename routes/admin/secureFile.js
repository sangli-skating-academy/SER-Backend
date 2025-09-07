import express from "express";
import path from "path";
import fs from "fs";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";
import pool from "../../config/db.js";

const router = express.Router();

// GET /api/admin/secure-file/:filename (admin only)
router.get("/:filename", auth, adminOnly, async (req, res) => {
  const { filename } = req.params;

  try {
    // First, check if this filename exists in the database (for Cloudinary files)
    const result = await pool.query(
      `SELECT aadhaar_image FROM user_details WHERE (
        aadhaar_image LIKE $1 OR 
        aadhaar_image LIKE $2 OR
        aadhaar_image = $3
      ) LIMIT 1`,
      [`%${filename}%`, `%/${filename}`, filename]
    );

    if (result.rows.length > 0) {
      const aadhaarImageUrl = result.rows[0].aadhaar_image;

      // If it's a Cloudinary URL, redirect to it
      if (aadhaarImageUrl && aadhaarImageUrl.startsWith("http")) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.redirect(aadhaarImageUrl);
      }
    }

    // For local files, try to serve from uploads directory
    const filePath = path.join(process.cwd(), "uploads", "aadhaar", filename);
    if (fs.existsSync(filePath)) {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.sendFile(filePath);
    } else {
      res.status(404).send("File not found");
    }
  } catch (error) {
    console.error("Error in admin secure file access:", error);
    res.status(500).send("Internal server error");
  }
});

export default router;
