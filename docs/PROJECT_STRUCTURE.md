# 🏗️ Backend Architecture & Developer Guide

**Version:** 2.0  
**Last Updated:** December 27, 2025  
**Project:** Sangli Skating Academy - Event Registration System

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Folder Structure](#folder-structure)
4. [Core Components](#core-components)
5. [Best Practices](#best-practices)
6. [Getting Started](#getting-started)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

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
- **Email Service:** Nodemailer (SMTP)
- **Job Scheduler:** node-cron
- **Security:** Helmet.js, CORS, bcryptjs

---

## 🏛️ Architecture Philosophy

This backend follows **industry-standard patterns**:

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

## 📁 Folder Structure

```
server/
├── config/                    # 🔧 Configuration files
│   └── db.js                  # PostgreSQL connection pool
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
│   └── errorHandler.js        # Global error handler
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
│   ├── paymentRoutes.js       # Payment processing routes
│   ├── registrationRoutes.js  # Event registration routes
│   ├── securefile.js          # User file access
│   ├── teamRoutes.js          # Team management routes
│   ├── userDetailsRoutes.js   # User details routes
│   └── userRoutes.js          # User auth & profile routes
│
├── services/                  # 🔨 Business logic services
│   ├── emailService.js        # Email templates & sending
│   ├── emailService_backup.js # Email backup
│   ├── emailService_clean.js  # Email clean version
│   └── paymentService.js      # Payment processing logic
│
├── jobs/                      # ⏰ Scheduled background jobs
│   ├── classRegistrationCleanupJob.js  # Archive expired classes
│   ├── eventCleanupJob.js     # Archive past events
│   └── eventStatusJob.js      # Update event status
│
├── utils/                     # 🧰 Helper functions
│   └── generateToken.js       # JWT token generation
│
├── logs/                      # 📝 Application logs
│   ├── access.js              # Access logs configuration
│   └── error.js               # Error logs configuration
│
├── uploads/                   # 📤 File upload storage
│   ├── aadhaar/               # User Aadhaar documents
│   ├── events/                # Event images
│   └── gallery/               # Gallery images
│
├── docs/                      # 📚 Documentation
│   ├── DB_SCHEMA.md           # Database schema documentation
│   └── PROJECT_STRUCTURE.md   # This file
│
├── index.js                   # 🚀 Server entry point
├── package.json               # 📦 Dependencies & scripts
├── .env                       # 🔐 Environment variables (not in git)
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

**Best Practices:**

- ✅ Load environment variables first
- ✅ Apply security middleware early
- ✅ Separate public and admin routes
- ✅ Use global error handler at the end
- ✅ Start scheduled jobs after server starts

---

### 2. **config/** - Configuration Layer

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

**Best Practices:**

- ✅ Use connection pooling (not individual connections)
- ✅ Enable SSL for production databases
- ✅ Never hardcode credentials
- ✅ Test connection on startup
- ✅ Handle connection errors gracefully

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

**Best Practices:**

- ✅ Support both header and cookie tokens
- ✅ Set reasonable token expiration (7 days)
- ✅ Use httpOnly cookies for XSS prevention
- ✅ Handle token expiration gracefully
- ✅ Never expose sensitive data in tokens

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

**Best Practices:**

- ✅ Always use after auth middleware
- ✅ Return 403 (Forbidden) for non-admins
- ✅ Log unauthorized access attempts
- ✅ Consider role-based permissions for scalability

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

**Best Practices:**

- ✅ Use as last middleware in index.js
- ✅ Log errors for debugging
- ✅ Never expose stack traces in production
- ✅ Return consistent error format
- ✅ Set appropriate HTTP status codes

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

**Best Practices:**

- ✅ One controller per resource (users, events, etc.)
- ✅ Use try-catch for async operations
- ✅ Validate input before processing
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Return appropriate HTTP status codes
- ✅ Don't expose internal error details
- ✅ Keep controllers thin - move logic to services

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

**Best Practices:**

- ✅ Group related routes in separate files
- ✅ Use consistent naming (plural nouns)
- ✅ Apply middleware at route level
- ✅ Use HTTP methods correctly (GET, POST, PATCH, DELETE)
- ✅ Separate admin routes into admin/ folder
- ✅ Document routes with comments

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

**Best Practices:**

- ✅ Use HTML email templates
- ✅ Include plain text fallback
- ✅ Handle errors gracefully
- ✅ Never fail requests if email fails
- ✅ Log email sending status
- ✅ Verify SMTP connection on startup

---

#### **paymentService.js**

**Purpose:** Payment processing logic (currently integrated in controllers)

**Future Enhancements:**

- Extract Razorpay logic from controllers
- Centralize payment verification
- Handle webhook processing
- Implement refund logic

---

### 7. **jobs/** - Scheduled Background Tasks

Automated tasks that run periodically using node-cron.

#### **eventStatusJob.js**

**Purpose:** Auto-update event `live` status for past events

**Schedule:** Every hour

```javascript
cron.schedule("0 * * * *", () => {
  updateEventStatus();
});
```

**Logic:**

```javascript
UPDATE events
SET live = false
WHERE live = true
AND start_date < CURRENT_DATE
```

---

#### **eventCleanupJob.js**

**Purpose:** Archive past events and send admin notifications

**Schedule:** Daily at 3:00 AM

```javascript
cron.schedule("0 3 * * *", async () => {
  await processExpiredEvents();
});
```

---

#### **classRegistrationCleanupJob.js**

**Purpose:** Archive expired class registrations

**Schedule:** Daily at 4:00 AM

```javascript
cron.schedule("0 4 * * *", async () => {
  await processExpiredClassRegistrations();
});
```

**Process:**

1. Find registrations where `end_date <= CURRENT_DATE`
2. Move to `class_registrations_archive` table
3. Delete from `class_registrations`
4. Send admin notification email

**Best Practices:**

- ✅ Use cron syntax correctly
- ✅ Set appropriate timezone
- ✅ Log job execution
- ✅ Send notifications on completion
- ✅ Handle errors gracefully
- ✅ Archive data before deletion
- ✅ Test jobs in development mode

---

### 8. **utils/** - Helper Functions

Small, reusable utility functions.

#### **generateToken.js**

**Purpose:** Create JWT tokens for authentication

```javascript
const generateToken = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.SESSION_SECRET, {
    expiresIn: "7d",
  });
};
```

**Best Practices:**

- ✅ Keep token payload minimal
- ✅ Never store passwords in tokens
- ✅ Set reasonable expiration
- ✅ Use strong secret key
- ✅ Rotate secrets periodically

---

### 9. **uploads/** - File Storage

Local file storage for uploaded content (considering Cloudinary migration).

**Structure:**

```
uploads/
├── aadhaar/     # User Aadhaar documents (sensitive)
├── events/      # Event images
└── gallery/     # Gallery images
```

**Security:**

- ✅ Aadhaar files require authentication
- ✅ Public images served with CORS headers
- ✅ File size limits (10MB)
- ✅ File type validation
- ✅ Unique filenames (prevent overwrite)

**Migration to Cloudinary:**

- Event images → Cloudinary ✅
- Gallery images → Cloudinary ✅
- Aadhaar documents → Local (security)

---

## 🎯 Best Practices

### 1. **Security**

```javascript
// ✅ DO: Parameterized queries
pool.query("SELECT * FROM users WHERE id = $1", [userId]);

// ❌ DON'T: String concatenation
pool.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ DO: Hash passwords
const hashed = await bcrypt.hash(password, 12);

// ❌ DON'T: Store plain passwords
password: req.body.password;

// ✅ DO: Validate input
if (!email || !password) {
  return res.status(400).json({ error: "Missing fields" });
}
```

### 2. **Error Handling**

```javascript
// ✅ DO: Try-catch in async functions
export const controller = async (req, res, next) => {
  try {
    // ... logic
  } catch (err) {
    next(err);
  }
};

// ✅ DO: Send appropriate status codes
res.status(404).json({ error: "Not found" });
res.status(400).json({ error: "Bad request" });
res.status(500).json({ error: "Server error" });
```

### 3. **Database Queries**

```javascript
// ✅ DO: Use RETURNING for inserts
const result = await pool.query(
  "INSERT INTO users (...) VALUES (...) RETURNING id",
  [values]
);
const userId = result.rows[0].id;

// ✅ DO: Check for existence
if (result.rows.length === 0) {
  return res.status(404).json({ error: "Not found" });
}

// ✅ DO: Use transactions for related operations
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO ...");
  await client.query("UPDATE ...");
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
} finally {
  client.release();
}
```

### 4. **API Design**

```javascript
// ✅ DO: Consistent response format
res.json({
  success: true,
  data: result,
  message: "Operation successful"
});

// ✅ DO: Use plural nouns for collections
/api/users
/api/events
/api/registrations

// ✅ DO: Version your APIs (future)
/api/v1/users
/api/v2/users
```

### 5. **Environment Variables**

```javascript
// ✅ DO: Use environment variables
const port = process.env.PORT || 5000;

// ❌ DON'T: Hardcode sensitive data
const apiKey = "sk_test_123456789";

// ✅ DO: Validate env vars on startup
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}
```

### 6. **Code Organization**

```javascript
// ✅ DO: Keep files focused
userController.js → User operations only

