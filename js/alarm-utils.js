/* @noSnoop */
/**
 * Alarm Utilities
 * Helper functions for alarm dashboard processing
 */

// ========================================
// ALARM DATA EXTRACTION
// ========================================

/**
 * Extract equipment name from a source path
 * Example: "slot:/Drivers/BacnetNetwork/HP5/points/Monitor/SpaceTemp" -> "HP5"
 * @param {string} sourceName - Source path or name
 * @returns {string} - Equipment name
 */
window.extractEquipmentName = function(sourceName) {
  if (!sourceName) return 'Unknown';
  
  // Try to extract equipment name from slot path
  var match = sourceName.match(/\/([^\/]+)\/points\//);
  if (match) return match[1];
  
  // Fallback: try to find HP/MAU/AHU pattern
  match = sourceName.match(/(HP|MAU|AHU|VAV|FCU|RTU|WSHP|CU|EF)\d+[^\/]*/i);
  if (match) return match[0];
  
  return sourceName.split('/')[0] || 'Unknown';
};

/**
 * Extract point name from a source path
 * Example: ".../no_CtrlSpaceTemp/OutOfRangeAlarmExt" -> "no_CtrlSpaceTemp"
 * @param {string} sourceName - Source path or name
 * @returns {string} - Point name
 */
window.extractPointName = function(sourceName) {
  if (!sourceName) return 'Unknown';
  
  // Extract point name - handle alarm extensions
  var match = sourceName.match(/\/([^\/]+)\/[^\/]*AlarmExt$/);
  if (match) return match[1];
  
  // Try to get the point name from common patterns
  match = sourceName.match(/\/points\/[^\/]+\/([^\/]+)$/);
  if (match) return match[1];
  
  match = sourceName.match(/\/Monitor\/([^\/]+)$/);
  if (match) return match[1];
  
  // Fallback: Extract last part of path
  var parts = sourceName.split('/');
  return parts[parts.length - 1] || 'Unknown';
};

// ========================================
// ALARM FILTERING
// ========================================

/**
 * Filter alarms based on criteria
 * @param {array} alarms - Array of alarm objects
 * @param {object} options - Filter options
 * @returns {array} - Filtered alarms
 */
window.filterAlarms = function(alarms, options) {
  options = options || {};
  var filterType = options.filterType || 'all';
  var searchText = (options.searchText || '').toLowerCase();
  var equipmentFilter = options.equipmentFilter || null;
  
  return alarms.filter(function(alarm) {
    // Apply filter type
    if (filterType === 'unacked' && !alarm.ackState.toLowerCase().includes('unacked')) {
      return false;
    }
    if (filterType === 'active' && alarm.normalTime && alarm.normalTime.toString() !== 'null') {
      return false;
    }
    
    // Apply equipment filter
    if (equipmentFilter) {
      var equipment = window.extractEquipmentName(alarm.sourcePath || alarm.sourceName);
      if (equipment.toLowerCase().indexOf(equipmentFilter.toLowerCase()) === -1) {
        return false;
      }
    }
    
    // Apply search text
    if (searchText) {
      var searchable = (alarm.sourceName + ' ' + alarm.msgText).toLowerCase();
      if (searchable.indexOf(searchText) === -1) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Sort alarms by a field
 * @param {array} alarms - Array of alarm objects
 * @param {string} field - Field to sort by
 * @param {boolean} descending - Sort descending (default: true)
 * @returns {array} - Sorted alarms
 */
window.sortAlarms = function(alarms, field, descending) {
  field = field || 'timestamp';
  descending = descending !== false;
  
  return alarms.slice().sort(function(a, b) {
    var aVal = a[field];
    var bVal = b[field];
    
    if (aVal === bVal) return 0;
    
    var comparison = 0;
    if (aVal > bVal) comparison = 1;
    if (aVal < bVal) comparison = -1;
    
    return descending ? -comparison : comparison;
  });
};

// ========================================
// ALARM STATISTICS
// ========================================

/**
 * Calculate alarm statistics
 * @param {array} alarms - Array of alarm objects
 * @returns {object} - Statistics object
 */
window.calculateAlarmStats = function(alarms) {
  var stats = {
    total: 0,
    unacked: 0,
    active: 0,
    byEquipment: {},
    byAlarmClass: {},
    oldest: null,
    newest: null
  };
  
  alarms.forEach(function(alarm) {
    stats.total++;
    
    if (alarm.ackState && alarm.ackState.toLowerCase().includes('unacked')) {
      stats.unacked++;
    }
    
    if (!alarm.normalTime || alarm.normalTime.toString() === 'null') {
      stats.active++;
    }
    
    // Group by equipment
    var equipment = window.extractEquipmentName(alarm.sourcePath || alarm.sourceName);
    if (!stats.byEquipment[equipment]) {
      stats.byEquipment[equipment] = 0;
    }
    stats.byEquipment[equipment]++;
    
    // Group by alarm class
    if (alarm.alarmClass) {
      var alarmClass = alarm.alarmClass.toString();
      if (!stats.byAlarmClass[alarmClass]) {
        stats.byAlarmClass[alarmClass] = 0;
      }
      stats.byAlarmClass[alarmClass]++;
    }
    
    // Track oldest/newest
    if (alarm.timestamp) {
      var ts = alarm.timestamp instanceof Date ? alarm.timestamp : new Date(alarm.timestamp);
      if (!stats.oldest || ts < stats.oldest) stats.oldest = ts;
      if (!stats.newest || ts > stats.newest) stats.newest = ts;
    }
  });
  
  return stats;
};

// ========================================
// ALARM SEVERITY
// ========================================

/**
 * Get alarm severity level (for sorting/display)
 * @param {object} alarm - Alarm object
 * @returns {number} - Severity level (higher = more severe)
 */
window.getAlarmSeverity = function(alarm) {
  var severity = 0;
  
  // Unacked alarms are more severe
  if (alarm.ackState && alarm.ackState.toLowerCase().includes('unacked')) {
    severity += 10;
  }
  
  // Active alarms are more severe
  if (!alarm.normalTime || alarm.normalTime.toString() === 'null') {
    severity += 20;
  }
  
  // Check alarm class name for severity hints
  if (alarm.alarmClass) {
    var className = alarm.alarmClass.toString().toLowerCase();
    if (className.includes('critical') || className.includes('emergency')) {
      severity += 50;
    } else if (className.includes('high')) {
      severity += 30;
    } else if (className.includes('medium') || className.includes('warning')) {
      severity += 15;
    } else if (className.includes('low') || className.includes('info')) {
      severity += 5;
    }
  }
  
  return severity;
};

/**
 * Get alarm row background color based on state
 * @param {object} alarm - Alarm object
 * @returns {string} - CSS background color
 */
window.getAlarmRowColor = function(alarm) {
  var isUnacked = alarm.ackState && alarm.ackState.toLowerCase().includes('unacked');
  var isActive = !alarm.normalTime || alarm.normalTime.toString() === 'null';
  
  if (isUnacked && isActive) {
    return 'rgba(244, 67, 54, 0.15)'; // Red for active unacked
  } else if (isUnacked) {
    return 'rgba(255, 152, 0, 0.1)'; // Orange for unacked
  } else if (isActive) {
    return 'rgba(33, 150, 243, 0.1)'; // Blue for active
  }
  return 'rgba(76, 175, 80, 0.05)'; // Green for acknowledged/returned
};

