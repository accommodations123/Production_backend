import dotenv from "dotenv";
dotenv.config();
import Event from "../model/Events.models.js";

async function inspect() {
  try {
    console.log("Querying approved events...");
    const approved = await Event.query("status").eq("approved").exec();
    console.log(`Found ${approved.length} approved events:`);
    for (const e of approved) {
      console.log({
        id: e.id,
        title: e.title,
        status: e.status,
        start_date: e.start_date,
        start_time: e.start_time,
        end_date: e.end_date,
        end_time: e.end_time,
        is_deleted: e.is_deleted
      });
    }
  } catch (err) {
    console.error("Error inspecting events:", err);
  }
  process.exit(0);
}

inspect();
