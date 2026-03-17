import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   CommunityResource Model — DynamoDB (Dynamoose)
   ===================================================================== */

const communityResourceSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    community_id: {
      type: String,
      required: true,
      index: {
        name: "community_id-index",
        type: "global"
      }
    },
    added_by: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: { type: String },
    resource_type: {
      type: String,
      required: true,
      enum: ["link", "file", "contact"]
    },
    resource_value: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "hidden", "deleted"]
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const CommunityResource = dynamoose.model("CommunityResource", communityResourceSchema);

export default CommunityResource;
