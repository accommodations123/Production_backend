import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Notification Model — DynamoDB (Dynamoose)
   ===================================================================== */

const notificationSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    user_id: {
      type: String,
      required: true,
      index: {
        name: "user_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    entity_type: {
      type: String,
      default: "event"
    },
    entity_id: { type: String },
    metadata: { type: Object },
    is_read: {
      type: Boolean,
      default: false
    },
    is_deleted: {
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

const Notification = dynamoose.model("Notification", notificationSchema);

export default Notification;
