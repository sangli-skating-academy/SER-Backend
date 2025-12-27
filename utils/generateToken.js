import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/config.js";

const generateToken = (id, email, role) => {
  if (!JWT_CONFIG.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not set in environment variables");
  }
  return jwt.sign({ id, email, role }, JWT_CONFIG.SESSION_SECRET, {
    expiresIn: "7d",
  });
};

export default generateToken;
