# Render.com Deployment Guide for OrderMyPDF

## Prerequisites
- GitHub account with OrderMyPDF repo pushed
- Render.com account (https://render.com)
- Groq API key (from https://console.groq.com)

---

## Step 1: Connect to Render

1. Go to [render.com](https://render.com)
2. Click **New +** → **Web Service**
3. Select **Deploy from a Git repository**
4. Connect your GitHub account if needed
5. Select **asg-01/ordermypdf** repository
6. Choose **main** branch

---

## Step 2: Configure Deployment

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `ordermypdf` |
| **Environment** | `Docker` |
| **Region** | `Oregon (us-west)` |
| **Branch** | `main` |
| **Runtime** | `Docker` |

---

## Step 3: Set Environment Variables

Click **Advanced** → **Add Environment Variable** for each:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `sk-...` (your actual Groq API key) |
| `LLM_MODEL` | `llama-3.3-70b-versatile` |
| `MAX_FILE_SIZE_MB` | `100` |
| `MAX_FILES_PER_REQUEST` | `5` |
| `PYTHONUNBUFFERED` | `1` |

---

## Step 4: Review & Deploy

1. Review all settings
2. Click **Create Web Service**
3. Render will start building (takes 5-10 minutes)
4. Watch the build logs for errors

---

## Expected Build Process

```
• Installing dependencies...
• Installing Ghostscript...
• Installing Python packages...
• Building React frontend...
• Starting FastAPI server...
✓ Live at: https://ordermypdf-xxxxx.onrender.com
```

---

## After Deployment

### ✅ Test the App
```
https://ordermypdf-xxxxx.onrender.com
```

### ⚠️ Important Notes for Free Tier

1. **Cold Starts**: First request after inactivity (~15 mins) takes 30+ seconds to start
2. **No Persistent Storage**: Files are kept for 30 minutes then deleted (by design)
3. **Memory Limits**: 512 MB RAM - large PDFs might struggle
4. **Ghostscript**: Pre-installed in build process

### 🔧 Troubleshooting

**Build fails with "Ghostscript not found":**
- The Dockerfile installs it automatically
- If still fails, check build logs at Dashboard → Logs

**App crashes at startup:**
- Verify `GROQ_API_KEY` is set correctly in environment variables
- Check logs: Dashboard → Logs tab

**Files disappearing:**
- Expected behavior - APScheduler deletes files after 30 minutes
- Re-upload if needed

**Out of memory errors:**
- Reduce `MAX_FILE_SIZE_MB` to 50 in environment variables
- Split large PDFs before uploading

---

## Upgrade Options

Want better performance? Render paid plans:

- **Starter**: $7/month (1 GB RAM, 0.5 CPU, persistent uptime)
- **Standard**: $25/month (2 GB RAM, 1 CPU)

---

## Support

- View logs: Dashboard → Service → Logs tab
- Restart service: Dashboard → Settings → Restart Instance
- Check status: https://render.com/status
