import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import dynamoose, { checkDynamoDBConnection } from "./config/db.js";
import { allowedOrigins } from "./config/origins.js";
import { initSocket } from "./services/socket.js";
import { runExpiryChecks } from "./services/expiryService.js";

/* ===================== MODELS ===================== */
import "./model/User.js";
import "./model/Host.js";
import "./model/Property.js";
import "./model/Wishlist.js";
import "./model/ConnectionRequest.js";
import "./model/people/People.models.js";
import "./model/stayRequest/StayRequest.models.js";

/* ===================== ROUTES ===================== */
import otpRoutes from "./routes/otp.routes.js";
import adminRoutes from "./routes/adminroutes.js";
import hostRoutes from "./routes/HostRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminPropertyRoutes from "./routes/adminPropertyRoutes.js";
import adminApprovedRoutes from "./routes/approved.js";
import eventsRoutes from "./routes/Events.routes.js";
import eventReviewRoutes from "./routes/EventsReviews.Routes.js";
import buySellRoutes from "./routes/buySellRoutes.js";
import authRoutes from "./routes/auth/googleAuthroutes.js";
import travelRoutes from "./routes/travel/travelRoutes.js";
import careerRoutes from "./routes/carrer/careers.routes.js";
import analyticsRoutes from "./routes/DashboardAnalytics/analyticsroutes.js";
import buySellAnalytics from "./routes/DashboardAnalytics/buySellAnalyticsroutes.js";
import travelAnalytics from "./routes/DashboardAnalytics/travelAnalytics.routes.js";
import carreranalyticsRoutes from "./routes/DashboardAnalytics/carrer.routes.js";
import useanalytics from './routes/DashboardAnalytics/useranalytics.routes.js'
import notificationRoutes from "./routes/notification.routes.js";
import wishlistroutes from './routes/wishlistRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import connectionRequestRoutes from './routes/connectionRequestRoutes.js'
import eventAnalytics from "./routes/DashboardAnalytics/eventanalyticsroutes.js";

import peopleRoutes from "./routes/people/People.routes.js";
import adminPeopleRoutes from "./routes/people/admin.people.routes.js";

import stayRequestRoutes from "./routes/stayRequest/StayRequest.routes.js";
import adminStayRequestRoutes from "./routes/stayRequest/admin.stayRequest.routes.js";




/* ===================== APP ===================== */
const app = express();
const server = http.createServer(app);

/* ===================== CORS (MUST BE FIRST) ===================== */

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // server-to-server or direct
      const cleanOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cache-Control",
      "cache-control",
      "Pragma",
      "pragma",
      "x-country",
      "x-country-code",
      "x-state",
      "x-city",
      "x-zip-code"
    ],
    optionsSuccessStatus: 200
  })
);

app.options("*", cors());

/* ===================== TRUST PROXY ===================== */
app.set("trust proxy", 1);

/* ===================== SECURITY ===================== */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://*.cloudfront.net", "https://*.s3.amazonaws.com"],
        mediaSrc: ["'self'", "https://*.cloudfront.net", "https://*.s3.amazonaws.com"],
        connectSrc: ["'self'", "*"],
        fontSrc: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    xContentTypeOptions: true,
    frameguard: { action: "deny" },
  })
);



/* ===================== COMPRESSION ===================== */
// Gzip/Brotli all JSON responses. Reduces payload size 60-80%.
// Must come BEFORE routes and AFTER security middleware.
app.use(compression());

/* ===================== REQUEST TIMEOUT ===================== */
// Auto-respond 503 if any request hangs for more than 30 seconds.
// Prevents slow DynamoDB scans or SMTP stalls from exhausting connections.
const REQUEST_TIMEOUT_MS = 30_000;
app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`⏱ Request timeout: ${req.method} ${req.path}`);
      res.status(503).json({
        success: false,
        message: "Request timed out. Please try again."
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear the timer as soon as the response is finished (success or error)
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
});

/* ===================== BODY PARSERS ===================== */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ===================== ROUTES ===================== */
app.use("/otp", otpRoutes);
app.use("/admin", adminRoutes);
app.use("/host", hostRoutes);
app.use("/property", propertyRoutes);
app.use("/adminproperty", adminPropertyRoutes);
app.use("/admin/approved", adminApprovedRoutes);
app.use("/events", eventsRoutes);
app.use("/events/reviews", eventReviewRoutes);
app.use("/buy-sell", buySellRoutes);
app.use("/auth", authRoutes);
app.use("/travel", travelRoutes);
app.use("/career", careerRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/eventanalytics", eventAnalytics);
app.use("/buysellanalytics", buySellAnalytics);
app.use("/travelanalytics", travelAnalytics);
app.use("/carreranalytics", carreranalyticsRoutes)
app.use("/users", useanalytics)
app.use("/notification", notificationRoutes);
app.use("/wishlist", wishlistroutes)
app.use("/contact", contactRoutes)
app.use("/connection-requests", connectionRequestRoutes);

app.use("/people", peopleRoutes);
app.use("/admin/people", adminPeopleRoutes);

app.use("/stay-request", stayRequestRoutes);
app.use("/admin/stay-request", adminStayRequestRoutes);

/* ===================== HEALTH ===================== */
app.get("/health", async (req, res) => {
  try {
    const connected = await checkDynamoDBConnection();
    if (connected) {
      res.json({ status: "ok", db: "connected" });
    } else {
      res.status(500).json({ status: "error", db: "disconnected" });
    }
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

/* ===================== ERROR HANDLER (LAST) ===================== */
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

/* ===================== STARTUP ===================== */
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    const connected = await checkDynamoDBConnection();
    if (connected) {
      console.log("✅ DynamoDB connected");
    } else {
      console.error("❌ DynamoDB connection check failed");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  }
})();

/* ===================== SOCKET ===================== */
try {
  initSocket(server);
} catch (err) {
  console.error("❌ Socket init failed:", err);
}

/* ===================== LISTEN ===================== */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Start periodic expiry checks (run immediately, then every 5 minutes)
  console.log("⏱ Starting background expiry checks scheduler...");
  runExpiryChecks().catch(err => console.error("Error running initial expiry checks:", err));
  setInterval(() => {
    runExpiryChecks().catch(err => console.error("Error in scheduled expiry checks:", err));
  }, 5 * 60 * 1000);
});

/* ===================== GRACEFUL SHUTDOWN ===================== */
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Graceful shutdown initiated...");
  server.close(() => {
    console.log("👋 HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force exit after 10 seconds if connections fail to close
  setTimeout(() => {
    console.error("⚠️ Graceful shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);
});