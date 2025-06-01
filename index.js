import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = [
  "http://localhost:5173",
  "https://ser-frontend-livid.vercel.app",
  "https://ser-frontend-fasb8pxt4-sangli-skating-academy-s-projects.vercel.app",
];
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
// API Routes
app.get("/", (req, res) => {
  res.send("Sport event registration Backend Running! 🛡️");
});
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/contact", contactRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
