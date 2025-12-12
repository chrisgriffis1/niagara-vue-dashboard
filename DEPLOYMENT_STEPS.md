# Step-by-Step Deployment Guide

## Prerequisites
- ✅ RustDesk connected to Niagara station
- ✅ Build ready: `niagara-dashboard-deploy.zip`
- ✅ Station file service access

---

## Step 1: Extract the Zip File

**On YOUR computer (where you have the project):**

1. Navigate to: `C:\NiagaraNavigator\`
2. Find: `niagara-dashboard-deploy.zip`
3. Right-click → Extract All
4. Extract to: `C:\NiagaraNavigator\` (same folder)
5. You should now see: `niagara-module\` folder

**Verify:**
- Open `niagara-module\file\web1\`
- You should see: `index.html`, `assets\` folder, `mock-data\` folder

---

## Step 2: Access Niagara Station File Service

**On the STATION (via RustDesk):**

### Option A: Using Workbench File Service
1. Open **Niagara Workbench**
2. Connect to your station
3. Go to: **File Service** (usually in Station view)
4. Navigate to: `/file/web1/` (or create it if it doesn't exist)

### Option B: Using Windows Explorer (if station is Windows)
1. Open Windows Explorer
2. Navigate to station's file service path
3. Typical location: `C:\Niagara\station\file\web1\` or similar

### Option C: Using FTP/Network Share
1. If station has network share: `\\station-ip\file\web1\`
2. Or use FTP client to connect

**Tell me which method you're using and I'll guide you further!**

---

## Step 3: Copy Files to Station

**From YOUR computer:**
1. Open: `C:\NiagaraNavigator\niagara-module\file\web1\`
2. Select ALL files and folders:
   - `index.html`
   - `assets\` folder
   - `mock-data\` folder
   - `vite.svg` (if present)

**To STATION:**
1. Copy selected files
2. Paste into station's `/file/web1/` directory
3. Wait for copy to complete

**Verify on station:**
- Check that `index.html` exists
- Check that `assets\` folder has `.js` and `.css` files
- Check that `mock-data\` folder has JSON files

---

## Step 4: Access the Dashboard

**On STATION or YOUR computer:**

1. Open web browser
2. Navigate to: `http://STATION-IP:PORT/file/web1/index.html`
   - Replace `STATION-IP` with your station's IP address
   - Replace `PORT` with your station's HTTP port (usually 80, 8080, or 1911)

**Common URLs:**
- `http://localhost:8080/file/web1/index.html` (if testing on station)
- `http://192.168.1.XXX:8080/file/web1/index.html` (from your computer)

---

## Step 5: Verify It's Working

**Open browser console (F12):**

Look for these messages:
- ✅ `📍 Environment: Niagara Station` (should say this!)
- ✅ `🔄 Initializing Niagara BQL Adapter...`
- ✅ `✓ Niagara BQL Adapter initialized:`
- ✅ `📦 Equipment: X` (should show real count)
- ✅ `📍 Points: X` (should show real count)

**If you see:**
- ❌ `Environment: Development` → BajaScript not loaded
- ❌ `Failed to initialize` → Check console errors
- ❌ `404 Not Found` → Wrong file path

---

## Step 6: Test Features

1. **Equipment Cards:**
   - Should see equipment cards loading
   - Click ▶ to expand and see points

2. **Points:**
   - Should see point values
   - Should see point names

3. **Mini Charts:**
   - Expand equipment → should see mini charts
   - May take a moment to load

4. **Trending:**
   - Click "📊 View Trend" button
   - Should open trending panel

---

## Troubleshooting

### "404 Not Found"
- Check file path is correct: `/file/web1/index.html`
- Verify files were copied correctly
- Check file permissions on station

### "Environment: Development" (should say Niagara Station)
- BajaScript not loaded
- May need to embed in existing Niagara HTML page
- Or check if station has BajaScript available

### "Failed to initialize"
- Check console for specific error
- May be BQL query timeout
- May be authentication issue

### Blank page
- Check browser console (F12)
- Look for JavaScript errors
- Verify assets folder copied correctly

---

## What to Tell Me

As you go through these steps, tell me:
1. ✅ Which step you're on
2. ✅ What you see (success or error)
3. ✅ Any error messages
4. ✅ Console output (if there are errors)

I'll help troubleshoot in real-time!