// ✅ DO: Export named functions
export const getUser = async () => {};
export const createUser = async () => {};

// ✅ DO: Use async/await (not callbacks)
const data = await pool.query("...");

// ❌ DON'T: Use callbacks
pool.query("...", (err, result) => {});
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
```

4. **Initialize Database**
   Run SQL schema from `docs/DB_SCHEMA.md`:

```bash
psql -U user -d database -f schema.sql
```

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

## 🔍 Common Patterns

### Adding a New Feature

**Example: Add "Attendance" feature**

1. **Create Controller** (`controllers/attendanceController.js`)

```javascript
export const markAttendance = async (req, res) => {
  try {
    const { userId, eventId } = req.body;
    const result = await pool.query(
      "INSERT INTO attendance (user_id, event_id) VALUES ($1, $2) RETURNING *",
      [userId, eventId]
    );
    res.status(201).json({ attendance: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

2. **Create Routes** (`routes/attendanceRoutes.js`)

```javascript
import { markAttendance } from "../controllers/attendanceController.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.post("/", auth, markAttendance);
export default router;
```

3. **Register Routes** (`index.js`)

```javascript
import attendanceRoutes from "./routes/attendanceRoutes.js";
app.use("/api/attendance", attendanceRoutes);
```

4. **Update Database Schema** (`docs/DB_SCHEMA.md`)

5. **Test Endpoints**

---

## 🐛 Troubleshooting

### Common Issues

**1. Database Connection Errors**

```bash
Error: connect ECONNREFUSED
```

**Solution:**

- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Check firewall/network settings

**2. JWT Token Invalid**

```bash
Error: Token is not valid
```

**Solution:**

- Check `SESSION_SECRET` is set
- Verify token hasn't expired
- Clear cookies and re-login

**3. Email Not Sending**

```bash
Error: Invalid login
```

**Solution:**

- Enable "Less secure apps" OR use App Password (Gmail)
- Check SMTP credentials
- Verify SMTP port (587 for TLS)

**4. File Upload Fails**

```bash
Error: ENOENT: no such file or directory
```

**Solution:**

- Create upload directories manually
- Check file permissions
- Verify disk space

**5. Scheduled Jobs Not Running**

```bash
Jobs not executing
```

**Solution:**

- Check cron syntax
- Verify timezone settings
- Check server logs
- Test jobs in development mode

---

## 📞 Support & Contributing

**Documentation:**

- Database Schema: `docs/DB_SCHEMA.md`
- Project Structure: `docs/PROJECT_STRUCTURE.md` (this file)

**Contact:**

- Technical Lead: [Add contact]
- Repository: [Add GitHub link]

**Contributing:**

1. Create feature branch
2. Follow code conventions
3. Write tests
4. Update documentation
5. Submit pull request

---

**Document Version:** 2.0  
**Last Updated:** December 27, 2025  
**Maintained by:** Development Team
