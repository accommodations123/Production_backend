import { DataTypes } from "sequelize";
import sequelize from "../../config/db.js";
import Host from "../Host.js";

/**
 * TravelTrip
 * One row = one verified host's travel plan
 */
const TravelTrip = sequelize.define(
  "TravelTrip",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    host_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    from_country: {
      type: DataTypes.STRING,
      allowNull: false
    },

    from_state: {
      type: DataTypes.STRING,
      allowNull: false
    },

    from_city: {
      type: DataTypes.STRING,
      allowNull: false
    },

    to_country: {
      type: DataTypes.STRING,
      allowNull: false
    },

    to_city: {
      type: DataTypes.STRING,
      allowNull: false
    },

    travel_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },

    departure_time: {
      type: DataTypes.TIME,
      allowNull: false
    },

    arrival_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    arrival_time: {
      type: DataTypes.TIME,
      allowNull: true
    },

    airline: {
      type: DataTypes.STRING,
      allowNull: true
    },

    flight_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    /* ===============================
       🔥 NEW FIELDS (TRIP-SPECIFIC)
       =============================== */

    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 18,
        max: 100
      }
    },

    languages: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },

    status: {
      type: DataTypes.STRING,
      defaultValue: "active"
      // active, completed, cancelled
    }
  },
  {
    tableName: "travel_trips",
    timestamps: true,
    underscored: true,

    indexes: [
      // 🔥 MAIN SEARCH INDEX
      {
        name: "idx_trip_search",
        fields: ["from_country", "to_country", "travel_date", "status"]
      },

      // 🔥 HOST DASHBOARD
      {
        name: "idx_trip_host",
        fields: ["host_id", "travel_date"]
      },

      // 🔥 STATUS FILTER
      {
        name: "idx_trip_status",
        fields: ["status"]
      },

      // 🔥 DESTINATION QUICK FILTER
      {
        name: "idx_trip_destination",
        fields: ["to_country", "to_city"]
      }
    ]
  }
);

/* ======================================================
   ASSOCIATIONS (THIS IS WHAT YOU WERE MISSING)
   ====================================================== */

// Each trip belongs to ONE host
TravelTrip.belongsTo(Host, {
  foreignKey: "host_id",
  as: "host",
  onDelete: "CASCADE"
});

// One host can have MANY trips
Host.hasMany(TravelTrip, {
  foreignKey: "host_id",
  as: "trips"
});

export default TravelTrip;
