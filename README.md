# EduPodcast AI - Notes-to-Podcast Learning Platform

Transform academic notes into intelligent learning resources using AI-powered content generation.

## Features

- **Multi-format Note Upload**: Support for PDF, DOCX, and TXT files
- **AI-Powered Content Generation**:
  - Comprehensive summaries
  - Medium-length summaries
  - Exam revision notes
  - One-minute quick revision
  - 20+ Flashcards with spaced repetition
  - 20+ Multiple choice questions
  - Podcast scripts and audio generation
- **Podcast Generation**: Convert notes to engaging podcast audio
- **Quiz System**: Auto-generated quizzes with score tracking
- **User Management**: Registration, email verification, password reset
- **Admin Dashboard**: User management, analytics, content moderation
- **Email Notifications**: Via Brevo (formerly Sendinblue)

## Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Authentication**: JWT with bcryptjs password hashing
- **File Upload**: Multer
- **AI**: OpenAI API / Gemini API
- **Text-to-Speech**: Google TTS / ElevenLabs API
- **Email**: Brevo SMTP

### Frontend
- React.js
- Tailwind CSS
- Axios for API calls
- React Router DOM for navigation

## Prerequisites

- Node.js 14+ and npm
- PostgreSQL 12+
- OpenAI API key (for ChatGPT-based content generation)
- Brevo API key (for email notifications)
- Optional: ElevenLabs API key (for premium text-to-speech)

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd podcast-AI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Database Setup

#### Create PostgreSQL Database
```bash
createdb edupodcast_db
```

#### Or using pgAdmin:
1. Open pgAdmin
2. Create new database named `edupodcast_db`
3. Create a user with credentials

### 4. Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edupodcast_db
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_very_secret_key_change_in_production
JWT_EXPIRE=7d

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=EduPodcast AI

# Text-to-Speech
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=Rachel

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 5. Database Migration

Run Sequelize to sync models:

```bash
npm run dev
```

The models will auto-sync on server startup (in development mode).

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `POST /verify-email` - Verify email address
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `GET /profile` - Get user profile (requires auth)
- `PUT /profile` - Update user profile (requires auth)

### Notes (`/api/notes`)
- `POST /upload` - Upload notes file (PDF, DOCX, TXT)
- `GET /` - Get user's notes
- `GET /:notesId` - Get specific note details
- `PUT /:notesId` - Update note metadata
- `DELETE /:notesId` - Delete notes

### Podcasts (`/api/podcasts`)
- `POST /generate` - Generate podcast from notes
- `GET /` - Get user's podcasts
- `GET /:podcastId` - Get podcast details
- `GET /:podcastId/download` - Download MP3
- `GET /:podcastId/stream` - Stream audio
- `DELETE /:podcastId` - Delete podcast

### Quizzes (`/api/quizzes`)
- `POST /generate` - Generate quiz from notes
- `GET /` - Get available quizzes
- `GET /:quizId` - Get quiz details
- `POST /:quizId/start` - Start quiz attempt
- `POST /:quizId/submit` - Submit quiz answers
- `GET /:quizId/results` - Get quiz results

### Flashcards (`/api/flashcards`)
- `POST /generate` - Generate flashcards from notes
- `GET /` - Get flashcards
- `GET /:flashcardId` - Get specific flashcard
- `POST /` - Create custom flashcard
- `PUT /:flashcardId` - Update flashcard
- `DELETE /:flashcardId` - Delete flashcard
- `POST /:flashcardId/review` - Record review (for spaced repetition)

### Summaries (`/api/summaries`)
- `GET /` - Get user's summaries
- `GET /:summaryId` - Get specific summary
- `GET /notes/:notesId` - Get all summaries for a note
- `GET /:summaryId/export/:format` - Export summary (pdf, docx, txt)

### Admin (`/api/admin`)
- `GET /users` - List all users
- `GET /users/:userId` - Get user details
- `PUT /users/:userId/status` - Update user status
- `DELETE /users/:userId` - Delete user
- `GET /notes` - List all notes
- `DELETE /notes/:notesId` - Remove flagged notes
- `GET /analytics` - Get platform analytics
- `GET /logs` - Get admin logs

## Project Structure

```
podcast-AI/
├── index.js                 # Main server file
├── package.json
├── .env.example
├── backend/
│   ├── config/
│   │   └── database.js      # Sequelize configuration
│   ├── Models/
│   │   ├── User.js
│   │   ├── Notes.js
│   │   ├── Podcast.js
│   │   ├── Quiz.js
│   │   ├── Flashcard.js
│   │   ├── Summary.js
│   │   ├── Notification.js
│   │   ├── AdminLog.js
│   │   └── index.js         # Model associations
│   ├── Routes/
│   │   ├── userRoutes.js
│   │   ├── notesRoutes.js
│   │   ├── podcastRoutes.js
│   │   ├── quizRoutes.js
│   │   ├── flashcardRoutes.js
│   │   ├── summaryRoutes.js
│   │   └── adminRoutes.js
│   ├── Controllers/         # (Ready for business logic)
│   └── utils/
│       ├── textExtractor.js # PDF/DOCX/TXT extraction
│       ├── aiProcessor.js   # OpenAI integration
│       ├── audioGenerator.js # Text-to-speech
│       └── emailService.js  # Brevo email service
└── uploads/                 # User uploaded files

```

## Future Features

- [ ] Background job queue (Bull) for async processing
- [ ] Caching layer (Redis)
- [ ] WebSocket support for real-time progress
- [ ] Gemini API integration
- [ ] AWS S3 for file storage
- [ ] Advanced analytics dashboard
- [ ] Social sharing features
- [ ] Collaborative features
- [ ] web app (React vite latest version )

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Submit a pull request

## License

MIT License

## Support

For support, email support@edupodcast.ai or open an issue on GitHub.

## Roadmap

- **Phase 1** (Current): Core features and MVP
- **Phase 2**: Performance optimization and scaling
- **Phase 3**: Advanced AI features and integrations
- **Phase 4**: Mobile applications
- **Phase 5**: Enterprise features

## API Documentation

Full API documentation available at: `/api/docs` (Swagger UI - to be implemented)

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `createdb edupodcast_db`

### File Upload Issues
- Check upload directory permissions
- Verify `MAX_FILE_SIZE` in `.env`
- Ensure disk space is available

### AI Processing Issues
- Verify OpenAI API key is valid
- Check rate limits on OpenAI account
- Review server logs for specific errors

### Email Issues
- Verify Brevo API credentials
- Check sender email is verified in Brevo
- Review email logs in Brevo dashboard
