import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import { sendWelcomeEmail } from "../services/emailService.js";

// Register a new user
export const registerUser = async (req, res, next) => {
  try {
    const { username, email, phone, password, role } = req.body;
    if (!username || !email || !password || !phone || !role) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }
    // Check if user already exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "User already exists with this email." });
    }
    // Hash password and insert user
    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (username, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, phone, role`,
      [username, email, phone, hashed, role]
    );
    const user = result.rows[0];
    const token = generateToken(user.id, user.email, user.role);

    // Set JWT as HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    });

    // Send welcome email (don't wait for it to complete)
    sendWelcomeEmail({
      username: user.username,
      email: user.email,
      role: user.role,
    }).catch((error) => {
      console.error("Failed to send welcome email:", error.message);
      // Don't fail the registration if email fails
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// Login user
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const token = generateToken(user.id, user.email, user.role);
    delete user.password;

    // Set JWT as HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    });

    res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const { id } = req.user;
    const result = await pool.query(
      `SELECT id, username, email , phone, role FROM users WHERE id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user info.",
      details: err.message,
    });
  }
};

// Update current user
export const updateMe = async (req, res) => {
  try {
    const { id } = req.user;
    const { username, email, phone } = req.body;

    // Check if email is being changed and if it already exists
    if (email) {
      const emailExists = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email, id]
      );
      if (emailExists.rows.length > 0) {
        return res.status(409).json({
          message: "Email address is already registered to another account.",
        });
      }
    }

    // Only update provided fields
    const fields = { username, email, phone };
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        setClauses.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }
    values.push(id);
    const updateQuery = `UPDATE users SET ${setClauses.join(
      ", "
    )} WHERE id = $${idx} RETURNING id, username, email, phone, role`;
    const result = await pool.query(updateQuery, values);
    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UpdateMe error:", err);

    // Handle specific database constraint errors
    if (err.code === "23505") {
      // Unique constraint violation
      if (err.constraint && err.constraint.includes("email")) {
        return res.status(409).json({
          message: "Email address is already registered to another account.",
        });
      } else if (err.constraint && err.constraint.includes("username")) {
        return res.status(409).json({
          message:
            "Username is already taken. Please choose a different username.",
        });
      } else if (err.constraint && err.constraint.includes("phone")) {
        return res.status(409).json({
          message: "Phone number is already registered to another account.",
        });
      }
    }

    res
      .status(500)
      .json({ message: "Failed to update user info.", details: err.message });
  }
};

// Logout user
export const logoutUser = (req, res) => {
  try {
    // Clear the auth_token cookie
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", details: err.message });
  }
};
