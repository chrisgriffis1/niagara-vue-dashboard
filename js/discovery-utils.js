/* @noSnoop */
/**
 * Discovery Utilities
 * Helper functions for device discovery and type inference
 */

// ========================================
// DEVICE TYPE INFERENCE PATTERNS
// ========================================

window.deviceTypePatterns = {
  // Heat Pump patterns
  heatpump: {
    namePatterns: [/^hp\d+/i, /heat\s*pump/i, /wshp/i, /water.?source.?heat.?pump/i],
    pointPatterns: ['compressor', 'reversing', 'eheat', 'aux heat', 'defrost'],
    priority: 10
  },
  
  // Air Handling Unit patterns
  ahu: {
    namePatterns: [/^ahu\d*/i, /air.?hand/i, /^mau\d*/i, /make.?up.?air/i, /rtu/i, /roof.?top/i],
    pointPatterns: ['supply fan', 'return fan', 'oa damper', 'filter', 'economizer'],
    priority: 9
  },
  
  // VAV Box patterns
  vav: {
    namePatterns: [/^vav/i, /variable.?air/i],
    pointPatterns: ['damper', 'reheat', 'cfm', 'air flow'],
    priority: 8
  },
  
  // Fan Coil Unit patterns
  fcu: {
    namePatterns: [/^fcu\d*/i, /fan.?coil/i, /^fc\d+/i],
    pointPatterns: ['fan speed', 'valve', 'coil'],
    priority: 7
  },
  
  // Chiller patterns
  chiller: {
    namePatterns: [/chiller/i, /^ch\d+/i],
    pointPatterns: ['chw', 'chilled', 'condenser', 'evaporator'],
    priority: 10
  },
  
  // Boiler patterns  
  boiler: {
    namePatterns: [/boiler/i, /^blr\d*/i],
    pointPatterns: ['hhw', 'hot water', 'burner', 'stack', 'flue'],
    priority: 10
  },
  
  // Cooling Tower patterns
  coolingtower: {
    namePatterns: [/cooling.?tower/i, /^ct\d*/i, /^ctp\d*/i],
    pointPatterns: ['tower', 'condenser', 'basin', 'fan speed'],
    priority: 9
  },
  
  // Pump patterns
  pump: {
    namePatterns: [/pump/i, /^p\d+/i, /^clp\d*/i, /^chwp/i, /^hwp/i],
    pointPatterns: ['flow', 'pressure', 'psi', 'gpm', 'vfd'],
    priority: 6
  },
  
  // Exhaust Fan patterns
  exhaustfan: {
    namePatterns: [/exhaust/i, /^ef\d*/i, /^exf/i, /ex\s*fan/i],
    pointPatterns: ['exhaust', 'status', 'run'],
    priority: 5
  },
  
  // Generator patterns
  generator: {
    namePatterns: [/generator/i, /genset/i, /^gen\d*/i],
    pointPatterns: ['fuel', 'coolant', 'battery', 'engine', 'oil pressure'],
    priority: 10
  },
  
  // Water sensor patterns
  watersensor: {
    namePatterns: [/water/i, /h20/i, /h2o/i, /^dom/i],
    pointPatterns: ['leak', 'flow', 'temp', 'level'],
    priority: 4
  },
  
  // UPS/Charger patterns
  charger: {
    namePatterns: [/charger/i, /ups/i, /battery/i],
    pointPatterns: ['ac_on', 'ac_fail', 'batt', 'voltage'],
    priority: 5
  }
};

// ========================================
// TYPE INFERENCE
// ========================================

/**
 * Infer device type from name and points
 * @param {string} deviceName - Device name
 * @param {array} points - Array of point names (optional)
 * @returns {object} - Inferred type info
 */
window.inferDeviceType = function(deviceName, points) {
  var name = (deviceName || '').toLowerCase();
  points = points || [];
  
  var bestMatch = {
    type: 'unknown',
    confidence: 0,
    matchedOn: 'none'
  };
  
  // Check each device type
  for (var typeKey in window.deviceTypePatterns) {
    var pattern = window.deviceTypePatterns[typeKey];
    var confidence = 0;
    var matchedOn = [];
    
    // Check name patterns
    for (var i = 0; i < pattern.namePatterns.length; i++) {
      if (pattern.namePatterns[i].test(name)) {
        confidence += 50;
        matchedOn.push('name');
        break;
      }
    }
    
    // Check point patterns
    var pointStr = points.join(' ').toLowerCase();
    for (var j = 0; j < pattern.pointPatterns.length; j++) {
      if (pointStr.indexOf(pattern.pointPatterns[j]) !== -1) {
        confidence += 10;
        if (matchedOn.indexOf('points') === -1) {
          matchedOn.push('points');
        }
      }
    }
    
    // Apply priority bonus
    confidence += pattern.priority;
    
    if (confidence > bestMatch.confidence) {
      bestMatch = {
        type: typeKey,
        confidence: confidence,
        matchedOn: matchedOn.join(', ')
      };
    }
  }
  
  // Require minimum confidence
  if (bestMatch.confidence < 25) {
    bestMatch.type = 'unknown';
  }
  
  return bestMatch;
};

