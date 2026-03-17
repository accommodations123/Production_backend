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
    department: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    geo_restriction: { type: String },
    work_style: {
      type: String,
      required: true,
      enum: ["remote", "hybrid", "onsite"]
    },
    employment_type: {
      type: String,
      required: true
    },
    contract_duration: { type: String },
    experience_level: {
      type: String,
      required: true
    },
    salary_range: { type: String },
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
    skills: {
      type: Object,
      default: { primary: [], secondary: [], nice_to_have: [] }
    },
    mandatory_conditions: {
      type: Array,
      schema: [String],
      default: []
    },
    metadata: {
      type: Object,
      default: {}
    },
    featured: {
      type: Boolean,
      default: false
    },
    views_count: {
      type: Number,
      default: 0
    },
    applications_count: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "draft",
      enum: ["draft", "active", "closed"],
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
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
