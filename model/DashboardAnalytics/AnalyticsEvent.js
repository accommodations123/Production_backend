import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   AnalyticsEvent Model — DynamoDB (Dynamoose)
   ===================================================================== */

const analyticsEventSchema = new dynamoose.Schema({
  id: {
    type: String,
    hashKey: true,
    default: () => uuidv4()
  },
  event_type: {
    type: String,
    required: true,
    index: {
      name: "event_type-index",
      type: "global",
      rangeKey: "created_at"
    }
  },
  user_id: { type: String },
  host_id: { type: String },
  property_id: { type: String },
  event_id: { type: String },
  country: { type: String },
  state: { type: String },
  metadata: { type: Object },
  created_at: {
    type: String,
    default: () => new Date().toISOString(),
    index: {
      name: "created_at-index",
      type: "global"
    }
  }
});

const AnalyticsEvent = dynamoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;