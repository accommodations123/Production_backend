import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   ApprovedHost Model — DynamoDB (Dynamoose)
   ===================================================================== */

const approvedHostSchema = new dynamoose.Schema(
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
        type: "global"
      }
    },
    host_id: {
      type: String,
      required: true
    },
    property_id: {
      type: String,
      required: true
    },
    approved_by: {
      type: String,
      required: true
    },
    approved_at: {
      type: String,
      default: () => new Date().toISOString()
    },
    host_snapshot: {
      type: Object
    },
    property_snapshot: {
      type: Object
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const ApprovedHost = dynamoose.model("ApprovedHost", approvedHostSchema);

export default ApprovedHost;
