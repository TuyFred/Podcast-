const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Maps to public.profiles in Supabase
// The profiles table is auto-created by Supabase Auth trigger on new user signup
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'first_name',
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'last_name',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'profile_picture_url',
  },
  institution: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  educationLevel: {
    type: DataTypes.ENUM('high_school', 'undergraduate', 'postgraduate', 'professional'),
    defaultValue: 'undergraduate',
    field: 'education_level',
  },
  fieldOfStudy: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'field_of_study',
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_email_verified',
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'instructor'),
    defaultValue: 'user',
  },
  subscriptionStatus: {
    type: DataTypes.ENUM('free', 'premium', 'enterprise'),
    defaultValue: 'free',
    field: 'subscription_status',
  },
  subscriptionExpiry: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'subscription_expiry',
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'profiles',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = User;
