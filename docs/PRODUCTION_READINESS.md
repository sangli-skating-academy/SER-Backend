# 🚀 Production Readiness Checklist

**Project:** Sangli Skating Academy - Event Registration System  
**Version:** 1.0  
**Last Updated:** December 28, 2025  
**Status:** Pre-Production

---

## 🎯 Overview

This document outlines the requirements and recommendations for making the Sangli Skating Academy application production-ready. It covers security, performance, monitoring, and operational best practices.

**Target Launch Date:** TBD  
**Current Environment:** Development/Staging  
**Deployment Platform:** Render (Backend), Vercel (Frontend)

---

## ✅ Current State Assessment

### What We Already Have (Good Foundation!)

#### 1. **Core Architecture** ✅

- **Centralized Configuration** - `config/config.js` with environment validation
- **JWT Authentication** - Stateless token-based auth
- **PostgreSQL Database** - Connection pooling configured
- **Cloudinary Integration** - Image storage and CDN
- **Payment Gateway** - Razorpay integration
- **Automated Jobs** - 5 scheduled cleanup jobs
- **Email Service** - Nodemailer with HTML templates
- **CORS Configuration** - Cross-origin requests handled
- **Security Headers** - Helmet.js configured
- ✅ **Rate Limiting** - express-rate-limit with 6 configured limiters (P0 #1 - COMPLETE)
- ✅ **Email Queue System** - pg-boss PostgreSQL-based job queue (P1 - COMPLETE)

#### 2. **Code Quality** ✅

- **Modular Structure** - Separated controllers, services, routes
- **Environment Variables** - Centralized config management
- **ES6 Modules** - Modern JavaScript
- **Documentation** - PROJECT_STRUCTURE.md, DB_SCHEMA.md
- **Error Handling** - Global error handler middleware

#### 3. **Features** ✅

- User registration and authentication
- Event management (CRUD)
- Team registrations
- Payment processing
- Gallery management
- Contact form
- Class/membership registrations
- Admin dashboard
- File uploads (Aadhaar, event images)
- Email notifications
- Automated data cleanup
- **API rate limiting** (protection against abuse)
- **Asynchronous email sending** (non-blocking with retry mechanism)

#### 4. **Security & Performance Enhancements** ✅

| Feature            | Status      | Implementation                                                   |
| ------------------ | ----------- | ---------------------------------------------------------------- |
| Rate Limiting      | ✅ Complete | 6 limiters: general, auth, contact, payment, registration, admin |
| Email Queue        | ✅ Complete | pg-boss with 3 retry attempts, exponential backoff               |
| Request Throttling | ✅ Complete | Applied to all public and admin routes                           |
| Email Retry Logic  | ✅ Complete | Automatic retry with 60s delay                                   |
| Graceful Shutdown  | ✅ Complete | SIGTERM/SIGINT handlers for clean queue shutdown                 |

---

## 🔴 CRITICAL REQUIREMENTS (P0)

### Priority Matrix

| #   | Requirement                      | Status          | Priority | Effort | Impact   |
| --- | -------------------------------- | --------------- | -------- | ------ | -------- |
| 1   | **Rate Limiting**                | ✅ **COMPLETE** | P0       | ~2h    | High     |
| 2   | **Input Validation**             | ⚠️ Pending      | P0       | ~3h    | High     |
| 3   | **Error Tracking (Sentry)**      | ⚠️ Pending      | P0       | ~1h    | High     |
| 4   | **Production Logging (Winston)** | ⚠️ Pending      | P0       | ~2h    | High     |
| 5   | **Database Backups**             | ⚠️ Pending      | P0       | ~1h    | Critical |
| 6   | **Enhanced Health Check**        | ⚠️ Pending      | P0       | ~30m   | Medium   |

---

### 1. Rate Limiting ✅ COMPLETE

**Status:** ✅ **IMPLEMENTED AND PRODUCTION READY**

**What Was Implemented:**

```javascript
// middleware/rateLimiter.js - 6 Rate Limiters Created

1. generalLimiter    - 100 requests per 15 minutes (all routes)
2. authLimiter       - 5 requests per 15 minutes (login/register)
3. contactLimiter    - 3 requests per hour (contact form)
4. paymentLimiter    - 10 requests per hour (payment APIs)
5. registrationLimiter - 5 requests per hour (event registration)
6. adminLimiter      - 50 requests per 15 minutes (admin routes)
```

**Routes Protected:**

| Route File            | Limiter Applied     | Endpoints                           |
| --------------------- | ------------------- | ----------------------------------- |
| userRoutes.js         | authLimiter         | POST /login, /register              |
| contactRoutes.js      | contactLimiter      | POST /contact                       |
| paymentRoutes.js      | paymentLimiter      | POST /create-order, /verify-payment |
| registrationRoutes.js | registrationLimiter | POST /register                      |
| clubRoutes.js         | registrationLimiter | POST /register                      |
| eventRoutes.js        | generalLimiter      | All GET endpoints                   |
| admin/\*              | adminLimiter        | All admin routes                    |

**Features:**

- ✅ Standard rate limit headers (X-RateLimit-\*)
- ✅ Custom error messages per limiter
- ✅ 429 status code responses
- ✅ IP-based tracking
- ✅ skipSuccessfulRequests for auth (only failed attempts count)

**Documentation:** See [RATE_LIMITING.md](RATE_LIMITING.md) for complete details

**Testing:** Test script available at `tests/test-rate-limiting.js`

---

### 2. Input Validation & Sanitization

**Current Status:**

**Why Critical:**

- Prevent SQL injection attacks
- Prevent XSS attacks
- Ensure data integrity
- Validate payment amounts
- Sanitize user input

**What to Implement:**

```javascript
// Install: npm install express-validator

import { body, param, validationResult } from "express-validator";

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// User registration validation
const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be 3-50 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),
  body("phone")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Valid Indian phone number required"),
  validate,
];

// Event registration validation
const eventRegistrationValidation = [
  body("eventId").isInt().withMessage("Valid event ID required"),
  body("teamName").optional().trim().isLength({ min: 2, max: 100 }).escape(),
  body("members.*.name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .escape()
    .withMessage("Valid member name required"),
  body("members.*.age")
    .isInt({ min: 5, max: 100 })
    .withMessage("Age must be between 5 and 100"),
  body("members.*.phone")
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Valid phone number required"),
  validate,
];

// Contact form validation
const contactValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .escape()
    .withMessage("Name must be 2-100 characters"),
  body("email")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("Valid email required"),
  body("phone")
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Valid phone number required"),
  body("subject")
    .trim()
    .isLength({ min: 5, max: 200 })
    .escape()
    .withMessage("Subject must be 5-200 characters"),
  body("message")
    .trim()
    .isLength({ min: 10, max: 2000 })
    .escape()
    .withMessage("Message must be 10-2000 characters"),
  validate,
];

// Payment amount validation
const paymentValidation = [
  body("amount")
    .isFloat({ min: 1, max: 100000 })
    .withMessage("Amount must be between ₹1 and ₹100,000"),
  body("razorpay_order_id")
    .matches(/^order_[a-zA-Z0-9]+$/)
    .withMessage("Invalid Razorpay order ID"),
  body("razorpay_payment_id")
    .matches(/^pay_[a-zA-Z0-9]+$/)
    .withMessage("Invalid Razorpay payment ID"),
  body("razorpay_signature")
    .isLength({ min: 40, max: 200 })
    .withMessage("Invalid signature"),
  validate,
];

// Apply to routes
router.post("/register", registerValidation, registerUser);
router.post(
  "/api/registrations",
  eventRegistrationValidation,
  registerForEvent
);
router.post("/api/contact", contactValidation, createContactMessage);
router.post("/api/payment/verify", paymentValidation, verifyPayment);
```

**Files to Update:**

- `routes/userRoutes.js`
- `routes/registrationRoutes.js`
- `routes/contactRoutes.js`
- `routes/paymentRoutes.js`
- `routes/clubRoutes.js`
- All admin routes

**Priority:** 🔴 P0  
**Impact:** High - Critical security

---

### 3. Error Tracking & Monitoring

**Current Status:** (only console.log)

**Why Critical:**

- Know immediately when errors occur in production
- Track error frequency and patterns
- Debug production issues
- Monitor application health
- Get alerts for critical failures

**What to Implement:**

#### Option 1: Sentry (Recommended - Free Tier Available)

```javascript
// Install: npm install @sentry/node

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  integrations: [
    // Performance monitoring
    nodeProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Error sampling
  sampleRate: 1.0,
});

// Request handler (must be first)
app.use(Sentry.Handlers.requestHandler());

// Tracing handler
app.use(Sentry.Handlers.tracingHandler());

// All routes here...

// Error handler (must be before other error middleware)
app.use(Sentry.Handlers.errorHandler());

// Custom error handler
app.use((err, req, res, next) => {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  // Send to Sentry (already captured by Sentry.Handlers.errorHandler)

  res.status(err.status || 500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});
```

**Sentry Features:**

- ✅ Real-time error tracking
- ✅ Stack traces with code context
- ✅ Performance monitoring
- ✅ Release tracking
- ✅ User context (who experienced error)
- ✅ Email/Slack alerts
- ✅ Free tier: 5,000 errors/month

**Priority:** 🔴 P0  
**Impact:** High - Essential for production

---

### 4. Production Logging

**Current Status:** (only dev logs - morgan "dev" mode)

**Why Critical:**

- Debug production issues
- Audit trail for security/compliance
- Monitor application behavior
- Track user actions
- Investigate payment issues

**What to Implement:**

```javascript
// Install: npm install winston winston-daily-rotate-file

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "skating-academy-api" },
  transports: [
    // Write all logs to daily rotating files
    new DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "info",
    }),
    // Write errors to separate file
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "90d",
      level: "error",
    }),
  ],
});

// Console logging in development
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Morgan integration for HTTP logs
import morgan from "morgan";

const morganStream = {
  write: (message) => logger.info(message.trim()),
};

app.use(morgan("combined", { stream: morganStream }));

// Usage in code
logger.info("User registered", { userId, email });
logger.warn("Payment verification failed", { orderId, reason });
logger.error("Database connection error", { error: err.message });

// Export for use in other files
export default logger;
```

**What to Log:**

- ✅ All HTTP requests (via Morgan)
- ✅ Authentication attempts (success/failure)
- ✅ Payment transactions (all stages)
- ✅ Registration submissions
- ✅ Email sending (success/failure)
- ✅ Scheduled job executions
- ✅ Database errors
- ✅ Cloudinary operations
- ✅ Admin actions (create/update/delete)

**Log Rotation:**

- Daily rotation
- Keep 30 days for general logs
- Keep 90 days for error logs
- Compress old logs

**Priority:** 🔴 P0  
**Impact:** High - Essential for debugging

---

### 5. Database Backups

**Current Status:** (not configured)

**Why Critical:**

- Prevent data loss
- Recover from disasters
- Restore accidentally deleted data
- Compliance requirements

**What to Implement:**

#### On Render (PostgreSQL)

1. **Enable Automated Backups:**

   - Navigate to Database settings in Render
   - Enable "Point-in-Time Recovery" (PITR)
   - Retention: 30 days minimum
   - Backup frequency: Daily

2. **Manual Backup Script:**

```bash
#!/bin/bash
# server/scripts/backup-database.sh

DATE=$(date +%Y-%m-%d-%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/backup-$DATE.sql.gz"

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Create backup
pg_dump $DATABASE_URL | gzip > $BACKUP_FILE

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/

# Keep only last 30 days of local backups
find $BACKUP_DIR -name "backup-*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
```

3. **Test Restore Process:**

```bash
# Test restoration monthly
gunzip -c backup-2025-12-28.sql.gz | psql $DATABASE_URL_TEST
```

**Backup Strategy:**

- ✅ Automated daily backups (Render)
- ✅ Manual weekly backups to local/cloud
- ✅ Keep 30 days minimum
- ✅ Test restore quarterly
- ✅ Store backups in separate location

**Priority:** 🔴 P0  
**Impact:** Critical - Data protection

---

## 🟡 IMPORTANT ENHANCEMENTS (P1)

### Priority Matrix

| #   | Requirement                    | Status          | Priority | Effort | Impact |
| --- | ------------------------------ | --------------- | -------- | ------ | ------ |
| 7   | **Email Queue System**         | ✅ **COMPLETE** | P1       | ~3h    | High   |
| 8   | **Webhook Security**           | ⚠️ Pending      | P1       | ~2h    | Medium |
| 9   | **API Pagination**             | ⚠️ Pending      | P1       | ~2h    | Medium |
| 10  | **Payment Reconciliation**     | ⚠️ Pending      | P1       | ~3h    | High   |
| 11  | **Sensitive Field Encryption** | ⚠️ Pending      | P1       | ~2h    | Medium |

---

### 7. Email Queue System ✅ COMPLETE

**Status:** ✅ **IMPLEMENTED AND PRODUCTION READY**

**What Was Implemented:**

A PostgreSQL-based email queue system using **pg-boss** that makes email sending asynchronous and non-blocking.

#### Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌──────────────┐
│ Controller  │ ──────> │ emailServiceWith │ ──────> │ Email Queue  │
│             │  Call   │ Queue.js         │  Queue  │ (pg-boss)    │
└─────────────┘         └──────────────────┘         └──────────────┘
                               │                             │
                               │ immediate=true              │
                               ↓                             ↓
                        ┌──────────────┐            ┌──────────────┐
                        │ emailService │            │ Email Worker │
                        │ .js (direct) │            │ (background) │
                        └──────────────┘            └──────────────┘
                                                            │
                                                            ↓
                                                     ┌──────────────┐
                                                     │ emailService │
                                                     │ .js (queued) │
                                                     └──────────────┘
```

#### Components Created

| File                                | Purpose                | Key Features                                 |
| ----------------------------------- | ---------------------- | -------------------------------------------- |
| `services/emailQueue.js`            | Queue management       | Initialize queue, add jobs, stop gracefully  |
| `jobs/emailWorker.js`               | Background processor   | Process jobs, monitor queue, handle failures |
| `services/emailServiceWithQueue.js` | Wrapper layer          | Queue or send immediately                    |
| `index.js` (modified)               | Startup initialization | Init queue → Start worker → Listen           |

#### Configuration

```javascript
// Email Queue Configuration
{
  retryLimit: 3,              // 3 retry attempts
  retryDelay: 60,             // 60 seconds between retries
  retryBackoff: true,         // Exponential backoff
  expireInHours: 48,          // Jobs expire after 48 hours
  teamSize: 5,                // Process 5 emails concurrently
  archiveCompletedAfterSeconds: 86400  // Archive after 24 hours
}
```

#### Priority Levels

| Priority | Value | Use Case              | Functions                  |
| -------- | ----- | --------------------- | -------------------------- |
| High     | 10    | Payment confirmations | `queueHighPriorityEmail()` |
| Normal   | 0     | User registrations    | `queueEmail()`             |
| Low      | -10   | Admin notifications   | `queueLowPriorityEmail()`  |

#### Updated Controllers

All controllers now use `emailServiceWithQueue.js`:

```javascript
// Before (blocking)
import { sendWelcomeEmail } from "../services/emailService.js";
await sendWelcomeEmail(userDetails); // Blocks until email sent

// After (non-blocking)
import { sendWelcomeEmail } from "../services/emailServiceWithQueue.js";
await sendWelcomeEmail(userDetails); // Returns immediately, queued
await sendWelcomeEmail(userDetails, true); // immediate=true for direct send
```

**Files Modified:**

- ✅ `controllers/userController.js`
- ✅ `controllers/registrationController.js`
- ✅ `controllers/clubController.js`
- ✅ `controllers/paymentController.js`

#### Features

- ✅ Automatic retry mechanism (3 attempts)
- ✅ Exponential backoff on failures
- ✅ Priority-based processing
- ✅ Concurrent email processing (5 at a time)
- ✅ Graceful shutdown handling
- ✅ Queue monitoring and alerts
- ✅ Failed job tracking
- ✅ No Redis required (uses PostgreSQL)

#### Monitoring

```javascript
// Email Worker monitors queue health
- Checks failed job count every hour
- Alerts if > 10 failed jobs
- Logs job success/failure
- Handles permanent failures after all retries
```

#### Server Startup Sequence

```
1. validateConfig()
2. initializeEmailQueue()      ← Initialize pg-boss
3. startEmailWorker()           ← Start background processor
4. app.listen()                 ← Start Express server
5. Schedule cleanup jobs
6. SIGTERM/SIGINT handlers      ← Graceful shutdown
```

**Benefits:**

- ⚡ Non-blocking API responses
- 🔄 Automatic retry on failures
- 📊 Better observability
- 🛡️ Fault tolerance
- 🚀 Improved performance

**Testing:** Server tested successfully with email queue working without errors

**Documentation:** Email queue system fully documented in this section

---

## 🟡 ENHANCEMENTS (Should Have Soon)

### 8. Webhook Security (Razorpay)

**Current Status:** ⚠️ Need to verify webhook signatures

**Why Important:**

- Prevent fake payment confirmations
- Ensure webhook authenticity
- Handle duplicate webhooks
- Security compliance

**What to Implement:**

```javascript
// routes/webhookRoutes.js

import express from "express";
import crypto from "crypto";
import { RAZORPAY_CONFIG } from "../config/config.js";
import pool from "../config/db.js";

const router = express.Router();

// Webhook endpoint (no auth middleware!)
router.post(
  "/razorpay/webhook",
  express.raw({ type: "application/json" }), // Get raw body
  async (req, res) => {
    try {
      // Verify signature
      const signature = req.headers["x-razorpay-signature"];
      const body = req.body.toString();

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
      }

      const payload = JSON.parse(body);
      const event = payload.event;

      // Handle idempotency (prevent duplicate processing)
      const webhookId = payload.payload.payment.entity.id;
      const existing = await pool.query(
        "SELECT id FROM processed_webhooks WHERE webhook_id = $1",
        [webhookId]
      );

      if (existing.rows.length > 0) {
        return res.status(200).json({ status: "already_processed" });
      }

      // Process webhook based on event
      switch (event) {
        case "payment.captured":
          await handlePaymentCaptured(payload.payload.payment.entity);
          break;
        case "payment.failed":
          await handlePaymentFailed(payload.payload.payment.entity);
          break;
        // Add other events
      }

      // Mark webhook as processed
      await pool.query(
        "INSERT INTO processed_webhooks (webhook_id, event, processed_at) VALUES ($1, $2, NOW())",
        [webhookId, event]
      );

      res.status(200).json({ status: "ok" });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Processing failed" });
    }
  }
);

