import express from "express";
import { getLatestGalleryItems } from "../controllers/galleryController.js";

const router = express.Router();

// GET /api/gallery/all
router.get("/all", getLatestGalleryItems);

export default router;
