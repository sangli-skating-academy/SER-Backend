# 🏗️ Backend Architecture & Developer Guide

**Version:** 3.0  
**Last Updated:** December 28, 2025  
**Project:** Sangli Skating Academy - Event Registration System

---

## 🎯 Overview

This is a **production-grade Node.js/Express backend** for a sports event registration system. The application handles user authentication, event management, payment processing, team registrations, and automated cleanup jobs.

**Tech Stack:**

- **Runtime:** Node.js (ES6 Modules)
- **Framework:** Express.js v5
- **Database:** PostgreSQL with connection pooling
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary (images)
- **Payment Gateway:** Razorpay
- **Email Service:** Nodemailer (SMTP - Direct sending)
- **Rate Limiting:** express-rate-limit
- **Job Scheduler:** node-cron
- **Security:** Helmet.js, CORS, bcryptjs

---

## 🏛️ Architecture Philosophy

### 1. **MVC Pattern (Model-View-Controller)**

- **Routes:** Define API endpoints and HTTP methods
- **Controllers:** Handle business logic and request/response
- **Services:** Reusable business logic (email, payments)
- **Middleware:** Request interceptors (auth, validation, error handling)

### 2. **Separation of Concerns**

Each layer has a **single responsibility**:

- Routes → Define API structure
- Controllers → Process requests
- Services → Business logic
- Middleware → Cross-cutting concerns
- Utils → Helper functions

### 3. **Security First**

- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting (6 different limiters)
- SQL injection prevention (parameterized queries)
- XSS protection (Helmet.js)
- CORS configuration
- Secure file uploads

### 4. **Scalability**

- Connection pooling for database
- Scheduled jobs for maintenance
- Modular code structure
- Environment-based configuration

---

## 📊 System Architecture Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLIENT (React)                            │
│                    http://localhost:5173                        │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP/HTTPS Requests
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER                             │
│                    Port 3000/5000                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Security Layer (Helmet, CORS, Rate Limiting)             │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ↓                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware (JWT)                          │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ↓                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Routes (User, Event, Payment, Admin, etc.)               │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ↓                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Controllers (Business Logic)                             │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
│                        ↓                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Services (Email Queue, Payment, Utils)                   │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  Cloudinary  │  │   Razorpay   │
│   Database   │  │  (Images)    │  │  (Payments)  │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓
┌──────────────────────────┐
│  Background Services     │
│  • Scheduled Jobs (cron) │
└──────────────────────────┘
```

### Request Processing Flow

```
HTTP Request
    ↓
┌───────────────────────┐
│  Rate Limiter         │ ← Check request count
│  (express-rate-limit) │
└───────┬───────────────┘
        │ ✓ Under limit
        ↓
┌───────────────────────┐
│  Security Headers     │ ← Helmet.js
│  (CSP, XSS, etc.)     │
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  CORS Check           │ ← Verify origin
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  Body Parser          │ ← Parse JSON/form data
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  JWT Auth (if needed) │ ← Verify token
│  req.user = decoded   │
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  Route Handler        │ ← Match endpoint
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  Controller Logic     │ ← Process request
│  • Validate input     │
│  • Query database     │
│  • Call services      │
└───────┬───────────────┘
        ↓
┌───────────────────────┐
│  Response             │ ← Send JSON
└───────────────────────┘
        │
        ↓ (if error)
