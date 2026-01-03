import dotenv from "dotenv";
dotenv.config();
import http from 'http'
import express from "express";
import cors from "cors";
import sequelize from "./config/db.js";
import { initSocket } from "./services/socket.js";
import "./model/User.js";
import "./model/Host.js";
import "./model/Property.js";   // add any other models here

// now import Routes
import otpRoutes from "./routes/otp.routes.js";
import adminRoutes from "./routes/adminroutes.js";
import HostRoutes from "./routes/HostRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminPropertyRoutes from "./routes/adminPropertyRoutes.js";
import adminApprovedRoutes from "./routes/approved.js";
import EventsRoutes from './routes/Events.routes.js'
import eventReviewRoutes from './routes/EventsReviews.Routes.js'
import buySellRoutes from './routes/buySellRoutes.js'
import communities from './routes/community/communityRoutes.js'
import communityContentRoutes from './routes/community/communityContentRoutes.js'
import authRoutes from './routes/auth/googleAuthroutes.js'
(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync( );

    console.log("MySQL connected");

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Routes
    app.use("/otp", otpRoutes);
    app.use('/admin', adminRoutes);
    app.use('/host', HostRoutes);
    app.use('/property', propertyRoutes);
    app.use('/adminproperty', adminPropertyRoutes);
    app.use("/admin/approved", adminApprovedRoutes);
    app.use("/events",EventsRoutes)
    app.use("/events/reviews", eventReviewRoutes);
    app.use('/buy-sell',buySellRoutes);
    app.use('/community',communities)
    app.use('/community',communityContentRoutes)
    app.use('/auth',authRoutes)
    
    const server = http.createServer(app)
    initSocket(server)
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => console.log("Server running on", PORT));

  } catch (err) {
    console.log("DB Error:", err.message);
  }
})();
