const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QuizAttempt = sequelize.define('QuizAttempt', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quizId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'quizzes',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  userAnswers: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of user answers with question IDs',
  },
  correctAnswers: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Score as percentage',
  },
  timeTaken: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Time taken in seconds',
  },
  isPassed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'quiz_attempts',
  timestamps: false,
});

module.exports = QuizAttempt;
