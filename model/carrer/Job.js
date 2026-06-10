import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Job Model — DynamoDB (Dynamoose)
   ===================================================================== */

const jobSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    created_by: {
      type: String,
      required: true,
      index: {
        name: "created_by-index",
        type: "global"
      }
    },
    title: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    client_name: {
      type: String
    },
    vendor_name: {
      type: String
    },
    location: {
      type: String,
      required: true
    },
    work_style: {
      type: String,
      required: true,
      enum: ["remote", "hybrid", "onsite"]
    },
    employment_type: {
      type: String,
      required: true
    },
    position_type: {
      type: String,
      enum: ["C2C", "W2", "Contract", "Full Time", "Part Time", "Contract to Hire"]
    },
    contract_duration: { type: String },
    experience_level: {
      type: String,
      required: true
    },
    salary_range: { type: String },
    pay_min: { type: Number },
    pay_max: { type: Number },
    pay_type: {
      type: String,
      enum: ["hourly", "salary"]
    },
    visa_status: {
      type: Array,
      schema: [String],
      default: []
    },
    start_date: { type: String },
    description: {
      type: String,
      required: true
    },
    requirements: {
      type: Array,
      schema: [String],
      default: []
    },
    responsibilities: {
      type: Array,
      schema: [String],
      default: []
    },
    preferred_skills: {
      type: Array,
      schema: [String],
      default: []
    },
    benefits: {
      type: Array,
      schema: [String],
      default: []
    },
    skills: {
      type: Object,
      schema: {
        primary: {
          type: Array,
          schema: [String]
        },
        secondary: {
          type: Array,
          schema: [String]
        },
        nice_to_have: {
          type: Array,
          schema: [String]
        }
      },
      default: { primary: [], secondary: [], nice_to_have: [] }
    },
    recruiter_name: { type: String },
    recruiter_email: { type: String },
    recruiter_phone: { type: String },
    recruiter_linkedin: { type: String },
    company_linkedin: {
      type: String,
      default: "https://linkedin.com/company/nextkinlife"
    },
    metadata: {
      type: Object,
      default: {}
    },
    views_count: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      required: true,
      default: "draft",
      enum: ["active", "closed", "draft"],
      index: {
        name: "status-index",
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

const Job = dynamoose.model("Job", jobSchema);

export default Job;
