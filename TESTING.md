# Testing Guide

## How to Test the Niagara Integration

Since we can't connect to a real Niagara station from here, we test in several ways:

### 1. Build Output Tests

**Test the build process:**
```bash
npm run test:build
```

This verifies:
- ✅ Directory structure is correct
- ✅ All required files exist
- ✅ HTML references assets correctly
- ✅ Assets are bundled properly
- ✅ File sizes are reasonable
- ✅ Zip file is created

**Expected output:**
```
✨ All tests passed!
📋 Build output summary:
   - Total files: ~8 files
   - Total size: 3.78 MB
   - Structure: ✓ Correct
   - Assets: ✓ Bundled
   - Ready for deployment: ✓ Yes
```

### 2. Adapter Interface Tests

**Test adapter compatibility:**
```bash
node test-adapter-interface.js
```

This verifies:
- ✅ Both adapters implement the same interface
- ✅ All required methods exist
- ✅ Method signatures match
- ✅ MockDataAdapter works
- ✅ NiagaraBQLAdapter detects environment correctly

**Expected output:**
```
✨ All interface tests passed!
📋 Summary:
   ✅ Both adapters implement same interface
   ✅ Methods are compatible
   ✅ MockDataAdapter works in development
   ✅ NiagaraBQLAdapter correctly detects environment
```

### 3. Browser Detection Test

**Open in browser:**
```
Open: test-niagara-detection.html
```

This visual test shows:
- ✅ How Niagara environment is detected
- ✅ How development environment is detected
- ✅ Which adapter would be selected

### 4. Development Testing

**Test with mock data:**
```bash
npm run dev
```

Then:
1. Open `http://localhost:5173`
2. Check browser console for:
   - `📍 Environment: Development (Mock Data)`
   - `✓ Real Niagara Data (with histories) initialized`
   - Equipment and point counts

### 5. Build Testing

**Test the build:**
```bash
npm run build:niagara
```

Then:
1. Extract `niagara-dashboard-deploy.zip`
2. Check `niagara-module/file/web1/` structure
3. Verify all files are present

### 6. Manual Station Testing (When Available)

**On actual Niagara station:**

1. **Deploy:**
   - Copy `file/web1/*` to station's `/file/web1/`
   - Access: `http://station-ip:port/file/web1/index.html`

2. **Check console:**
   - Should see: `📍 Environment: Niagara Station`
   - Should see: `✓ Niagara BQL Adapter initialized`
   - Should see equipment and point counts

3. **Test features:**
   - Equipment cards load
   - Points display
   - Trending works
   - History queries work

## What We Can't Test Here

❌ **Actual BQL queries** - Need real station  
❌ **History data** - Need real history service  
❌ **Live point values** - Need real station  
❌ **Alarm subscriptions** - Need real station  

## What We Can Test

✅ **Build process** - Creates correct structure  
✅ **File bundling** - Assets are optimized  
✅ **Adapter interface** - Both adapters compatible  
✅ **Environment detection** - Correctly identifies context  
✅ **Mock data** - Works with JSON files  
✅ **Code structure** - No syntax errors  

## Test Results

Run all tests:
```bash
npm run test:build && node test-adapter-interface.js
```

**Expected:** All tests pass ✅

## Next Steps for Real Testing

When you have access to a Niagara station:

1. ✅ Build: `npm run build:niagara`
2. ✅ Deploy zip contents to station
3. ✅ Open dashboard in browser
4. ✅ Check console for errors
5. ✅ Test equipment discovery
6. ✅ Test point values
7. ✅ Test history queries
8. ✅ Report any issues

## Troubleshooting Tests

**Build test fails:**
- Run `npm run build:niagara` first
- Check `niagara-module/` exists

**Interface test fails:**
- Check adapter files exist
- Verify imports work

**Detection test fails:**
- Check browser console
- Verify baja mock is created

