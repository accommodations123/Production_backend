import "./config/db.js";
import { StayRequest } from "./model/stayRequest/StayRequest.models.js";

async function listAllStayRequests() {
  try {
    const results = await StayRequest.scan().exec();
    console.log("Total Stay Requests in DB:", results.length);
    results.forEach((r, idx) => {
      console.log(`[${idx + 1}] ID: ${r.id} | Title: "${r.title}" | Country: "${r.country}" | City: "${r.city}" | Status: "${r.status}" | Published: ${r.is_published}`);
    });
  } catch (err) {
    console.error("Error scanning stay requests:", err.message);
  }
}

listAllStayRequests();
