import express from "express";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/admin.js";
import { processExpiredClassRegistrations } from "../../jobs/classRegistrationCleanupJob.js";

const router = express.Router();

// Manually trigger class registration cleanup
router.post("/trigger-cleanup", auth, adminOnly, async (req, res) => {
  try {
    console.log("🔧 Manual class registration cleanup triggered by admin");

    // Run the cleanup job
    await processExpiredClassRegistrations();

    res.json({
      success: true,
      message: "Class registration cleanup job completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Manual class cleanup failed:", error.message);
    res.status(500).json({
      success: false,
      message: "Class registration cleanup failed",
      error: error.message,
    });
  }
});

// Get stats about class registrations
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const { pool } = await import("../../config/db.js");

    // Get current active registrations
    const activeQuery = `
      SELECT COUNT(*) as active_count
      FROM class_registrations 
      WHERE end_date > CURRENT_DATE AND status = 'success'
    `;

    // Get expired registrations
    const expiredQuery = `
      SELECT COUNT(*) as expired_count
      FROM class_registrations 
      WHERE end_date <= CURRENT_DATE AND status = 'success'
    `;

    // Get archived registrations (if table exists)
    const archivedQuery = `
      SELECT COUNT(*) as archived_count
      FROM class_registrations_archive
    `;

    const [activeResult, expiredResult] = await Promise.all([
      pool.query(activeQuery),
      pool.query(expiredQuery),
    ]);

    let archivedCount = 0;
    try {
      const archivedResult = await pool.query(archivedQuery);
      archivedCount = parseInt(archivedResult.rows[0].archived_count);
    } catch (error) {
      // Archive table doesn't exist yet
      archivedCount = 0;
    }

    res.json({
      success: true,
      stats: {
        active_registrations: parseInt(activeResult.rows[0].active_count),
        expired_registrations: parseInt(expiredResult.rows[0].expired_count),
        archived_registrations: archivedCount,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Failed to get class registration stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get class registration stats",
      error: error.message,
    });
  }
});

// Get list of expired registrations (for review before cleanup)
router.get("/expired", auth, adminOnly, async (req, res) => {
  try {
    const { pool } = await import("../../config/db.js");

    const expiredQuery = `
      SELECT id, user_id, full_name, email, phone_number, amount, 
             issue_date, end_date, created_at
      FROM class_registrations 
      WHERE end_date <= CURRENT_DATE 
        AND status = 'success'
      ORDER BY end_date ASC
      LIMIT 100
    `;

    const result = await pool.query(expiredQuery);

    res.json({
      success: true,
      expired_registrations: result.rows,
      count: result.rows.length,
      message:
        result.rows.length === 0
          ? "No expired class registrations found"
          : `Found ${result.rows.length} expired class registrations`,
    });
  } catch (error) {
    console.error("❌ Failed to get expired registrations:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get expired registrations",
      error: error.message,
    });
  }
});

export default router;
