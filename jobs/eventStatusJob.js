import cron from "node-cron";
import pool from "../config/db.js";
import { SERVER_CONFIG } from "../config/config.js";

// Function to update live status for ended events
async function updateEventStatus() {
  try {
    console.log("Checking for events that have ended...");

    // Update events to live = false where the event has ended (start_date < today)
    const query = `
      UPDATE events 
      SET live = false 
      WHERE live = true 
      AND start_date < CURRENT_DATE
      RETURNING id, title, start_date
    `;

    const result = await pool.query(query);

    if (result.rows.length > 0) {
      console.log(`Updated ${result.rows.length} events to live = false:`);
      result.rows.forEach((event) => {
        console.log(
          `- Event ID ${event.id}: "${event.title}" (Date: ${event.start_date})`
        );
      });
    } else {
      console.log("No events needed status update");
    }

    return result.rows;
  } catch (error) {
    console.error("Error updating event status:", error);
    throw error;
  }
}

// Function to get events that have ended today or recently
async function getRecentlyEndedEvents() {
  const query = `
    SELECT 
      id,
      title,
      start_date,
      location,
      live,
      CURRENT_DATE - start_date as days_since_end
    FROM events 
    WHERE start_date >= CURRENT_DATE - INTERVAL '7 days'
    AND start_date < CURRENT_DATE
    ORDER BY start_date DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching recently ended events:", error);
    throw error;
  }
}

// Schedule the job to run every hour to check for ended events
const scheduleEventStatusUpdate = () => {
  console.log("Scheduling event status update job to run every hour");

  // Run every hour at minute 0
  cron.schedule(
    "0 * * * *",
    () => {
      console.log("Running scheduled event status update job...");
      updateEventStatus();
    },
    {
      timezone: "Asia/Kolkata", // Adjust timezone as needed
    }
  );

  // Optional: Run immediately on startup for testing (remove in production)
  if (SERVER_CONFIG.NODE_ENV === "development") {
    console.log(
      "Development mode: Running event status update immediately for testing..."
    );
    setTimeout(() => {
      updateEventStatus();
    }, 3000); // Run after 3 seconds
  }
};

export { scheduleEventStatusUpdate, updateEventStatus, getRecentlyEndedEvents };
