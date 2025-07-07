# Sports Club Event Registration System - Database Documentation

## Database Schema (Production Ready)

This document outlines the improved, production-ready database structure for the Sports Club Event Registration System. The application uses PostgreSQL as its database, managed through Drizzle ORM.

---

### Tables

#### 1. Users

Stores user account information for all system users.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'individual', -- 'individual', 'coach', 'admin'
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

---

#### 2. (Removed) Event Categories

The event_categories table has been dropped. Event categories are now handled via hashtags in the events table.

---

#### 3. Events

Stores all event information.

```sql
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  gender VARCHAR(50) NOT NULL,
  age_group VARCHAR(100) NOT NULL,
  is_team_event BOOLEAN DEFAULT FALSE,
  price_per_person DECIMAL(10, 2),
  price_per_team DECIMAL(10, 2),
  max_team_size INT,
  image_url TEXT,
  hashtags TEXT[] DEFAULT '{}', -- Array of hashtags for flexible categorization
  is_featured BOOLEAN,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  rules_and_guidelines JSONB -- Stores general rules, equipment requirements, scoring system, etc.
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_hashtags ON events USING GIN (hashtags);
```

---

#### 4. Teams

Stores information about teams participating in events.

```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  captain_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  members JSONB NOT NULL, -- JSON array of user IDs or objects
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_event_id ON teams(event_id);
CREATE INDEX idx_teams_captain_id ON teams(captain_id);
```

---

#### 5. Registrations

Tracks all event registrations.

```sql
CREATE TABLE registrations (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL, -- nullable for team registrations
  team_id INT REFERENCES teams(id) ON DELETE SET NULL, -- nullable for individual registrations
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_type VARCHAR(20) NOT NULL CHECK (registration_type IN ('individual', 'team')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  user_details_id INT REFERENCES user_details(id) ON DELETE SET NULL, -- NEW: direct reference to user_details
  UNIQUE (user_id, event_id, team_id)
);

CREATE INDEX idx_registrations_event_id ON registrations(event_id);
CREATE INDEX idx_registrations_user_id ON registrations(user_id);
CREATE INDEX idx_registrations_team_id ON registrations(team_id);
```

---

#### 6. User Details

Stores additional user details for profile management.

```sql
CREATE TABLE user_details (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coach_name VARCHAR(255),
  club_name VARCHAR(255),
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  age_group VARCHAR(50),
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  district VARCHAR(100),
  state VARCHAR(100),
  date_of_birth DATE,
  category VARCHAR(20) CHECK (category IN ('quad', 'inline', 'beginner')),
  aadhaar_number VARCHAR(20),
  aadhaar_image VARCHAR(255),
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- REMOVED: UNIQUE (user_id, event_id) constraint to allow multiple user_details per user/event (needed for coaches)

CREATE INDEX idx_user_details_user_id ON user_details(user_id);
```

---

#### 7. Payments

Stores payment information for registrations.

```sql
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  registration_id INT NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('success', 'failed', 'pending')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_registration_id ON payments(registration_id);
```

---

#### 8. Gallery

Stores photos from past events.

```sql
CREATE TABLE gallery (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  event_name VARCHAR(255), -- Name of the event (user-filled)
  date DATE, -- Date of the gallery item (added)
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

#### 9. Contact Messages

Stores contact form submissions.

```sql
CREATE TABLE contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

---

## Setup Instructions

### Database Setup

1. Ensure PostgreSQL is installed on your server.
2. Create a new database:
   ```
   CREATE DATABASE sports_club_events;
   ```
3. Create a database user with appropriate permissions:
   ```
   CREATE USER sports_admin WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE sports_club_events TO sports_admin;
   ```
4. Connect to the database:
   ```
   \c sports_club_events
   ```

---

### Environment Variables

The application requires the following environment variables to be set:

```
DATABASE_URL=postgresql://sports_admin:your_secure_password@hostname:5432/sports_club_events
SESSION_SECRET=your_secure_session_secret
NODE_ENV=production
```

For production environments, configure these in your hosting platform's environment settings or in a secure `.env` file that's **never** committed to version control.

---

### Initial Data Import

---

## Backup and Maintenance

### Regular Backups

Set up regular database backups using pg_dump:

```bash
pg_dump -U sports_admin -d sports_club_events -F c -f /path/to/backup/sports_club_$(date +"%Y%m%d").dump
```

Schedule this command to run daily or weekly via cron.

---

### Database Maintenance

Run regular VACUUM operations to optimize the database:

```sql
VACUUM (VERBOSE, ANALYZE);
```

---

## Security Considerations

1. All passwords are stored using bcrypt hashing.
2. Ensure PostgreSQL is properly secured with firewall rules.
3. Regularly rotate database credentials.
4. Use SSL/TLS for database connections in production.
5. Restrict database user privileges to only what is needed.

---

## Troubleshooting

- If connection issues occur, verify that the DATABASE_URL environment variable is correctly configured.
- For performance issues, monitor query execution with EXPLAIN ANALYZE.
- Check application logs for database connection or query errors.

---

## Scaling

As the application grows:

1. Consider implementing connection pooling.
2. Add indexes for frequently queried columns.
3. Consider read replicas for high-traffic scenarios.
4. Implement a caching strategy for frequently accessed data.

---

Document Version: 2.2  
Last Updated: October 5, 2025
