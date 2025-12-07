// config/db.js
import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";



const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASS,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
    
  }
);

export default sequelize;
