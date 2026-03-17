import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   User Model — DynamoDB (Dynamoose)
   ===================================================================== */

const userSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    email: {
      type: String,
      index: {
        name: "email-index",
        type: "global"
      }
    },
    otp: {
      type: String
    },
    otp_expires: {
      type: String // ISO date string
    },
    verified: {
      type: Boolean,
      default: false
    },
    name: {
      type: String
    },
    profile_image: {
      type: String
    },
    google_id: {
      type: String,
      index: {
        name: "google_id-index",
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

const User = dynamoose.model("User", userSchema);

export default User;
