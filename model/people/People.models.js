import dynamoose from "../../config/db.js";
import { v4 as uuidv4 } from "uuid";

// ── Professional Profile Model ──────────────────────────────────────────
const professionalProfileSchema = new dynamoose.Schema(
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
    name: {
      type: String,
      required: true
    },
    firstName: String,
    lastName: String,
    displayName: String,
    headline: String,
    bio: String,

    category: {
      type: String,
      index: {
        name: "category-index",
        global: true
      }
    },
    subcategory: String,
    profileType: {
      type: String,
      default: "professional"
    },
    roles: {
      type: Array,
      schema: [String],
      default: ["talent"]
    },

    hourlyRate: {
      type: Number,
      default: 0
    },
    yearsOfExperience: {
      type: Number,
      default: 0
    },
    offersServices: {
      type: Boolean,
      default: false
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected", "blocked"]
    },
    is_approved: {
      type: Boolean,
      default: false
    },
    rejection_reason: {
      type: String,
      default: ""
    },
    is_verified: {
      type: Boolean,
      default: false
    },
    is_featured: {
      type: Boolean,
      default: false
    },
    is_blocked: {
      type: Boolean,
      default: false
    },

    country: {
      type: String,
      index: {
        name: "country-index",
        global: true
      }
    },
    state: String,
    city: String,
    zipCode: String,
    address: String,

    whatsapp: String,
    phone: String,
    email: String,
    website: String,
    social_links: {
      type: Object,
      default: {}
    },
    contact_preferences: {
      type: Object,
      default: {}
    },
    contact_info: {
      type: Object,
      default: {}
    },

    avatar: String,
    bannerImage: String,

    experience: {
      type: Array,
      schema: [Object],
      default: []
    },
    education: {
      type: Array,
      schema: [Object],
      default: []
    },
    skills: {
      type: Array,
      schema: [String],
      default: []
    },
    languages: {
      type: Array,
      schema: [String],
      default: []
    },
    certifications: {
      type: Array,
      schema: [Object],
      default: []
    },
    services: {
      type: Array,
      schema: [Object],
      default: []
    },
    portfolio: {
      type: Array,
      schema: [Object],
      default: []
    },
    resumes: {
      type: Array,
      schema: [Object],
      default: []
    },

    rating: {
      type: Number,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    followersCount: {
      type: Number,
      default: 0
    },
    followingCount: {
      type: Number,
      default: 0
    },
    viewsCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    saveUnknown: true
  }
);

export const ProfessionalProfile = dynamoose.model(
  "ProfessionalProfile",
  professionalProfileSchema
);

// ── People Review Model ────────────────────────────────────────────────
const peopleReviewSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    profile_id: {
      type: String,
      required: true,
      index: {
        name: "profile_id-index",
        global: true
      }
    },
    reviewer_user_id: {
      type: String,
      required: true
    },
    reviewer_name: String,
    reviewer_avatar: String,
    rating: {
      type: Number,
      required: true
    },
    comment: String
  },
  {
    timestamps: true
  }
);

export const PeopleReview = dynamoose.model(
  "PeopleReview",
  peopleReviewSchema
);

// ── People Follower Model ──────────────────────────────────────────────
const peopleFollowerSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => uuidv4()
    },
    follower_user_id: {
      type: String,
      required: true,
      index: {
        name: "follower_user_id-index",
        global: true
      }
    },
    following_user_id: {
      type: String,
      required: true,
      index: {
        name: "following_user_id-index",
        global: true
      }
    }
  },
  {
    timestamps: true
  }
);

export const PeopleFollower = dynamoose.model(
  "PeopleFollower",
  peopleFollowerSchema
);

// ── People Report Model ────────────────────────────────────────────────
const peopleReportSchema = new dynamoose.Schema(
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
    reported_profile_id: {
      type: String,
      required: true
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

export const PeopleReport = dynamoose.model(
  "PeopleReport",
  peopleReportSchema
);

export default {
  ProfessionalProfile,
  PeopleReview,
  PeopleFollower,
  PeopleReport
};
