/* Mock BajaScript API for local testing */

// Mock equipment data
const MOCK_EQUIPMENT = [
  { name: 'HP1', originalName: 'HP1', ord: 'station:|slot:/Drivers/BacnetNetwork/HP1', slotPath: '/Drivers/BacnetNetwork/HP1', inferredType: 'heatpump', zone: 'Zone 1' },
  { name: 'HP2', originalName: 'HP2', ord: 'station:|slot:/Drivers/BacnetNetwork/HP2', slotPath: '/Drivers/BacnetNetwork/HP2', inferredType: 'heatpump', zone: 'Zone 1' },
  { name: 'HP3', originalName: 'HP3', ord: 'station:|slot:/Drivers/BacnetNetwork/HP3', slotPath: '/Drivers/BacnetNetwork/HP3', inferredType: 'heatpump', zone: 'Zone 2' },
  { name: 'HP4', originalName: 'HP4', ord: 'station:|slot:/Drivers/BacnetNetwork/HP4', slotPath: '/Drivers/BacnetNetwork/HP4', inferredType: 'heatpump', zone: 'Zone 2' },
  { name: 'AHU1', originalName: 'AHU1', ord: 'station:|slot:/Drivers/BacnetNetwork/AHU1', slotPath: '/Drivers/BacnetNetwork/AHU1', inferredType: 'ahu', zone: 'Zone 1' },
  { name: 'AHU2', originalName: 'AHU2', ord: 'station:|slot:/Drivers/BacnetNetwork/AHU2', slotPath: '/Drivers/BacnetNetwork/AHU2', inferredType: 'ahu', zone: 'Zone 3' },
  { name: 'VAV1', originalName: 'VAV1', ord: 'station:|slot:/Drivers/BacnetNetwork/VAV1', slotPath: '/Drivers/BacnetNetwork/VAV1', inferredType: 'vav', zone: 'Zone 1' },
  { name: 'VAV2', originalName: 'VAV2', ord: 'station:|slot:/Drivers/BacnetNetwork/VAV2', slotPath: '/Drivers/BacnetNetwork/VAV2', inferredType: 'vav', zone: 'Zone 2' },
  { name: 'Boiler1', originalName: 'Boiler1', ord: 'station:|slot:/Drivers/BacnetNetwork/Boiler1', slotPath: '/Drivers/BacnetNetwork/Boiler1', inferredType: 'boiler', zone: 'Mechanical' },
  { name: 'Pump1', originalName: 'Pump1', ord: 'station:|slot:/Drivers/BacnetNetwork/Pump1', slotPath: '/Drivers/BacnetNetwork/Pump1', inferredType: 'pump', zone: 'Mechanical' },
  { name: 'Pump2', originalName: 'Pump2', ord: 'station:|slot:/Drivers/BacnetNetwork/Pump2', slotPath: '/Drivers/BacnetNetwork/Pump2', inferredType: 'pump', zone: 'Mechanical' },
  { name: 'EF1', originalName: 'EF1', ord: 'station:|slot:/Drivers/BacnetNetwork/EF1', slotPath: '/Drivers/BacnetNetwork/EF1', inferredType: 'exhaustfan', zone: 'Kitchen' },
];

