# 🚀 HOW TO SEE YOUR REAL DATA - SIMPLE STEPS

## The dev server is running at: http://localhost:5173/

---

## ✅ EASIEST METHOD - Use Quick Test Page

### Open this page:
```
http://localhost:5173/quick-test.html
```

### Click the big green button:
**"🚀 Load Real Data (83 equip, 38k points)"**

That's it! You'll immediately see:
- ✅ 83 equipment devices loaded
- ✅ 38,605 points loaded
- ✅ All equipment types
- ✅ Sample data from your real system

---

## 📊 Alternative - Use Full Test Page

### Open this page:
```
http://localhost:5173/test-adapter.html
```

### Steps:
1. Make sure dropdown shows "Real Niagara Data (83 equip, 38k points)"
2. Click **"🔄 Load Data"** button
3. Wait 1-2 seconds
4. See your equipment and stats!

---

## 🎯 What You'll See

When you load the real data, you'll see:

### Your Actual Equipment:
- **AHU1, AHU2, AHU4, AHU6** - Air Handling Units
- **MAU1, MAU2, MAU3, MAU4** - Makeup Air Units
- **HP11, HP12, HP13, HP14...** - Heat Pump Thermostats
- **TowerPlant** - Cooling Tower System
- **MJHSupervisor** - Niagara Station
- And 74 more devices!

### Your Actual Points:
- 38,605 real data points from your system
- With actual values like temperatures, pressures, status
- From file: `site-profile-1765425942065.json`

---

## 🔍 Troubleshooting

### If you see "Demo Data" instead:
1. Make sure you clicked **"Load Data"** button
2. Check the dropdown is set to **"Real Niagara Data"**
3. Look at browser console (F12) for any errors

### Check Browser Console:
Press F12 and look for:
```
✓ Real Niagara Data (83 equip, 6.4k points) initialized:
  📦 Equipment: 83
  📍 Points: 38,605
```

If you see this, it's working!

### If you see errors:
Check Network tab (F12 → Network) - you should see:
```
site-profile-1765425942065.json - Status: 200 OK
```

---

## 💻 Quick Browser Console Test

Open quick-test.html, press F12, and paste:

```javascript
// Check what's loaded
console.log('Current dataset:', adapter.getCurrentDataset());

// Force load real data
await adapter.switchDataset('real');

// Get equipment
const devices = await adapter.discoverDevices();
console.log('Equipment count:', devices.length);
console.table(devices.slice(0, 10));
```

You should see 83 devices!

---

## ✨ Bottom Line

**Open:** http://localhost:5173/quick-test.html  
**Click:** The green "Load Real Data" button  
**Result:** Your 83 equipment and 38k points loaded! 🎉

---

*The real data file is at: `mock-data/site-profile-1765425942065.json`*

