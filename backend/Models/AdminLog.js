const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminLog = sequelize.define('AdminLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  action: {
    type: DataTypes.ENUM(
      'user_deleted',
      'user_suspended',
      'user_verified',
      'notes_removed',
      'podcast_removed',
      'quiz_created',
      'content_reviewed',
      'settings_updated',
      'analytics_exported'
    ),
    allowNull: false,
  },
  targetType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of target (user, notes, podcast, etc)',
  },
  targetId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'admin_logs',
  timestamps: false,
});

module.exports = AdminLog;
