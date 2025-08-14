import express from "express";
import pool from "../../config/db.js";
import adminOnly from "../../middleware/admin.js";
import auth from "../../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const router = express.Router();

// Multer config for temp storage before Cloudinary upload
const upload = multer({ dest: "uploads/gallery/" });

// Helper to get base URL
function getBaseUrl(req) {
  return process.env.BASE_URL;
}

// PATCH /api/admin/gallery/:id (admin only)
router.patch(
  "/:id",
  auth,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const { title, event_name, date, image_location } = req.body;
    let image_url = null;
    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "gallery",
        resource_type: "image",
      });
      image_url = result.secure_url;
      // Remove temp file
      fs.unlinkSync(req.file.path);
    }
    try {
      // Fetch old image url if new image uploaded
      let oldImage = null;
      if (image_url) {
        const old = await pool.query(
          "SELECT image_url FROM gallery WHERE id = $1",
          [id]
        );
        oldImage = old.rows[0]?.image_url;
      }
      // Build query and params for update
      let query =
        "UPDATE gallery SET title = $1, event_name = $2, date = $3, image_location = $4, uploaded_at = NOW()";
      let params = [title, event_name, date, image_location];
      if (image_url) {
        query += ", image_url = $5 WHERE id = $6 RETURNING *";
        params.push(image_url, id);
      } else {
        query += " WHERE id = $5 RETURNING *";
        params.push(id);
      }
      const result = await pool.query(query, params);
      // Remove old image file or Cloudinary image if replaced
      if (image_url && oldImage && oldImage !== image_url) {
        if (oldImage.startsWith("http")) {
          // Delete from Cloudinary using public_id
          const matches = oldImage.match(/\/gallery\/([^\.]+)\./);
          if (matches && matches[1]) {
            const publicId = `gallery/${matches[1]}`;
            try {
              await cloudinary.uploader.destroy(publicId, {
                resource_type: "image",
              });
            } catch {}
          }
        } else if (oldImage.includes("/uploads/gallery/")) {
          const oldPath = oldImage.replace(getBaseUrl(req), "");
          fs.unlink(path.join(process.cwd(), oldPath), () => {});
        }
      }
      res.json({ gallery: result.rows[0] });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to update gallery item", details: err.message });
    }
  }
);

// POST /api/admin/gallery/add (admin only)
router.post(
  "/add",
  auth,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const { title, event_name, date, image_location } = req.body;
    let image_url = null;
    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "gallery",
        resource_type: "image",
      });
      image_url = result.secure_url;
      // Remove temp file
      fs.unlinkSync(req.file.path);
    }
    try {
      const result = await pool.query(
        `INSERT INTO gallery (title, event_name, date, image_url, image_location, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
        [title, event_name, date, image_url, image_location]
      );
      res.status(201).json({ gallery: result.rows[0] });
    } catch (err) {
      res
        .status(500)
        .json({ error: "Failed to add gallery item", details: err.message });
    }
  }
);

// DELETE /api/admin/gallery/:id (admin only)
router.delete("/:id", auth, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // Get image_url to delete file or Cloudinary image
    const result = await pool.query(
      "SELECT image_url FROM gallery WHERE id = $1",
      [id]
    );
    const image_url = result.rows[0]?.image_url;
    // Delete from DB
    await pool.query("DELETE FROM gallery WHERE id = $1", [id]);
    // Remove image from Cloudinary or local disk
    if (image_url) {
      if (image_url.startsWith("http")) {
        const matches = image_url.match(/\/gallery\/([^\.]+)\./);
        if (matches && matches[1]) {
          const publicId = `gallery/${matches[1]}`;
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
            });
          } catch {}
        }
      } else if (image_url.includes("/uploads/gallery/")) {
        const oldPath = image_url.replace(getBaseUrl(req), "");
        fs.unlink(path.join(process.cwd(), oldPath), () => {});
      }
    }
    res.json({ message: "Gallery item deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete gallery item", details: err.message });
  }
});

export default router;
