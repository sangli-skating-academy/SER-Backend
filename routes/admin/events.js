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
const upload = multer({ storage });

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
        "gender",
        "age_group",
        "is_team_event",
        "price_per_person",
        "price_per_team",
        "max_team_size",
        "hashtags",
        "is_featured",
        "rules_and_guidelines",
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

export default router;
