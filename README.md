# 🏠 NextKinLife — Backend API

> **Production-grade REST API** powering the NextKinLife accommodation & community platform.  
> Built with **Express 5**, **DynamoDB** (via Dynamoose), **AWS S3**, **Socket.IO**, and deployed through **Jenkins → Docker → AWS Elastic Beanstalk**.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Feature Modules](#feature-modules)
- [API Routes](#api-routes)
- [Middleware](#middleware)
- [Services](#services)
- [Database & Models](#database--models)
- [Real-Time (Socket.IO)](#real-time-socketio)
- [File Uploads (S3)](#file-uploads-s3)
- [Email Notifications](#email-notifications)
- [Dashboard Analytics](#dashboard-analytics)
- [Authentication & Authorization](#authentication--authorization)
- [Rate Limiting](#rate-limiting)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Docker](#docker)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Quality (SonarQube)](#code-quality-sonarqube)
- [Health Check](#health-check)
- [License](#license)

---

## Overview

**NextKinLife** is a full-featured accommodation and community platform that enables:

- **Property Listings** — Hosts can list accommodations; admins review and approve/reject.
- **Events** — Users create & manage events with participants, reviews, and admin moderation.
- **Buy & Sell Marketplace** — A peer-to-peer marketplace for buying/selling items.
- **Community Groups** — Users create groups with posts, resources, and member management.
- **Travel Matching** — Match travelers for shared trips with request/accept/reject flows.
- **Careers / Job Board** — Post jobs, accept applications, track status history.
- **Contact Form** — Public contact form submissions with branded email notifications.
- **Wishlist** — Users save their favorite properties.
- **Real-time Notifications** — Socket.IO-powered in-app notifications with JWT auth.
- **Admin Dashboard Analytics** — Comprehensive analytics for every module.

---

## Tech Stack

| Layer               | Technology                                                  |
| ------------------- | ----------------------------------------------------------- |
| **Runtime**         | Node.js 18 (Alpine in Docker)                               |
| **Framework**       | Express 5                                                   |
| **Module System**   | ES Modules (`"type": "module"`)                             |
| **Database**        | AWS DynamoDB (via [Dynamoose](https://dynamoosejs.com/) v4) |
| **Object Storage**  | AWS S3 (`@aws-sdk/client-s3`, `multer-s3`)                  |
| **Real-time**       | Socket.IO v4                                                |
| **Authentication**  | JWT (`jsonwebtoken`), Google OAuth (`google-auth-library`)   |
| **Password Hashing**| bcryptjs                                                    |
| **Validation**      | Joi                                                         |
| **Email**           | Nodemailer (Gmail SMTP)                                     |
| **Security**        | Helmet, CORS, express-rate-limit, rate-limiter-flexible      |
| **Geo-location**    | geoip-lite                                                  |
| **Containerization**| Docker (multi-stage build)                                  |
| **CI/CD**           | Jenkins → DockerHub → AWS Elastic Beanstalk                 |
| **Code Quality**    | SonarQube                                                   |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT APPLICATIONS                      │
│  nextkinlife.live  │  admin.nextkinlife.live  │  localhost    │
└────────────┬───────────────────┬──────────────┬──────────────┘
             │    HTTPS / WSS    │              │
             ▼                   ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXPRESS 5 + SOCKET.IO                       │
│                                                               │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐   │
│  │  CORS   │  │  Helmet  │  │  Rate   │  │  Cookie      │   │
│  │         │  │          │  │ Limiter │  │  Parser      │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘   │
│       └─────────────┴────────────┴───────────────┘           │
│                          │                                    │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │                      ROUTES                             │  │
│  │  /otp  /admin  /host  /property  /events  /buy-sell     │  │
│  │  /community  /auth  /travel  /carrer  /analytics        │  │
│  │  /notification  /wishlist  /contact  /health            │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │                   MIDDLEWARE                             │  │
│  │  userAuth │ adminAuth │ communityAuth │ upload │ roles  │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │                  CONTROLLERS                            │  │
│  │  Business logic, validation, DB operations              │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┴────────────────────────────────┐  │
│  │                    SERVICES                             │  │
│  │  emailService │ socket │ analytics │ notificationDisp.  │  │
│  └───────────┬───────────────────────┬────────────────────┘  │
│              │                       │                        │
│              ▼                       ▼                        │
│  ┌───────────────────┐  ┌────────────────────────────────┐   │
│  │   AWS DynamoDB    │  │          AWS S3                 │   │
│  │   (Dynamoose)     │  │   (Images/Docs/Videos)         │   │
│  └───────────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
nextkinlife-backend/
├── config/
│   ├── db.js                         # DynamoDB connection (Dynamoose), health check
│   └── s3.js                         # AWS S3 client configuration
│
├── controllers/
│   ├── admin.js                      # Admin CRUD, login, profile management
│   ├── adminPropertyController.js    # Admin property review actions
│   ├── Approved.js                   # Approval workflow controller
│   ├── buySellController.js          # Buy/Sell marketplace CRUD
│   ├── contactController.js          # Contact form handler
│   ├── Event.controllers.js          # Event CRUD, join/leave, moderation
│   ├── EventReview.controller.js     # Event review/rating system
│   ├── HostController.js             # Host registration, profile, documents
│   ├── Notification.controller.js    # In-app notification management
│   ├── otp.controller.js             # OTP generation, verification, login
│   ├── propertyController.js         # Property listing CRUD
│   ├── wishlistController.js         # Wishlist add/remove/fetch
│   ├── auth/                         # Google OAuth controller
│   ├── carrer/                       # Career/job controllers
│   ├── community/                    # Community group & content controllers
│   ├── travel/                       # Travel trip & match controllers
│   └── DashboardAnalytics/           # Analytics controllers (7 modules)
│       ├── adminAnalyticsController.js
│       ├── buySellAnalyticsController.js
│       ├── carrerAnalytics.controller.js
│       ├── communityAnalytics.controller.js
│       ├── eventAnalyticsController.js
│       ├── travelAnalytics.controller.js
│       └── userAnalytics.controller.js
│
├── middleware/
│   ├── adminAuth.js                  # Admin JWT verification
│   ├── auditContext.js               # Audit logging context
│   ├── communityAuth.js              # Community-specific auth guards
│   ├── eventWriteGuard.js            # Event write permission guard
│   ├── joinleaveAuth.js              # Event join/leave authorization
│   ├── loadEvent.js                  # Load event into req context
│   ├── loadProperty.js               # Load property into req context
│   ├── mojoAuth.js                   # Mojo auth integration
│   ├── rateLimiter.js                # Granular rate limiters (general, post, resource, event)
│   ├── requireRole.js                # Role-based access control
│   ├── upload.js                     # S3 file upload (images, docs, videos)
│   ├── userAuth.js                   # User JWT verification
│   └── verifyEventOwnership.js       # Event ownership verification
│   └── verifyPropertyOwnership.js    # Property ownership verification
│
├── model/
│   ├── Admin.js                      # Admin schema (Dynamoose)
│   ├── Approved.js                   # Approval records
│   ├── AuditLog.js                   # Audit trail
│   ├── BuySellListing.js             # Marketplace listings
│   ├── EventParticipant.js           # Event participants
│   ├── EventReview.js                # Event reviews
│   ├── Events.models.js              # Events schema
│   ├── Host.js                       # Host profiles
│   ├── Notification.js               # Notifications
│   ├── Property.js                   # Property listings
│   ├── User.js                       # User accounts
│   ├── Wishlist.js                   # User wishlists
│   ├── associations.js               # Model associations
│   ├── community/
│   │   ├── Community.js              # Community groups
│   │   ├── CommunityMember.js        # Group members
│   │   ├── CommunityPost.js          # Group posts
│   │   └── CommunityResource.js      # Group resources
│   ├── travel/
│   │   ├── TravelTrip.js             # Travel trip details
│   │   └── TravelMatch.js            # Travel match requests
│   ├── carrer/
│   │   ├── Job.js                    # Job postings
│   │   ├── Application.js            # Job applications
│   │   └── ApplicationStatusHistory.js
│   └── DashboardAnalytics/
│       └── AnalyticsEvent.js         # Analytics event tracking
│
├── routes/
│   ├── otp.routes.js                 # OTP endpoints
│   ├── adminroutes.js                # Admin endpoints
│   ├── HostRoutes.js                 # Host endpoints
│   ├── propertyRoutes.js             # Property endpoints
│   ├── adminPropertyRoutes.js        # Admin property management
│   ├── approved.js                   # Approval routes
│   ├── Events.routes.js              # Event endpoints
│   ├── EventsReviews.Routes.js       # Event review endpoints
│   ├── buySellRoutes.js              # Buy/Sell endpoints
│   ├── contactRoutes.js              # Contact form endpoint
│   ├── notification.routes.js        # Notification endpoints
│   ├── wishlistRoutes.js             # Wishlist endpoints
│   ├── auth/
│   │   └── googleAuthroutes.js       # Google OAuth routes
│   ├── community/
│   │   ├── communityRoutes.js        # Community group routes
│   │   └── communityContentRoutes.js # Community post/resource routes
│   ├── travel/
│   │   └── travelRoutes.js           # Travel routes
│   ├── carrer/
│   │   └── careers.routes.js         # Career routes
│   └── DashboardAnalytics/
│       ├── analyticsroutes.js        # Admin analytics
│       ├── buySellAnalyticsroutes.js  # Buy/Sell analytics
│       ├── communityAnalytics.routes.js
│       ├── travelAnalytics.routes.js
│       ├── carrer.routes.js          # Career analytics
│       ├── eventanalyticsroutes.js   # Event analytics
│       └── useranalytics.routes.js   # User analytics
│
├── services/
│   ├── Analytics.js                  # Analytics tracking service
│   ├── auditLogger.js                # Audit log writer
│   ├── cacheService.js               # Cache abstraction layer
│   ├── communityAnalytics.js         # Community analytics service
│   ├── emailService.js               # Nodemailer + HTML email templates
│   ├── eventService.js               # Event helper service
│   ├── notificationDispatcher.js     # Notification dispatch service
│   ├── socket.js                     # Socket.IO initialization & auth
│   ├── queues/
│   │   └── emailQueue.js            # Email queue (async dispatch)
│   └── workers/                      # Background workers (reserved)
│
├── utils/
│   └── imageUtils.js                 # Image processing utilities
│
├── scripts/
│   ├── seedSuperAdmin.js             # Create first super admin account
│   ├── migrateToDynamo.js            # Data migration to DynamoDB (v1)
│   └── migrateToDynamoV2.js          # Data migration to DynamoDB (v2)
│
├── server.js                         # Application entry point
├── package.json                      # Dependencies & scripts
├── Dockerfile                        # Multi-stage Docker build
├── Jenkinsfile                       # CI/CD pipeline definition
├── sonar-project.properties          # SonarQube configuration
├── .dockerignore                     # Docker build exclusions
├── .gitignore                        # Git exclusions
└── .env                              # Environment variables (not committed)
```

---

## Feature Modules

### 🏡 Properties & Accommodations
- Hosts create property listings with images, videos, and documents
- Admin reviews and approves/rejects listings
- Public search and filtering of approved properties
- Wishlist functionality for users

### 🎉 Events
- Create, update, delete events with rich media
- Event participation (join/leave) with rate limiting
- Event reviews and ratings
- Admin moderation and analytics

### 🛒 Buy & Sell Marketplace
- Post items for sale with images
- Admin approval workflow
- Full CRUD operations

### 👥 Community Groups
- Create community groups with approval flow
- Posts and resource sharing within groups
- Member management (join/leave)
- Content moderation by admins

### ✈️ Travel Matching
- Create travel trips with details
- Request/accept/reject travel matches between users
- Admin can cancel matches and trips
- Email notifications on match status changes

### 💼 Careers / Job Board
- Post job openings
- Accept and manage applications
- Track application status history with email notifications

### 📊 Dashboard Analytics
Seven dedicated analytics modules for the admin dashboard:
- Admin analytics, User analytics, Event analytics
- Buy/Sell analytics, Community analytics
- Travel analytics, Career analytics

---

## API Routes

| Prefix                | Module                    | Auth Required |
| --------------------- | ------------------------- | ------------- |
| `GET /health`         | Health check              | No            |
| `/otp`                | OTP login/verification    | No            |
| `/auth`               | Google OAuth              | No            |
| `/admin`              | Admin management          | Admin JWT     |
| `/host`               | Host registration         | User/Admin JWT|
| `/property`           | Property CRUD             | User JWT      |
| `/adminproperty`      | Admin property moderation | Admin JWT     |
| `/admin/approved`     | Approval workflows        | Admin JWT     |
| `/events`             | Event CRUD & participation| User JWT      |
| `/events/reviews`     | Event reviews             | User JWT      |
| `/buy-sell`           | Buy/Sell marketplace      | User JWT      |
| `/community`          | Community groups & content| User JWT      |
| `/travel`             | Travel trips & matching   | User JWT      |
| `/carrer`             | Career / job board        | User JWT      |
| `/notification`       | In-app notifications      | User JWT      |
| `/wishlist`           | Property wishlists        | User JWT      |
| `/contact`            | Contact form              | No            |
| `/analytics`          | Admin dashboard analytics | Admin JWT     |
| `/eventanalytics`     | Event analytics           | Admin JWT     |
| `/buysellanalytics`   | Buy/Sell analytics        | Admin JWT     |
| `/communityanalytics` | Community analytics       | Admin JWT     |
| `/travelanalytics`    | Travel analytics          | Admin JWT     |
| `/carreranalytics`    | Career analytics          | Admin JWT     |
| `/users`              | User analytics            | Admin JWT     |

---

## Middleware

| Middleware                 | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `userAuth.js`              | Verifies user JWT from `Authorization` header or cookies |
| `adminAuth.js`             | Verifies admin JWT with role validation                  |
| `communityAuth.js`         | Community-specific permission guards                     |
| `requireRole.js`           | Role-based access control (`user`, `admin`, `super_admin`) |
| `rateLimiter.js`           | Granular rate limiters — general, post, resource, event  |
| `upload.js`                | S3 file upload via multer-s3 (images, docs, videos)      |
| `loadEvent.js`             | Pre-loads event data into `req` context                  |
| `loadProperty.js`          | Pre-loads property data into `req` context               |
| `verifyEventOwnership.js`  | Ensures user owns the event before write operations      |
| `verifyPropertyOwnership.js` | Ensures user owns the property                         |
| `eventWriteGuard.js`       | Event write permission guard                             |
| `joinleaveAuth.js`         | Event join/leave authorization                           |
| `auditContext.js`          | Injects audit context for logging                        |

---

## Services

| Service                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `emailService.js`          | Nodemailer transporter with 15+ branded HTML templates   |
| `socket.js`                | Socket.IO server with JWT auth and room-based routing    |
| `notificationDispatcher.js`| Centralized notification dispatch (email + in-app)       |
| `Analytics.js`             | Analytics event tracking                                 |
| `auditLogger.js`           | Structured audit log writer                              |
| `cacheService.js`          | Cache abstraction layer                                  |
| `communityAnalytics.js`    | Community-specific analytics tracking                    |
| `eventService.js`          | Event helper/utility service                             |
| `queues/emailQueue.js`     | Asynchronous email dispatch queue                        |

---

## Database & Models

The backend uses **AWS DynamoDB** with [Dynamoose](https://dynamoosejs.com/) as the ODM.

### Configuration
- **Production**: Connects to AWS DynamoDB using IAM credentials
- **Development**: Supports **DynamoDB Local** (configurable via `DYNAMODB_LOCAL=true`)
- **Table Defaults**: On-demand billing, auto-create, auto-update, `nkl_` prefix

### Core Models

| Model                    | Description                              |
| ------------------------ | ---------------------------------------- |
| `User`                   | User accounts (email, phone, profile)    |
| `Admin`                  | Admin accounts (super_admin, admin)      |
| `Host`                   | Host profiles with documents             |
| `Property`               | Property/accommodation listings          |
| `Wishlist`               | User property wishlists                  |
| `Events.models`          | Event listings                           |
| `EventParticipant`       | Event participation records              |
| `EventReview`            | Event reviews & ratings                  |
| `BuySellListing`         | Marketplace buy/sell items               |
| `Community`              | Community groups                         |
| `CommunityMember`        | Community group members                  |
| `CommunityPost`          | Community posts                          |
| `CommunityResource`      | Community shared resources               |
| `TravelTrip`             | Travel trip details                      |
| `TravelMatch`            | Travel match requests                    |
| `Job`                    | Job postings                             |
| `Application`            | Job applications                         |
| `ApplicationStatusHistory` | Application status change log          |
| `Notification`           | In-app notification records              |
| `Approved`               | Approval records                         |
| `AuditLog`               | Audit trail entries                      |
| `AnalyticsEvent`         | Analytics tracking events                |

---

## Real-Time (Socket.IO)

Socket.IO provides real-time notifications with:

- **JWT Authentication** — Token from `handshake.auth.token` or HTTP cookies
- **Role Validation** — Only `user` and `admin` roles accepted
- **Room-based Routing** — Users auto-join `user:{userId}` room on connect
- **Transport** — WebSocket with polling fallback
- **Heartbeat** — `pingInterval: 25s`, `pingTimeout: 20s`

```javascript
// Client connection example
const socket = io("https://api.nextkinlife.live", {
  auth: { token: "your-jwt-token" },
  transports: ["websocket", "polling"]
});
```

---

## File Uploads (S3)

All file uploads go to **AWS S3** via `multer-s3`:

| Uploader               | S3 Path                  | File Types                 | Max Size |
| ----------------------- | ------------------------ | -------------------------- | -------- |
| `upload`                | `properties/`            | Images                     | 10 MB    |
| `uploadProfileImage`    | `users/`                 | Images                     | 10 MB    |
| `uploadHostProfile`     | `hosts/profiles/`        | Images                     | 10 MB    |
| `uploadCommunityImage`  | `community/`             | Images                     | 10 MB    |
| `uploadBuySellImage`    | `buysell/`               | Images                     | 10 MB    |
| `uploadPropertyImage`   | `properties/images/`     | Images                     | 10 MB    |
| `uploadTravelImage`     | `travel/`                | Images                     | 10 MB    |
| `uploadHostDocs`        | `hosts/documents/`       | PDF, Images, Word docs     | Default  |
| `uploadDocs`            | `properties/documents/`  | PDF, Images, Word docs     | Default  |
| `uploadVideo`           | `properties/videos/`     | MP4, MOV, MKV, AVI         | Default  |

---

## Email Notifications

The email service uses **Nodemailer** with Gmail SMTP and includes **15+ branded HTML templates**:

| Notification Type          | Trigger                                    |
| -------------------------- | ------------------------------------------ |
| `HOST_APPROVED/REJECTED`   | Admin reviews host application             |
| `EVENT_APPROVED/REJECTED`  | Admin reviews event submission             |
| `PROPERTY_APPROVED/REJECTED` | Admin reviews property listing           |
| `BUYSELL_APPROVED/REJECTED` | Admin reviews marketplace listing         |
| `COMMUNITY_APPROVED/REJECTED/SUSPENDED` | Admin reviews community group |
| `TRAVEL_MATCH_REQUESTED`   | User requests a travel match               |
| `TRAVEL_MATCH_ACCEPTED/REJECTED/CANCELLED` | Match status changes      |
| `TRAVEL_TRIP_CANCELLED`    | Admin cancels a travel trip                |
| `APPLICATION_UPDATE`       | Job application status change              |
| `CONTACT_FORM`             | Contact form submission                    |

---

## Authentication & Authorization

### User Authentication
- **OTP-based Login** — Email OTP generation & verification
- **Google OAuth** — Google Sign-In with redirect callback
- **JWT Tokens** — Issued on successful auth, sent via headers or httpOnly cookies

### Admin Authentication
- **Email/Password** — Admin login with bcrypt password hashing (12 rounds)
- **Role Hierarchy** — `super_admin` > `admin`
- **JWT Tokens** — Admin-specific token verification

### CORS Policy
Allowed origins:
- `https://nextkinlife.live` (Frontend)
- `https://admin.nextkinlife.live` (Admin Panel)
- `https://api.nextkinlife.live` (API itself)
- `http://localhost:5173` / `http://localhost:5000` (Development)

---

## Rate Limiting

Two layers of rate limiting:

### Global (express-rate-limit)
- **300 requests** per IP per **15 minutes**

### Granular (rate-limiter-flexible)
| Limiter            | Points | Duration | Scope                       |
| ------------------ | ------ | -------- | --------------------------- |
| General            | 50     | 60s      | Per IP                      |
| Post               | 10     | 60s      | Per user (`post:{userId}`)  |
| Resource upload    | 5      | 60s      | Per user (`resource:{userId}`) |
| Event join/leave   | 5      | 60s      | Per user + event ID         |

> Supports optional Redis backend for distributed rate limiting (currently using in-memory).

---

## Scripts

### Seed Super Admin
```bash
node scripts/seedSuperAdmin.js
```
Creates the initial super admin account. Configurable via environment variables:
- `SUPER_ADMIN_EMAIL` (default: `superadmin@nextkinlife.com`)
- `SUPER_ADMIN_PASSWORD` (must be 12+ chars with mixed case, number, special char)

### Database Migration
```bash
node scripts/migrateToDynamo.js    # v1 migration
node scripts/migrateToDynamoV2.js  # v2 migration (recommended)
```
Migrates data from legacy databases to DynamoDB.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ─── Server ───────────────────────────────────────
PORT=5000
NODE_ENV=development                    # development | production

# ─── JWT ──────────────────────────────────────────
JWT_SECRET=your-jwt-secret-key

# ─── Gmail (Nodemailer SMTP) ─────────────────────
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password            # Gmail App Password (NOT login password)

# ─── AWS S3 ───────────────────────────────────────
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET=your-s3-bucket-name
AWS_REGION=us-east-2

# ─── DynamoDB ─────────────────────────────────────
DYNAMODB_LOCAL=true                     # true for local DynamoDB, false for AWS
DYNAMODB_LOCAL_ENDPOINT=http://localhost:8000
DYNAMODB_TABLE_PREFIX=nkl_

# ─── Google OAuth ─────────────────────────────────
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://api.nextkinlife.live/auth/google/callback
FRONTEND_URL=https://nextkinlife.live

# ─── Super Admin (for seeding) ───────────────────
SUPER_ADMIN_EMAIL=superadmin@nextkinlife.com
SUPER_ADMIN_PASSWORD=YourSecurePassword@123
```

---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- **DynamoDB Local** (for development) — or AWS DynamoDB access
- **AWS Account** (for S3 uploads)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/nextkinlife-backend.git
cd nextkinlife-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# 4. Start DynamoDB Local (if using local development)
# Option A: Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Option B: Download from AWS
# https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html

# 5. Seed the super admin
node scripts/seedSuperAdmin.js

# 6. Start the development server
npm run dev
```

The server will start on `http://localhost:5000` with file-watching enabled.

### Verify
```bash
curl http://localhost:5000/health
# Expected: {"status":"ok","db":"connected"}
```

---

## Docker

### Multi-Stage Build

The Dockerfile uses a **two-stage build** for optimized production images:

1. **Stage 1 (Build)** — Installs all dependencies and copies source
2. **Stage 2 (Production)** — Installs only production dependencies, copies build output

```bash
# Build the image
docker build -t nextkinlife/prodnextkinlife:latest .

# Run the container
docker run -p 5000:5000 --env-file .env nextkinlife/prodnextkinlife:latest
```

### Image Details
- **Base**: `node:18-alpine`
- **Working Directory**: `/Production_backend`
- **Exposed Port**: `5000`
- **Entry Point**: `node server.js`

---

## CI/CD Pipeline

The project uses a **Jenkins** pipeline with four stages:

```
Checkout → Build Docker Image → Push to DockerHub → Deploy to Elastic Beanstalk
```

### Pipeline Stages

| Stage                         | Action                                          |
| ----------------------------- | ----------------------------------------------- |
| **Checkout**                  | Pulls latest code from SCM                      |
| **Build Docker Image**        | Builds `nextkinlife/prodnextkinlife:latest`      |
| **Push to DockerHub**         | Authenticates and pushes to DockerHub registry   |
| **Deploy to Elastic Beanstalk** | Deploys to `prod-backend-final` EB environment |

### Required Jenkins Credentials
- `dockerhub-creds` — DockerHub username/password
- `aws-creds` — AWS access key/secret for EB deployment

---

## Code Quality (SonarQube)

SonarQube is configured for static code analysis:

```properties
sonar.projectKey=nextkinlife-backend
sonar.projectName=NextKinLife Backend
sonar.sources=.
sonar.exclusions=**/node_modules/**, **/coverage/**, **/.git/**, **/*.test.js
```

Run analysis:
```bash
npx sonar-scanner
```

---

## Health Check

```
GET /health
```

**Response (Healthy)**:
```json
{
  "status": "ok",
  "db": "connected"
}
```

**Response (Unhealthy)**:
```json
{
  "status": "error",
  "db": "disconnected"
}
```

Used by Elastic Beanstalk and load balancers for instance health monitoring.

---

## Security Features

- ✅ **Helmet** — HTTP security headers
- ✅ **CORS** — Strict origin whitelist with credentials
- ✅ **Rate Limiting** — Global + granular per-action limiters
- ✅ **JWT Authentication** — Stateless auth with cookie support
- ✅ **bcrypt** — Password hashing with 12 salt rounds
- ✅ **Joi Validation** — Request body/param validation
- ✅ **Trust Proxy** — Configured for reverse proxy (load balancer)
- ✅ **Graceful Shutdown** — Handles SIGTERM for clean container stops
- ✅ **Audit Logging** — Track admin actions and changes

---

## License

ISC

---

<p align="center">
  Built with ❤️ by the <strong>NextKinLife</strong> team
</p>
