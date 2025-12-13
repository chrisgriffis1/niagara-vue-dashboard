# ⚠️ IMPORTANT: How to Access the Dashboard

## ❌ DON'T Open in Workbench HTML Viewer

**Workbench's HTML viewer breaks module loading!**

The errors you're seeing:
- `Failed to load module script: Expected JavaScript but got text/html`
- `MIME type ('text/html') is not a supported stylesheet MIME type`

This happens because Workbench's viewer uses `ord?file:` URLs which don't serve static files correctly.

---

## ✅ DO Access via HTTP Browser

**Use a web browser (Chrome, Edge, Firefox) - NOT Workbench viewer!**

### Step 1: Find Your Station's HTTP URL

Your station IP: `192.168.0.217`

Common ports:
- `8080` (most common)
- `1911` (default Niagara)
- `80` (standard HTTP)

### Step 2: Open in Browser

Try these URLs (one should work):

```
http://192.168.0.217:8080/file/web1/index.html
http://192.168.0.217:1911/file/web1/index.html
http://192.168.0.217/file/web1/index.html
```

Or if you created the wrapper:
```
http://192.168.0.217:8080/file/web1/niagara-wrapper.html
```

### Step 3: Check Console

Press **F12** → **Console** tab

**Should see:**
- ✅ `📍 Environment: Niagara Station`
- ✅ `🔄 Initializing Niagara BQL Adapter...`
- ✅ `✓ Niagara BQL Adapter initialized:`
- ✅ Equipment and point counts

**If you see:**
- ❌ `Environment: Development` → BajaScript not loaded (but app still works with mock data)
- ❌ `Failed to load` → Wrong URL or files not copied

---

## Finding Your Station's Port

**In Workbench:**
1. Right-click your station
2. Properties → Network
3. Look for HTTP Port (usually 8080 or 1911)

**Or check station config:**
- Station → Config → HTTP Service → Port

---

## Quick Test

1. ✅ Copy files to `/file/web1/` on station
2. ✅ Open browser (Chrome/Edge)
3. ✅ Go to: `http://192.168.0.217:8080/file/web1/index.html`
4. ✅ Press F12 to see console
5. ✅ Tell me what you see!

---

## Why This Happens

- **Workbench Viewer**: Uses `ord?file:` scheme → Breaks module loading
- **HTTP Browser**: Uses standard HTTP → Works perfectly

The dashboard is designed to run in a browser, not Workbench's viewer!

