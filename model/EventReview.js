import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   EventReview Model — DynamoDB (Dynamoose)
   ===================================================================== */

const eventReviewSchema = new dynamoose.Schema(
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
        rangeKey: "created_at"
      }
    },
    user_id: {
      type: String,
      required: true,
      index: {
        name: "user_id-index",
        type: "global"
      }
    },
    reviewer_name: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "hidden", "reported"]
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const EventReview = dynamoose.model("EventReview", eventReviewSchema);

export default EventReview;
