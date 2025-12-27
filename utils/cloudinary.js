import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_CONFIG } from "../config/config.js";

// Configure Cloudinary with centralized config
cloudinary.config(CLOUDINARY_CONFIG);

/**
 * Centralized Cloudinary instance
 * Use this for all file uploads across the application
 */
export default cloudinary;

/**
 * Helper function to upload a file to Cloudinary
 * @param {Buffer|string} file - File buffer or file path
 * @param {Object} options - Upload options (folder, transformation, etc.)
 * @returns {Promise} Upload result
 */
export async function uploadToCloudinary(file, options = {}) {
  return await cloudinary.uploader.upload(file, options);
}

/**
 * Helper function to delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the file
 * @returns {Promise} Delete result
 */
export async function deleteFromCloudinary(publicId) {
  return await cloudinary.uploader.destroy(publicId);
}
