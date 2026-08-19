import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Application Model — DynamoDB (Dynamoose)
   ===================================================================== */

const applicationSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    job_id: {
      type: String,
      required: true,
      index: {
        name: "job_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    job_title: {
      type: String
    },
    user_id: {
      type: String,
      index: {
        name: "user_id-index",
        type: "global"
      }
    },
    first_name: {
      type: String
    },
    last_name: {
      type: String
    },
    full_name: {
      type: String
    },
    email: {
      type: String,
      required: true,
      index: {
        name: "email-index",
        type: "global"
      }
    },
    phone: { type: String },
    linkedin_url: { type: String },
    portfolio_url: { type: String },
    resume_url: {
      type: String
    },
    current_location: { type: String },
    work_authorization: { type: String },
    years_of_experience: { type: String },
    job_email_key: {
      type: String,
      index: {
        name: "job-email-index",
        type: "global"
      }
    },
    experience: {
      type: Array,
      schema: [Object],
      default: []
    },
    availability_date: { type: String },
    status: {
      type: String,
      default: "submitted",
      enum: ["submitted", "viewed", "shortlisted", "interview", "offer", "rejected", "withdrawn"],
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    status_updated_at: {
      type: String,
      default: () => new Date().toISOString()
    },
    last_viewed_at: { type: String },
    viewed_by_admin: { type: String }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const Application = dynamoose.model("Application", applicationSchema);

export default Application;