┌───────────────────────┐
│  Error Handler        │ ← Global catch
└───────────────────────┘
```

---

## 📁 Folder Structure

```
server/
├── config/                    # 🔧 Configuration files
│   ├── db.js                  # PostgreSQL connection pool
│   └── config.js              # ✨ Centralized environment configuration
│
├── controllers/               # 🎮 Request handlers (business logic)
│   ├── clubController.js      # Class/membership registration
│   ├── contactController.js   # Contact form submissions
│   ├── eventController.js     # Event CRUD operations
│   ├── galleryController.js   # Gallery image management
│   ├── paymentController.js   # Razorpay payment verification
│   ├── registrationController.js  # Event registration logic
│   ├── teamController.js      # Team management
│   ├── userController.js      # User authentication & profile
│   └── userDetailsController.js   # Additional user data
│
├── middleware/                # 🛡️ Request interceptors
│   ├── auth.js                # JWT authentication
│   ├── admin.js               # Admin-only access
│   ├── errorHandler.js        # Global error handler
│   └── rateLimiter.js         # ✨ Rate limiting (6 limiters)
│
├── routes/                    # 🛤️ API endpoint definitions
│   ├── admin/                 # Admin-only routes
│   │   ├── classCleanup.js    # Class registration cleanup
│   │   ├── classRegistrations.js  # Admin class management
│   │   ├── contact.js         # Admin contact management
│   │   ├── eventCleanup.js    # Event cleanup operations
│   │   ├── events.js          # Admin event management
│   │   ├── gallery.js         # Admin gallery management
│   │   ├── registrations.js   # Admin registration view
│   │   ├── secureFile.js      # Admin file access
│   │   └── users.js           # Admin user management
│   ├── clubRoutes.js          # Public club routes
│   ├── contactRoutes.js       # Public contact routes
│   ├── eventRoutes.js         # Public event routes
│   ├── galleryRoutes.js       # Public gallery routes
│   ├── healthRoute.js         # Health check endpoint
│   ├── paymentRoutes.js       # Payment processing routes
│   ├── registrationRoutes.js  # Event registration routes
│   ├── securefile.js          # User file access
│   ├── teamRoutes.js          # Team management routes
│   ├── userDetailsRoutes.js   # User details routes
│   └── userRoutes.js          # User auth & profile routes
│
├── services/                  # 🔨 Business logic services
│   └── emailService.js        # Direct email sending with Nodemailer
│
├── jobs/                      # ⏰ Scheduled background jobs
│   ├── classRegistrationCleanupJob.js  # Archive expired classes
│   ├── eventCleanupJob.js     # Archive past events + Cloudinary cleanup
│   ├── eventStatusJob.js      # Update event status
│   └── paymentCleanupJob.js   # Archive failed/pending payments (60 days)
│
├── utils/                     # 🧰 Helper functions
│   ├── cloudinary.js          # ✨ Centralized Cloudinary operations
│   ├── generateToken.js       # JWT token generation
│   └── razorpay.js            # ✨ Centralized Razorpay utilities
│
├── logs/                      # 📝 Application logs
│   ├── access.js              # Access logs configuration
│   └── error.js               # Error logs configuration
│
│
├── docs/                      # 📚 Documentation
│   ├── DB_SCHEMA.md           # Database schema documentation
│   ├── PRODUCTION_READINESS.md # Production deployment checklist
│   └── PROJECT_STRUCTURE.md   # This file (architecture guide)
│
├── index.js                   # 🚀 Server entry point
├── package.json               # 📦 Dependencies & scripts
├── package-lock.json          # 📦 Dependency lock file
├── .env                       # 🔐 Environment variables (not in git)
├── .env.example               # 📋 Environment template
├── .git/                      # 🔧 Git repository data
├── .gitignore                 # 🚫 Git ignore rules
└── node_modules/              # 📚 Installed packages

```

---

## 🔧 Core Components

### 1. **index.js** - Server Entry Point

**Purpose:** Main application file that:

- Initializes Express app
- Loads environment variables
- Configures middleware
- Registers routes
- Starts the server
- Initializes scheduled jobs

**Key Features:**

```javascript
// Security middlewares
app.use(helmet());           // Security headers
app.use(morgan("dev"));      // Request logging

// CORS configuration
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Static file serving
app.use("/uploads/events", express.static(...));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin/events", adminEventRoutes);

// Global error handler
app.use(errorHandler);
```

---

### 2. **config/** - Configuration Layer

#### **config.js** - Centralized Configuration

**Purpose:** Single source of truth for all environment variables

```javascript
import dotenv from "dotenv";
dotenv.config();

// Server Configuration
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  BASE_URL: process.env.BASE_URL || "http://localhost:5000",
};

// Database Configuration
export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL,
};

// JWT Configuration
export const JWT_CONFIG = {
  secret: process.env.SESSION_SECRET,
  expiresIn: "7d",
};

// SMTP Configuration
export const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === "465",
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_USER,
};

// Cloudinary Configuration
export const CLOUDINARY_CONFIG = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  keyId: process.env.RAZORPAY_ID_KEY,
  keySecret: process.env.RAZORPAY_SECRET_KEY,
};

// Admin Configuration
export const ADMIN_CONFIG = {
  eventCleanupEmails: process.env.EVENT_CLEANUP_EMAILS?.split(",") || [],
};

