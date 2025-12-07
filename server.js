import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors"; // missing before
import sequelize from "./config/db.js";

import otpRoutes from "./routes/otp.routes.js";
import adminRoutes from "./routes/adminroutes.js";
import HostRoutes from "./routes/HostRoutes.js";
import propertyRoutes from "./routes/propertyRoutes.js";
import adminPropertyRoutes from "./routes/adminPropertyRoutes.js";
import adminApprovedRoutes from "./routes/approved.js";



(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();            // or sync({ alter: true }) in dev

    console.log("MySQL connected");

    const app = express();
    app.use(cors());
    app.use(express.json());

    app.use("/otp", otpRoutes);
    app.use('/admin',adminRoutes);
    app.use('/host',HostRoutes);
    app.use('/property',propertyRoutes);
    app.use('/adminproperty',adminPropertyRoutes);
    app.use("/admin/approved", adminApprovedRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log("Server running on", PORT));

  } catch (err) {
    console.log("DB Error:", err.message);
  }
})();
