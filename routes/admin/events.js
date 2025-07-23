import pool from "../../config/db.js";
import express from "express";
import auth from "../../middleware/auth.js";
import adminAuth from "../../middleware/admin.js";
import multer from "multer";
import path from "path";
const router = express.Router();

// Multer config for event image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/events/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const randomStr = Math.random().toString(36).substring(2, 10);
    cb(null, `${Date.now()}-${randomStr}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

function getBaseUrl(req) {
  return process.env.BASE_URL;
}

// PATCH /api/admin/events/:eventId
router.patch(
  "/:eventId",
  auth,
  adminAuth,
  upload.single("file"), // Accept file as 'file' for consistency
  async (req, res) => {
    const { eventId } = req.params;
    let updateFields = req.body;
    let image_url = null;
    if (req.file) {
      image_url = `${getBaseUrl(req)}/uploads/events/${req.file.filename}`;
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
      ];
      let setClauses = [];
      let params = [];
      let idx = 1;
      for (const key of allowedFields) {
        if (updateFields[key] !== undefined) {
          setClauses.push(`${key} = $${idx}`);
          // Parse JSON fields if needed
          if (key === "hashtags" && typeof updateFields[key] === "string") {
            try {
              params.push(JSON.parse(updateFields[key]));
            } catch {
              params.push(updateFields[key]);
            }
          } else if (
            key === "rules_and_guidelines" &&
            typeof updateFields[key] === "string"
          ) {
            try {
              params.push(JSON.parse(updateFields[key]));
            } catch {
              params.push(updateFields[key]);
            }
          } else {
            params.push(updateFields[key]);
          }
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
      // Remove old image file if replaced
      if (
        image_url &&
        oldImage &&
        oldImage !== image_url &&
        oldImage.includes("/uploads/events/")
      ) {
        const oldPath = oldImage.replace(getBaseUrl(req), "");
        import("fs").then((fs) => {
          fs.unlink(path.join(process.cwd(), oldPath), () => {});
        });
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
router.post("/", auth, adminAuth, upload.single("file"), async (req, res) => {
  let fields = req.body;
  let image_url = null;
  if (req.file) {
    image_url = `${getBaseUrl(req)}/uploads/events/${req.file.filename}`;
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
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        let value = fields[key];
        if (
          numericFields.includes(key) &&
          (value === "" || value === undefined)
        ) {
          value = null;
        }
        columns.push(key);
        values.push(`$${idx}`);
        if (key === "hashtags" && typeof value === "string") {
          try {
            params.push(JSON.parse(value));
          } catch {
            params.push(value);
          }
        } else if (
          key === "rules_and_guidelines" &&
          typeof value === "string"
        ) {
          try {
            params.push(JSON.parse(value));
          } catch {
            params.push(value);
          }
        } else {
          params.push(value);
        }
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
});

// DELETE /api/admin/events/:eventId
router.delete("/:eventId", auth, adminAuth, async (req, res) => {
  const { eventId } = req.params;
  try {
    // Get image url to delete file if exists
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
    // Remove image file if exists
    if (image_url && image_url.includes("/uploads/events/")) {
      const oldPath = image_url.replace(getBaseUrl(req), "");
      import("fs").then((fs) => {
        fs.unlink(path.join(process.cwd(), oldPath), () => {});
      });
    }
    res.json({ success: true, message: "Event deleted successfully." });
  } catch (err) {
    console.error("Error deleting event:", err);
    res.status(500).json({ error: "Failed to delete event." });
  }
});

export default router;
