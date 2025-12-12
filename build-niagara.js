/**
 * Niagara Module Build Script
 * Packages Vue dashboard for deployment to Niagara station
 * Creates a deployable zip file with proper structure
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🏗️  Building Niagara Module...\n');

// Step 1: Build Vue app
console.log('📦 Step 1: Building Vue app...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Vue build complete\n');
} catch (error) {
  console.error('❌ Vue build failed:', error.message);
  process.exit(1);
}

// Step 2: Create Niagara module structure
console.log('📁 Step 2: Creating Niagara module structure...');
const distDir = path.join(__dirname, 'dist');
const niagaraDir = path.join(__dirname, 'niagara-module');
const fileDir = path.join(niagaraDir, 'file', 'web1');

// Clean and create directories
if (fs.existsSync(niagaraDir)) {
  fs.rmSync(niagaraDir, { recursive: true });
}
fs.mkdirSync(fileDir, { recursive: true });

// Copy dist files to Niagara structure
console.log('📋 Copying files...');
function copyRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(distDir, fileDir);
console.log('✅ Files copied\n');

// Step 3: Create README for deployment
const readmeContent = `# Niagara Vue Dashboard Module

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
`;

fs.writeFileSync(path.join(niagaraDir, 'README.txt'), readmeContent);

// Step 4: Create deployment zip (if zip command available)
console.log('📦 Step 4: Creating deployment package...');
try {
  const zipPath = path.join(__dirname, 'niagara-dashboard-deploy.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  // Use PowerShell on Windows, zip on Unix
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    // Use full path to PowerShell
    const psCommand = `Compress-Archive -Path '${niagaraDir.replace(/\\/g, '/')}/*' -DestinationPath '${zipPath.replace(/\\/g, '/')}' -Force`;
    execSync(
      `powershell.exe -Command "${psCommand}"`,
      { stdio: 'inherit', shell: true }
    );
  } else {
    execSync(
      `cd ${niagaraDir} && zip -r ${zipPath} .`,
      { stdio: 'inherit' }
    );
  }
  
  const zipSize = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ Deployment package created: niagara-dashboard-deploy.zip (${zipSize} MB)\n`);
} catch (error) {
  console.warn('⚠️  Could not create zip file (zip tool not available)');
  console.log('📁 Module files are in: niagara-module/\n');
}

console.log('✨ Build complete!');
console.log('\n📋 Next steps:');
console.log('   1. Extract niagara-dashboard-deploy.zip (or use niagara-module/ folder)');
console.log('   2. Copy file/web1/* to your Niagara station\'s /file/web1/ directory');
console.log('   3. Access: http://station-ip:port/file/web1/index.html');
console.log('\n');