// CORS Configuration
export const CORS_CONFIG = {
  allowedOrigins: process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

// Validate required configuration
export function validateConfig() {
  const required = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "RAZORPAY_ID_KEY",
    "RAZORPAY_SECRET_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
```

**Usage in Controllers:**

```javascript
import { SMTP_CONFIG, SERVER_CONFIG } from "../config/config.js";

const transporter = nodemailer.createTransport({
  host: SMTP_CONFIG.host,
  port: SMTP_CONFIG.port,
  secure: SMTP_CONFIG.secure,
  auth: {
    user: SMTP_CONFIG.user,
    pass: SMTP_CONFIG.pass,
  },
});
```

---

#### **db.js** - Database Connection

**Purpose:** Manages PostgreSQL connection pool

```javascript
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;
```

**Common Operations:**

```javascript
// Query with parameters (prevents SQL injection)
const result = await pool.query("SELECT * FROM users WHERE email = $1", [
  email,
]);

// Insert with RETURNING
const result = await pool.query(
  "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id",
  [username, email]
);
```

---

### 3. **middleware/** - Request Interceptors

#### **auth.js** - Authentication Middleware

**Purpose:** Verifies JWT tokens and protects routes

```javascript
const auth = (req, res, next) => {
  // Check Authorization header or cookie
  let token =
    req.headers.authorization?.split(" ")[1] || req.cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  const decoded = jwt.verify(token, process.env.SESSION_SECRET);
  req.user = decoded; // Attach user to request
  next();
};
```

**Usage:**

```javascript
// Protect a route
router.get("/profile", auth, getUserProfile);

// Access user in controller
const userId = req.user.id;
const userRole = req.user.role;
```

---

#### **admin.js** - Authorization Middleware

**Purpose:** Restricts routes to admin users only

```javascript
const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Admin access required" });
};
```

**Usage:**

```javascript
// Require both authentication AND admin role
router.delete("/users/:id", auth, adminOnly, deleteUser);
```

---

#### **errorHandler.js** - Global Error Handler

**Purpose:** Catches all errors and sends consistent responses

```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
};
```

---

### 4. **controllers/** - Business Logic

Controllers handle request processing and orchestrate services.

**Structure Pattern:**

```javascript
export const controllerFunction = async (req, res, next) => {
  try {
    // 1. Extract data from request
    const { param } = req.body;
    const userId = req.user.id;

    // 2. Validate input
    if (!param) {
      return res.status(400).json({ error: "Missing param" });
    }

    // 3. Database operations
    const result = await pool.query("...", [param]);

    // 4. Call services if needed
    await emailService.send(...);

    // 5. Send response
    res.status(200).json({ data: result.rows });

  } catch (err) {
    // 6. Forward to error handler
    next(err);
  }
};
```

**Key Controllers:**

#### **userController.js**

- `registerUser` - Create new user account
- `loginUser` - Authenticate and return JWT
- `logoutUser` - Clear auth cookie
- `getMe` - Get current user profile
- `updateMe` - Update user profile

#### **eventController.js**

- `getEvents` - List all events (with filters)
- `getEventById` - Get single event details

#### **registrationController.js**

- `registerForEvent` - Register user/team for event
- `getUserRegistrations` - Get user's registrations
- `cancelRegistration` - Cancel a registration

#### **paymentController.js**

- `createOrder` - Create Razorpay order
- `verifyPayment` - Verify payment signature
- Sends confirmation emails on success

#### **clubController.js**

- `registerForClass` - Class membership registration
- `createClubOrder` - Create payment order
- `verifyClubPayment` - Verify and confirm payment
- `getUserMemberships` - Get user's active memberships

---

### 5. **routes/** - API Endpoints

Routes define the API structure and connect URLs to controllers.

**Pattern:**

```javascript
import express from "express";
import { controller1, controller2 } from "../controllers/...js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", controller1);

// Protected routes
router.post("/", auth, controller2);

