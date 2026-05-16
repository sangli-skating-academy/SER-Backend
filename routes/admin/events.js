import pool from "../../config/db.js";
import express from "express";
import auth from "../../middleware/auth.js";
import adminAuth from "../../middleware/admin.js";
import multer from "multer";
import cloudinary from "../../utils/cloudinary.js";
import { SERVER_CONFIG } from "../../config/config.js";

const router = express.Router();

// Use memoryStorage for Render (ephemeral filesystem)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

function getBaseUrl(req) {
  return SERVER_CONFIG.BASE_URL;
}

// PATCH /api/admin/events/:eventId
router.patch(
  "/:eventId",
  auth,
  adminAuth,
  upload.single("file"), // Accept file as 'file' for consistency
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({
            error: "File too large",
            message: "Image must be less than 10MB",
          });
      }
      return res
        .status(400)
        .json({ error: "File upload error", message: err.message });
    } else if (err) {
      return res
        .status(400)
        .json({ error: "Invalid file", message: err.message });
    }
    next();
  },
  async (req, res) => {
    const { eventId } = req.params;
    let updateFields = req.body;
    let image_url = null;
    if (req.file) {
      // Upload buffer directly to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "events",
          resource_type: "image",
        }
      );
      image_url = result.secure_url;
    }
    try {
      // Fetch old image url if new image uploaded
      let oldImage = null;
      if (image_url) {
        const old = await pool.query(
          "SELECT image_url FROM events WHERE id = $1",
          [eventId]
        );
        oldImage = old.rows[0]?.image_url;
      }
      // Build query and params for update
      const allowedFields = [
        "title",
        "description",
        "location",
        "start_date",
        "start_time", // <-- added
        "gender",
        "age_group",
        "is_team_event",
        "price_per_person",
        "price_per_team",
        "max_team_size",
        "hashtags",
        "is_featured",
        "rules_and_guidelines",
        "live", // <-- add live field
        "event_category", // <-- add event_category
        "skate_category", // <-- add skate_category
      ];
      let setClauses = [];
      let params = [];
      let idx = 1;

      const numericFields = [
        "price_per_person",
        "price_per_team",
        "max_team_size",
      ];
      const jsonbFields = [
        "age_group",
        "rules_and_guidelines",
        "event_category",
      ];
      const textArrayFields = [
        "hashtags",
        "skate_category",
      ];

      for (const key of allowedFields) {
        if (updateFields[key] !== undefined) {
          let value = updateFields[key];
          console.log(`Processing field: ${key}, value: "${value}"`);

          // Handle numeric fields: convert empty strings to null
          if (numericFields.includes(key) && (value === "" || value === null || value === "null")) {
            console.log(`Converting ${key} to null`);
            value = null;
          } else if (jsonbFields.includes(key) && typeof value === "string") {
            // JSONB fields: ensure they are valid JSON strings (already strings from multer)
            try {
              JSON.parse(value); // Validate JSON
            } catch (err) {
              console.warn(`Invalid JSON for field ${key}:`, err);
            }
          } else if (textArrayFields.includes(key) && typeof value === "string") {
            // TEXT[] fields: parse strings into Javascript arrays for pg driver
            try {
              value = JSON.parse(value);
            } catch (err) {
              console.warn(`Failed to parse array for field ${key}:`, err);
            }
          }

          setClauses.push(`${key} = $${idx}`);
          params.push(value);
          idx++;
        }
      }
      if (image_url) {
        setClauses.push(`image_url = $${idx}`);
        params.push(image_url);
        idx++;
      }
      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No valid fields to update." });
      }
      params.push(eventId);
      const result = await pool.query(
        `UPDATE events SET ${setClauses.join(
          ", "
        )} WHERE id = $${idx} RETURNING *`,
        params
      );
      // Remove old image from Cloudinary if replaced
      if (image_url && oldImage && oldImage !== image_url) {
        if (oldImage.startsWith("http")) {
          // Delete from Cloudinary using public_id
          const matches = oldImage.match(/\/events\/([^\.]+)\./);
          if (matches && matches[1]) {
            const publicId = `events/${matches[1]}`;
            try {
              await cloudinary.uploader.destroy(publicId, {
                resource_type: "image",
              });
            } catch {}
          }
        }
      }
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Event not found." });
      }
      res.json({ success: true, event: result.rows[0] });
    } catch (err) {
      console.error("Error updating event:", err);
      res.status(500).json({ error: "Failed to update event." });
    }
  }
);

