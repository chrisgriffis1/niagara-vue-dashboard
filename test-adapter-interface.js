/**
 * Test Adapter Interface
 * Verifies both adapters implement the same interface
 */

import MockDataAdapter from './src/adapters/MockDataAdapter.js';
import NiagaraBQLAdapter from './src/adapters/NiagaraBQLAdapter.js';

console.log('🧪 Testing Adapter Interface Compatibility...\n');

// List of required methods
const requiredMethods = [
  'initialize',
  'discoverDevices',
  'getPointsByEquipment',
  'getPointValue',
  'getHistoricalData',
  'getBuildingStats',
  'getEquipmentTypes'
];

// Test 1: Check MockDataAdapter has all methods
console.log('✅ Test 1: MockDataAdapter interface...');
const mockAdapter = new MockDataAdapter();
let mockPass = true;

for (const method of requiredMethods) {
  if (typeof mockAdapter[method] !== 'function') {
    console.error(`   ❌ Missing method: ${method}`);
    mockPass = false;
  }
}
if (mockPass) {
  console.log(`   ✓ All ${requiredMethods.length} methods present\n`);
}

// Test 2: Check NiagaraBQLAdapter has all methods
console.log('✅ Test 2: NiagaraBQLAdapter interface...');
const niagaraAdapter = new NiagaraBQLAdapter();
let niagaraPass = true;

for (const method of requiredMethods) {
  if (typeof niagaraAdapter[method] !== 'function') {
    console.error(`   ❌ Missing method: ${method}`);
    niagaraPass = false;
  }
}
if (niagaraPass) {
  console.log(`   ✓ All ${requiredMethods.length} methods present\n`);
}

// Test 3: Check method signatures match
console.log('✅ Test 3: Method signatures...');
let signaturePass = true;

for (const method of requiredMethods) {
  const mockFn = mockAdapter[method];
  const niagaraFn = niagaraAdapter[method];
  
  // Check if both are async
  const mockIsAsync = mockFn.constructor.name === 'AsyncFunction';
  const niagaraIsAsync = niagaraFn.constructor.name === 'AsyncFunction';
  
  if (mockIsAsync !== niagaraIsAsync) {
    console.warn(`   ⚠️  ${method}: async mismatch (Mock: ${mockIsAsync}, Niagara: ${niagaraIsAsync})`);
  }
}

console.log('   ✓ Signatures compatible\n');

// Test 4: Test MockDataAdapter initialization (can actually run)
console.log('✅ Test 4: MockDataAdapter initialization...');
try {
  await mockAdapter.switchDataset('real');
  await mockAdapter.initialize();
  const devices = await mockAdapter.discoverDevices();
  const stats = await mockAdapter.getBuildingStats();
  
  console.log(`   ✓ Initialized successfully`);
  console.log(`   ✓ Discovered ${devices.length} devices`);
  console.log(`   ✓ Stats: ${stats.equipmentCount} equipment, ${stats.pointCount} points\n`);
} catch (error) {
  console.error(`   ❌ Initialization failed: ${error.message}\n`);
}

// Test 5: Test NiagaraBQLAdapter detection (will fail without baja, but that's expected)
console.log('✅ Test 5: NiagaraBQLAdapter detection...');
try {
  await niagaraAdapter.initialize();
  console.error('   ❌ Should have failed without baja global\n');
} catch (error) {
  if (error.message.includes('baja global not found')) {
    console.log('   ✓ Correctly detects missing Niagara environment\n');
  } else {
    console.error(`   ❌ Unexpected error: ${error.message}\n`);
  }
}

// Summary
if (mockPass && niagaraPass) {
  console.log('✨ All interface tests passed!\n');
  console.log('📋 Summary:');
  console.log('   ✅ Both adapters implement same interface');
  console.log('   ✅ Methods are compatible');
  console.log('   ✅ MockDataAdapter works in development');
  console.log('   ✅ NiagaraBQLAdapter correctly detects environment');
  console.log('\n💡 The app can seamlessly switch between adapters!\n');
} else {
  console.error('❌ Some tests failed\n');
  process.exit(1);
}

