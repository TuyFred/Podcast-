# ================================================================
#  VoiceAI Backend — Dockerfile (for Render / any Docker host)
# ================================================================
FROM node:20-alpine

# Install native build tools (needed for pdf-parse, bcryptjs, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# ── Install dependencies ──────────────────────────────────────
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# ── Copy application code ─────────────────────────────────────
COPY backend/ ./backend/

# ── Create uploads directory (temp storage for audio/files) ──
RUN mkdir -p backend/uploads

# ── Expose port (Render injects $PORT automatically) ─────────
EXPOSE 5000

# ── Health check ──────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const h=require('http');h.get('http://localhost:'+(process.env.PORT||5000)+'/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# ── Start server ──────────────────────────────────────────────
CMD ["node", "backend/index.js"]
