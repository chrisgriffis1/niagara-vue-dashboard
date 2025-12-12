@echo off
echo ========================================
echo   Dashboard Test Server
echo ========================================
echo.
echo Starting local server at http://localhost:8080
echo.
echo Open your browser to:
echo   http://localhost:8080/mock/test-dashboard.html
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd /d "%~dp0.."
python -m http.server 8080

pause

