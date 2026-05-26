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

const OriginalAnalyticsEvent = dynamoose.model("AnalyticsEvent", analyticsEventSchema);

// Helper to remove top-level null values, letting Dynamoose treat them as undefined (which omits them properly)
const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

// Create a proxy to intercept construct/create/update calls and sanitize inputs
const AnalyticsEvent = new Proxy(OriginalAnalyticsEvent, {
  construct(target, args, newTarget) {
    if (args[0] && typeof args[0] === "object") {
      args[0] = sanitize(args[0]);
    }
    return Reflect.construct(target, args, newTarget);
  },
  get(target, prop, receiver) {
    if (prop === "create") {
      return async function (object, ...args) {
        return OriginalAnalyticsEvent.create(sanitize(object), ...args);
      };
    }
    if (prop === "update") {
      return async function (key, object, ...args) {
        return OriginalAnalyticsEvent.update(key, sanitize(object), ...args);
      };
    }
    return Reflect.get(target, prop, receiver);
  }
});

export default AnalyticsEvent;