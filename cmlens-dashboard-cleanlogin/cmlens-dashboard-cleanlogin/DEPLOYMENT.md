# 🚀 Railway Deployment Guide for CM-Lens

This guide explains how to deploy the CM-Lens application to Railway.

## 📋 Prerequisites

- GitHub repository with the CM-Lens code
- Railway account (free tier available)
- Python 3.11+ (configured in runtime.txt)

## 🚀 Deployment Steps

### 1. Prepare Your Repository

Ensure your repository contains these files:
- `web_backend.py` - Main Flask application
- `script.py` - ETL processing logic
- `requirements.txt` - Python dependencies
- `railway.toml` - Railway configuration
- `nixpacks.toml` - Build configuration
- `Procfile` - Process configuration
- `runtime.txt` - Python version specification

### 2. Deploy to Railway

1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your CM-Lens repository

2. **Configure Environment Variables** (Optional)
   ```
   OPENROUTER_API_KEY=your_api_key_here  # For AI features
   FLASK_ENV=production
   ```

3. **Deploy**
   - Railway will automatically detect the configuration
   - The build process will install Python dependencies
   - The app will start using the configured startup command

### 3. Verify Deployment

After deployment, Railway will provide a public URL. Test these endpoints:

- **Health Check**: `https://your-app.up.railway.app/health`
- **Main API**: `https://your-app.up.railway.app/process-agent-data`

## 🔧 Configuration Files

### railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "python web_backend.py"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[env]
FLASK_ENV = "production"
FLASK_APP = "web_backend.py"
PORT = "8080"

[build.env]
PYTHON_VERSION = "3.11"
NIXPACKS_PYTHON_VERSION = "3.11"
```

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ['python311', 'pip']

[phases.install]
cmds = ['pip install -r requirements.txt']

[phases.build]
cmds = ['echo "Python Flask backend ready"']

[start]
cmd = 'python web_backend.py'
```

### Procfile
```
web: python web_backend.py
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check `requirements.txt` for duplicate dependencies
   - Ensure Python version matches `runtime.txt`
   - Verify all required files are in the repository

2. **Runtime Errors**
   - Check Railway logs for specific error messages
   - Ensure health check endpoint `/health` is accessible
   - Verify environment variables are set correctly

3. **File Upload Issues**
   - Check file size limits (16MB max)
   - Ensure proper CORS configuration
   - Verify multipart form data handling

### Health Check

The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "healthy",
  "message": "ETL Backend is running",
  "port": "8080",
  "upload_dir": "/tmp/uploads"
}
```

## 📊 Monitoring

Railway provides built-in monitoring:
- **Logs**: View real-time application logs
- **Metrics**: CPU, memory, and network usage
- **Health Checks**: Automatic health monitoring
- **Restart Policy**: Automatic restart on failure

## 🔄 Updates

To update your deployment:
1. Push changes to your GitHub repository
2. Railway will automatically rebuild and redeploy
3. Monitor the deployment logs for any issues

## 💡 Tips

- Use Railway's environment variables for sensitive data
- Monitor logs during initial deployment
- Test the health check endpoint after deployment
- Keep dependencies up to date in `requirements.txt`
