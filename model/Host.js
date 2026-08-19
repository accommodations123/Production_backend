import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Host Model — DynamoDB (Dynamoose)
   ===================================================================== */

const hostSchema = new dynamoose.Schema(
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
    email: { type: String },
    phone: { type: String },
    full_name: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      index: {
        name: "country-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    state: { type: String },
    city: { type: String },
    zip_code: { type: String },
    street_address: { type: String },
    whatsapp: { type: String },
    facebook: { type: String },
    instagram: { type: String },
    status: {
      type: String,
      default: "pending",
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    rejection_reason: {
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

const Host = dynamoose.model("Host", hostSchema);

export default Host;
