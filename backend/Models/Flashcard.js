const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Flashcard = sequelize.define('Flashcard', {
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
  question:    { type: DataTypes.TEXT, allowNull: false },
  answer:      { type: DataTypes.TEXT, allowNull: false },
  category: {
    type: DataTypes.ENUM('definition', 'concept', 'theory', 'application', 'formula', 'procedure'),
    allowNull: true,
  },
  difficulty: {
    type: DataTypes.ENUM('easy', 'medium', 'hard'),
    defaultValue: 'medium',
  },
  topic:       { type: DataTypes.STRING, allowNull: true },
  tags:        { type: DataTypes.JSONB,  allowNull: true },
  explanation: { type: DataTypes.TEXT,   allowNull: true },
  examples:    { type: DataTypes.JSONB,  allowNull: true },
  userReviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'user_review_count',
  },
  userCorrectCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'user_correct_count',
  },
  userIncorrectCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'user_incorrect_count',
  },
  nextReviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_review_date',
  },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  tableName: 'flashcards',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = Flashcard;
