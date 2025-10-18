# Railway Deployment Guide

This guide will help you deploy the CMLens Dashboard to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Git installed on your computer
3. GitHub account (recommended)

## Deployment Steps

### 1. Push Code to GitHub

First, ensure your code is committed and pushed to GitHub:

```bash
# Check git status
git status

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Railway deployment"

# Push to GitHub
git push origin main
```

### 2. Create a New Railway Project

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `cmlens-dashboard` repository
5. Railway will automatically detect the Dockerfile

### 3. Configure Environment Variables

In your Railway project dashboard:

1. Go to the "Variables" tab
2. Add the following environment variables (if needed):

```
FLASK_ENV=production
FLASK_APP=web_backend.py
```

3. **Optional**: Add OpenRouter API key for AI coaching features:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Note**: Railway automatically sets the `PORT` variable - do NOT set it manually.

### 4. Deploy

Railway will automatically:
- Build the Docker container using your Dockerfile
- Build the frontend (Node.js + Vite)
- Install Python dependencies
- Start the Flask backend with Gunicorn
- Expose the application on a public URL

The deployment process takes approximately 5-10 minutes.

### 5. Access Your Application

Once deployed:
1. Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)
2. Click on the URL to access your dashboard
3. Test the `/health` endpoint: `https://your-app.up.railway.app/health`

## Project Structure

```
cmlens-dashboard/
├── Dockerfile              # Multi-stage build (Node + Python)
├── railway.toml           # Railway configuration
├── web_backend.py         # Flask backend (serves frontend + API)
├── script.py              # ETL pipeline logic
├── requirements.txt       # Python dependencies
├── package.json          # Node.js dependencies
├── src/                  # React frontend source
├── dist/                 # Built frontend (created during deployment)
└── .env.example         # Environment variables template
```

## How It Works

### Build Process (Dockerfile)

1. **Stage 1 - Frontend Build**:
   - Uses Node.js 20 to install npm dependencies
   - Runs `npm run build` to create production build
   - Output: `dist/` folder with static files

2. **Stage 2 - Python Runtime**:
   - Uses Python 3.11 slim image
   - Installs Python dependencies from `requirements.txt`
   - Copies Flask backend and built frontend
   - Starts Gunicorn server on dynamic PORT

### Port Configuration

- **Development**:
  - Frontend (Vite): Port 5000
  - Backend (Flask): Port 8080

- **Production (Railway)**:
  - Single service on Railway-assigned PORT
  - Flask serves both API and frontend static files
  - Gunicorn handles production traffic

### Health Check

Railway uses the `/health` endpoint to verify the application is running:
- URL: `https://your-app.up.railway.app/health`
- Response: `{"status": "healthy", "message": "ETL Backend is running"}`

## Troubleshooting

### Build Fails

1. **Check build logs** in Railway dashboard
2. Common issues:
   - Missing dependencies in `requirements.txt` or `package.json`
   - TypeScript errors during `npm run build`
   - Python version mismatch

### Application Won't Start

1. **Check application logs** in Railway dashboard
2. Common issues:
   - Port configuration (Railway sets PORT automatically)
   - Missing environment variables
   - File path issues

### Frontend Not Loading

1. Verify `dist/` folder was created during build
2. Check if `dist/index.html` exists
3. Review Dockerfile build logs for frontend build errors

### API Endpoints Not Working

1. Test `/health` endpoint first
2. Check CORS configuration in `web_backend.py`
3. Verify frontend is making requests to the correct URL

## Important Files

### railway.toml
Configures Railway deployment settings:
- Build using Dockerfile
- Health check path
- Restart policy

### Dockerfile
Multi-stage build:
- Stage 1: Build React frontend
- Stage 2: Python runtime with Flask + built frontend

### web_backend.py
Flask application that:
- Serves static files from `dist/` folder
- Provides API endpoints for ETL processing
- Handles file uploads and data processing

### requirements.txt
Python dependencies:
- Flask 2.3.3
- Flask-CORS 4.0.0
- Pandas 2.0.3
- Gunicorn 21.2.0 (production server)
- Other data processing libraries

## Updating Your Deployment

To deploy updates:

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main
```

Railway will automatically detect the push and redeploy your application.

## Environment Variables Reference

See `.env.example` for a complete list of environment variables.

### Required:
- None (all defaults are set)

### Optional:
- `OPENROUTER_API_KEY` - For AI coaching features
- `FLASK_ENV` - Set to "production" (auto-set by Railway)

### Auto-Set by Railway:
- `PORT` - Dynamic port assignment
- `RAILWAY_ENVIRONMENT` - Environment name
- `RAILWAY_PROJECT_ID` - Project identifier
- `RAILWAY_STATIC_URL` - Your app's public URL

## Support

For issues:
1. Check Railway documentation: https://docs.railway.app
2. Review application logs in Railway dashboard
3. Test locally with Docker: `docker build -t cmlens . && docker run -p 8080:8080 cmlens`

## Security Notes

1. **Never commit** `.env` file to git
2. Use Railway's environment variables for sensitive data
3. Keep `OPENROUTER_API_KEY` in Railway variables, not in code
4. Review CORS settings in production

## Next Steps

After successful deployment:

1. Test all features:
   - File upload
   - ETL processing
   - Data visualization
   - AI coaching (if API key configured)

2. Monitor performance in Railway dashboard

3. Set up custom domain (optional):
   - Go to Settings > Domains in Railway
   - Add your custom domain
   - Update DNS records

4. Configure alerts (optional):
   - Set up Railway notifications
   - Monitor resource usage
   - Track deployment status
