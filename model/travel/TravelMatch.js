import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   TravelMatch Model — DynamoDB (Dynamoose)
   ===================================================================== */

const travelMatchSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    trip_id: {
      type: String,
      required: true,
      index: {
        name: "trip_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    matched_trip_id: {
      type: String,
      required: true,
      index: {
        name: "matched_trip_id-index",
        type: "global",
        rangeKey: "status"
      }
    },
    status: {
      type: String,
      default: "pending"
    },
    consent_given: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const TravelMatch = dynamoose.model("TravelMatch", travelMatchSchema);

export default TravelMatch;
