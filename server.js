import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dynamoose, { checkDynamoDBConnection } from "./config/db.js";
import { initSocket } from "./services/socket.js";

/* ===================== MODELS ===================== */
import "./model/User.js";
import "./model/Host.js";
import "./model/Property.js";
import "./model/Wishlist.js";

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
import communityRoutes from "./routes/community/communityRoutes.js";
import communityContentRoutes from "./routes/community/communityContentRoutes.js";
import authRoutes from "./routes/auth/googleAuthroutes.js";
import travelRoutes from "./routes/travel/travelRoutes.js";
import careerRoutes from "./routes/carrer/careers.routes.js";
import analyticsRoutes from "./routes/DashboardAnalytics/analyticsroutes.js";
import buySellAnalytics from "./routes/DashboardAnalytics/buySellAnalyticsroutes.js";
import communityAnalytics from "./routes/DashboardAnalytics/communityAnalytics.routes.js";
import travelAnalytics from "./routes/DashboardAnalytics/travelAnalytics.routes.js";
import carreranalyticsRoutes from "./routes/DashboardAnalytics/carrer.routes.js";
import useanalytics from './routes/DashboardAnalytics/useranalytics.routes.js'
import notificationRoutes from "./routes/notification.routes.js";
import wishlistroutes from './routes/wishlistRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import eventAnalytics from "./routes/DashboardAnalytics/eventanalyticsroutes.js";

/* ===================== WORKERS ===================== */
import cron from "node-cron";
import { runExpiryChecks } from "./services/expiryService.js";
cron.schedule("*/5 * * * *", async () => {
  console.log("[Cron Worker] Running 5-minute expiry scan...");
  await runExpiryChecks();
});

/* ===================== APP ===================== */
const app = express();
const server = http.createServer(app);

/* ===================== CORS (MUST BE FIRST) ===================== */
const allowedOrigins = [
  "https://nextkinlife.live",
  "https://admin.nextkinlife.live",
  "https://api.nextkinlife.live",
  "http://localhost:5173",
  "http://localhost:5000"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // server-to-server
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "cache-control",
      "Pragma",
      "pragma",
      "x-country",
      "x-country-code",
      "x-state",
      "x-city",
      "x-zip-code"
    ]
  })
);

/* ===================== TRUST PROXY ===================== */
app.set("trust proxy", 1);

/* ===================== SECURITY ===================== */
// NOTE: This is a pure JSON API server (api.nextkinlife.live).
// It never serves HTML/JS, so script-src and style-src are defense-in-depth only.
// 'unsafe-inline' and 'unsafe-eval' are intentionally ABSENT — there are no
// inline scripts or eval() calls to support. If a response accidentally renders
// as HTML in a browser, these strict directives prevent script injection.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://*.cloudfront.net", "https://*.s3.amazonaws.com"],
        mediaSrc: ["'self'", "https://*.cloudfront.net", "https://*.s3.amazonaws.com"],
        connectSrc: ["'self'"],
        fontSrc: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    // Explicit X-Content-Type-Options: nosniff (helmet enables by default, being explicit)
    xContentTypeOptions: true,
    // X-Frame-Options: DENY (redundant with frame-ancestors: 'none', but belts-and-suspenders)
    frameguard: { action: "deny" },
  })
);



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
app.use("/community", communityRoutes);
app.use("/community", communityContentRoutes);
app.use("/auth", authRoutes);
app.use("/travel", travelRoutes);
app.use("/career", careerRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/eventanalytics", eventAnalytics);
app.use("/buysellanalytics", buySellAnalytics);
app.use("/communityanalytics", communityAnalytics);
app.use("/travelanalytics", travelAnalytics);
app.use("/carreranalytics", carreranalyticsRoutes)
app.use("/users", useanalytics)
app.use("/notification", notificationRoutes);
app.use("/wishlist", wishlistroutes)
app.use("/contact", contactRoutes)

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
});

/* ===================== GRACEFUL SHUTDOWN ===================== */
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down...");
  process.exit(0);
});