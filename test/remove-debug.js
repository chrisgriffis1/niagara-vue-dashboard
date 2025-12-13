const fs = require('fs');
const path = 'c:/NiagaraNavigator/LivePoints.html';
let content = fs.readFileSync(path, 'utf8');
const before = content.split('\n').length;

// Remove lines that are only debug console.log statements
const lines = content.split('\n');
const filtered = lines.filter(line => {
  const trimmed = line.trim();
  // Remove lines that start with console.log and contain debug emojis
  if (trimmed.startsWith('console.log(')) {
    if (trimmed.includes('🔍') || trimmed.includes('[DEBUG]') ||
        trimmed.includes('✅') && !trimmed.includes('error') ||
        trimmed.includes('💡') || trimmed.includes('📦') ||
        trimmed.includes('📊') || trimmed.includes('🔄') ||
        trimmed.includes('💾') || trimmed.includes('🔧') ||
        trimmed.includes('⚠️') && trimmed.includes('[DEBUG]')) {
      return false;
    }
  }
  return true;
});

content = filtered.join('\n');

// Remove excessive blank lines (more than 2 consecutive)
content = content.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync(path, content, 'utf8');
const after = content.split('\n').length;
console.log('Before:', before, 'After:', after, 'Removed:', before - after);

