// Quick test to verify real data structure
import fs from 'fs';

console.log('🧪 Testing Real Niagara Data Load...\n');

try {
    // Load the real data file
    console.log('📂 Loading: mock-data/site-profile-1765425942065.json');
    const rawData = fs.readFileSync('mock-data/site-profile-1765425942065.json', 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('✅ File loaded successfully!\n');
    
    // Check structure
    console.log('📊 Data Structure:');
    console.log('  - Has metadata:', !!data.metadata);
    console.log('  - Has data section:', !!data.data);
    
    if (data.data) {
        const d = data.data;
        console.log('\n📦 Content Counts:');
        console.log(`  - Equipment: ${d.equipment?.length || 0}`);
        console.log(`  - Points: ${d.points?.length || 0}`);
        console.log(`  - Schedules: ${d.schedules?.length || 0}`);
        console.log(`  - Histories: ${d.histories?.length || 0}`);
        console.log(`  - Tagged Components: ${d.tags?.tagData?.length || 0}`);
        
        // Show sample equipment
        if (d.equipment && d.equipment.length > 0) {
            console.log('\n🔧 Sample Equipment (first 10):');
            d.equipment.slice(0, 10).forEach((eq, i) => {
                console.log(`  ${i+1}. ${eq.name} (${eq.type})`);
            });
        }
        
        // Show sample points
        if (d.points && d.points.length > 0) {
            console.log('\n📍 Sample Points (first 5):');
            d.points.slice(0, 5).forEach((pt, i) => {
                console.log(`  ${i+1}. ${pt.name}: ${pt.value}`);
            });
        }
        
        console.log('\n✅ Data structure looks good!');
        console.log('✅ The MockDataAdapter should load this successfully.');
        
    } else {
        console.log('⚠️  Warning: No data section found');
    }
    
} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}

