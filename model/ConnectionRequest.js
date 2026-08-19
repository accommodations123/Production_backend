import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

const connectionRequestSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    targetUserId: {
      type: String,
      required: true,
      index: {
        name: "targetUserId-index",
        type: "global"
      }
    },
    requesterId: {
      type: String,
      required: true,
      index: {
        name: "requesterId-index",
        type: "global"
      }
    },
    targetName: {
      type: String,
      default: "Host / Seller / Member"
    },
    requesterName: {
      type: String,
      default: "User"
    },
    requesterEmail: {
      type: String,
      default: ""
    },
    requesterPhone: {
      type: String,
      default: ""
    },
    itemId: {
      type: String,
      default: ""
    },
    itemTitle: {
      type: String,
      default: "Listing"
    },
    itemType: {
      type: String,
      default: "accommodations",
      enum: ["accommodations", "property", "buysell", "travel", "trip", "events", "event", "people"]
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "declined"]
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const ConnectionRequest = dynamoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;
