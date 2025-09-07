# Event Cleanup Job Documentation

## Overview

This automated job system handles the cleanup of expired events. When an event's end date has passed by more than 1 day, the system will:

1. Set the event's `live` column to `false`
2. Export all registration data to CSV format
3. Email the CSV to specified recipients
4. Delete all related data from the database

## Features

- **Automatic Scheduling**: Runs daily at 2:00 AM
- **CSV Export**: Generates clean CSV files with filtered data
- **Email Notifications**: Sends CSV attachments via email
- **Database Cleanup**: Removes all event-related data
- **Transaction Safety**: Uses database transactions for data integrity
- **Error Handling**: Continues processing even if individual events fail

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install node-cron nodemailer
```

### 2. Environment Variables

Add these variables to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Event Cleanup Recipients (comma-separated)
EVENT_CLEANUP_EMAILS=admin@yoursite.com,manager@yoursite.com

# Optional: Development mode
NODE_ENV=production
```

### 3. Gmail App Password Setup

If using Gmail, you'll need to create an App Password:

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security > App passwords
4. Generate a new app password for "Mail"
5. Use this password in `SMTP_PASS`

### 4. Start the Server

The job will automatically start when the server starts:

```bash
npm start
```

## Manual Testing

### Check Expired Events

```bash
GET /api/admin/event-cleanup/expired-events
```

Returns list of events that are eligible for cleanup.

### Trigger Manual Cleanup

```bash
POST /api/admin/event-cleanup/trigger-cleanup
```

Manually triggers the cleanup process (admin only).

## How It Works

### 1. Event Detection

The job finds events where:
- `live = true`
- `start_date < CURRENT_DATE - INTERVAL '1 day'`

### 2. Data Export

Exports registration data including:
- User information (name, email, phone)
- Registration details (type, status, date)
- Event information (title, location, date)
- Team information (if applicable)
- Payment information
- User details (coach, club, category, etc.)

**Excluded Fields:**
- `user_id`, `team_id`, `event_id`, `user_details_id`
- `event_location`, `event_start_date`, `event_hashtags`
- `live`, `user_role`

### 3. Team Members Handling

Team members are formatted as: "FirstName LastName; FirstName LastName"
Falls back to username, email, or member ID if names aren't available.

### 4. Email Notification

Sends HTML email with:
- Event details summary
- CSV attachment
- Timestamp information

### 5. Database Cleanup

Deletes in order (respecting foreign keys):
1. Payments
2. Registrations
3. User details for the event
4. Teams for the event
5. Gallery items (matching event name)
6. The event itself

## Scheduling

- **Default**: Daily at 2:00 AM (Asia/Kolkata timezone)
- **Development**: Runs immediately after 5 seconds for testing

## Error Handling

- Individual event failures don't stop the entire process
- Database operations use transactions (rollback on error)
- Detailed logging for debugging
- Email errors are logged but don't crash the job

## Security

- Admin authentication required for manual endpoints
- Environment variables for sensitive email credentials
- Database transactions prevent partial cleanups

## Customization

### Change Schedule

Edit the cron pattern in `eventCleanupJob.js`:

```javascript
// Daily at 2:00 AM
cron.schedule('0 2 * * *', ...)

// Weekly on Sunday at 3:00 AM
cron.schedule('0 3 * * 0', ...)

// Monthly on 1st at 2:00 AM
cron.schedule('0 2 1 * *', ...)
```

### Change Cleanup Delay

Modify the query condition:

```sql
-- Current: 1 day after event
start_date < CURRENT_DATE - INTERVAL '1 day'

-- 7 days after event
start_date < CURRENT_DATE - INTERVAL '7 days'

-- 1 month after event
start_date < CURRENT_DATE - INTERVAL '1 month'
```

### Add/Remove CSV Fields

Modify the `excludeFields` array in `eventCleanupJob.js`:

```javascript
const excludeFields = [
  'user_id', 
  'team_id', 
  // Add more fields to exclude
  'additional_field_to_remove'
];
```

## Monitoring

### Check Logs

The job logs important events:
- Job start/completion
- Number of expired events found
- Processing status for each event
- Error details

### Database Monitoring

Monitor database size and performance:
- Check for locked tables during cleanup
- Monitor transaction log size
- Verify foreign key constraints

## Troubleshooting

### Job Not Running

1. Check server logs for scheduling errors
2. Verify timezone settings
3. Ensure server is running continuously

### Email Issues

1. Verify SMTP credentials
2. Check firewall/security settings
3. Test with a simple email client
4. Verify app password for Gmail

### Database Errors

1. Check foreign key constraints
2. Monitor for locked tables
3. Verify database permissions
4. Check transaction log space

### CSV Issues

1. Check for special characters in data
2. Verify team member data structure
3. Monitor memory usage for large datasets

## Production Recommendations

1. **Backup Strategy**: Run before cleanup job
2. **Monitoring**: Set up alerts for job failures
3. **Testing**: Test in staging environment first
4. **Performance**: Monitor database performance during cleanup
5. **Logging**: Set up centralized logging
6. **Notifications**: Add Slack/Teams notifications for job status

## File Structure

```
server/
├── jobs/
│   └── eventCleanupJob.js          # Main job logic
├── routes/admin/
│   └── eventCleanup.js             # Manual trigger endpoints
├── .env.event-cleanup-template     # Environment template
└── index.js                        # Job initialization
```
