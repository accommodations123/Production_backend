import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import sequelize from "./config/db.js";
import { initSocket } from "./services/socket.js";

/* ===================== MODELS ===================== */
import "./model/User.js";
import "./model/Host.js";
import "./model/Property.js";

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
import eventAnalytics from "./routes/DashboardAnalytics/eventanalyticsroutes.js";
import buySellAnalytics from "./routes/DashboardAnalytics/buySellAnalyticsroutes.js";
import communityAnalytics from "./routes/DashboardAnalytics/communityAnalytics.routes.js";
import travelAnalytics from "./routes/DashboardAnalytics/travelAnalytics.routes.js";
import carreranalyticsRoutes from "./routes/DashboardAnalytics/carrer.routes.js";
import useanalytics from './routes/DashboardAnalytics/useranalytics.routes.js'
import notificationRoutes from "./routes/notification.routes.js";
import wishlistroutes from './routes/wishlistRoutes.js'
/* ===================== WORKERS ===================== */
import "./services/workers/emailWorker.js";

/* ===================== APP ===================== */
const app = express();
const server = http.createServer(app);

/* ===================== CORS (MUST BE FIRST) ===================== */
const allowedOrigins = [
  "https://accomodation.test.nextkinlife.live",
  "https://accomodation.admin.test.nextkinlife.live",
  "https://accomodation.api.test.nextkinlife.live",
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
      "x-country-code"
    ]
  })
);

/* ===================== TRUST PROXY ===================== */
app.set("trust proxy", 1);

/* ===================== SECURITY ===================== */
app.use(helmet());

/* ===================== RATE LIMITING ===================== */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
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
app.use("/carrer", careerRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/eventanalytics", eventAnalytics);
app.use("/buysellanalytics", buySellAnalytics);
app.use("/communityanalytics", communityAnalytics);
app.use("/travelanalytics", travelAnalytics);
app.use("/carreranalytics",carreranalyticsRoutes)
app.use("/users",useanalytics)
app.use("/notification", notificationRoutes);
app.use("/wishlist",wishlistroutes)
/* ===================== HEALTH ===================== */
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

/* ===================== ERROR HANDLER (LAST) ===================== */
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err);

  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: err.errors[0].message
    });
  }

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
    await sequelize.authenticate();
    console.log("✅ MySQL connected");

    if (process.env.NODE_ENV === "development") {
      await sequelize.sync();
      console.log("⚠️ Sequelize sync enabled (DEV ONLY)");
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
  await sequelize.close();
  process.exit(0);
});
