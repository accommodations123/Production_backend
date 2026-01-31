import dotenv from "dotenv";
dotenv.config();

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import sequelize from "./config/db.js";
import { initSocket } from "./services/socket.js";

/* ===================== MODELS ===================== */
import "./model/User.js";
import "./model/Host.js";
import "./model/Property.js";

/* ===================== ROUTES ===================== */
import otpRoutes from "./routes/otp.routes.js";
import adminRoutes from "./routes/adminroutes.js";
import HostRoutes from "./routes/HostRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminPropertyRoutes from "./routes/adminPropertyRoutes.js";
import adminApprovedRoutes from "./routes/approved.js";
import EventsRoutes from "./routes/Events.routes.js";
import eventReviewRoutes from "./routes/EventsReviews.Routes.js";
import buySellRoutes from "./routes/buySellRoutes.js";
import communities from "./routes/community/communityRoutes.js";
import communityContentRoutes from "./routes/community/communityContentRoutes.js";
import authRoutes from "./routes/auth/googleAuthroutes.js";
import travelRoutes from "./routes/travel/travelRoutes.js";
import careerRoutes from "./routes/carrer/careers.routes.js";
import analyticsRoutes from "./routes/DashboardAnalytics/analyticsroutes.js";
import EventAnalytics from "./routes/DashboardAnalytics/eventanalyticsroutes.js";
import buySellanalytics from "./routes/DashboardAnalytics/buySellAnalyticsroutes.js";
import communityanalytics from "./routes/DashboardAnalytics/communityAnalytics.routes.js";
import travelanalytics from "./routes/DashboardAnalytics/travelAnalytics.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

/* ===================== WORKERS ===================== */
import "./services/workers/emailWorker.js";

/* ===================== APP ===================== */
const app = express();
const server = http.createServer(app);

/* ===================== SECURITY ===================== */
app.use(helmet());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ===================== CORS ===================== */
const allowedOrigins = [
  "https://accomodation.test.nextkinlife.live",
  "https://accomodation.admin.test.nextkinlife.live",
  "http://localhost:5173",
  "http://localhost:5000"
];

app.use(
  cors({
    origin: allowedOrigins,  // ✅ Simpler syntax - pass the array directly
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-country", "x-country-code" ]
  })
);

// ❌ DO NOT add another app.use(cors()) here

// app.use(cors());

/* ===================== ROUTES ===================== */
app.use("/otp", otpRoutes);
app.use("/admin", adminRoutes);
app.use("/host", HostRoutes);
app.use("/property", propertyRoutes);
app.use("/adminproperty", adminPropertyRoutes);
app.use("/admin/approved", adminApprovedRoutes);
app.use("/events", EventsRoutes);
app.use("/events/reviews", eventReviewRoutes);
app.use("/buy-sell", buySellRoutes);
app.use("/community", communities);
app.use("/community", communityContentRoutes);
app.use("/auth", authRoutes);
app.use("/travel", travelRoutes);
app.use("/career", careerRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/eventanalytics", EventAnalytics);
app.use("/buysellanalytics", buySellanalytics);
app.use("/communityanalytics", communityanalytics);
app.use("/travelanalytics", travelanalytics);
app.use("/notification", notificationRoutes);

/* ===================== HEALTH ===================== */
app.get("/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", db: "connected" });
  } catch {
    res.status(500).json({ status: "error", db: "disconnected" });
  }
});

/* ===================== ERROR HANDLER ===================== */
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
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

    // ❗ NEVER sync in production
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync();
      console.log("⚠️ Sequelize sync enabled (DEV ONLY)");
    }
  } catch (err) {
    console.error("❌ DB connection failed:", err.message);
  }
})();

initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ===================== GRACEFUL SHUTDOWN ===================== */
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received. Shutting down...");
  await sequelize.close();
  process.exit(0);
});
