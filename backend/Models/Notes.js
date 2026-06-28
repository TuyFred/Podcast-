const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notes = sequelize.define('Notes', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: { model: 'profiles', key: 'id' },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  originalFileName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'original_file_name',
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'file_size',
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'file_path',
  },
  fileType: {
    type: DataTypes.ENUM('pdf', 'docx', 'txt'),
    allowNull: false,
    field: 'file_type',
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'extracted_text',
  },
  cleanedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cleaned_text',
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'course_name',
  },
  subjectArea: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'subject_area',
  },
  difficultyLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate',
    field: 'difficulty_level',
  },
  mainTopics: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'main_topics',
  },
  subTopics: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'sub_topics',
  },
  learningObjectives: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'learning_objectives',
  },
  keywords: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  processingStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    field: 'processing_status',
  },
  processingError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'processing_error',
  },
  aiProcessedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ai_processed_at',
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public',
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'view_count',
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
  tableName: 'notes',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = Notes;
