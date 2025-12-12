# Dashboard Test Server
Write-Host "========================================"
Write-Host "  Dashboard Test Server"
Write-Host "========================================"
Write-Host ""

$port = 8080
$root = Split-Path -Parent $PSScriptRoot

# Try Python first
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    Write-Host "Starting Python HTTP server..."
    Write-Host ""
    Write-Host "Open your browser to:"
    Write-Host "  http://localhost:$port/mock/test-dashboard.html"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop"
    Write-Host "========================================"
    Set-Location $root
    python -m http.server $port
    exit
}

# Try Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "Starting Node.js HTTP server..."
    
    # Create a simple server inline
    $serverCode = @"
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    let filePath = path.join('$($root -replace '\\','/')', req.url === '/' ? '/mock/test-dashboard.html' : req.url);
    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    };
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            res.end(content);
        }
    });
});

server.listen($port, () => console.log('Server running at http://localhost:$port'));
"@
    
    Write-Host ""
    Write-Host "Open your browser to:"
    Write-Host "  http://localhost:$port/mock/test-dashboard.html"
    Write-Host ""
    node -e $serverCode
    exit
}

# Neither found
Write-Host "ERROR: Neither Python nor Node.js found!"
Write-Host ""
Write-Host "Install one of these to run the test server:"
Write-Host "  - Python: https://www.python.org/downloads/"
Write-Host "  - Node.js: https://nodejs.org/"
Write-Host ""
Write-Host "Or just open test-dashboard.html directly in your browser"
Write-Host "(some features may not work due to CORS restrictions)"
pause