export default router;
```

**Route Organization:**

#### **Public Routes** (No Authentication)

- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `GET /api/events` - List events
- `GET /api/events/:id` - Event details
- `GET /api/gallery` - Gallery images
- `POST /api/contact` - Contact form

#### **Protected Routes** (Requires Authentication)

- `GET /api/users/me` - Current user profile
- `POST /api/registrations` - Register for event
- `GET /api/registrations` - User's registrations
- `POST /api/payment/create-order` - Create payment
- `POST /api/payment/verify` - Verify payment

#### **Admin Routes** (Requires Admin Role)

- `GET /api/admin/users` - All users
- `POST /api/admin/events` - Create event
- `PATCH /api/admin/events/:id` - Update event
- `DELETE /api/admin/events/:id` - Delete event
- `GET /api/admin/registrations/all` - All registrations
- `POST /api/admin/gallery/add` - Add gallery image

**RESTful Conventions:**

- `GET /resource` - List all
- `GET /resource/:id` - Get one
- `POST /resource` - Create new
- `PATCH /resource/:id` - Update existing
- `DELETE /resource/:id` - Delete

---

### 6. **services/** - Business Logic Layer

Services contain reusable business logic that can be called from multiple controllers.

#### **emailService.js**

**Purpose:** Centralized email sending with HTML templates

**Functions:**

- `sendWelcomeEmail()` - New user registration
- `sendRegistrationConfirmationEmail()` - Event registration
- `sendClubRegistrationSuccessEmail()` - Class membership
- `sendClubRegistrationAdminNotification()` - Admin alerts

**Pattern:**

```javascript
export const sendWelcomeEmail = async (userDetails) => {
  const { username, email } = userDetails;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body>
        <h1>Welcome ${username}!</h1>
      </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Welcome to Sangli Skating",
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

---

#### **paymentService.js**

**Purpose:** Payment processing logic (currently integrated in controllers)

**Future Enhancements:**

- Extract Razorpay logic from controllers
- Centralize payment verification
- Handle webhook processing
- Implement refund logic

---

## 🚦 Rate Limiting System

### Architecture

```
Request arrives
       │
       ↓
┌──────────────────────┐
│  Rate Limiter Check  │
│  IP: 192.168.1.1     │
│  Route: /api/login   │
└──────┬───────────────┘
       │
       ↓
┌─────────────────────────────┐
│  Memory Store               │
│  {                          │
│    "IP:endpoint": {         │
│      count: 5,              │
│      resetTime: timestamp   │
│    }                        │
│  }                          │
└─────────┬───────────────────┘
          │
          ↓
    Count >= Limit?
          │
    ┌─────┴─────┐
   YES          NO
    │           │
    ↓           ↓
┌────────┐  ┌────────┐
│ 429    │  │ Allow  │
│ Error  │  │ +1     │
└────────┘  └────────┘
```

### Rate Limiters Configuration

| Limiter             | Window | Max | Applied To              | Special Config         |
| ------------------- | ------ | --- | ----------------------- | ---------------------- |
| generalLimiter      | 15 min | 100 | All routes              | -                      |
| authLimiter         | 15 min | 5   | /login, /register       | skipSuccessfulRequests |
| contactLimiter      | 1 hour | 3   | /contact                | -                      |
| paymentLimiter      | 1 hour | 10  | Payment APIs            | -                      |
| registrationLimiter | 1 hour | 5   | Event/club registration | -                      |
| adminLimiter        | 15 min | 50  | Admin routes            | -                      |

### Response Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735363200
Retry-After: 900
```

### Error Response

```json
{
  "error": "Too many login attempts. Try again after 15 minutes.",
  "retryAfter": 1735363200
}
```

### Routes Protected

| Route                    | Limiter             | Reason                          |
| ------------------------ | ------------------- | ------------------------------- |
| POST /api/users/login    | authLimiter         | Prevent brute-force             |
| POST /api/users/register | authLimiter         | Prevent spam accounts           |
| POST /api/contact        | contactLimiter      | Prevent spam                    |
| POST /api/payment/\*     | paymentLimiter      | Payment security                |
| POST /api/registrations  | registrationLimiter | Prevent duplicate registrations |
| POST /api/club/register  | registrationLimiter | Prevent abuse                   |
| GET /api/events/\*       | generalLimiter      | General protection              |
| /api/admin/\*            | adminLimiter        | Admin protection                |

---

### 7. **jobs/** - Scheduled Background Tasks

Automated tasks that run periodically using node-cron.

#### **eventStatusJob.js**

**Purpose:** Auto-update event `live` status for past events

**Schedule:** Daily at 2:00 AM

```javascript
cron.schedule("0 2 * * *", () => {
  updateEventStatus();
});
```

**Logic:**

```javascript
UPDATE events
SET live = false
WHERE live = true
AND end_date < CURRENT_DATE
```

---

#### **eventCleanupJob.js**

**Purpose:** Archive past events AND delete Cloudinary files ✨ UPDATED

**Schedule:** Daily at 3:00 AM

```javascript
cron.schedule("0 3 * * *", async () => {
  await cleanupEventData();
});
```

**Process:**

1. Find events 30+ days past end date
2. **Fetch event image_url and all aadhaar_image URLs**
3. Delete database records (payments, registrations, user_details, teams, events)
4. **Delete event image from Cloudinary** ✨ NEW
5. **Delete all aadhaar images from Cloudinary** ✨ NEW
6. Send admin notification email

**Key Features:**

- ✅ Non-blocking Cloudinary deletion
- ✅ Comprehensive logging with emoji indicators
- ✅ Handles both event images and aadhaar documents
- ✅ Graceful error handling (continues if Cloudinary fails)

---

#### **classRegistrationCleanupJob.js**

**Purpose:** Archive expired class registrations

**Schedule:** Daily at midnight (00:00)

```javascript
cron.schedule("0 0 * * *", async () => {
  await processExpiredClassRegistrations();
});
```

**Process:**

1. Find registrations where `end_date <= CURRENT_DATE`
2. Move to `class_registrations_archive` table
3. Delete from `class_registrations`
4. Send admin notification email

---

#### **contactCleanupJob.js** ✨ NEW

**Purpose:** Delete old contact form submissions

**Schedule:** Daily at 4:00 AM

```javascript
cron.schedule("0 4 * * *", async () => {
  await cleanupOldContactMessages();
});
```

**Process:**

1. Find contact messages older than **3 months**
2. Delete messages permanently
3. Send admin notification with summary

**Retention Policy:** 3 months

**Why:** Contact form submissions are informational and don't need long-term storage. Keeps database lean.

---

#### **paymentCleanupJob.js** ✨ NEW

**Purpose:** Archive old failed/pending payments

**Schedule:** Weekly on Sundays at 5:00 AM

```javascript
cron.schedule("0 5 * * 0", async () => {
  await cleanupOldPayments();
});
```

**Process:**

1. Find payments with status `failed` or `pending` older than **60 days**
2. Move to `payments_archive` table
3. Delete from `payments` table
4. Send admin notification with statistics

**Retention Policy:** 60 days for failed/pending payments

**Why:** Failed/pending payments clutter the main table. Archiving maintains audit trail while keeping active table clean.

**Email Report Includes:**

- Total archived count
- Failed vs pending breakdown
- Total amount
- First 20 payment details

---

**Job Schedule Summary:**

| Job             | Schedule              | Retention Policy         | Action                      |
| --------------- | --------------------- | ------------------------ | --------------------------- |
| Event Status    | Daily 2:00 AM         | N/A                      | Update live flag            |
| Event Cleanup   | Daily 3:00 AM         | 30 days past end         | Delete + Cloudinary cleanup |
| Class Cleanup   | Daily 00:00           | Expired registrations    | Archive                     |
| Contact Cleanup | Daily 4:00 AM         | 3 months                 | Delete                      |
| Payment Cleanup | Weekly Sunday 5:00 AM | 60 days (failed/pending) | Archive                     |

---

### 8. **utils/** - Helper Functions

Small, reusable utility functions.

#### **cloudinary.js** - Cloudinary Utilities ✨ NEW

**Purpose:** Centralized Cloudinary configuration and operations

```javascript
import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_CONFIG } from "../config/config.js";

