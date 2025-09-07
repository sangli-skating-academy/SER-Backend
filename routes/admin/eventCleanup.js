import express from "express";
import {
  processEventsForCleanup,
  getEventsForCleanup,
} from "../../jobs/eventCleanupJob.js";
import {
  updateEventStatus,
  getRecentlyEndedEvents,
} from "../../jobs/eventStatusJob.js";
import adminAuth from "../../middleware/admin.js";
import pool from "../../config/db.js";

const router = express.Router();

// Manual trigger for event status update (admin only)
router.post("/update-status", adminAuth, async (req, res) => {
  try {
    console.log("Manual event status update triggered by admin");
    const updatedEvents = await updateEventStatus();
    res.json({
      success: true,
      message: "Event status update completed successfully",
      updatedEvents: updatedEvents,
    });
  } catch (error) {
    console.error("Error in manual event status update:", error);
    res.status(500).json({
      success: false,
      message: "Error running event status update job",
      error: error.message,
    });
  }
});

// Manual trigger for event cleanup (admin only)
router.post("/trigger-cleanup", adminAuth, async (req, res) => {
  try {
    console.log("Manual event cleanup triggered by admin");
    await processEventsForCleanup();
    res.json({
      success: true,
      message: "Event cleanup job completed successfully",
    });
  } catch (error) {
    console.error("Error in manual event cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Error running event cleanup job",
      error: error.message,
    });
  }
});

// Get recently ended events (admin only)
router.get("/recently-ended", adminAuth, async (req, res) => {
  try {
    const recentlyEndedEvents = await getRecentlyEndedEvents();
    res.json({
      success: true,
      recentlyEndedEvents: recentlyEndedEvents,
    });
  } catch (error) {
    console.error("Error fetching recently ended events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recently ended events",
      error: error.message,
    });
  }
});

// Get events ready for cleanup (admin only)
router.get("/ready-for-cleanup", adminAuth, async (req, res) => {
  try {
    const eventsForCleanup = await getEventsForCleanup();
    res.json({
      success: true,
      eventsForCleanup: eventsForCleanup,
    });
  } catch (error) {
    console.error("Error fetching events for cleanup:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events for cleanup",
      error: error.message,
    });
  }
});

// Get status of expired events (admin only) - DEPRECATED but kept for compatibility
router.get("/expired-events", adminAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        title,
        start_date,
        location,
        live,
        CURRENT_DATE - start_date as days_expired
      FROM events 
      WHERE start_date < CURRENT_DATE - INTERVAL '1 day'
      ORDER BY start_date ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      expiredEvents: result.rows,
    });
  } catch (error) {
    console.error("Error fetching expired events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching expired events",
      error: error.message,
    });
  }
});

export default router;
