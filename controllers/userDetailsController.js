import pool from "../config/db.js";
import cloudinary from "../utils/cloudinary.js";
import fs from "fs";
import path from "path";
// Get user_details for a registration (by registrationId)
export const getUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;
  try {
    // Join user_details, registrations, teams, and events
    const result = await pool.query(
      `SELECT ud.*, r.team_id, t.name as team_name, t.members as team_members, e.is_team_event
       FROM user_details ud
       JOIN registrations r ON ud.id = r.user_details_id
       LEFT JOIN teams t ON r.team_id = t.id
       LEFT JOIN events e ON r.event_id = e.id
       WHERE r.id = $1`,
      [registrationId]
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "User details not found for this registration." });
    }
    const row = result.rows[0];
    let team = null;
    if (row.is_team_event && row.team_id) {
      let members = [];
      if (row.team_members) {
        if (typeof row.team_members === "string") {
          try {
            members = JSON.parse(row.team_members);
          } catch {
            members = [];
          }
        } else if (
          Array.isArray(row.team_members) ||
          typeof row.team_members === "object"
        ) {
          members = row.team_members;
        }
      }
      team = {
        id: row.team_id,
        name: row.team_name,
        members,
      };
    }
    // Remove team fields from user_details object
    const { team_id, team_name, team_members, is_team_event, ...userDetails } =
      row;
    // Ensure skate_category is present (for legacy rows)
    if (!("skate_category" in userDetails)) {
      userDetails.skate_category = userDetails.category || null;
    }
    res.json({ ...userDetails, team });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user_details for a registration (by registrationId)
export const updateUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;

  // Validate input
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "No data provided for update" });
  }

  // Remove any fields not in user_details table (e.g., team)
  let fields = { ...req.body };
  delete fields.team;

  // Handle JSON fields properly
  if (fields.event_category !== undefined) {
    if (fields.event_category === null || fields.event_category === "") {
      // Handle empty/null values
      fields.event_category = "{}";
    } else if (typeof fields.event_category === "string") {
      try {
        // If it's already a JSON string, parse and re-stringify to validate
        const parsed = JSON.parse(fields.event_category);
        fields.event_category = JSON.stringify(parsed);
      } catch (error) {
        // If parsing fails, treat it as a single item and create proper JSON array
        fields.event_category = JSON.stringify([fields.event_category]);
      }
    } else if (Array.isArray(fields.event_category)) {
      // If it's already an array, stringify it
      fields.event_category = JSON.stringify(fields.event_category);
    } else if (typeof fields.event_category === "object") {
      // If it's an object, stringify it
      fields.event_category = JSON.stringify(fields.event_category);
    }
  }

  // Additional validation: ensure all fields that should be JSON are properly formatted
  const jsonFields = ["event_category"];
  for (const fieldName of jsonFields) {
    if (fields[fieldName] !== undefined) {
      try {
        // Test if it's valid JSON by parsing it
        JSON.parse(fields[fieldName]);
      } catch (error) {
        // Convert invalid JSON to empty object or array as appropriate
        fields[fieldName] = fieldName.includes("category") ? "[]" : "{}";
      }
    }
  }

  // Handle other potential JSON fields
  if (
    fields.previous_experience &&
    typeof fields.previous_experience === "object"
  ) {
    fields.previous_experience = JSON.stringify(fields.previous_experience);
  }

  // If skate_category is present, update it; else fallback to category
  if ("skate_category" in fields && !fields.skate_category) {
    fields.skate_category = fields.category || null;
  }
  try {
    // Get user_details_id for this registration
    const regResult = await pool.query(
      "SELECT user_details_id, aadhaar_image FROM registrations r JOIN user_details ud ON r.user_details_id = ud.id WHERE r.id = $1",
      [registrationId]
    );
    if (regResult.rows.length === 0 || !regResult.rows[0].user_details_id) {
      return res
        .status(404)
        .json({ message: "User details not found for this registration." });
    }
    const userDetailsId = regResult.rows[0].user_details_id;
    const oldAadhaarImage = regResult.rows[0].aadhaar_image;

    // --- HANDLE AADHAAR IMAGE (file upload) ---
    // If using multer, req.file will be present for multipart/form-data
    if (req.file) {
      // Remove old image if exists (local or cloudinary)
      if (oldAadhaarImage && oldAadhaarImage.startsWith("http")) {
        // Delete from Cloudinary using public_id
        const matches = oldAadhaarImage.match(/\/aadhaar\/([^\.]+)\./);
        if (matches && matches[1]) {
          const publicId = `aadhaar/${matches[1]}`;
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
            });
          } catch {}
        }
      } else if (oldAadhaarImage) {
        const oldPath = `uploads/aadhaar/${path.basename(oldAadhaarImage)}`;
        fs.unlink(oldPath, (err) => {}); // ignore error
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "aadhaar",
        resource_type: "image",
      });
      fields.aadhaar_image = result.secure_url;
      fs.unlinkSync(req.file.path);
    } else if (
      req.body &&
      (req.body.aadhaarImage === "null" || req.body.aadhaarImage === null)
    ) {
      // Remove old image if user wants to clear (handle camelCase from frontend)
      if (oldAadhaarImage && oldAadhaarImage.startsWith("http")) {
        const matches = oldAadhaarImage.match(/\/aadhaar\/([^\.]+)\./);
        if (matches && matches[1]) {
          const publicId = `aadhaar/${matches[1]}`;
          try {
            await cloudinary.uploader.destroy(publicId, {
              resource_type: "image",
            });
          } catch {}
        }
      } else if (oldAadhaarImage) {
        const oldPath = `uploads/aadhaar/${path.basename(oldAadhaarImage)}`;
        fs.unlink(oldPath, (err) => {}); // ignore error
      }
      fields.aadhaar_image = null;
    }

    // Prevent empty update
    if (Object.keys(fields).length === 0 && !req.file) {
      return res.status(400).json({ message: "No fields to update." });
    }

    // Build dynamic update query
    const setClause = Object.keys(fields)
      .map((key, idx) => `${key} = $${idx + 2}`)
      .join(", ");
    const values = [userDetailsId, ...Object.values(fields)];
    const updateQuery = `UPDATE user_details SET ${setClause} WHERE id = $1 RETURNING *`;

    const updateResult = await pool.query(updateQuery, values);
    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error("Error updating user details:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
