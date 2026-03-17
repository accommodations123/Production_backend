import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   TravelTrip Model — DynamoDB (Dynamoose)
   ===================================================================== */

const travelTripSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    host_id: {
      type: String,
      required: true,
      index: {
        name: "host_id-index",
        type: "global",
        rangeKey: "travel_date"
      }
    },
    from_country: {
      type: String,
      required: true
    },
    from_state: {
      type: String,
      required: true
    },
    from_city: {
      type: String,
      required: true
    },
    to_country: {
      type: String,
      required: true,
      index: {
        name: "to_country-index",
        type: "global",
        rangeKey: "travel_date"
      }
    },
    to_city: {
      type: String,
      required: true
    },
    travel_date: {
      type: String,
      required: true
    },
    departure_time: {
      type: String,
      required: true
    },
    arrival_date: { type: String },
    arrival_time: { type: String },
    airline: { type: String },
    flight_number: { type: String },
    age: { type: Number },
    languages: {
      type: Array,
      schema: [String],
      default: []
    },
    status: {
      type: String,
      default: "active",
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
      }
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const TravelTrip = dynamoose.model("TravelTrip", travelTripSchema);

export default TravelTrip;
