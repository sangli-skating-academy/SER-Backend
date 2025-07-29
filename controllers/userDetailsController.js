import pool from "../config/db.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
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
    res.json({ ...userDetails, team });
  } catch (err) {
    console.error("Error fetching user details:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user_details for a registration (by registrationId)
export const updateUserDetailsByRegistration = async (req, res) => {
  const { registrationId } = req.params;
  // Remove any fields not in user_details table (e.g., team)
  let fields = { ...req.body };
  delete fields.team;
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
    console.error("Error updating user details:", err);
    res.status(500).json({ message: "Server error" });
  }
};
