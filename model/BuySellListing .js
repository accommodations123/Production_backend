import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";

const BuySellListing = sequelize.define(
    "BuySellListing",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        // Owner: any authenticated user
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        title: {
            type: DataTypes.STRING(150),
            allowNull: false
        },

        category: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        subcategory: {
            type: DataTypes.STRING(100),
            allowNull: true
        },

        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        country: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        city: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        zip_code: {
            type: DataTypes.STRING(20),
            allowNull: true
        },


        // Snapshot contact details (not tied to Host)
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            validate: { isEmail: true }
        },

        phone: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: "Array of image URLs"
        },

        status: {
            type: DataTypes.ENUM(
                "draft",
                "pending",
                "active",
                "sold",
                "hidden",
                "blocked"
            ),
            defaultValue: "pending"
        }

    },
    {
        tableName: "buy_sell_listings",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["user_id"] },
            { fields: ["category", "status"] },
            { fields: ["status", "created_at"] },
            { fields: ["price"] },
            // ✅ Location indexes
            { fields: ["country"] },
            { fields: ["country", "city"] },
            { fields: ["country", "city", "zip_code"] }
        ]
    }
);

/* Associations */

BuySellListing.belongsTo(User, {
    foreignKey: "user_id",
    onDelete: "CASCADE",
    onUpdate: "CASCADE"
});

User.hasMany(BuySellListing, {
    foreignKey: "user_id"
});

export default BuySellListing;
