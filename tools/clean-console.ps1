# Clean all console statements from LivePoints.html
$content = Get-Content "LivePoints.html" -Raw -Encoding UTF8

# Remove multi-line console statements
$content = $content -replace 'console\.(log|debug|warn|info|error)\s*\([^)]*\)\s*;', ''

# Save with UTF8 encoding
$content | Set-Content "LivePoints.html" -Encoding UTF8 -NoNewline
Write-Host "✅ Cleaned LivePoints.html"

