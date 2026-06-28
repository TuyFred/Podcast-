# EduPodcast AI - Complete Setup Guide

This guide will help you set up the EduPodcast AI platform from scratch.

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version` and `npm --version`

2. **PostgreSQL** (v12 or higher)
   - Download from: https://www.postgresql.org/download/
   - Ensure PostgreSQL service is running

3. **Git** (optional, for cloning)
   - Download from: https://git-scm.com/

4. **API Keys** (you'll need these later):
   - OpenAI API Key: https://platform.openai.com/api-keys
   - Brevo API Key: https://brevo.com/
   - ElevenLabs API Key (optional): https://elevenlabs.io/

## Step 1: Clone/Download the Project

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd podcast-AI
```

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# Verify installation
npm list | head -20
```

## Step 3: Set Up PostgreSQL Database

### Option A: Using Command Line

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE edupodcast_db;

# Create user (optional - if not using default postgres user)
CREATE USER edupodcast_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE edupodcast_db TO edupodcast_user;

# Exit psql
\q
```

### Option B: Using pgAdmin GUI

1. Open pgAdmin
2. Connect to local server
3. Right-click "Databases" → Create → Database
4. Name: `edupodcast_db`
5. Click Save

### Verify Database Creation

```bash
# Connect to the new database
psql -U postgres -d edupodcast_db

# List tables (should be empty initially)
\dt

# Exit
\q
```

## Step 4: Configure Environment Variables

### Copy the Example File

```bash
# From project root
cp .env.example .env
```

### Edit `.env` File

Open `.env` in your text editor and update:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edupodcast_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Secret (Generate a strong one)
JWT_SECRET=your_very_long_random_secret_key_here_change_in_production
JWT_EXPIRE=7d

# OpenAI Configuration
OPENAI_API_KEY=sk-your_actual_openai_key

# Email Configuration (Brevo)
BREVO_API_KEY=your_actual_brevo_api_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=EduPodcast AI

# ElevenLabs (Optional)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=Rachel

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=50000000
UPLOAD_DIR=./uploads

# Admin Credentials
ADMIN_EMAIL=admin@edupodcast.com
ADMIN_PASSWORD=your_secure_admin_password
```

### Generate JWT Secret

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and paste it in JWT_SECRET
```

## Step 5: Set Up Database Tables

### Option A: Automatic (On Server Start)

```bash
# Start the server - it will auto-sync tables in development
npm run dev
```

### Option B: Manual Migration

```bash
# Run migration script
npm run migrate
```

## Step 6: Obtain API Keys

### OpenAI API Key

1. Go to: https://platform.openai.com/
2. Click "Sign up" or "Log in"
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into `.env`

**Cost Estimation:**
- GPT-3.5-turbo: ~$0.0005 per 1K tokens
- For a typical document: 2-5 API calls = $0.01-0.05

### Brevo (Email Service)

1. Go to: https://brevo.com/
2. Sign up for free account
3. Navigate to Settings → SMTP & API
4. Copy your API v3 key
5. Verify your sender email address
6. Add API key to `.env`

### ElevenLabs (Optional, for Premium Voice)

1. Go to: https://elevenlabs.io/
2. Sign up for account
3. Copy your API key
4. Choose a voice ID (e.g., "Rachel")
5. Add to `.env`

## Step 7: Start the Development Server

```bash
# From project root
npm run dev

# You should see:
# ✓ Database connection successful
# ✓ Database models synchronized
# ✓ Server running on port 5000
```

### Verify Server is Running

```bash
# In another terminal, test the health endpoint
curl http://localhost:3000/api/health

# Should return:
# {"status":"OK","message":"EduPodcast AI server is running"}
```

## Step 8: Test the API

### Test Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

## Step 9: Set Up Frontend (Optional)

### Create React App

```bash
# Create frontend app in same directory
npx create-react-app frontend

# Navigate to frontend
cd frontend

# Install dependencies
npm install axios react-router-dom tailwindcss

# Start frontend
npm start
```

The frontend will run on `http://localhost:3000`

## Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows: Services → PostgreSQL
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Test connection
psql -U postgres -d edupodcast_db -c "SELECT 1"
```

### Issue: "Port 5000 already in use"

**Solution:**
```bash
# Change PORT in .env to different port (e.g., 5001)
PORT=5001

# Or kill process using port 5000
# Windows: netstat -ano | findstr :5000
# Mac/Linux: lsof -i :5000 | kill
```

### Issue: "OpenAI API Key invalid"

**Solution:**
- Go to https://platform.openai.com/account/api-keys
- Verify your key is valid and not expired
- Check your account has credits
- Try regenerating the key

### Issue: "Email verification not working"

**Solution:**
- Verify Brevo API key is correct
- Check sender email is verified in Brevo
- Review error logs: `console` in terminal

### Issue: "Upload directory permission denied"

**Solution:**
```bash
# Create upload directory
mkdir uploads

# Grant permissions (Linux/Mac)
chmod 755 uploads
```

## Database Backup & Restore

### Backup Database

```bash
# Create backup
pg_dump -U postgres edupodcast_db > backup.sql

# Compressed backup
pg_dump -U postgres edupodcast_db | gzip > backup.sql.gz
```

### Restore Database

```bash
# Restore from backup
psql -U postgres edupodcast_db < backup.sql

# Or from compressed backup
gunzip -c backup.sql.gz | psql -U postgres edupodcast_db
```

## Performance Optimization

### Enable Query Logging

```env
# In .env
NODE_ENV=development
```

### Add Database Indexes

Tables are automatically indexed on:
- User.email
- Notes.userId
- Podcast.notesId
- Quiz.notesId

### Monitoring

```bash
# Monitor server
npm run dev

# Watch for slow queries in output
```

## Security Best Practices

1. **Change JWT Secret**: Generate a new strong secret key
2. **Update Admin Password**: Change default admin credentials
3. **Enable HTTPS**: In production, use SSL/TLS
4. **Environment Variables**: Never commit `.env` to git
5. **Rate Limiting**: Already configured, adjust if needed
6. **CORS**: Configure allowed origins in production

## Production Deployment

### Environment Setup

```env
NODE_ENV=production
JWT_SECRET=<generate-new-strong-secret>
PORT=443
```

### Database

- Use managed PostgreSQL service (AWS RDS, DigitalOcean, etc.)
- Enable automatic backups
- Use strong passwords
- Enable SSL connections

### Hosting Options

1. **Heroku**: `git push heroku main`
2. **AWS**: Elastic Beanstalk or EC2
3. **DigitalOcean**: App Platform or Droplet
4. **Azure**: App Service
5. **Google Cloud**: App Engine

## Next Steps

1. ✓ Install dependencies
2. ✓ Set up database
3. ✓ Configure API keys
4. ✓ Start server
5. → Build frontend (optional)
6. → Deploy to production
7. → Set up monitoring

## Support

- Issues: GitHub Issues
- Docs: README.md
- Email: support@edupodcast.ai

## Useful Commands

```bash
# Start development server
npm run dev

# Run production server
npm start

# Run database migrations
npm run migrate

# Run tests (to be implemented)
npm test

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

Good luck! 🚀
