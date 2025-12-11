/**
 * Data Inspector Script
 * Run this in the browser console to inspect the real Niagara data structure
 * 
 * Usage:
 * 1. Open test-adapter.html in browser
 * 2. Open Developer Console (F12)
 * 3. Paste this script and run it
 */

async function inspectRealData() {
    console.log('🔍 Inspecting Real Niagara Data Structure...\n');
    
    try {
        // Fetch the real data file
        const response = await fetch('/mock-data/chris-config-profile.json');
        if (!response.ok) {
            console.error('❌ File not found or error loading');
            console.log('Expected location: /mock-data/chris-config-profile.json');
            console.log('Please ensure the file is in the correct location');
            return;
        }
        
        const data = await response.json();
        console.log('✅ Data loaded successfully!\n');
        
        // Inspect top-level structure
        console.log('📋 Top-Level Keys:');
        console.log(Object.keys(data));
        console.log('');
        
        // Check for nested data
        const dataSource = data.data || data;
        console.log('📦 Data Source Keys:');
        console.log(Object.keys(dataSource));
        console.log('');
        
        // Inspect equipment
        if (dataSource.equipment && Array.isArray(dataSource.equipment)) {
            console.log(`🔧 Equipment: ${dataSource.equipment.length} items`);
            if (dataSource.equipment.length > 0) {
                console.log('First equipment item structure:');
                console.log(JSON.stringify(dataSource.equipment[0], null, 2));
            }
            console.log('');
        } else if (dataSource.devices && Array.isArray(dataSource.devices)) {
            console.log(`🔧 Devices: ${dataSource.devices.length} items`);
            if (dataSource.devices.length > 0) {
                console.log('First device item structure:');
                console.log(JSON.stringify(dataSource.devices[0], null, 2));
            }
            console.log('');
        }
        
        // Inspect points
        if (dataSource.points && Array.isArray(dataSource.points)) {
            console.log(`📍 Points: ${dataSource.points.length} items`);
            if (dataSource.points.length > 0) {
                console.log('First point item structure:');
                console.log(JSON.stringify(dataSource.points[0], null, 2));
                
                // Analyze point properties
                const firstPoint = dataSource.points[0];
                console.log('\nPoint properties found:');
                console.log('- id:', firstPoint.id || firstPoint.pointId || 'MISSING');
                console.log('- name:', firstPoint.name || firstPoint.displayName || firstPoint.navName || 'MISSING');
                console.log('- type:', firstPoint.type || firstPoint.pointType || 'MISSING');
                console.log('- value:', firstPoint.value !== undefined ? firstPoint.value : (firstPoint.out !== undefined ? firstPoint.out : 'MISSING'));
                console.log('- unit:', firstPoint.unit || firstPoint.units || 'MISSING');
                console.log('- ord/path:', firstPoint.ord || firstPoint.slotPath || firstPoint.path || 'MISSING');
                console.log('- equipmentId:', firstPoint.equipmentId || firstPoint.parentEquipment || 'MISSING');
            }
            console.log('');
        }
        
        // Inspect schedules
        if (dataSource.schedules && Array.isArray(dataSource.schedules)) {
            console.log(`📅 Schedules: ${dataSource.schedules.length} items`);
            if (dataSource.schedules.length > 0) {
                console.log('First schedule item structure:');
                console.log(JSON.stringify(dataSource.schedules[0], null, 2));
            }
            console.log('');
        }
        
        // Inspect histories
        if (dataSource.histories && Array.isArray(dataSource.histories)) {
            console.log(`📈 Histories: ${dataSource.histories.length} items`);
            if (dataSource.histories.length > 0) {
                console.log('First history item structure:');
                console.log(JSON.stringify(dataSource.histories[0], null, 2));
            }
            console.log('');
        }
        
        // Inspect tagged components
        const components = dataSource.taggedComponents || dataSource.components;
        if (components && Array.isArray(components)) {
            console.log(`🏷️  Tagged Components: ${components.length} items`);
            if (components.length > 0) {
                console.log('First component item structure:');
                console.log(JSON.stringify(components[0], null, 2));
            }
            console.log('');
        }
        
        // Check metadata
        if (data.metadata) {
            console.log('📝 Metadata:');
            console.log(JSON.stringify(data.metadata, null, 2));
            console.log('');
        }
        
        // Summary
        console.log('📊 Summary:');
        console.log('='.repeat(50));
        const summary = {
            'Total Equipment': (dataSource.equipment || dataSource.devices || []).length,
            'Total Points': (dataSource.points || []).length,
            'Total Schedules': (dataSource.schedules || []).length,
            'Total Histories': (dataSource.histories || []).length,
            'Total Tagged Components': (components || []).length
        };
        console.table(summary);
        
        // Equipment type distribution
        const equipment = dataSource.equipment || dataSource.devices || [];
        if (equipment.length > 0) {
            console.log('\n🔧 Equipment Type Distribution:');
            const typeCount = {};
            equipment.forEach(eq => {
                const type = eq.type || eq.equipmentType || 'Unknown';
                typeCount[type] = (typeCount[type] || 0) + 1;
            });
            console.table(typeCount);
        }
        
        // Point type distribution
        const points = dataSource.points || [];
        if (points.length > 0) {
            console.log('\n📍 Point Type Distribution:');
            const pointTypeCount = {};
            points.forEach(pt => {
                const type = pt.type || pt.pointType || 'Unknown';
                pointTypeCount[type] = (pointTypeCount[type] || 0) + 1;
            });
            console.table(pointTypeCount);
            
            // Value type distribution
            console.log('\n📊 Point Value Type Distribution:');
            const valueTypeCount = {};
            points.slice(0, 1000).forEach(pt => { // Sample first 1000
                const value = pt.value !== undefined ? pt.value : pt.out;
                const type = typeof value;
                valueTypeCount[type] = (valueTypeCount[type] || 0) + 1;
            });
            console.table(valueTypeCount);
        }
        
        console.log('\n✅ Inspection complete!');
        console.log('The MockDataAdapter should handle this structure automatically.');
        
        return data;
        
    } catch (error) {
        console.error('❌ Error inspecting data:', error);
        console.error('Stack:', error.stack);
    }
}

// Run inspection
inspectRealData();

