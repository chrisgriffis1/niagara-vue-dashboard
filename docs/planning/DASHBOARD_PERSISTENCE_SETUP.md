# Dashboard Persistence Setup Guide

This guide explains how to set up file-based persistence for the dashboard using the Program Object.

## Overview

The dashboard can now save and load data using Niagara file system instead of (or in addition to) browser localStorage. This provides:
- Persistent data across browser sessions and devices
- Backup and restore capabilities
- Better data management

## Setup Steps

### 1. Create the Program Object

1. In Niagara Workbench, create a new Program Object
2. Copy the code from `DashboardPersistenceProgram.java` into the program
3. Compile and save the program
4. Note the program's ORD (e.g., `station:|slot:/Drivers/DashboardPersistence`)

### 2. Configure Program Properties

The program needs these properties configured:

- **directory** (BOrd): The directory where files will be saved
  - Example: `slot:/Drivers/DashboardData`
  - Create this folder in your station if it doesn't exist

- **operation** (BString): Either "save" or "load" (set by JavaScript automatically)
- **dataKey** (BString): The key for the data (e.g., "customCards", "hiddenPoints")
- **jsonData** (BString): The JSON data to save (for save operations)
- **loadedData** (BString): The loaded data (read-only, set by program after load)

### 3. Configure JavaScript in LivePoints.html

At the top of the JavaScript section (around line 7548), configure these variables:

```javascript
// Set to your program's ORD
window.DASHBOARD_PERSISTENCE_PROGRAM_ORD = "station:|slot:/Drivers/DashboardPersistence";

// Set to the directory ORD where files will be saved
window.DASHBOARD_PERSISTENCE_DIRECTORY = "slot:/Drivers/DashboardData";

// Set to true to use file persistence, false to use localStorage
window.USE_FILE_PERSISTENCE = true;
```

### 4. File Structure

The program will create files like:
- `dashboard_customCards.json`
- `dashboard_hiddenCards.json`
- `dashboard_hiddenPoints.json`
- `dashboard_cardTitles.json`
- `dashboard_cardSizes.json`
- `dashboard_expandedSections.json`
- `dashboard_expandedDevices.json`

## How It Works

### Saving Data

When `window.USE_FILE_PERSISTENCE` is `true`:
1. JavaScript calls `saveDashboardDataToFile(key, jsonData)`
2. This sets the program's properties and executes it
3. The program writes the JSON data to a file
4. Data is also saved to localStorage as a backup

### Loading Data

When `window.USE_FILE_PERSISTENCE` is `true`:
1. On page load, `DashboardState.load()` is called
2. For each data key, it calls `loadDashboardDataFromFile(key)`
3. The program reads the file and stores it in the `loadedData` property
4. JavaScript reads the `loadedData` property and parses the JSON
5. Falls back to localStorage if file doesn't exist

## Testing

1. Set `USE_FILE_PERSISTENCE = true`
2. Make some changes to custom cards
3. Check the program's log to see if files were created
4. Refresh the page - your changes should persist
5. Check the directory to see the JSON files

## Troubleshooting

### Files not being created
- Check that the directory ORD is correct and exists
- Check the program's log for errors
- Verify the program has execute permissions

### Data not loading
- Check that files exist in the directory
- Check browser console for errors
- Verify the program ORD is correct
- Try setting `USE_FILE_PERSISTENCE = false` to use localStorage as fallback

### Program execution errors
- Check that all required properties are set
- Verify the directory path is correct
- Check file system permissions

## Fallback Behavior

The system automatically falls back to localStorage if:
- File persistence is not configured
- File operations fail
- Program cannot be found

This ensures the dashboard always works, even if file persistence fails.

