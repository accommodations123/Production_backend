import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";

const Wishlist = sequelize.define(
    "Wishlist",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        item_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        item_type: {
            type: DataTypes.ENUM(
                "property",
                "event",
                "buysell",
                "community",
                "trip"
            ),
            allowNull: false
        }
    },
    {
        tableName: "wishlists",
        timestamps: true,
        underscored: true,
        indexes: [
            { unique: true, fields: ["user_id", "item_id", "item_type"] },
            { fields: ["user_id"] },
            { fields: ["user_id", "item_type"] }, // compound optimization
            { fields: ["user_id", "created_at"] }
        ]
    }
);

Wishlist.belongsTo(User, { foreignKey: "user_id", onDelete: "CASCADE" });
User.hasMany(Wishlist, { foreignKey: "user_id" });

export default Wishlist;
