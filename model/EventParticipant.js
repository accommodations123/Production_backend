import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   EventParticipant Model — DynamoDB (Dynamoose)
   ===================================================================== */

const eventParticipantSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    event_id: {
      type: String,
      required: true,
      index: {
        name: "event_id-index",
        type: "global",
        rangeKey: "user_id"
      }
    },
    user_id: {
      type: String,
      required: true,
      index: {
        name: "user_id-index",
        type: "global"
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

const EventParticipant = dynamoose.model("EventParticipant", eventParticipantSchema);

export default EventParticipant;
