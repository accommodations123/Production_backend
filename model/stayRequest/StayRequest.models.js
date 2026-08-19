import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

// ── Stay Request Model ────────────────────────────────────────────────
const stayRequestSchema = new dynamoose.Schema(
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
        global: true
      }
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      index: {
        name: "country-index",
        global: true
      }
    },
    state: String,
    city: {
      type: String,
      required: true,
      index: {
        name: "city-index",
        global: true
      }
    },
    budget: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: "EUR"
    },
    stayType: {
      type: String,
      default: "Long Term"
    },
    furnishing: {
      type: String,
      default: "Furnished"
    },
    email: String,
    phone: String,
    status: {
      type: String,
      default: "pending",
      index: {
        name: "status-index",
        global: true
      }
    },
    is_published: {
      type: Boolean,
      default: true
    },
    is_approved: {
      type: Boolean,
      default: true
    },
    is_featured: {
      type: Boolean,
      default: false
    },
    is_blocked: {
      type: Boolean,
      default: false
    },
    rejection_reason: {
      type: String,
      default: ""
    },
    views_count: {
      type: Number,
      default: 0
    },
    offers_count: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    saveUnknown: true
  }
);

export const StayRequest = dynamoose.model("StayRequest", stayRequestSchema);

// ── Stay Request Offer Model ──────────────────────────────────────────
const stayRequestOfferSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    request_id: {
      type: String,
      required: true,
      index: {
        name: "request_id-index",
        global: true
      }
    },
    host_user_id: {
      type: String,
      required: true,
      index: {
        name: "host_user_id-index",
        global: true
      }
    },
    property_id: String,
    message: String,
    offered_price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: "EUR"
    },
    status: {
      type: String,
      default: "pending"
    },
    contact_phone: String,
    contact_email: String
  },
  {
    timestamps: true
  }
);

export const StayRequestOffer = dynamoose.model("StayRequestOffer", stayRequestOfferSchema);

// ── Stay Request Report Model ─────────────────────────────────────────
const stayRequestReportSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    reporter_user_id: {
      type: String,
      required: true
    },
    reported_request_id: {
      type: String,
      required: true,
      index: {
        name: "reported_request_id-index",
        global: true
      }
    },
    reason: String,
    details: String,
    status: {
      type: String,
      default: "pending"
    },
    resolution_notes: String,
    action_taken: String
  },
  {
    timestamps: true
  }
);

export const StayRequestReport = dynamoose.model("StayRequestReport", stayRequestReportSchema);

export default {
  StayRequest,
  StayRequestOffer,
  StayRequestReport
};