// Mock points for each equipment type
const MOCK_POINTS = {
  heatpump: [
    { name: 'SpaceTemp', displayName: 'Space Temperature', value: '72.5', status: 'ok', unit: '°F' },
    { name: 'SupplyTemp', displayName: 'Supply Air Temp', value: '55.2', status: 'ok', unit: '°F' },
    { name: 'ReturnTemp', displayName: 'Return Air Temp', value: '74.1', status: 'ok', unit: '°F' },
    { name: 'FanSpeed', displayName: 'Fan Speed', value: '75', status: 'ok', unit: '%' },
    { name: 'CoolCall', displayName: 'Cooling Call', value: 'true', status: 'ok', unit: '' },
    { name: 'HeatCall', displayName: 'Heating Call', value: 'false', status: 'ok', unit: '' },
    { name: 'Setpoint', displayName: 'Setpoint', value: '72', status: 'ok', unit: '°F' },
    { name: 'OccMode', displayName: 'Occupied Mode', value: 'true', status: 'ok', unit: '' },
  ],
  ahu: [
    { name: 'SupplyTemp', displayName: 'Supply Air Temp', value: '54.8', status: 'ok', unit: '°F' },
    { name: 'ReturnTemp', displayName: 'Return Air Temp', value: '73.2', status: 'ok', unit: '°F' },
    { name: 'MixedAirTemp', displayName: 'Mixed Air Temp', value: '65.0', status: 'ok', unit: '°F' },
    { name: 'OADamper', displayName: 'OA Damper Position', value: '35', status: 'ok', unit: '%' },
    { name: 'SupplyFanSpeed', displayName: 'Supply Fan Speed', value: '85', status: 'ok', unit: '%' },
    { name: 'ReturnFanSpeed', displayName: 'Return Fan Speed', value: '80', status: 'ok', unit: '%' },
    { name: 'FilterDP', displayName: 'Filter DP', value: '0.45', status: 'ok', unit: 'inWC' },
    { name: 'StaticPressure', displayName: 'Duct Static', value: '1.2', status: 'ok', unit: 'inWC' },
  ],
  vav: [
    { name: 'SpaceTemp', displayName: 'Space Temperature', value: '71.8', status: 'ok', unit: '°F' },
    { name: 'DamperPos', displayName: 'Damper Position', value: '45', status: 'ok', unit: '%' },
    { name: 'AirFlow', displayName: 'Air Flow', value: '350', status: 'ok', unit: 'CFM' },
    { name: 'Setpoint', displayName: 'Setpoint', value: '72', status: 'ok', unit: '°F' },
    { name: 'ReheatValve', displayName: 'Reheat Valve', value: '0', status: 'ok', unit: '%' },
  ],
  boiler: [
    { name: 'SupplyTemp', displayName: 'Supply Water Temp', value: '145.5', status: 'ok', unit: '°F' },
    { name: 'ReturnTemp', displayName: 'Return Water Temp', value: '125.2', status: 'ok', unit: '°F' },
    { name: 'FiringRate', displayName: 'Firing Rate', value: '65', status: 'ok', unit: '%' },
    { name: 'Enable', displayName: 'Boiler Enable', value: 'true', status: 'ok', unit: '' },
    { name: 'StackTemp', displayName: 'Stack Temperature', value: '280', status: 'ok', unit: '°F' },
  ],
  pump: [
    { name: 'Status', displayName: 'Pump Status', value: 'Running', status: 'ok', unit: '' },
    { name: 'Speed', displayName: 'Pump Speed', value: '80', status: 'ok', unit: '%' },
    { name: 'DischargePressure', displayName: 'Discharge PSI', value: '45.2', status: 'ok', unit: 'PSI' },
    { name: 'SuctionPressure', displayName: 'Suction PSI', value: '12.5', status: 'ok', unit: 'PSI' },
  ],
  exhaustfan: [
    { name: 'Status', displayName: 'Fan Status', value: 'Running', status: 'ok', unit: '' },
    { name: 'Speed', displayName: 'Fan Speed', value: '100', status: 'ok', unit: '%' },
    { name: 'Enable', displayName: 'Enable', value: 'true', status: 'ok', unit: '' },
  ],
};

// Mock config storage
let mockConfig = {
  global: {
    snapshot: MOCK_EQUIPMENT,
    groups: {
      heatpump: MOCK_EQUIPMENT.filter(e => e.inferredType === 'heatpump').map(e => e.ord),
      ahu: MOCK_EQUIPMENT.filter(e => e.inferredType === 'ahu').map(e => e.ord),
      vav: MOCK_EQUIPMENT.filter(e => e.inferredType === 'vav').map(e => e.ord),
      boiler: MOCK_EQUIPMENT.filter(e => e.inferredType === 'boiler').map(e => e.ord),
      pump: MOCK_EQUIPMENT.filter(e => e.inferredType === 'pump').map(e => e.ord),
      exhaustfan: MOCK_EQUIPMENT.filter(e => e.inferredType === 'exhaustfan').map(e => e.ord),
    },
    zones: {
      'Zone 1': MOCK_EQUIPMENT.filter(e => e.zone === 'Zone 1').map(e => e.ord),
      'Zone 2': MOCK_EQUIPMENT.filter(e => e.zone === 'Zone 2').map(e => e.ord),
      'Zone 3': MOCK_EQUIPMENT.filter(e => e.zone === 'Zone 3').map(e => e.ord),
      'Mechanical': MOCK_EQUIPMENT.filter(e => e.zone === 'Mechanical').map(e => e.ord),
      'Kitchen': MOCK_EQUIPMENT.filter(e => e.zone === 'Kitchen').map(e => e.ord),
    },
    lastSync: new Date().toISOString()
  }
};