// POST /api/admin/events
router.post(
  "/",
  auth,
  adminAuth,
  upload.single("file"),
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({
            error: "File too large",
            message: "Image must be less than 10MB",
          });
      }
      return res
        .status(400)
        .json({ error: "File upload error", message: err.message });
    } else if (err) {
      return res
        .status(400)
        .json({ error: "Invalid file", message: err.message });
    }
    next();
  },
  async (req, res) => {
    let fields = req.body;
    let image_url = null;
    if (req.file) {
      // Upload buffer directly to Cloudinary
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "events",
          resource_type: "image",
        }
      );
      image_url = result.secure_url;
    }
    try {
      const allowedFields = [
        "title",
        "description",
        "location",
        "start_date",
        "start_time", // <-- added
        "gender",
        "age_group",
        "is_team_event",
        "price_per_person",
        "price_per_team",
        "max_team_size",
        "hashtags",
        "is_featured",
        "rules_and_guidelines",
        "live", // <-- add live field
        "event_category", // <-- add event_category
        "skate_category", // <-- add skate_category
      ];
      let columns = [];
      let values = [];
      let params = [];
      let idx = 1;

      const numericFields = [
        "price_per_person",
        "price_per_team",
        "max_team_size",
      ];
      const jsonbFields = [
        "age_group",
        "rules_and_guidelines",
        "event_category",
      ];
      const textArrayFields = [
        "hashtags",
        "skate_category",
      ];

      for (const key of allowedFields) {
        if (fields[key] !== undefined) {
          let value = fields[key];

          // Handle numeric fields: convert empty strings to null
          if (numericFields.includes(key) && (value === "" || value === null)) {
            value = null;
          } else if (jsonbFields.includes(key) && typeof value === "string") {
            // JSONB fields: ensure they are valid JSON strings (already strings from multer)
            try {
              JSON.parse(value); // Validate JSON
            } catch (err) {
              console.warn(`Invalid JSON for field ${key}:`, err);
            }
          } else if (textArrayFields.includes(key) && typeof value === "string") {
            // TEXT[] fields: parse strings into Javascript arrays for pg driver
            try {
              value = JSON.parse(value);
            } catch (err) {
              console.warn(`Failed to parse array for field ${key}:`, err);
            }
          }

          columns.push(key);
          values.push(`$${idx}`);
          params.push(value);
          idx++;
        }
      }
      if (image_url) {
        columns.push("image_url");
        values.push(`$${idx}`);
        params.push(image_url);
        idx++;
      }
      if (columns.length === 0) {
        return res.status(400).json({ error: "No valid fields to insert." });
      }
      const result = await pool.query(
        `INSERT INTO events (${columns.join(", ")}) VALUES (${values.join(
          ", "
        )}) RETURNING *`,
        params
      );
      res.json({ success: true, event: result.rows[0] });
    } catch (err) {
      console.error("Error creating event:", err);
      res.status(500).json({ error: "Failed to create event." });
    }
  }
);

// DELETE /api/admin/events/:eventId
router.delete("/:eventId", auth, adminAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    // Get image url to delete file or Cloudinary image
    const result = await pool.query(
      "SELECT image_url FROM events WHERE id = $1",
      [eventId]
    );
    const image_url = result.rows[0]?.image_url;
    // Delete event
    const del = await pool.query(
      "DELETE FROM events WHERE id = $1 RETURNING *",
      [eventId]
    );
    if (del.rowCount === 0) {
      return res.status(404).json({ error: "Event not found." });
    }
    // Remove image from Cloudinary or local disk
    if (image_url) {
      if (image_url.startsWith("http")) {
        const matches = image_url.match(/\/events\/([^\.]+)\./);
        if (matches && matches[1]) {
          const publicId = `events/${matches[1]}`;
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
            });
          } catch {}
        }
      } else if (image_url.includes("/uploads/events/")) {
        const oldPath = image_url.replace(getBaseUrl(req), "");
        fs.unlinkSync(path.join(process.cwd(), oldPath));
      }
    }
    res.json({ success: true, message: "Event deleted successfully." });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: "Failed to delete event." });
  }
});

export default router;