/**
 * Get display name for a device type
 * @param {string} typeKey - Type key (e.g., 'heatpump')
 * @returns {string} - Human-readable name
 */
window.getDeviceTypeDisplayName = function(typeKey) {
  var displayNames = {
    heatpump: 'Heat Pump',
    ahu: 'Air Handler',
    vav: 'VAV Box',
    fcu: 'Fan Coil Unit',
    chiller: 'Chiller',
    boiler: 'Boiler',
    coolingtower: 'Cooling Tower',
    pump: 'Pump',
    exhaustfan: 'Exhaust Fan',
    generator: 'Generator',
    watersensor: 'Water Sensor',
    charger: 'Charger/UPS',
    chilledwater: 'Chilled Water',
    unknown: 'Other Equipment'
  };
  
  return displayNames[typeKey] || typeKey || 'Unknown';
};

/**
 * Get icon for a device type
 * @param {string} typeKey - Type key
 * @returns {string} - Emoji icon
 */
window.getDeviceTypeIcon = function(typeKey) {
  var icons = {
    heatpump: '🔥❄️',
    ahu: '🌬️',
    vav: '📦',
    fcu: '🌀',
    chiller: '❄️',
    boiler: '🔥',
    coolingtower: '🗼',
    pump: '💧',
    exhaustfan: '🌪️',
    generator: '⚡',
    watersensor: '💦',
    charger: '🔋',
    chilledwater: '🧊',
    unknown: '🔧'
  };
  
  return icons[typeKey] || '📟';
};

// ========================================
// ZONE GROUPING
// ========================================

/**
 * Group devices by zone
 * @param {array} devices - Array of device objects with zone property
 * @returns {object} - Devices grouped by zone
 */
window.groupDevicesByZone = function(devices) {
  var groups = {};
  
  devices.forEach(function(device) {
    var zone = device.zone || 'Unassigned';
    if (!groups[zone]) {
      groups[zone] = [];
    }
    groups[zone].push(device);
  });
  
  return groups;
};

/**
 * Group devices by type
 * @param {array} devices - Array of device objects with inferredType property
 * @returns {object} - Devices grouped by type
 */
window.groupDevicesByType = function(devices) {
  var groups = {};
  
  devices.forEach(function(device) {
    var type = device.inferredType || 'unknown';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(device);
  });
  
  return groups;
};

// ========================================
// NAME NORMALIZATION
// ========================================

/**
 * Normalize equipment name for display
 * @param {string} name - Raw equipment name
 * @returns {string} - Normalized display name
 */
window.normalizeEquipmentName = function(name) {
  if (!name) return 'Unknown';
  
  // Replace common abbreviations
  var normalized = name
    .replace(/^HP(\d+)/i, 'Heat Pump $1')
    .replace(/^AHU(\d+)/i, 'Air Handler $1')
    .replace(/^MAU(\d+)/i, 'Makeup Air Unit $1')
    .replace(/^RTU(\d+)/i, 'Rooftop Unit $1')
    .replace(/^VAV(\d+)/i, 'VAV Box $1')
    .replace(/^FCU(\d+)/i, 'Fan Coil $1')
    .replace(/^EF(\d+)/i, 'Exhaust Fan $1');
  
  // Remove underscores/dashes and capitalize words
  normalized = normalized
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  
  return normalized;
};

/**
 * Extract location/zone from point name
 * @param {string} pointName - Point name or path
 * @returns {string|null} - Extracted zone or null
 */
window.extractZoneFromPoint = function(pointName) {
  if (!pointName) return null;
  
  // Common zone patterns
  var zonePatterns = [
    /zone\s*[-_]?\s*(\d+[a-z]?)/i,
    /level\s*[-_]?\s*(\d+)/i,
    /floor\s*[-_]?\s*(\d+)/i,
    /area\s*[-_]?\s*([a-z0-9]+)/i,
    /building\s*[-_]?\s*([a-z0-9]+)/i
  ];
  
  for (var i = 0; i < zonePatterns.length; i++) {
    var match = pointName.match(zonePatterns[i]);
    if (match) {
      return match[0];
    }
  }
  
  return null;
};

