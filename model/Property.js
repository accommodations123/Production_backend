import dynamoose from "../config/db.js";
import { v4 as uuidv4 } from "uuid";

/* =====================================================================
   Property Model — DynamoDB (Dynamoose)
   ===================================================================== */

const propertySchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    user_id: {
      type: String,
      required: true
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
    category_id: { type: String },
    property_type: { type: String },
    privacy_type: { type: String },
    guests: { type: Number },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    pets_allowed: { type: Number },
    area: { type: Number },
    title: { type: String },
    description: { type: String },
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
    photos: {
      type: Array,
      schema: [String],
      default: []
    },
    video: { type: String },
    amenities: {
      type: Array,
      schema: [String],
      default: []
    },
    rules: {
      type: Array,
      schema: [String],
      default: []
    },
    price_per_hour: { type: Number },
    price_per_night: { type: Number },
    price_per_month: { type: Number },
    currency: {
      type: String,
      default: "USD"
    },
    status: {
      type: String,
      default: "draft",
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
    is_deleted: {
      type: Boolean,
      default: false
    },
    deleted_at: { type: String },
    deleted_by: { type: String },
    delete_reason: { type: String },
    listing_expires_at: { type: String },
    is_expired: {
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

const Property = dynamoose.model("Property", propertySchema);

export default Property;
