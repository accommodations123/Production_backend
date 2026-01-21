import TravelTrip from "../model/travel/TravelTrip.js";
import TravelMatch from "../model/travel/TravelMatch.js";

/* ======================================================
   TRAVEL MATCH ASSOCIATIONS (PRODUCTION SAFE)
   ====================================================== */

// Trip that INITIATED the request
TravelTrip.hasMany(TravelMatch, {
  foreignKey: "trip_id",
  as: "sentMatches",
  onDelete: "CASCADE"
});



// Trip that RECEIVED the request
TravelTrip.hasMany(TravelMatch, {
  foreignKey: "matched_trip_id",
  as: "receivedMatches",
  onDelete: "CASCADE"
});


