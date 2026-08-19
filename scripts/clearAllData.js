import dotenv from "dotenv";
dotenv.config();

import Property from "../model/Property.js";
import ApprovedHost from "../model/Approved.js";
import Wishlist from "../model/Wishlist.js";
import { StayRequest } from "../model/stayRequest/StayRequest.models.js";
import Event from "../model/Events.models.js";
import EventParticipant from "../model/EventParticipant.js";
import EventReview from "../model/EventReview.js";
import BuySellListing from "../model/BuySellListing.js";
import { ProfessionalProfile, PeopleReview, PeopleFollower, PeopleReport } from "../model/people/People.models.js";
import TravelTrip from "../model/travel/TravelTrip.js";
import TravelMatch from "../model/travel/TravelMatch.js";
import ConnectionRequest from "../model/ConnectionRequest.js";
import { checkDynamoDBConnection } from "../config/db.js";

async function clearTable(model, name) {
  try {
    const items = await model.scan().exec();
    console.log(`🔍 Found ${items.length} records in ${name}...`);
    for (const item of items) {
      if (item && item.id) {
        await model.delete({ id: item.id });
      }
    }
    console.log(`✅ Cleared ${items.length} records from ${name}`);
  } catch (err) {
    console.error(`⚠️ Error clearing ${name}:`, err.message);
  }
}

async function clearAll() {
  console.log("🗑️  Starting complete cleanup of all listings and module data...");
  const isConnected = await checkDynamoDBConnection();
  if (!isConnected) {
    console.error("❌ Cannot connect to DynamoDB");
    process.exit(1);
  }

  // 1. Accommodations
  console.log("\n--- ACCOMMODATIONS ---");
  await clearTable(Property, "Property (Accommodations)");
  await clearTable(ApprovedHost, "ApprovedHost (Approved Accommodations)");
  await clearTable(Wishlist, "Wishlist");

  // 2. Stay Requests
  console.log("\n--- STAY REQUESTS ---");
  await clearTable(StayRequest, "StayRequest");

  // 3. Events
  console.log("\n--- EVENTS ---");
  await clearTable(Event, "Event");
  await clearTable(EventParticipant, "EventParticipant");
  await clearTable(EventReview, "EventReview");

  // 4. Buy / Sell Marketplace
  console.log("\n--- BUY / SELL MARKETPLACE ---");
  await clearTable(BuySellListing, "BuySellListing");

  // 5. People Directory
  console.log("\n--- PEOPLE DIRECTORY ---");
  await clearTable(ProfessionalProfile, "ProfessionalProfile (People)");
  await clearTable(PeopleReview, "PeopleReview");
  await clearTable(PeopleFollower, "PeopleFollower");
  await clearTable(PeopleReport, "PeopleReport");

  // 6. Travel Partners
  console.log("\n--- TRAVEL PARTNERS ---");
  await clearTable(TravelTrip, "TravelTrip");
  await clearTable(TravelMatch, "TravelMatch");

  // 7. Connection Requests
  console.log("\n--- CONNECTIONS ---");
  await clearTable(ConnectionRequest, "ConnectionRequest");

  console.log("\n🎉 All requested module data has been completely cleared!");
}

clearAll().then(() => process.exit(0)).catch(err => {
  console.error("❌ Cleanup failed:", err);
  process.exit(1);
});