cloudinary.config({
  cloud_name: CLOUDINARY_CONFIG.cloudName,
  api_key: CLOUDINARY_CONFIG.apiKey,
  api_secret: CLOUDINARY_CONFIG.apiSecret,
});

export default cloudinary;

// Helper functions
export const uploadToCloudinary = async (filePath, folder) => {
  return await cloudinary.uploader.upload(filePath, { folder });
};

export const deleteFromCloudinary = async (publicId) => {
  return await cloudinary.uploader.destroy(publicId);
};
```

**Usage:**

```javascript
import cloudinary from "../utils/cloudinary.js";

// Upload image
const result = await cloudinary.uploader.upload(file.path, {
  folder: "events",
});

// Delete image
await cloudinary.uploader.destroy(publicId, {
  resource_type: "image",
});
```

---

#### **razorpay.js** - Razorpay Utilities

**Purpose:** Centralized Razorpay configuration and utilities

```javascript
import Razorpay from "razorpay";
import crypto from "crypto";
import { RAZORPAY_CONFIG } from "../config/config.js";

const razorpayInstance = new Razorpay({
  key_id: RAZORPAY_CONFIG.keyId,
  key_secret: RAZORPAY_CONFIG.keySecret,
});

export default razorpayInstance;

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_CONFIG.keySecret)
    .update(body.toString())
    .digest("hex");
  return expectedSignature === signature;
};

