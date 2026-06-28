const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Summary = sequelize.define('Summary', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  notesId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'notes_id',
    references: { model: 'notes', key: 'id' },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'profiles', key: 'id' },
  },
  summaryType: {
    type: DataTypes.ENUM('comprehensive', 'medium', 'exam_revision', 'one_minute'),
    allowNull: false,
    field: 'summary_type',
  },
  content:     { type: DataTypes.TEXT,    allowNull: false },
  wordCount:   { type: DataTypes.INTEGER, allowNull: true, field: 'word_count' },
  readingTime: { type: DataTypes.INTEGER, allowNull: true, field: 'reading_time' },
  keyPoints:   { type: DataTypes.JSONB,   allowNull: true, field: 'key_points' },
  focusAreas:  { type: DataTypes.JSONB,   allowNull: true, field: 'focus_areas' },
  generatedAt: { type: DataTypes.DATE,    defaultValue: DataTypes.NOW, field: 'generated_at' },
  createdAt:   { type: DataTypes.DATE,    defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt:   { type: DataTypes.DATE,    defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  tableName: 'summaries',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = Summary;
