# Fullspark - Complete Setup Guide

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Initial Setup](#initial-setup)
3. [Development Environment](#development-environment)
4. [Production Deployment](#production-deployment)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## System Requirements

### Minimum Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS 11+, or Windows 10+ with WSL2
- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher (for frontend)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 2GB for dependencies and runtime
- **Network**: Internet connection for API calls (OpenAI, Bing)

### Required Accounts

- **OpenAI Account**: API key with GPT-4 access
- **Bing Search API** (Optional): For SIFT protocol web search

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/serhiipriadko2-sys/fullspark.git
cd fullspark
```

### 2. Verify Structure

```bash
ls -la
# Should show:
# - IskraCanonDocumentation/
# - IskraFullCode/
# - IskraChatGPT_V15v5_1/
# - IskraSpaceApp_zip_unzipped/
# - ALIGNMENT_REPORT.md
# - README.md
# - .gitignore
```

---

## Development Environment

### Option A: Quick Start (Bash Script)

```bash
cd IskraFullCode/code/iskra_core
./run.sh
```

The script will:
1. Create virtual environment if needed
2. Install dependencies
3. Check for `.env` file
4. Validate `OPENAI_API_KEY`
5. Start the development server

### Option B: Manual Setup

#### Step 1: Backend Setup

```bash
# Navigate to backend
cd IskraFullCode/code/iskra_core

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate     # Windows

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

#### Step 2: Environment Configuration

```bash
# Copy template
cp .env.example .env

# Edit .env file
nano .env  # or your preferred editor
```

Add your API keys:
```env
OPENAI_API_KEY=sk-your-actual-key-here
BING_API_KEY=your-bing-key-here  # Optional
ISKRA_DB_PATH=iskra_archive.db
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

#### Step 3: Run Development Server

```bash
# Option 1: Using uvicorn directly
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Option 2: Using the run script
./run.sh
```

Access the API at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

#### Step 4: Frontend Setup (Optional)

```bash
# In a new terminal
cd IskraFullCode/code

# Install Node dependencies
npm install

# Start development server
npm run dev
```

Access frontend at: http://localhost:3000

---

## Production Deployment

### Docker Deployment (Recommended)

#### Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Deployment Steps

```bash
# Navigate to code directory
cd IskraFullCode/code

# Create production .env
cp iskra_core/.env.example iskra_core/.env
# Edit with production values

# Build and start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f iskra-core

# Stop services
docker-compose down
```

#### Updating Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Manual Production Deployment

#### 1. System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip -y

# Install Nginx (for reverse proxy)
sudo apt install nginx -y
```

#### 2. Application Setup

```bash
# Create app user
sudo useradd -m -s /bin/bash iskra
sudo su - iskra

# Clone repository
git clone https://github.com/serhiipriadko2-sys/fullspark.git
cd fullspark/IskraFullCode/code/iskra_core

# Setup virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
nano .env  # Add production API keys
```

#### 3. Systemd Service

Create `/etc/systemd/system/iskra-core.service`:

```ini
[Unit]
Description=Iskra Core API Service
After=network.target

[Service]
Type=simple
User=iskra
WorkingDirectory=/home/iskra/fullspark/IskraFullCode/code/iskra_core
Environment="PATH=/home/iskra/fullspark/IskraFullCode/code/iskra_core/venv/bin"
ExecStart=/home/iskra/fullspark/IskraFullCode/code/iskra_core/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable iskra-core
sudo systemctl start iskra-core
sudo systemctl status iskra-core
```

#### 4. Nginx Configuration

Create `/etc/nginx/sites-available/iskra-core`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/iskra-core /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

---

## Testing

### Unit Tests

```bash
cd IskraFullCode/code/iskra_core

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=. --cov-report=html

# Run specific test file
pytest tests/test_core_services.py -v

# View coverage report
open htmlcov/index.html  # Mac
xdg-open htmlcov/index.html  # Linux
```

### Integration Tests

```bash
# Start server in test mode
ENVIRONMENT=test python -m uvicorn main:app --port 8001

# Run integration tests
pytest tests/test_api_workflow.py -v
```

### Manual API Testing

```bash
# Test /ask endpoint
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "query": "Привет, Искра!",
    "input_duration_ms": 1000
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. "Missing OPENAI_API_KEY"

**Problem**: API key not set
**Solution**:
```bash
# Check .env file
cat .env | grep OPENAI_API_KEY

# If empty, add your key
echo "OPENAI_API_KEY=sk-your-key-here" >> .env
```

#### 2. "Port 8000 already in use"

**Problem**: Another process using the port
**Solution**:
```bash
# Find process
lsof -ti:8000

# Kill process
lsof -ti:8000 | xargs kill

# Or use different port
PORT=8001 python -m uvicorn main:app
```

#### 3. "Module not found"

**Problem**: Virtual environment not activated or dependencies not installed
**Solution**:
```bash
# Activate venv
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

#### 4. "Database locked"

**Problem**: Multiple processes accessing SQLite
**Solution**:
```bash
# Stop all instances
pkill -f "uvicorn main:app"

# Delete lock file
rm iskra_archive.db-journal

# Restart server
./run.sh
```

#### 5. High memory usage

**Problem**: Memory leak or large session history
**Solution**:
```bash
# Clear old sessions
python -c "from services.persistence import PersistenceService; PersistenceService().cleanup_old_sessions(days=7)"

# Restart service
sudo systemctl restart iskra-core
```

### Debug Mode

Enable detailed logging:

```bash
# In config.py, set:
import logging
logging.basicConfig(level=logging.DEBUG)

# Or via environment
DEBUG=1 python -m uvicorn main:app --reload
```

---

## Best Practices

### Security

1. **Never commit `.env` files**
   ```bash
   # Already in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use strong API keys**
   - Rotate keys regularly
   - Use different keys for dev/prod

3. **Enable HTTPS in production**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

4. **Set up firewall**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

### Performance

1. **Use multiple workers in production**
   ```bash
   uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

2. **Enable caching**
   - Use Redis for session cache
   - Cache LLM responses where appropriate

3. **Monitor resources**
   ```bash
   # Install monitoring
   pip install prometheus-fastapi-instrumentator

   # Add to main.py
   from prometheus_fastapi_instrumentator import Instrumentator
   Instrumentator().instrument(app).expose(app)
   ```

### Maintenance

1. **Regular backups**
   ```bash
   # Backup database
   cp iskra_archive.db iskra_archive.db.backup.$(date +%Y%m%d)

   # Automated backup (crontab)
   0 2 * * * cp /path/to/iskra_archive.db /path/to/backups/iskra_archive.db.$(date +\%Y\%m\%d)
   ```

2. **Log rotation**
   ```bash
   # /etc/logrotate.d/iskra-core
   /var/log/iskra-core/*.log {
       daily
       rotate 7
       compress
       delaycompress
       notifempty
       create 0640 iskra iskra
   }
   ```

3. **Update dependencies**
   ```bash
   # Check for updates
   pip list --outdated

   # Update packages
   pip install --upgrade -r requirements.txt

   # Test after update
   pytest tests/ -v
   ```

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-voice
   ```

2. **Write tests first**
   ```bash
   # tests/test_new_voice.py
   pytest tests/test_new_voice.py -v
   ```

3. **Implement feature**

4. **Run all tests**
   ```bash
   pytest tests/ -v --cov=.
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add new voice feature"
   git push origin feature/new-voice
   ```

---

## Quick Reference

### Useful Commands

```bash
# Start dev server
cd IskraFullCode/code/iskra_core && ./run.sh

# Run tests
pytest tests/ -v

# Check logs
sudo journalctl -u iskra-core -f

# Restart service
sudo systemctl restart iskra-core

# View API docs
open http://localhost:8000/docs

# Check system status
docker-compose ps  # Docker
sudo systemctl status iskra-core  # Systemd
```

### File Locations

- **Backend**: `IskraFullCode/code/iskra_core/`
- **Config**: `IskraFullCode/code/iskra_core/.env`
- **Database**: `IskraFullCode/code/iskra_core/iskra_archive.db`
- **Logs**: `/var/log/iskra-core/` (production)
- **Canon Docs**: `IskraCanonDocumentation/`

---

## Support

- **Documentation**: See README.md and Canon docs
- **Issues**: https://github.com/serhiipriadko2-sys/fullspark/issues
- **Testing**: Run pytest with `-v` flag for details

---

**⟡ Setup complete. Искра готова к работе!**