export const getRazorpayKeyId = () => RAZORPAY_CONFIG.keyId;
```

**Usage:**

```javascript
import razorpayInstance, {
  verifyRazorpaySignature,
} from "../utils/razorpay.js";

// Create order
const order = await razorpayInstance.orders.create(options);

// Verify payment
const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
```

---

#### **generateToken.js**

**Purpose:** Create JWT tokens for authentication

```javascript
import jwt from "jsonwebtoken";
import { JWT_CONFIG } from "../config/config.js";

const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, JWT_CONFIG.secret, {
    expiresIn: JWT_CONFIG.expiresIn,
  });
};

export default generateToken;
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 14+
- Git

### Installation

1. **Clone Repository**

```bash
cd server
```

2. **Install Dependencies**

```bash
npm install
```

3. **Configure Environment**
   Create `.env` file:

```env
# Server
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
SESSION_SECRET=your_super_secret_jwt_key_change_this

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Razorpay
RAZORPAY_ID_KEY=rzp_test_xxxxx
RAZORPAY_SECRET_KEY=xxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx

# Admin Emails (for notifications)
EVENT_CLEANUP_EMAILS=admin1@example.com,admin2@example.com
ADMIN_NOTIFICATION_EMAILS=admin2@gmail.com
```

4. **Initialize Database**
   Run SQL schema from `docs/DB_SCHEMA.md`:

5. **Start Server**

```bash
# Development
npm run dev

# Production
npm start
```

6. **Verify Installation**

```bash
curl http://localhost:5000/health
```

---

## 📞 Support

**Documentation:**

- Database Schema: `docs/DB_SCHEMA.md`
- Project Structure: `docs/PROJECT_STRUCTURE.md` (this file)
- Production Readiness: `docs/PRODUCTION_READINESS.md`

---

## 📊 Current Architecture Status

### Implemented Features

#### Security & Performance ✅

| Feature           | Implementation        | Status      | Details                      |
| ----------------- | --------------------- | ----------- | ---------------------------- |
| Rate Limiting     | express-rate-limit    | ✅ Complete | 6 limiters across all routes |
| JWT Auth          | jsonwebtoken          | ✅ Complete | Stateless authentication     |
| Role-Based Access | Middleware            | ✅ Complete | Admin vs User roles          |
| Security Headers  | Helmet.js             | ✅ Complete | XSS, CSP protection          |
| CORS              | cors middleware       | ✅ Complete | Configurable origins         |
| SQL Injection     | Parameterized queries | ✅ Complete | All DB queries use $1, $2... |

#### Email System ✅

| Component     | Technology | Status      | Details                         |
| ------------- | ---------- | ----------- | ------------------------------- |
| Email Service | Nodemailer | ✅ Complete | Direct SMTP with HTML templates |
| SMTP Server   | Gmail SMTP | ✅ Complete | Connection pooling enabled      |
| Templates     | HTML/Text  | ✅ Complete | Registration, payment, admin    |

#### Background Jobs ✅

| Job             | Schedule       | Status    | Purpose                           |
| --------------- | -------------- | --------- | --------------------------------- |
| Event Status    | Daily 2:00 AM  | ✅ Active | Update live flag                  |
| Event Cleanup   | Daily 3:00 AM  | ✅ Active | Delete old events + Cloudinary    |
| Class Cleanup   | Daily 00:00    | ✅ Active | Archive expired registrations     |
| Payment Cleanup | Weekly Sun 5AM | ✅ Active | Archive failed payments (60 days) |

### Technology Stack Summary

**Backend:**

- Node.js v18+
- Express.js v5
- PostgreSQL (production database)

**Security:**

- express-rate-limit (API protection)
- helmet (security headers)
- bcryptjs (password hashing)
- jsonwebtoken (authentication)
- cors (cross-origin requests)

**External APIs:**

- Cloudinary (image storage/CDN)
- Razorpay (payment gateway)
- Gmail SMTP (direct email delivery)

---

**Document Version:** 3.0  
**Last Updated:** December 28, 2025  
**Maintained by:** Development Team
