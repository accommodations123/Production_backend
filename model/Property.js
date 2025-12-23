import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Host from './Host.js';

const Property = sequelize.define('Property', {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  host_id: {
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
   zip_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
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
  },
  is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    delete_reason: {
      type: DataTypes.STRING,
      allowNull: true
    }

}, {
  tableName: 'properties',
  timestamps: true,
  underscored: true,
  
  
   //  indexes
  indexes: [
    { fields: ['host_id'] },
    { fields: ['status'] },
    { fields: ['city'] },
     { fields: ['zip_code'] },
    { fields: ['country'] },
    { fields: ['category_id'] },
    { fields: ['property_type'] },
    { fields: ['is_deleted']},
     { fields: ['country', 'city', 'zip_code'] } // ✅ ADDED (important)
  ]
});

Property.belongsTo(Host, { foreignKey: 'host_id' });
Host.hasMany(Property, { foreignKey: 'host_id' });


export default Property;
