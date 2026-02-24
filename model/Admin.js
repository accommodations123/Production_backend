import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false
  },

  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'recruiter'),
    allowNull: false,
    defaultValue: 'admin',
    validate: {
      isIn: [['super_admin', 'admin', 'recruiter']]
    }
  }

}, {
  tableName: 'admins',
  timestamps: true,
  underscored: true
});

export default Admin;
