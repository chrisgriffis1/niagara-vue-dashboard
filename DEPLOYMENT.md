# Deployment Guide - Niagara Vue Dashboard

## Quick Deploy (Recommended)

**One command to build and package everything:**

```bash
npm run build:niagara
```

This will:
1. ✅ Build the Vue app (`npm run build`)
2. ✅ Package into Niagara module structure
3. ✅ Create `niagara-dashboard-deploy.zip` file

**Then:**
1. Extract the zip file
2. Copy the `file/web1/` folder contents to your Niagara station's `/file/web1/` directory
3. Access: `http://your-station-ip:port/file/web1/index.html`

## What Gets Built

The build creates a single zip file containing:
```
niagara-dashboard-deploy.zip
└── file/
    └── web1/
        ├── index.html          (main entry point)
        ├── assets/             (all JS/CSS bundles)
        └── mock-data/          (fallback data)
```

**Total files:** ~10-15 files (not a million!)
- `index.html` - 1 file
- `assets/*.js` - 2-3 bundled JS files
- `assets/*.css` - 1 bundled CSS file
- `mock-data/*.json` - 3 JSON files

## Deployment Options

### Option 1: File Service (Easiest)
1. Build: `npm run build:niagara`
2. Extract zip
3. Use Workbench File Service or FTP to copy `file/web1/*` to station
4. Done!

### Option 2: Manual Copy
1. Build: `npm run build:niagara`
2. Extract zip
3. Copy files manually via Workbench File Service
4. Done!

### Option 3: Niagara Module (Advanced)
If you want a proper Niagara module (JAR file), you'd need:
- Grunt/Niagara build tools
- Java module structure
- Module manifest

**For now, the zip file approach is simplest and works perfectly.**

## File Count

**Before build:** ~100+ source files  
**After build:** ~10-15 files (bundled and optimized)

Vite bundles everything into:
- 1 HTML file
- 2-3 JavaScript bundles (minified)
- 1 CSS bundle (minified)
- 3 JSON data files

## Build Output

```
niagara-module/
├── README.txt
└── file/
    └── web1/
        ├── index.html
        ├── assets/
        │   ├── index-[hash].js
        │   ├── index-[hash].css
        │   └── ...
        └── mock-data/
            └── ...
```

## Troubleshooting

### Build fails
- Make sure `node_modules` is installed: `npm install`
- Check Node.js version (18+)

### Zip file not created
- Windows: Uses PowerShell (should work automatically)
- Mac/Linux: Needs `zip` command installed
- Files are still in `niagara-module/` folder

### Files too large
- Vite minifies everything automatically
- Typical size: 500KB - 2MB total
- Much smaller than source files

## Next Steps After Deployment

1. ✅ Build: `npm run build:niagara`
2. ✅ Deploy zip contents to station
3. ✅ Test: Open `http://station-ip:port/file/web1/index.html`
4. ✅ Verify: Check console for "Niagara Station" detection
5. ✅ Done!

## Notes

- **No JAR file needed** - Static files work perfectly
- **No Grunt required** - Vite handles bundling
- **Auto-detection** - App knows if it's in Niagara or dev
- **Single zip file** - Easy to deploy and version control

