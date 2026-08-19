import dotenv from "dotenv";
dotenv.config();

import dynamoose from "../config/db.js";
import Application from "../model/carrer/Application.js";

async function backfill() {
  try {
    console.log("Starting backfill for Application job_email_key...");
    
    // Scan all application records
    const apps = await Application.scan().exec();
    console.log(`Found ${apps.length} application records.`);
    
    let updatedCount = 0;
    for (const app of apps) {
      if (!app.job_email_key) {
        const normalizedEmail = (app.email || "").toLowerCase().trim();
        if (app.job_id && normalizedEmail) {
          const key = `${app.job_id}#${normalizedEmail}`;
          await Application.update({ id: app.id }, { job_email_key: key });
          console.log(`Updated application ${app.id} with job_email_key: ${key}`);
          updatedCount++;
        } else {
          console.warn(`Skipping application ${app.id} because job_id or email is missing.`);
        }
      }
    }
    
    console.log(`Backfill finished. Updated ${updatedCount} records.`);
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

backfill();
