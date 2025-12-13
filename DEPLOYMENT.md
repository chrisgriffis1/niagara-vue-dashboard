# Niagara Navigator Deployment Guide

## 📦 Deployment Options

### Option 1: Standalone HTML (Simplest)
**Perfect for:** Quick demos, email sharing, testing

```bash
# 1. Build it
npm run build:standalone

# 2. Share the file
# Send: niagara-navigator-standalone.html
# Size: ~550KB
```

**To use:**
- Double-click the HTML file
- Opens in default browser
- No installation needed!

---

### Option 2: Docker Container (Recommended for Production)
**Perfect for:** Servers, consistent deployment, team use

#### Quick Start:
```bash
# 1. Build the container
docker build -t niagara-navigator .

# 2. Run it
docker run -d -p 8080:80 --name niagara-nav niagara-navigator

# 3. Open in browser
# Go to: http://localhost:8080
```

#### Using Docker Compose:
```bash
# Start
docker-compose up -d

# Stop
docker-compose down

# View logs
docker-compose logs -f
```

#### Deploy to Production Server:
```bash
# On your machine - save image
docker save niagara-navigator > niagara-navigator.tar

# Copy to server
scp niagara-navigator.tar user@server:/tmp/

# On server - load and run
docker load < /tmp/niagara-navigator.tar
docker run -d -p 80:80 --restart always niagara-navigator
```

---

### Option 3: Progressive Web App (PWA)
**Perfect for:** Mobile users, offline access

**Already built in!** Users can:
1. Open your hosted site in Chrome/Edge
2. Click browser menu → "Install Niagara Navigator"
3. App installs like native app
4. Works offline after first visit

---

### Option 4: Electron Desktop App
**Perfect for:** Desktop-only users, native look

```bash
# Install Electron packager
npm install --save-dev electron electron-builder

# Build
npm run build:electron

# Creates:
# - niagara-navigator-Setup.exe (Windows)
# - niagara-navigator.dmg (Mac)
# - niagara-navigator.AppImage (Linux)
```

---

## 🎯 Which Should I Use?

| Use Case | Best Option | Why |
|----------|------------|-----|
| **Demo to client** | Standalone HTML | Email one file, done |
| **Deploy to server** | Docker | Consistent, easy updates |
| **Mobile technicians** | PWA | Install from web, works offline |
| **Desktop app feel** | Electron | Looks native, taskbar icon |
| **Testing locally** | `npm run dev` | Hot reload, debugging |

---

## 📊 Comparison Table

| Feature | Standalone HTML | Docker | PWA | Electron |
|---------|----------------|--------|-----|----------|
| **File Size** | 550KB | 200MB | 550KB | 150MB |
| **Installation** | None | Docker only | Browser | Full install |
| **Updates** | Re-send file | Pull image | Auto | Auto-update |
| **Offline** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Native Feel** | ❌ No | ❌ No | ⚠️ Partial | ✅ Yes |
| **Cross-platform** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Build per OS |

---

## 🚀 Quick Commands

```bash
# Development
npm run dev                  # Start dev server

# Build for deployment
npm run build               # Standard build
npm run build:standalone    # Single HTML file
npm run build:niagara       # Niagara station package

# Docker
docker build -t niagara-navigator .
docker-compose up -d

# Test builds
npm run preview             # Preview production build
```

---

## 🔧 Configuration

### Environment Variables (Docker)
```yaml
environment:
  - VITE_API_URL=https://your-niagara-station
  - VITE_STATION_NAME=Building A
```

### Persistent Storage (Docker)
```bash
docker run -d \
  -p 8080:80 \
  -v $(pwd)/config:/app/config \
  niagara-navigator
```

---

## 📱 For Mobile Users

The PWA is perfect! After first visit:
- ✅ Works offline
- ✅ Home screen icon
- ✅ Full screen mode
- ✅ Auto updates

Install banner appears automatically on:
- Chrome (Android, Desktop)
- Edge (Windows, Android)
- Safari (iOS 16.4+)

---

## 🔐 Security Notes

**Standalone HTML:**
- Runs in browser sandbox
- No server-side code
- Same-origin policy applies

**Docker:**
- Isolated container
- Configure firewall rules
- Use HTTPS in production

**PWA:**
- HTTPS required (except localhost)
- Service worker for offline
- Same browser security

---

## ❓ Troubleshooting

**"Docker not found"**
```bash
# Install Docker Desktop
# Windows/Mac: https://docker.com/get-started
# Linux: sudo apt install docker.io
```

**"Port 8080 already in use"**
```bash
# Use different port
docker run -p 3000:80 niagara-navigator
```

**"Standalone HTML doesn't open"**
- Right-click → Open With → Chrome/Firefox/Edge
- Or rename to .htm extension

---

## 📚 Next Steps

1. **For demos**: Use `niagara-navigator-standalone.html`
2. **For production**: Use Docker + reverse proxy
3. **For mobile**: Enable PWA install
4. **For desktop**: Build Electron app

Need help? Check the main README.md or open an issue!

