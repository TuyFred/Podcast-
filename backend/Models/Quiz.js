const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Quiz = sequelize.define('Quiz', {
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
  title:          { type: DataTypes.STRING, allowNull: false },
  description:    { type: DataTypes.TEXT,   allowNull: true  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
    field: 'total_questions',
  },
  questions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'time_limit',
  },
  passingScore: {
    type: DataTypes.FLOAT,
    defaultValue: 70,
    field: 'passing_score',
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_published',
  },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  tableName: 'quizzes',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = Quiz;
