const User = require('./User');
const Notes = require('./Notes');
const Podcast = require('./Podcast');
const Summary = require('./Summary');
const Flashcard = require('./Flashcard');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Notification = require('./Notification');
const AdminLog = require('./AdminLog');
const { sequelize } = require('../config/database');

// Define associations
User.hasMany(Notes, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notes.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Podcast, { foreignKey: 'userId', onDelete: 'CASCADE' });
Podcast.belongsTo(User, { foreignKey: 'userId' });
Podcast.belongsTo(Notes, { foreignKey: 'notesId', onDelete: 'CASCADE' });
Notes.hasMany(Podcast, { foreignKey: 'notesId', onDelete: 'CASCADE' });

User.hasMany(Summary, { foreignKey: 'userId', onDelete: 'CASCADE' });
Summary.belongsTo(User, { foreignKey: 'userId' });
Summary.belongsTo(Notes, { foreignKey: 'notesId', onDelete: 'CASCADE' });
Notes.hasMany(Summary, { foreignKey: 'notesId', onDelete: 'CASCADE' });

User.hasMany(Flashcard, { foreignKey: 'userId', onDelete: 'CASCADE' });
Flashcard.belongsTo(User, { foreignKey: 'userId' });
Flashcard.belongsTo(Notes, { foreignKey: 'notesId', onDelete: 'CASCADE' });
Notes.hasMany(Flashcard, { foreignKey: 'notesId', onDelete: 'CASCADE' });

User.hasMany(Quiz, { foreignKey: 'userId', onDelete: 'CASCADE' });
Quiz.belongsTo(User, { foreignKey: 'userId' });
Quiz.belongsTo(Notes, { foreignKey: 'notesId', onDelete: 'CASCADE' });
Notes.hasMany(Quiz, { foreignKey: 'notesId', onDelete: 'CASCADE' });

User.hasMany(QuizAttempt, { foreignKey: 'userId', onDelete: 'CASCADE' });
QuizAttempt.belongsTo(User, { foreignKey: 'userId' });
Quiz.hasMany(QuizAttempt, { foreignKey: 'quizId', onDelete: 'CASCADE' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });

module.exports = {
  User,
  Notes,
  Podcast,
  Summary,
  Flashcard,
  Quiz,
  QuizAttempt,
  Notification,
  AdminLog,
  sequelize,
};
