/**
 * Build Standalone HTML File
 * Creates a single self-contained HTML file with all dependencies inline
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const buildsDir = path.join(__dirname, 'builds');
const outputFile = path.join(buildsDir, 'niagara-navigator-standalone.html');

// Create builds directory if it doesn't exist
if (!fs.existsSync(buildsDir)) {
  fs.mkdirSync(buildsDir, { recursive: true });
}

console.log('🔧 Building standalone HTML file...\n');

// Read the built index.html
const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf-8');

console.log('📄 Reading index.html');

// Extract JS and CSS file references
const jsRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
const cssRegex = /<link[^>]*href="([^"]+\.css)"[^>]*>/g;

// Find all JS files
const jsFiles = [];
let jsMatch;
while ((jsMatch = jsRegex.exec(html)) !== null) {
  const src = jsMatch[1];
  // Skip non-module scripts (BajaScript)
  if (src.includes('requirejs') || src.includes('require.min.js')) {
    continue;
  }
  jsFiles.push(src);
}

// Find all CSS files
const cssFiles = [];
let cssMatch;
while ((cssMatch = cssRegex.exec(html)) !== null) {
  cssFiles.push(cssMatch[1]);
}

console.log(`📦 Found ${jsFiles.length} JS files`);
console.log(`🎨 Found ${cssFiles.length} CSS files\n`);

// Inline CSS
for (const cssFile of cssFiles) {
  const cssPath = path.join(distDir, cssFile);
  if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const cssTag = `<style>\n${cssContent}\n</style>`;
    html = html.replace(new RegExp(`<link[^>]*href="${cssFile.replace(/\//g, '\\/')}"[^>]*>`, 'g'), cssTag);
    console.log(`✅ Inlined: ${cssFile}`);
  }
}

// Inline JS
for (const jsFile of jsFiles) {
  // Remove /file/web1/ prefix to get actual file path
  const cleanPath = jsFile.replace('/file/web1/', '');
  const jsPath = path.join(distDir, cleanPath);
  
  if (fs.existsSync(jsPath)) {
    let jsContent = fs.readFileSync(jsPath, 'utf-8');
    
    // Escape closing script tags in the JavaScript to prevent premature script termination
    jsContent = jsContent.replace(/<\/script>/gi, '<\\/script>');
    
    const scriptTag = `<script type="module">\n${jsContent}\n</script>`;
    html = html.replace(new RegExp(`<script[^>]*src="${jsFile.replace(/\//g, '\\/')}"[^>]*><\\/script>`, 'g'), scriptTag);
    console.log(`✅ Inlined: ${jsFile}`);
  } else {
    console.log(`⚠️  Not found: ${jsPath}`);
  }
}

// Remove PWA stuff and BajaScript (not needed for standalone)
html = html.replace(/<script[^>]*registerSW[^>]*><\/script>/g, '');
html = html.replace(/<link[^>]*manifest[^>]*>/g, '');
html = html.replace(/<script[^>]*requirejs[^>]*><\/script>/g, '');
html = html.replace(/<!-- @noSnoop -->\n?/g, '');

// Add metadata and instructions
const header = `<!--
╔═══════════════════════════════════════════════════════════════════════════╗
║                     NIAGARA NAVIGATOR - STANDALONE                        ║
║                         Self-Contained Demo                               ║
╚═══════════════════════════════════════════════════════════════════════════╝

🚀 QUICK START:
   1. Double-click this file to open in your browser
   2. That's it! No installation needed.

📋 WHAT'S INCLUDED:
   ✓ Full Vue.js application
   ✓ Mock BAS data (Heat Pumps, Air Handlers, VAVs)
   ✓ All charts and visualizations
   ✓ Live data simulation
   ✓ Complete UI components
   ✓ No internet connection required

🔧 FEATURES:
   • Equipment dashboard with real-time updates
   • Point history trending
   • Alarm monitoring
   • Smart selection
   • User configuration system
   • Tesla-style expandable cards

📝 NOTES:
   • All data is simulated (MockDataAdapter)
   • No backend server required
   • Works in any modern browser (Chrome, Firefox, Edge, Safari)
   • File size: ~550KB compressed

🔗 For Niagara integration, see the full deployment package.

Generated: ${new Date().toISOString()}
-->

`;

html = html.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n${header}`);

// Add title and description
html = html.replace('<title>Vite App</title>', '<title>Niagara Navigator - Standalone Demo</title>');

// Write the standalone file
fs.writeFileSync(outputFile, html, 'utf-8');

const stats = fs.statSync(outputFile);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('\n✨ SUCCESS!\n');
console.log('📦 Standalone file created:');
console.log(`   📁 ${outputFile}`);
console.log(`   📊 Size: ${fileSizeKB} KB`);
console.log('\n🎉 Ready to share! Just send this single HTML file.');
console.log('   Recipients can double-click to run - no setup needed!\n');

