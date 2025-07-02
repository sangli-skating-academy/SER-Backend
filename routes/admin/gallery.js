import express from "express";
import pool from "../../config/db.js";
import adminOnly from "../../middleware/admin.js";
import auth from "../../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/gallery/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + file.fieldname + ext);
  },
});
const upload = multer({ storage });

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
    const { title, event_name, date } = req.body;
    let image_url = null;
    if (req.file) {
      image_url = `${getBaseUrl(req)}/uploads/gallery/${req.file.filename}`;
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
        "UPDATE gallery SET title = $1, event_name = $2, date = $3, uploaded_at = NOW()";
      let params = [title, event_name, date];
      if (image_url) {
        query += ", image_url = $4 WHERE id = $5 RETURNING *";
        params.push(image_url, id);
      } else {
        query += " WHERE id = $4 RETURNING *";
        params.push(id);
      }
      const result = await pool.query(query, params);
      // Remove old image file if replaced
      if (
        image_url &&
        oldImage &&
        oldImage !== image_url &&
        oldImage.includes("/uploads/gallery/")
      ) {
        const oldPath = oldImage.replace(getBaseUrl(req), "");
        fs.unlink(path.join(process.cwd(), oldPath), () => {});
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
    const { title, event_name, date } = req.body;
    let image_url = null;
    if (req.file) {
      image_url = `${getBaseUrl(req)}/uploads/gallery/${req.file.filename}`;
    }
    try {
      const result = await pool.query(
        `INSERT INTO gallery (title, event_name, date, image_url, uploaded_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [title, event_name, date, image_url]
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
    // Get image_url to delete file
    const result = await pool.query(
      "SELECT image_url FROM gallery WHERE id = $1",
      [id]
    );
    const image_url = result.rows[0]?.image_url;
    // Delete from DB
    await pool.query("DELETE FROM gallery WHERE id = $1", [id]);
    // Remove file if exists and is local
    if (image_url && image_url.includes("/uploads/gallery/")) {
      const base = process.env.BASE_URL;
      const filePath =
        base && image_url.startsWith(base)
          ? image_url.replace(base, "")
          : image_url;
      fs.unlink(path.join(process.cwd(), filePath), () => {});
    }
    res.json({ message: "Gallery item deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete gallery item", details: err.message });
  }
});

export default router;
