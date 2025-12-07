import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Property = sequelize.define('Property', {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  category_id: DataTypes.STRING,
  property_type: DataTypes.STRING,
  privacy_type: DataTypes.STRING,

  guests: DataTypes.INTEGER,
  bedrooms: DataTypes.INTEGER,
  bathrooms: DataTypes.INTEGER,
  pets_allowed: DataTypes.INTEGER,
  area: DataTypes.INTEGER,

  title: DataTypes.STRING,
  description: DataTypes.TEXT,

  country: DataTypes.STRING,
  city: DataTypes.STRING,
  address: DataTypes.TEXT,

  photos: DataTypes.JSON,
  video: DataTypes.STRING,

  amenities: DataTypes.JSON,
  rules: DataTypes.JSON,
  legal_docs: DataTypes.JSON,

  price_per_hour: DataTypes.DECIMAL(10,2),
  price_per_night: DataTypes.DECIMAL(10,2),
  price_per_month: DataTypes.DECIMAL(10,2),

  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },

  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft'
  },

  rejection_reason: {
    type: DataTypes.TEXT,
    defaultValue: ''
  }

}, {
  tableName: 'properties',
  timestamps: true,
  underscored: true
});

Property.belongsTo(User, { foreignKey: 'user_id' });

export default Property;
