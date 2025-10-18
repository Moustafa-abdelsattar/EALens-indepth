# Stage 1: Build frontend with Node (Debian-based for better compatibility)
FROM node:20-bullseye AS frontend-builder

WORKDIR /app

# Install deps and build
COPY package.json package-lock.json ./
RUN npm ci

# Copy only files needed for the Vite build
COPY src ./src
COPY public ./public
COPY index.html ./index.html
COPY shared ./shared
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY tsconfig.app.json ./

RUN npm run build
RUN test -f dist/index.html || (echo "ERROR: dist/index.html missing after build" && ls -la && exit 1)

# Stage 2: Node.js runtime with Express backend
FROM node:20-bullseye-slim AS runtime

WORKDIR /app

# Install curl for healthcheck and python for backend processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    python3-pip \
 && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy Python requirements and install (for data processing backend)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend source files
COPY server ./server
COPY shared ./shared
COPY web_backend.py ./
COPY script.py ./
COPY drizzle.config.ts ./

# Copy built frontend from the Node stage
COPY --from=frontend-builder /app/dist ./dist
RUN test -f ./dist/index.html || (echo "ERROR: index.html not copied into runtime image" && ls -la ./dist || true && exit 1)

# Create upload directory
RUN mkdir -p /tmp/uploads

EXPOSE 3001

# Use dynamic port from environment (Railway sets PORT)
ENV PORT=3001
ENV NODE_ENV=production

# Healthcheck for Node.js server
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:${PORT:-3001}/ || exit 1

# Create startup script to run both Flask and Node.js
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Save Railway PORT for Node.js (Railway sets this)\n\
RAILWAY_PORT=${PORT:-3001}\n\
\n\
# Flask runs on internal port 8081\n\
FLASK_PORT=8081\n\
\n\
echo "Starting Flask backend on internal port $FLASK_PORT..."\n\
gunicorn --bind 0.0.0.0:$FLASK_PORT web_backend:app --daemon\n\
echo "Flask started on port $FLASK_PORT"\n\
\n\
# Give Flask a moment to start\n\
sleep 2\n\
\n\
echo "Starting Node.js Express server on port $RAILWAY_PORT (exposed to Railway)..."\n\
PORT=$RAILWAY_PORT exec npm run server\n\
' > /app/start.sh && chmod +x /app/start.sh

# Start both servers
CMD ["/bin/bash", "/app/start.sh"]
