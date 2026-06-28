const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  type: {
    type: DataTypes.ENUM(
      'welcome',
      'email_verified',
      'podcast_ready',
      'quiz_completed',
      'achievement_unlocked',
      'subscription_update',
      'support_message'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  content: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional data related to the notification',
  },
  relatedId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'ID of related entity (notes, podcast, etc)',
  },
  relatedType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of related entity',
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  emailSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  emailError: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
