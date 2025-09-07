import express from "express";
import path from "path";
import fs from "fs";
import auth from "../middleware/auth.js";
import pool from "../config/db.js";

const router = express.Router();

// GET /api/secure-file/:filename (user can only access their own file)
router.get("/:filename", auth, async (req, res) => {
  const { filename } = req.params;
  const user = req.user; // from auth middleware

  try {
    // First, check if this filename exists in the database for this user
    const result = await pool.query(
      `SELECT aadhaar_image FROM user_details WHERE user_id = $1 AND (
        aadhaar_image LIKE $2 OR 
        aadhaar_image LIKE $3 OR
        aadhaar_image = $4
      )`,
      [user.id, `%${filename}%`, `%/${filename}`, filename]
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .send("Forbidden: You can only access your own Aadhaar file.");
    }

    const aadhaarImageUrl = result.rows[0].aadhaar_image;

    // If it's a Cloudinary URL, fetch and proxy it
    if (aadhaarImageUrl && aadhaarImageUrl.startsWith("http")) {
      try {
        const imageResponse = await fetch(aadhaarImageUrl);
        if (!imageResponse.ok) {
          return res.status(404).send("Image not found on Cloudinary");
        }

        // Set appropriate headers
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader(
          "Content-Type",
          imageResponse.headers.get("content-type") || "image/png"
        );
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

        // Pipe the image response to the client
        const imageBuffer = await imageResponse.arrayBuffer();
        return res.send(Buffer.from(imageBuffer));
      } catch (error) {
        console.error("Error fetching Cloudinary image:", error);
        return res.status(500).send("Error fetching image");
      }
    }

    // For local files, check if filename starts with user id
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
  } catch (error) {
    console.error("Error in secure file access:", error);
    res.status(500).send("Internal server error");
  }
});

export default router;
