# IskraSpaceApp - Production Deployment Guide

<div align="center">

**🚀 Production-Ready Deployment Guide**

*Complete guide for deploying Iskra Space App to production*

</div>

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Nginx Configuration](#nginx-configuration)
6. [Systemd Service](#systemd-service)
7. [SSL/HTTPS Setup](#ssl-https-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Performance Optimization](#performance-optimization)
10. [Security Checklist](#security-checklist)
11. [Troubleshooting](#troubleshooting)

---

## Overview

IskraSpaceApp is a **client-side only** application that can be deployed as:
- Static files served by nginx
- Docker container with nginx
- Node.js preview server (development/staging)

**Important**: GEMINI_API_KEY is stored client-side in `.env.local` (browser localStorage), not on the server.

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows Server
- **CPU**: 2+ cores
- **RAM**: 2GB minimum, 4GB recommended
- **Disk**: 1GB for application + dependencies
- **Network**: Internet access for Gemini API

### Software Requirements

**Option 1: Docker (Recommended)**
- Docker 20.10+
- Docker Compose 1.29+

**Option 2: Manual**
- Node.js 18+
- npm 9+
- nginx 1.18+ (optional, for static serving)

---

## Docker Deployment

### Quick Start

```bash
# 1. Clone repository
cd IskraSpaceApp_zip_unzipped/IskraSpaceApp

# 2. Build and deploy
./deploy.sh

# 3. Access application
# → http://localhost:5173
```

### Using Docker Compose

**Production:**
```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Development:**
```bash
# Use development compose
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Access at http://localhost:5173
```

### Manual Docker Commands

```bash
# Build image
docker build -t iskra-space-app:3.0.0 .

# Run container
docker run -d \
  --name iskra-space-app \
  -p 5173:80 \
  --restart unless-stopped \
  iskra-space-app:3.0.0

# Check health
docker inspect --format='{{.State.Health.Status}}' iskra-space-app

# View logs
docker logs -f iskra-space-app

# Stop and remove
docker stop iskra-space-app && docker rm iskra-space-app
```

---

## Manual Deployment

### Build for Production

```bash
# 1. Install dependencies
npm ci --only=production

# 2. Build application
npm run build:prod

# 3. Test production build locally
npm run preview:prod
```

Build output: `dist/` directory

### Static File Deployment

**Deploy to any static host:**

```bash
# Copy dist folder to server
scp -r dist/* user@server:/var/www/iskra-space-app/

# Or use rsync
rsync -avz --delete dist/ user@server:/var/www/iskra-space-app/
```

**Supported platforms:**
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Google Cloud Storage
- Azure Static Web Apps

---

## Nginx Configuration

### Basic Configuration

File: `/etc/nginx/sites-available/iskra-space-app`

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/iskra-space-app;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Canon files
    location /canon/ {
        try_files $uri $uri/ =404;
    }

    # Health check
    location /health {
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Enable Site

```bash
# Link configuration
sudo ln -s /etc/nginx/sites-available/iskra-space-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Systemd Service

For running with Node.js preview server:

### Setup

```bash
# 1. Copy service file
sudo cp iskra-space-app.service /etc/systemd/system/

# 2. Create app directory
sudo mkdir -p /var/www/iskra-space-app
sudo cp -r dist/* /var/www/iskra-space-app/

# 3. Set permissions
sudo chown -R www-data:www-data /var/www/iskra-space-app

# 4. Reload systemd
sudo systemctl daemon-reload

# 5. Enable service
sudo systemctl enable iskra-space-app

# 6. Start service
sudo systemctl start iskra-space-app

# 7. Check status
sudo systemctl status iskra-space-app
```

### Service Commands

```bash
# Start
sudo systemctl start iskra-space-app

# Stop
sudo systemctl stop iskra-space-app

# Restart
sudo systemctl restart iskra-space-app

# Status
sudo systemctl status iskra-space-app

# Logs
sudo journalctl -u iskra-space-app -f
```

---

## SSL/HTTPS Setup

### Let's Encrypt (Certbot)

```bash
# 1. Install certbot
sudo apt install certbot python3-certbot-nginx

# 2. Obtain certificate
sudo certbot --nginx -d your-domain.com

# 3. Auto-renewal (automatic)
sudo systemctl status certbot.timer
```

### Manual SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of configuration
}

# HTTP redirect
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:5173/health
# Expected: "healthy"
```

### Docker Logs

```bash
# View logs
docker logs iskra-space-app

# Follow logs
docker logs -f iskra-space-app

# Last 100 lines
docker logs iskra-space-app --tail 100
```

### Nginx Logs

```bash
# Access log
tail -f /var/log/nginx/access.log

# Error log
tail -f /var/log/nginx/error.log
```

### Application Monitoring

**Recommended tools:**
- **Uptime**: UptimeRobot, Pingdom
- **Analytics**: Google Analytics, Plausible
- **Error Tracking**: Sentry (client-side)
- **Performance**: Lighthouse CI

---

## Performance Optimization

### Build Optimizations

✅ **Already configured in production build:**
- Code splitting (vendor chunks)
- Tree shaking
- Minification (Terser)
- Console.log removal
- Gzip compression

### Nginx Optimizations

```nginx
# In nginx.conf or site config

# Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript;

# Caching
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;

# Buffers
client_body_buffer_size 10K;
client_header_buffer_size 1k;
client_max_body_size 8m;
large_client_header_buffers 4 16k;
```

### Browser Caching

✅ **Already configured:**
- Static assets: 1 year cache
- HTML: no cache
- Canon files: 1 hour cache

---

## Security Checklist

### ✅ Application Security

- [x] API keys client-side only (localStorage)
- [x] No server-side secrets
- [x] CSP headers configured
- [x] X-Frame-Options set
- [x] X-Content-Type-Options set
- [x] HTTPS enforced (production)
- [x] Non-root user in Docker
- [x] Security headers in nginx

### ⚠️ Additional Recommendations

```nginx
# Add to nginx config

# Security headers
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=iskra:10m rate=10r/s;
limit_req zone=iskra burst=20 nodelay;
```

### Firewall Setup

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs iskra-space-app

# Inspect container
docker inspect iskra-space-app

# Check if port is in use
lsof -i :5173
```

### Build Fails

```bash
# Clear cache and rebuild
npm run clean
npm install
npm run build:prod
```

### Nginx Errors

```bash
# Test config
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### Health Check Fails

```bash
# Check if app is running
curl http://localhost:5173/

# Check nginx status
sudo systemctl status nginx

# Check Docker health
docker inspect --format='{{.State.Health.Status}}' iskra-space-app
```

### API Connection Issues

**Client-side (browser console):**
```javascript
// Check if API key is set
console.log(localStorage.getItem('GEMINI_API_KEY') ? 'Key set' : 'Key missing');
```

**Network:**
- Verify DNS resolution
- Check firewall rules
- Ensure CORS allows Gemini API domain

---

## Update Procedure

### Docker Deployment

```bash
# 1. Pull latest code
git pull

# 2. Redeploy
./deploy.sh latest

# 3. Verify
curl http://localhost:5173/health
```

### Manual Deployment

```bash
# 1. Pull latest
git pull

# 2. Rebuild
npm run build:prod

# 3. Deploy files
rsync -avz --delete dist/ /var/www/iskra-space-app/

# 4. Restart service (if using systemd)
sudo systemctl restart iskra-space-app
```

---

## Backup & Recovery

### What to Backup

1. **Configuration**: `.env.local` (if customized)
2. **Canon files**: `/canon/` directory
3. **Build**: `dist/` (optional, can rebuild)

### Backup Script

```bash
#!/bin/bash
BACKUP_DIR="/backups/iskra-space-app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/iskra-$DATE.tar.gz \
  .env.local \
  canon/ \
  package.json \
  docker-compose.yml

echo "Backup created: $BACKUP_DIR/iskra-$DATE.tar.gz"
```

---

## Performance Metrics

### Expected Performance

- **Build size**: ~2MB (gzipped: ~600KB)
- **First contentful paint**: <1.5s
- **Time to interactive**: <3s
- **Lighthouse score**: 90+

### Monitoring Metrics

```bash
# Check bundle size
npm run build:prod
du -sh dist/

# Analyze build
npx vite-bundle-visualizer
```

---

## Support & Resources

- **Documentation**: See [README.md](./README.md)
- **Issues**: https://github.com/serhiipriadko2-sys/fullspark/issues
- **Canon Docs**: `./canon/` directory
- **AI Studio**: https://ai.studio/apps/drive/1wWoN5Ppf-PwoQ_A2Zko6dqkNGj7wvBzx

---

<div align="center">

**🌌 IskraSpaceApp Production Ready**

*Deployed with ⟡ by Fullspark Team*

</div>
