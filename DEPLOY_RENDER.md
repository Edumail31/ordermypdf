# OrderMyPDF - Deployment Guide for Render.com

## Prerequisites
1. GitHub account with your OrderMyPDF repo pushed
2. Render.com account (free tier available)
3. Groq API key (from https://console.groq.com)

## Deployment Steps

### 1. Push Your Code to GitHub
```bash
git init
git add .
git commit -m "Initial commit: OrderMyPDF MVP"
git remote add origin https://github.com/YOUR_USERNAME/ordermypdf.git
git push -u origin main
```

### 2. Create a Render Account
- Go to https://render.com
- Sign up with GitHub (easier for deployments)

### 3. Deploy Backend Service
- Click "New +" → "Web Service"
- Connect your GitHub repo
- Fill in:
  - **Name**: `ordermypdf-backend`
  - **Runtime**: Python 3.13
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - **Plan**: Free (or paid for better performance)

### 4. Add Environment Variables
In Render dashboard, add these env vars to your backend service:
- `GROQ_API_KEY`: Your Groq API key (from https://console.groq.com)
- `LLM_MODEL`: `llama-3.3-70b-versatile`
- `MAX_FILES_PER_REQUEST`: `5`
- `MAX_FILE_SIZE_MB`: `100`

### 5. Deploy Frontend Service
- Click "New +" → "Static Site"
- Connect your GitHub repo
- Fill in:
  - **Name**: `ordermypdf-frontend`
  - **Build Command**: `cd frontend && npm install && npm run build`
  - **Publish Directory**: `frontend/dist`

### 6. Update Frontend API URL
In Render dashboard for frontend, add environment variable:
- `VITE_API_URL`: The URL of your backend service (e.g., `https://ordermypdf-backend.onrender.com`)

### 7. Update vite.config.js for Production
The frontend now reads the API URL from the environment variable. Make sure it's set during build time.

## Important Notes

### Ghostscript Dependency
The free Render tier might not have Ghostscript pre-installed. You have two options:

**Option A: Add a build script** (Recommended for free tier)
Create `build.sh` in your root:
```bash
#!/bin/bash
apt-get update
apt-get install -y ghostscript
pip install -r requirements.txt
```

Then in Render, set:
- **Build Command**: `./build.sh`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Option B: Use a paid tier** (Easier)
Upgrade to at least a basic plan that allows more customization.

### File Storage
- Output files are kept for 30 minutes before auto-deletion
- Free Render tier has limited disk space (~500MB)
- Consider the implications: if users download large processed PDFs frequently, you may need a paid plan

### Alternative: Use Docker
If Ghostscript is problematic, use Docker on Render:

Create `Dockerfile`:
```dockerfile
FROM python:3.13
RUN apt-get update && apt-get install -y ghostscript
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Then deploy as Docker service on Render.

## Troubleshooting

**500 Error on /process?**
- Check backend logs in Render dashboard
- Verify Groq API key is set
- Ensure Ghostscript is installed

**Frontend can't connect to backend?**
- Check VITE_API_URL is correct
- Verify CORS is enabled (already done in your code)

**File cleanup not working?**
- The APScheduler might not persist across restarts on free tier
- Consider implementing cleanup via Render cron jobs (paid feature)

## Next Steps
1. Test locally with `npm run dev` and `uvicorn app.main:app --reload`
2. Push to GitHub
3. Deploy both services to Render
4. Share your Render URL with users!

Good luck! 🚀
