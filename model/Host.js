import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Host = sequelize.define('Host', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  email: DataTypes.STRING,
  phone: DataTypes.STRING,

  full_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false
  },

  id_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  id_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  id_photo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  selfie_photo: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'hosts',
  timestamps: true,
  underscored: true
});

// Relationship
Host.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Host, { foreignKey: 'user_id' });

export default Host;
