import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   AuditLog Model — DynamoDB (Dynamoose)
   ===================================================================== */

const auditLogSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    action: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      default: "LOW",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    },
    actor_id: { type: String },
    actor_role: { type: String },
    actor_user_id: { type: String },
    actor_host_id: { type: String },
    actor_admin_id: { type: String },
    target_type: { type: String },
    target_id: { type: String },
    ip_address: { type: String },
    user_agent: { type: String },
    metadata: { type: Object }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const AuditLog = dynamoose.model("AuditLog", auditLogSchema);

export default AuditLog;
