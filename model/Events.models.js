import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

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
        global: true,
        rangeKey: "created_at"
      }
    },

    host_user_id: {
      type: String
    },

    title: String,
    description: String,

    included_items: {
      type: Array,
      schema: [String],
      default: []
    },

    type: {
      type: String,
      enum: ["public", "private", "festival", "meetup", "party", "music", "sports", "conference", "workshop", "charity", "networking", "cultural", "other"],
      default: "public"
    },

    // LOCATION (GSI optimized)
    country: {
      type: String,
      index: {
        name: "country-index",
        global: true,
        rangeKey: "created_at"
      }
    },
    state: String,
    city: String,
    zip_code: String,
    street_address: String,
    landmark: String,

    start_date: String,
    end_date: String,
    start_time: String,
    end_time: String,

    schedule: {
      type: Array,
      schema: [Object],
      default: []
    },

    venue_name: String,
    venue_description: String,
    parking_info: String,
    accessibility_info: String,
    google_maps_url: String,
    latitude: Number,
    longitude: Number,

    banner_image: String,
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
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
      index: {
        name: "status-index",
        global: true,
        rangeKey: "created_at"
      }
    },

    rejection_reason: {
      type: String,
      default: ""
    },

    event_mode: {
      type: String,
      enum: ["in-person", "offline", "online", "hybrid"],
      default: "in-person"
    },

    event_url: String,
    online_instructions: String,

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

export default dynamoose.model("Event", eventSchema);