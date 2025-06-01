import jwt from "jsonwebtoken";
// Ensure SESSION_SECRET is loaded from environment
import dotenv from "dotenv";
dotenv.config();

const generateToken = (id, email, role) => {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set in environment variables");
  }
  return jwt.sign({ id, email, role }, process.env.SESSION_SECRET, {
    expiresIn: "7d",
  });
};

export default generateToken;
