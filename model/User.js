import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  otp: {
    type: DataTypes.STRING
  },
  // phone: {
  //   type: DataTypes.STRING(20),
  //   unique:true,
  //   allowNull:true
  // },
  otpExpires: {
    type: DataTypes.DATE,
    field: 'otp_expires',
    allowNull: true
  },
  verified: { 
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  validate: {
    emailOrPhoneRequired() {
      if (!this.email && !this.phone) {
        throw new Error('Either email or phone required')
      }
    }
  }
});

export default User;
