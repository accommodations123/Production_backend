import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   ApplicationStatusHistory Model — DynamoDB (Dynamoose)
   ===================================================================== */

const applicationStatusHistorySchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    application_id: {
      type: String,
      required: true,
      index: {
        name: "application_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    from_status: {
      type: String,
      required: true
    },
    to_status: {
      type: String,
      required: true
    },
    acted_by_id: { type: String },
    acted_by_role: {
      type: String,
      default: "admin",
      enum: ["admin", "recruiter", "interviewer", "system", "user"]
    },
    notes: { type: String }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const ApplicationStatusHistory = dynamoose.model("ApplicationStatusHistory", applicationStatusHistorySchema);

export default ApplicationStatusHistory;
