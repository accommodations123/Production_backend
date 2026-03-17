import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Event Model — DynamoDB (Dynamoose)
   ===================================================================== */

const eventSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    host_id: {
      type: String,
      required: true,
      index: {
        name: "host_id-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    title: {
      type: String,
      required: true
    },
    description: { type: String },
    included_items: {
      type: Array,
      schema: [String],
      default: []
    },
    type: {
      type: String,
      default: "public",
      enum: ["public", "private", "festival", "meetup", "party", "other"]
    },
    country: {
      type: String,
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
    landmark: { type: String },
    start_date: {
      type: String,
      required: true
    },
    end_date: { type: String },
    start_time: {
      type: String,
      required: true
    },
    end_time: { type: String },
    schedule: {
      type: Array,
      schema: [Object],
      default: []
    },
    venue_name: { type: String },
    venue_description: { type: String },
    parking_info: { type: String },
    accessibility_info: { type: String },
    google_maps_url: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    banner_image: { type: String },
    gallery_images: {
      type: Array,
      schema: [String],
      default: []
    },
    price: {
      type: Number,
      default: 0
    },
    attendees_count: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      default: "draft",
      enum: ["draft", "pending", "approved", "rejected"],
      index: {
        name: "status-index",
        type: "global",
        rangeKey: "created_at"
      }
    },
    rejection_reason: {
      type: String,
      default: ""
    },
    event_mode: {
      type: String,
      default: "offline",
      enum: ["offline", "online", "hybrid"]
    },
    event_url: { type: String },
    online_instructions: { type: String },
    is_deleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

const Event = dynamoose.model("Event", eventSchema);

export default Event;
