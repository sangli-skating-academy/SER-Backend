# Event Management Jobs Documentation

## Overview

The event management system now uses **two separate scheduled jobs** to handle event lifecycle:

### 1. **Event Status Job** (`eventStatusJob.js`)

- **Purpose**: Updates event `live` status when events end
- **Schedule**: Every hour
- **Action**: Sets `live = false` for events where `start_date < CURRENT_DATE`

### 2. **Event Cleanup Job** (`eventCleanupJob.js`)

- **Purpose**: Exports data and cleans up inactive events
- **Schedule**: Daily at 3:00 AM
- **Action**: Exports CSV and deletes all data for events that have been inactive for >1 day

## Why Two Jobs?

**Separation of Concerns:**

- **Status updates** need to happen quickly when events end (hourly checks)
- **Data cleanup** is a heavy operation that should happen less frequently (daily)
- **Frontend reliability** - if frontend fails to update status, backend catches it within an hour
- **Safety** - Events are inactive for at least 1 day before permanent deletion

## Job Details

### Event Status Job

**File:** `server/jobs/eventStatusJob.js`

**Schedule:** Every hour (`0 * * * *`)

**What it does:**

```sql
UPDATE events
SET live = false
WHERE live = true
AND start_date < CURRENT_DATE
```

**Endpoints:**

- `POST /api/admin/event-cleanup/update-status` - Manual trigger
- `GET /api/admin/event-cleanup/recently-ended` - View recently ended events

### Event Cleanup Job

**File:** `server/jobs/eventCleanupJob.js`

**Schedule:** Daily at 3:00 AM (`0 3 * * *`)

**What it does:**

1. Finds events where `live = false` AND `start_date < CURRENT_DATE - 1 day`
2. Exports registration data to CSV
3. Emails CSV to configured recipients
4. Permanently deletes all event-related data

**Endpoints:**

- `POST /api/admin/event-cleanup/trigger-cleanup` - Manual trigger
- `GET /api/admin/event-cleanup/ready-for-cleanup` - View events ready for cleanup

## Timeline Example

```
Day 0: Event "Summer Championship" scheduled for today
       live = true

Day 0 (End of day): Event ends
                   Frontend should set live = false
                   If frontend fails, backend will catch it within 1 hour

Day 1: Event Status Job runs (every hour)
       Sets live = false (if not already done)
       Event is now inactive but data still exists

Day 2 (3:00 AM): Event Cleanup Job runs
                Exports all registration data to CSV
                Emails CSV to admins
                Deletes all event data from database
```

## Configuration

### Environment Variables

```env
# Email Configuration (required for cleanup job)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EVENT_CLEANUP_EMAILS=admin@yoursite.com,manager@yoursite.com

# Development mode (optional)
NODE_ENV=development  # Runs jobs immediately for testing
```

### Timing Adjustments

**Event Status Job** - Change frequency in `eventStatusJob.js`:

```javascript
// Every hour (current)
cron.schedule('0 * * * *', ...)

// Every 30 minutes
cron.schedule('*/30 * * * *', ...)

// Every 6 hours
cron.schedule('0 */6 * * *', ...)
```

**Event Cleanup Job** - Change cleanup delay in `eventCleanupJob.js`:

```sql
-- Current: 1 day delay
WHERE live = false AND start_date < CURRENT_DATE - INTERVAL '1 day'

-- 3 day delay
WHERE live = false AND start_date < CURRENT_DATE - INTERVAL '3 days'

-- 1 week delay
WHERE live = false AND start_date < CURRENT_DATE - INTERVAL '1 week'
```

## API Endpoints

### Event Status Management

```bash
# Update event status (sets ended events to live = false)
POST /api/admin/event-cleanup/update-status

# Get recently ended events (last 7 days)
GET /api/admin/event-cleanup/recently-ended
```

### Event Cleanup Management

```bash
# Trigger data export and cleanup
POST /api/admin/event-cleanup/trigger-cleanup

# Get events ready for cleanup
GET /api/admin/event-cleanup/ready-for-cleanup

# Legacy endpoint (still works)
GET /api/admin/event-cleanup/expired-events
```

## Data Export Features

### CSV Export Includes:

- User information (name, email, phone)
- Registration details (type, status, date)
- Event information (title, location, date)
- Team information (properly formatted names)
- Payment information
- User details (coach, club, category, etc.)

### CSV Export Excludes:

- `user_id`, `team_id`, `event_id`, `user_details_id`
- `event_location`, `event_start_date`, `event_hashtags`
- `live`, `user_role`

### Team Members Fix:

Instead of: `[object Object],[object Object]`
Now shows: `John Doe; Jane Smith; Mike Wilson`

## Database Cleanup Order

The cleanup job deletes data in this order (respecting foreign keys):

1. **Payments** (for registrations)
2. **Registrations**
3. **User Details** (for the event)
4. **Teams** (for the event)
5. **Gallery Items** (matching event name)
6. **Event** (finally)

## Safety Features

- **Transactions**: All database operations use transactions (rollback on error)
- **Error Handling**: Individual event failures don't stop the entire process
- **Email Backup**: Data is always exported before deletion
- **Admin Access**: Manual triggers require admin authentication
- **Logging**: Comprehensive logging for monitoring and debugging

## Monitoring

### Check Job Status

Both jobs log their activity:

```bash
# Check server logs for
"Event status update job scheduled successfully"
"Event cleanup job scheduled successfully"
"Running scheduled event status update job..."
"Running scheduled event data cleanup job..."
```

### Manual Testing

In development mode (`NODE_ENV=development`):

- Status job runs after 3 seconds
- Cleanup job runs after 7 seconds

### Production Monitoring

Set up alerts for:

- Job execution failures
- Email sending failures
- Database transaction failures
- Long-running cleanup operations

## File Structure

```
server/
├── jobs/
│   ├── eventStatusJob.js       # Updates live status (hourly)
│   └── eventCleanupJob.js      # Exports & cleans data (daily)
├── routes/admin/
│   └── eventCleanup.js         # Manual trigger endpoints
├── docs/
│   └── EVENT_JOBS.md          # This documentation
└── index.js                   # Job initialization
```

## Migration from Old System

If you were previously relying on frontend-only status updates:

1. **Keep frontend logic** - it's still the primary method
2. **Backend acts as backup** - catches any missed updates within 1 hour
3. **No breaking changes** - system is backward compatible
4. **Improved reliability** - events will always become inactive eventually

## Best Practices

1. **Monitor logs** regularly for job execution
2. **Test email configuration** before production
3. **Backup database** before first cleanup run
4. **Set appropriate cleanup delays** for your use case
5. **Configure multiple email recipients** for redundancy
6. **Use staging environment** to test job behavior
