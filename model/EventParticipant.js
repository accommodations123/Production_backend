import dynamoose from "../config/db.js";

const eventParticipantSchema = new dynamoose.Schema(
  {
    event_id: {
      type: String,
      hashKey: true
    },

    user_id: {
      type: String,
      rangeKey: true,
      index: {
        name: "user_id-index",
        global: true,
        rangeKey: "joined_at"
      }
    },

    joined_at: {
      type: Date,
      default: Date.now
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