// Mock subscriber
class MockSubscriber {
  constructor() {
    this.subscriptions = [];
  }
  subscribe(options) {
    this.subscriptions.push(options);
    // Simulate initial value callback
    if (options.changed) {
      setTimeout(() => {
        options.changed({ getValue: () => Math.random() * 100 });
      }, 100);
    }
    return this;
  }
  unsubscribeAll() {
    this.subscriptions = [];
  }
  detach() {}
}

// Mock BajaScript Ord
class MockOrd {
  constructor(ordString) {
    this.ordString = ordString;
  }
  
  get() {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Parse the ORD to determine what to return
        if (this.ordString.includes('bql:')) {
          // BQL query - return mock table
          resolve(new MockTable());
        } else if (this.ordString.includes('/points/')) {
          // Point request
          resolve(new MockPoint());
        } else if (this.ordString.includes('/Drivers/')) {
          // Equipment request
          const eq = MOCK_EQUIPMENT.find(e => this.ordString.includes(e.originalName));
          resolve(new MockEquipment(eq));
        } else if (this.ordString.includes('file:')) {
          // File request - simulate file not found for new files
          resolve(null);
        } else {
          resolve(new MockComponent());
        }
      }, 50);
    });
  }
}

// Mock Table (for BQL results)
class MockTable {
  cursor(options) {
    const limit = options.limit || 100;
    
    // Return mock equipment data
    MOCK_EQUIPMENT.slice(0, limit).forEach((eq, idx) => {
      if (options.each) {
        options.each({
          get: (field) => {
            if (field === 'slotPath') return eq.slotPath;
            if (field === 'displayName') return eq.name;
            if (field === 'name') return eq.originalName;
            if (field === 'out') return eq.value || '72.5 {ok}';
            if (field === 'status') return 'ok';
            return null;
          }
        });
      }
    });
    
    if (options.after) {
      setTimeout(() => options.after(), 10);
    }
    
    return Promise.resolve();
  }
}

// Mock Equipment
class MockEquipment {
  constructor(eq) {
    this.eq = eq || {};
  }
  
  getSlots() {
    const self = this;
    const points = MOCK_POINTS[this.eq.inferredType] || MOCK_POINTS.heatpump;
    return {
      each: (callback) => {
        points.forEach(pt => {
          callback({
            getName: () => pt.name,
            getDisplayName: () => pt.displayName
          });
        });
      }
    };
  }
  
  get(slotName) {
    const points = MOCK_POINTS[this.eq.inferredType] || [];
    const pt = points.find(p => p.name === slotName);
    if (pt) return pt.value;
    return null;
  }
}

// Mock Point
class MockPoint {
  constructor() {
    this.value = (Math.random() * 50 + 50).toFixed(1);
  }
  
  get(prop) {
    if (prop === 'out') {
      return {
        getValue: () => this.value,
        toString: () => this.value + ' {ok}'
      };
    }
    return this.value;
  }
  
  getOut() {
    return { getValue: () => this.value };
  }
  
  getStatus() {
    return {
      isOk: () => true,
      isAlarm: () => false,
      isDown: () => false,
      isStale: () => false,
      isFault: () => false,
      flagsToString: () => 'ok'
    };
  }
}

// Mock Component
class MockComponent {
  get(prop) { return null; }
  getSlots() {
    return { each: () => {} };
  }
}

// Create the mock baja object
window.baja = {
  Ord: {
    make: (ordString) => new MockOrd(ordString)
  },
  Subscriber: MockSubscriber
};

// Mock require for BajaScript
window.require = function(deps, callback) {
  // Simulate async module loading
  setTimeout(() => {
    callback(window.baja, Promise);
  }, 100);
};

// Override config functions to use localStorage only
window.MOCK_MODE = true;

// Mock loadConfig
window.mockLoadConfig = async function() {
  const saved = localStorage.getItem('mockDashboardConfig');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {}
  }
  return mockConfig;
};

// Mock saveConfig
window.mockSaveConfig = async function(config) {
  localStorage.setItem('mockDashboardConfig', JSON.stringify(config));
  return true;
};

console.log('🎭 Mock BajaScript loaded - running in test mode');
console.log('📦 Mock equipment:', MOCK_EQUIPMENT.length, 'devices');
console.log('🔧 Mock points available for each device type');

