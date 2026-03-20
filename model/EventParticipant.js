import dynamoose from "../config/db.js";

const eventParticipantSchema = new dynamoose.Schema(
  {
    event_id: {
      type: String,
      hashKey: true
    },

    user_id: {
      type: String,
      rangeKey: true
    },

    joined_at: {
      type: Date,
      default: Date.now,
      index: {
        name: "user_id-index",
        global: true,
        hashKey: "user_id",
        rangeKey: "joined_at"
      }
    }
  },
  {
    timestamps: true
  }
);

export default dynamoose.model(
  "EventParticipant",
  eventParticipantSchema
);