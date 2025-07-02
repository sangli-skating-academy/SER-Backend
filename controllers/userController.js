import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

// Register a new user
export const registerUser = async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      full_name,
      phone,
      date_of_birth,
      gender,
      role,
    } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "User already exists with this email." });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const insertQuery = `INSERT INTO users (username, email, password, full_name, phone, date_of_birth, gender, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, full_name, phone, date_of_birth, gender, role`;
    const values = [
      username,
      email,
      hashedPassword,
      full_name,
      phone,
      date_of_birth,
      gender,
      role,
    ];
    const { rows } = await pool.query(insertQuery, values);
    const user = rows[0];
    const token = generateToken(user.id, user.email, user.role);

    // Set JWT as HTTP-only cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

// Get current user
export const getMe = async (req, res) => {
  try {
    const { id } = req.user;
    const result = await pool.query(
      `SELECT id, username, email, full_name, phone, date_of_birth, gender, role FROM users WHERE id = $1`,
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
    const { full_name, username, email, phone, date_of_birth, gender } =
      req.body;
    // Only update provided fields
    const fields = { full_name, username, email, phone, date_of_birth, gender };
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
    )} WHERE id = $${idx} RETURNING id, username, email, full_name, phone, date_of_birth, gender, role`;
    const result = await pool.query(updateQuery, values);
    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UpdateMe error:", err);
    res
      .status(500)
      .json({ message: "Failed to update user info.", details: err.message });
  }
};