async function handlePaymentCaptured(payment) {
  // Update payment status in database
  // Send confirmation email
  // Update registration status
}

async function handlePaymentFailed(payment) {
  // Update payment status
  // Notify user
  // Log for reconciliation
}

export default router;
```

**Database Migration:**

```sql
CREATE TABLE processed_webhooks (
  id SERIAL PRIMARY KEY,
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  event VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_webhooks_webhook_id ON processed_webhooks(webhook_id);
```

**Priority:** 🟡 P1  
**Impact:** Medium - Payment security

---

### 9. API Response Pagination

**Current Status:** ❌ No pagination (all results returned)

**Why Important:**

- Large datasets slow down API
- Improve frontend performance
- Reduce bandwidth
- Better UX

**What to Implement:**

```javascript
// middleware/pagination.js

export const paginate = (defaultLimit = 20, maxLimit = 100) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || defaultLimit, maxLimit);
    const offset = (page - 1) * limit;

    req.pagination = { page, limit, offset };
    next();
  };
};

// Helper to send paginated response
export const paginatedResponse = (data, total, req) => {
  const { page, limit } = req.pagination;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

// Usage in controller
import { paginate, paginatedResponse } from "../middleware/pagination.js";

router.get("/events", paginate(20), async (req, res) => {
  const { limit, offset } = req.pagination;

  // Get total count
  const countResult = await pool.query("SELECT COUNT(*) FROM events");
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const result = await pool.query(
    "SELECT * FROM events ORDER BY start_date DESC LIMIT $1 OFFSET $2",
    [limit, offset]
  );

  res.json(paginatedResponse(result.rows, total, req));
});
```

**Apply to:**

- `/api/events` - Event listing
- `/api/admin/registrations/all` - All registrations
- `/api/admin/users` - User list
- `/api/gallery/all` - Gallery images
- `/api/admin/contact` - Contact messages
- `/api/admin/class-registrations` - Class registrations

**Priority:** 🟡 P1  
**Impact:** Medium - Performance

---

### 11. Payment Reconciliation

**Current Status:** ❌ No reconciliation process

**Why Important:**

- Ensure all payments are captured
- Detect missed webhooks
- Identify discrepancies
- Financial accuracy

**What to Implement:**

```javascript
// jobs/paymentReconciliationJob.js

import cron from "node-cron";
import pool from "../config/db.js";
import razorpayInstance from "../utils/razorpay.js";

async function reconcilePayments() {
  console.log("🔍 Starting payment reconciliation...");

  try {
    // Get yesterday's date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Get payments from database
    const dbPayments = await pool.query(
      `SELECT razorpay_payment_id, amount, status, created_at 
       FROM payments 
       WHERE created_at BETWEEN $1 AND $2`,
      [yesterday, yesterdayEnd]
    );

    // Get payments from Razorpay
    const razorpayPayments = await razorpayInstance.payments.all({
      from: Math.floor(yesterday.getTime() / 1000),
      to: Math.floor(yesterdayEnd.getTime() / 1000),
    });

    // Compare and find mismatches
    const mismatches = [];

    for (const dbPayment of dbPayments.rows) {
      const rpPayment = razorpayPayments.items.find(
        (p) => p.id === dbPayment.razorpay_payment_id
      );

      if (!rpPayment) {
        mismatches.push({
          type: "missing_in_razorpay",
          payment: dbPayment,
        });
      } else if (rpPayment.amount / 100 !== parseFloat(dbPayment.amount)) {
        mismatches.push({
          type: "amount_mismatch",
          payment: dbPayment,
          razorpayAmount: rpPayment.amount / 100,
        });
      } else if (rpPayment.status !== dbPayment.status) {
        mismatches.push({
          type: "status_mismatch",
          payment: dbPayment,
          razorpayStatus: rpPayment.status,
        });
      }
    }

    // Check for payments in Razorpay but not in DB
    for (const rpPayment of razorpayPayments.items) {
      const dbPayment = dbPayments.rows.find(
        (p) => p.razorpay_payment_id === rpPayment.id
      );

      if (!dbPayment && rpPayment.status === "captured") {
        mismatches.push({
          type: "missing_in_database",
          razorpayPayment: rpPayment,
        });
      }
    }

    if (mismatches.length > 0) {
      console.error(`⚠️ Found ${mismatches.length} payment mismatches`);
      await sendReconciliationAlert(mismatches, yesterday);
    } else {
      console.log("✅ Payment reconciliation complete - no mismatches");
    }
  } catch (error) {
    console.error("❌ Payment reconciliation error:", error);
    await sendReconciliationError(error);
  }
}

async function sendReconciliationAlert(mismatches, date) {
  // Send email to admin with mismatch details
  const htmlContent = `
    <h2>Payment Reconciliation Alert</h2>
    <p>Found ${mismatches.length} mismatches for ${date.toDateString()}</p>
    <ul>
      ${mismatches
        .map(
          (m) => `
        <li>
          <strong>${m.type}</strong><br>
          ${JSON.stringify(m, null, 2)}
        </li>
      `
        )
        .join("")}
    </ul>
  `;

  // Send email (use your email service)
}

// Schedule daily at 6:00 AM
cron.schedule("0 6 * * *", reconcilePayments);

export default reconcilePayments;
```

**Priority:** 🟡 P1  
**Impact:** High - Financial accuracy

---

## 🟢 NICE TO HAVE FEATURES

### 13. Performance Monitoring

**Current Status:** ❌ No monitoring

**Why Nice to Have:**

- Track API response times
- Identify slow queries
- Optimize bottlenecks
- Capacity planning

**What to Implement:**

#### Option 1: New Relic (Free tier available)

```javascript
// Install: npm install newrelic

// Add to top of index.js (before any imports)
import "newrelic";

// newrelic.js config file
exports.config = {
  app_name: ["Sangli Skating Academy API"],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: "info",
  },
  distributed_tracing: {
    enabled: true,
  },
};
```

**Metrics to Track:**

- API response times
- Database query times
- Error rates
- Throughput (requests/sec)
- Memory usage
- CPU usage

**Priority:** 🟢 P2  
**Impact:** Low-Medium - Optimization

---

### 14. Database Indexes

**Current Status:** ⚠️ Need to verify

**Why Important:**

- Faster queries
- Better performance at scale
- Reduced database load

**What to Check:**

```sql
-- Check existing indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Recommended indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_live ON events(live);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured);

CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations(created_at);

CREATE INDEX IF NOT EXISTS idx_payments_registration_id ON payments(registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

CREATE INDEX IF NOT EXISTS idx_user_details_registration_id ON user_details(registration_id);

CREATE INDEX IF NOT EXISTS idx_teams_event_id ON teams(event_id);

CREATE INDEX IF NOT EXISTS idx_class_registrations_email ON class_registrations(email);
CREATE INDEX IF NOT EXISTS idx_class_registrations_end_date ON class_registrations(end_date);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_gallery_uploaded_at ON gallery(uploaded_at);
```

**Priority:** 🟢 P2  
**Impact:** Medium - Performance

---

### 17. Soft Deletes

**Current Status:** ❌ Hard deletes everywhere

**Why Nice to Have:**

- Recover accidentally deleted data
- Audit trail
- User-friendly (undo option)

**What to Implement:**

```sql
-- Add deleted_at column to tables
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN deleted_at TIMESTAMPTZ;

-- Create view for active records
CREATE VIEW active_events AS
SELECT * FROM events WHERE deleted_at IS NULL;

-- Update queries to filter soft-deleted records
-- Instead of: SELECT * FROM events
-- Use: SELECT * FROM events WHERE deleted_at IS NULL
```

```javascript
// Soft delete function
async function softDelete(table, id) {
  return await pool.query(
    `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1`,
    [id]
  );
}

// Restore function
async function restore(table, id) {
  return await pool.query(
    `UPDATE ${table} SET deleted_at = NULL WHERE id = $1`,
    [id]
  );
}

// Hard delete (after 30 days)
cron.schedule("0 2 * * *", async () => {
  await pool.query(
    "DELETE FROM events WHERE deleted_at < NOW() - INTERVAL '30 days'"
  );
});
```

**Priority:** 🟢 P2  
**Impact:** Medium - Data recovery

---

---

## 💰 Cost Considerations

### Free Tier Services (Recommended)

| Service               | Free Tier            | Use Case          | Cost if Exceeded |
| --------------------- | -------------------- | ----------------- | ---------------- |
| **Sentry**            | 5,000 errors/month   | Error tracking    | $26/month        |
| **Better Uptime**     | 10 monitors          | Uptime monitoring | $10/month        |
| **LogRocket**         | 1,000 sessions/month | Session replay    | $99/month        |
| **Render PostgreSQL** | Backups included     | Database backups  | Included         |
| **pg-boss**           | Uses PostgreSQL      | Email queue       | Free             |

### Paid Services (If Needed)

| Service            | Cost         | Use Case        | Alternative                    |
| ------------------ | ------------ | --------------- | ------------------------------ |
| **Redis (Render)** | $7/month     | Caching, queues | pg-boss (free)                 |
| **New Relic**      | $99/month    | APM             | Sentry performance (free tier) |
| **SendGrid**       | Free 100/day | Email delivery  | Current SMTP (free)            |

---

**Goal:** Long-term improvements

**Tasks:**

1. Build testing suite (unit, integration, e2e)
2. Add performance monitoring
3. Implement 2FA for admins
4. Add soft deletes
5. Stricter CSP policies
6. Advanced monitoring and alerting

**Deliverables:**

- Comprehensive test coverage
- Performance insights
- Enhanced admin security
- Recoverable deletes

---

---

## ✅ Implementation Summary

### Completed Items (Production Ready)

| #   | Feature           | Status      | Documentation                        | Tests                 |
| --- | ----------------- | ----------- | ------------------------------------ | --------------------- |
| 1   | **Rate Limiting** | ✅ Complete | [RATE_LIMITING.md](RATE_LIMITING.md) | test-rate-limiting.js |
| 2   | **Email Queue**   | ✅ Complete | This document                        | Server tested         |

### Implementation Details

#### ✅ Rate Limiting

**Files Created:**

- `middleware/rateLimiter.js` - 6 rate limiters
- `docs/RATE_LIMITING.md` - Full documentation
- `docs/RATE_LIMITING_SUMMARY.md` - Quick reference
- `tests/test-rate-limiting.js` - Test suite

**Files Modified:**

- `routes/userRoutes.js` - Added authLimiter
- `routes/contactRoutes.js` - Added contactLimiter
- `routes/paymentRoutes.js` - Added paymentLimiter
- `routes/registrationRoutes.js` - Added registrationLimiter
- `routes/clubRoutes.js` - Added registrationLimiter
- `routes/eventRoutes.js` - Added generalLimiter
- All admin routes - Added adminLimiter

**Configuration:**

```javascript
generalLimiter: 100/15min
authLimiter: 5/15min (skipSuccessfulRequests)
contactLimiter: 3/hour
paymentLimiter: 10/hour
registrationLimiter: 5/hour
adminLimiter: 50/15min
```

**Benefits Achieved:**

- ✅ Brute-force attack prevention
- ✅ API abuse protection
- ✅ Server overload protection
- ✅ Clear error messages
- ✅ Standard rate limit headers

---

#### ✅ Email Queue System

**Files Created:**

- `services/emailQueue.js` - pg-boss queue management
- `jobs/emailWorker.js` - Background email processor
- `services/emailServiceWithQueue.js` - Queue wrapper layer

**Files Modified:**

- `index.js` - Added queue initialization and graceful shutdown
- `controllers/userController.js` - Updated imports
- `controllers/registrationController.js` - Updated imports
- `controllers/clubController.js` - Updated imports
- `controllers/paymentController.js` - Updated imports

**Configuration:**

```javascript
Queue: pg-boss (PostgreSQL-based)
Retries: 3 attempts
Delay: 60s (exponential backoff)
Concurrency: 5 emails simultaneously
Expiration: 48 hours
Archive: 24 hours
```

**Benefits Achieved:**

- ✅ Non-blocking API responses
- ✅ Automatic retry mechanism
- ✅ Priority-based processing
- ✅ Fault tolerance
- ✅ Queue health monitoring
- ✅ Graceful shutdown
- ✅ No Redis dependency

---

### Pending P0 Requirements

| #   | Requirement                  | Effort | Priority     | Next Steps                                   |
| --- | ---------------------------- | ------ | ------------ | -------------------------------------------- |
| 2   | Input Validation             | ~3h    | 🔴 Critical  | Install express-validator, create validators |
| 3   | Error Tracking (Sentry)      | ~1h    | 🔴 Critical  | Sign up for Sentry, add DSN                  |
| 4   | Production Logging (Winston) | ~2h    | 🔴 Critical  | Install winston, configure log rotation      |
| 5   | Database Backups             | ~1h    | 🔴 Critical  | Enable PITR on Render, create backup script  |
| 6   | Enhanced Health Check        | ~30m   | 🟡 Important | Add DB/email/payment checks                  |

### Pending P1 Requirements

| #   | Requirement            | Effort | Priority     | Next Steps                   |
| --- | ---------------------- | ------ | ------------ | ---------------------------- |
| 8   | Webhook Security       | ~2h    | 🟡 Important | Verify Razorpay signatures   |
| 9   | API Pagination         | ~2h    | 🟡 Important | Create pagination middleware |
| 10  | Payment Reconciliation | ~3h    | 🟡 Important | Daily reconciliation script  |
| 11  | Field Encryption       | ~2h    | 🟡 Important | Encrypt sensitive data       |

### Total Progress

```
P0 Requirements:  2/6  Complete  (33%)  ████░░░░░░░░░░░░░░
P1 Requirements:  1/5  Complete  (20%)  ██░░░░░░░░░░░░░░░░
P2 Requirements:  0/4  Complete  (0%)   ░░░░░░░░░░░░░░░░░░

Overall Progress: 3/15 Complete  (20%)  ███░░░░░░░░░░░░░░░
```

### Estimated Time to Production Ready

**Remaining P0 Work:** ~7.5 hours  
**Remaining P1 Work:** ~9 hours  
**Total Remaining Critical Work:** ~16.5 hours (~2-3 days)

**Recommended Next Steps:**

1. Implement input validation (express-validator)
2. Setup Sentry error tracking
3. Configure Winston logging
4. Enable database backups
5. Add enhanced health check endpoint
6. Implement webhook security
7. Test everything in staging environment
8. Deploy to production

---

## 📧 Contact & Support

**Technical Escalation:**

- Critical errors: Check Sentry dashboard (once implemented)
- Payment issues: Check Razorpay dashboard + reconciliation reports
- Database issues: Check health endpoint + logs
- Email failures: Check pg-boss queue status in database

**Monitoring Dashboards:**

- Sentry: https://sentry.io (pending setup)
- Render: https://dashboard.render.com
- Better Uptime: https://betteruptime.com (recommended)
- Razorpay: https://dashboard.razorpay.com

**Emergency Procedures:**

- Database restore: See backup documentation
- Rollback deployment: Render dashboard > Previous deploy
- Payment disputes: Check reconciliation logs + contact Razorpay
- Email queue issues: Check PostgreSQL pgboss schema tables
- Rate limit issues: Restart server to clear memory store

**Health Check Endpoints:**

- Basic: `GET /health` - Returns 200 OK
- Enhanced (to implement): `GET /api/health/detailed` - Returns DB/email/queue status

---

**Document Version:** 2.0  
**Last Updated:** December 28, 2025  
**Next Review:** Before Production Launch  
**Maintained by:** Development Team
