# Niagara Vue Dashboard Module

## Deployment Instructions

1. Copy the contents of the 'file' folder to your Niagara station's file service
2. Typical path: /file/web1/
3. Access the dashboard at: http://your-station-ip:port/file/web1/index.html

## Structure

- file/web1/ - All Vue dashboard files
  - index.html - Main entry point
  - assets/ - JavaScript and CSS bundles
  - mock-data/ - Mock data files (for development fallback)

## Features

- Auto-detects Niagara environment
- Uses BQL adapter when running in station
- Falls back to mock data in development

## Notes

The dashboard will automatically detect if it's running in a Niagara station
and use the NiagaraBQLAdapter for live data, or MockDataAdapter for development.
