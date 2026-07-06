const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Podcast = sequelize.define('Podcast', {
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
  title:       { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT,   allowNull: true  },
  scriptContent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'script_content',
  },
  audioFilePath: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'audio_file_path',
  },
  audioUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'audio_url',
  },
  audioFileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'audio_file_size',
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  voiceType: {
    type: DataTypes.ENUM('google_tts', 'elevenlabs', 'custom'),
    defaultValue: 'google_tts',
    field: 'voice_type',
  },
  voiceSettings: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'voice_settings',
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en',
  },
  generationStatus: {
    type: DataTypes.ENUM('pending', 'script_generated', 'audio_processing', 'completed', 'failed'),
    defaultValue: 'pending',
    field: 'generation_status',
  },
  generationError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'generation_error',
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'generated_at',
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count',
  },
  streamCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stream_count',
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_public',
  },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  tableName: 'podcasts',
  schema: 'public',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true,
});

module.exports = Podcast;
