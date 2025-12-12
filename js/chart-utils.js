/* @noSnoop */
/**
 * Chart Utilities
 * Helper functions for history chart rendering and point classification
 */

// ========================================
// POINT CLASSIFICATION PATTERNS
// ========================================

// Customizable point patterns for different BAS vendors/naming conventions
window.customPointPatterns = {
  // Common prefixes to strip from point names (vendor-specific namespaces)
  prefixesToStrip: ['no_', 'ni_', 'bi_', 'bo_', 'ai_', 'ao_', 'bv_', 'av_', 'mv_', 'av_', 'ctrl', 'mon_', 'fb_'],
  
  // Temperature point patterns
  temperature: {
    general: ['temp', 'temperature', 'tmp'],
    supply: ['supply', 'sat', 'da ', 'discharge', 'disch'],
    return: ['return', 'rat', 'ra ', 'ret'],
    outdoor: ['outdoor', 'outside', 'oat', 'oa ', 'ambient', 'ext'],
    space: ['space', 'room', 'zone', 'area'],
    mixed: ['mixed', 'mat', 'ma '],
    discharge: ['discharge', 'dat', 'da '],
    setpoint: ['setpoint', 'sp ', 'set pt', 'stpt', 'effsp']
  },
  
  // Call/demand patterns
  calls: {
    general: ['call', 'demand', 'output', 'stage'],
    heating: ['heat', 'htg', 'hw', 'hot'],
    cooling: ['cool', 'clg', 'cw', 'cold', 'chw'],
    fan: ['fan', 'blower', 'motor']
  },
  
  // Speed/VFD patterns
  speed: ['speed', 'vfd', 'hz', 'hertz', 'rpm', 'percent', 'pct', '%'],
  
  // Position patterns
  position: {
    general: ['position', 'pos', 'cmd', 'command'],
    damper: ['damper', 'dpr', 'dmpr', 'oa ', 'ra ', 'ma '],
    valve: ['valve', 'vlv', 'vav']
  },
  
  // Pressure patterns
  pressure: {
    general: ['pressure', 'press', 'psi', 'inwc', 'pa '],
    static: ['static', 'sp ', 'duct'],
    differential: ['diff', 'dp ', 'delta']
  },
  
  // Flow patterns
  flow: ['flow', 'cfm', 'gpm', 'lpm', 'airflow'],
  
  // Humidity patterns
  humidity: ['humidity', 'humid', 'rh ', '%rh', 'dewpoint', 'dew'],
  
  // Power/Energy patterns
  power: ['power', 'kw', 'watts', 'watt', 'load'],
  energy: ['energy', 'kwh', 'consumption'],
  
  // Status patterns
  status: ['status', 'enable', 'on off', 'run', 'state', 'mode', 'occ'],
  
  // Alarm patterns
  alarm: ['alarm', 'fault', 'error', 'trip', 'fail', 'alert'],
  
  // Setpoint patterns (general)
  setpoint: ['setpoint', 'sp ', 'set pt', 'stpt', 'effsp']
};

// ========================================
// POINT CLASSIFICATION
// ========================================

/**
 * Classify a point based on its name
 * @param {string} pointName - The point name to classify
 * @returns {object} - Classification object with category, subcategory, unit, etc.
 */
window.classifyPoint = function(pointName) {
  var name = pointName.toLowerCase();
  
  // Strip common prefixes
  var prefixRegex = new RegExp('^(' + window.customPointPatterns.prefixesToStrip.join('|') + ')', 'g');
  name = name.replace(prefixRegex, '');
  
  // Normalize separators
  name = name.replace(/[_\-$]/g, ' ');
  
  function containsAny(patterns) {
    return patterns.some(function(pattern) {
      return name.indexOf(pattern) !== -1;
    });
  }
  
  function hasWord(word) {
    var regex = new RegExp('\\b' + word + '\\b', 'i');
    return regex.test(name);
  }
  
  var classification = {
    category: 'other',
    subcategory: null,
    unit: null,
    isAnalog: true,
    isMeasurement: true,
    displayGroup: 'Other',
    icon: '📊'
  };
  
  // Temperature points
  var isSAT = hasWord('sat') || (containsAny(window.customPointPatterns.temperature.supply) && containsAny(['air', 'temp']));
  var isRAT = hasWord('rat') || (containsAny(window.customPointPatterns.temperature.return) && containsAny(['air', 'temp']));
  var isOAT = hasWord('oat') || containsAny(window.customPointPatterns.temperature.outdoor);
  var isMAT = hasWord('mat') || (containsAny(window.customPointPatterns.temperature.mixed) && containsAny(['air', 'temp']));
  var isDAT = hasWord('dat') || (containsAny(window.customPointPatterns.temperature.discharge) && containsAny(['air', 'temp']));
  
  if (containsAny(window.customPointPatterns.temperature.general) || isSAT || isRAT || isOAT || isMAT || isDAT) {
    classification.category = 'temperature';
    classification.unit = '°F';
    classification.displayGroup = 'Temperatures';
    classification.icon = '🌡️';
    
    if (isSAT) classification.subcategory = 'supply';
    else if (isRAT) classification.subcategory = 'return';
    else if (isOAT) classification.subcategory = 'outdoor';
    else if (isDAT) classification.subcategory = 'discharge';
    else if (isMAT) classification.subcategory = 'mixed';
    else if (containsAny(window.customPointPatterns.temperature.space)) classification.subcategory = 'space';
    else if (containsAny(window.customPointPatterns.temperature.setpoint)) {
      classification.subcategory = 'setpoint';
      classification.isMeasurement = false;
    }
  }
  // Call/demand points
  else if (containsAny(window.customPointPatterns.calls.general)) {
    classification.category = 'call';
    classification.isAnalog = false;
    classification.unit = 'On/Off';
    classification.isMeasurement = false;
    classification.displayGroup = 'Calls/Demands';
    classification.icon = '🔔';
    
    if (containsAny(window.customPointPatterns.calls.heating)) classification.subcategory = 'heating';
    else if (containsAny(window.customPointPatterns.calls.cooling)) classification.subcategory = 'cooling';
    else if (containsAny(window.customPointPatterns.calls.fan)) classification.subcategory = 'fan';
  }
  // Speed/VFD points
  else if (containsAny(window.customPointPatterns.speed) ||
           (containsAny(window.customPointPatterns.calls.fan) && containsAny(['percent', 'pct', '%']))) {
    classification.category = 'speed';
    classification.unit = '%';
    classification.displayGroup = 'Speeds/VFDs';
    classification.icon = '⚡';
  }
  // Position points
  else if (containsAny(window.customPointPatterns.position.general) &&
           (containsAny(window.customPointPatterns.position.damper.concat(window.customPointPatterns.position.valve)))) {
    classification.category = 'position';
    classification.unit = '%';
    classification.displayGroup = 'Positions';
    classification.icon = '🎚️';
    
    if (containsAny(window.customPointPatterns.position.damper)) classification.subcategory = 'damper';
    else if (containsAny(window.customPointPatterns.position.valve)) classification.subcategory = 'valve';
  }
  // Pressure points
  else if (containsAny(window.customPointPatterns.pressure.general)) {
    classification.category = 'pressure';
    classification.unit = 'PSI';
    classification.displayGroup = 'Pressure';
    classification.icon = '💨';
    
    if (containsAny(window.customPointPatterns.pressure.static)) classification.subcategory = 'static';
    else if (containsAny(window.customPointPatterns.pressure.differential)) classification.subcategory = 'differential';
  }
  // Flow points
  else if (containsAny(window.customPointPatterns.flow)) {
    classification.category = 'flow';
    classification.unit = 'CFM';
    classification.displayGroup = 'Flow';
    classification.icon = '💨';
  }
  // Humidity points
  else if (containsAny(window.customPointPatterns.humidity)) {
    classification.category = 'humidity';
    classification.unit = '%';
    classification.displayGroup = 'Humidity';
    classification.icon = '💧';
  }
  // Power points
  else if (containsAny(window.customPointPatterns.power)) {
    classification.category = 'power';
    classification.unit = 'kW';
    classification.displayGroup = 'Power/Energy';
    classification.icon = '⚡';
  }
  // Energy points
  else if (containsAny(window.customPointPatterns.energy)) {
    classification.category = 'energy';
    classification.unit = 'kWh';
    classification.displayGroup = 'Power/Energy';
    classification.icon = '⚡';
  }
  // Status points
  else if (containsAny(window.customPointPatterns.status)) {
    classification.category = 'status';
    classification.isAnalog = false;
    classification.unit = 'On/Off';
    classification.isMeasurement = false;
    classification.displayGroup = 'Status/Control';
    classification.icon = '🔘';
  }
  // Alarm points
  else if (containsAny(window.customPointPatterns.alarm)) {
    classification.category = 'alarm';
    classification.isAnalog = false;
    classification.unit = 'Active/Clear';
    classification.isMeasurement = true;
    classification.displayGroup = 'Alarms/Faults';
    classification.icon = '🚨';
  }
  // Setpoint points
  else if (containsAny(window.customPointPatterns.setpoint)) {
    classification.category = 'setpoint';
    classification.isMeasurement = false;
    classification.displayGroup = 'Setpoints';
    classification.icon = '🎯';
  }
  
  return classification;
};

// ========================================
// SMART COLOR ASSIGNMENT
// ========================================

/**
 * Get a color for a point based on BAS naming conventions
 * @param {string} pointName - The point name
 * @returns {string} - Hex color code
 */
window.getSmartColorForPoint = function(pointName) {
  var name = pointName.toLowerCase();
  
  // Temperature points
  if (name.includes('supply') && name.includes('temp')) return '#e74c3c'; // Red
  if (name.includes('return') && name.includes('temp')) return '#3498db'; // Blue
  if (name.includes('space') && name.includes('temp')) return '#f39c12'; // Orange
  if (name.includes('outdoor') || name.includes('outside') || name.includes('oa')) {
    if (name.includes('temp')) return '#1abc9c'; // Teal
  }
  if (name.includes('discharge') && name.includes('temp')) return '#e67e22'; // Dark Orange
  if (name.includes('mixed') && name.includes('temp')) return '#9b59b6'; // Purple
  if (name.includes('temp')) return '#c0392b'; // Dark Red
  
  // Calls/Demands
  if (name.includes('heat') && name.includes('call')) return '#27ae60'; // Green
  if (name.includes('cool') && name.includes('call')) return '#16a085'; // Dark Teal
  if (name.includes('fan') && name.includes('call')) return '#2ecc71'; // Light Green
  if (name.includes('call') || name.includes('demand')) return '#27ae60'; // Green
  
  // Speeds/VFD
  if (name.includes('speed')) return '#8e44ad'; // Purple
  if (name.includes('vfd')) return '#9b59b6'; // Light Purple
  if (name.includes('fan') && name.includes('percent')) return '#8e44ad';
  
  // Setpoints
  if (name.includes('setpoint') || name.includes('sp')) return '#f1c40f'; // Gold
  if (name.includes('ctl') && name.includes('temp')) return '#f39c12'; // Orange
  
  // Positions
  if (name.includes('damper') && name.includes('pos')) return '#7f8c8d'; // Gray
  if (name.includes('valve') && name.includes('pos')) return '#95a5a6'; // Light Gray
  if (name.includes('position')) return '#7f8c8d';
  
  // Pressure/Flow
  if (name.includes('pressure')) return '#16a085'; // Dark Teal
  if (name.includes('flow')) return '#1abc9c'; // Teal
  
  // Humidity
  if (name.includes('humid')) return '#3498db'; // Blue
  
  // Power/Energy
  if (name.includes('power') || name.includes('kw')) return '#f1c40f'; // Gold
  if (name.includes('energy')) return '#f39c12'; // Orange
  
  // Status/Enable
  if (name.includes('enable') || name.includes('status')) return '#2ecc71'; // Green
  if (name.includes('alarm') || name.includes('fault')) return '#e74c3c'; // Red
  
  // Default
  return '#3498db';
};

// ========================================
// STATUS HELPERS
// ========================================

/**
 * Get status emoji for display
 * @param {object} statusInfo - Status info object
 * @returns {string} - Emoji string
 */
window.getStatusEmoji = function(statusInfo) {
  if (!statusInfo || statusInfo.isOk) return '';
  if (statusInfo.isAlarm || statusInfo.isUnackedAlarm) return '🔴';
  if (statusInfo.isDown) return '⚫';
  if (statusInfo.isFault) return '❌';
  if (statusInfo.isStale) return '⚠️';
  if (statusInfo.isDisabled) return '🚫';
  if (statusInfo.isOverridden) return '🔧';
  return '❓';
};

// ========================================
// DATE/TIME HELPERS
// ========================================

/**
 * Format a date for datetime-local input
 * @param {Date} date - Date object
 * @returns {string} - Formatted string
 */
window.formatDatetimeLocal = function(date) {
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');
  return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
};

/**
 * Get human-readable time since a timestamp
 * @param {Date|number} timestamp - Timestamp
 * @returns {string} - Human readable string
 */
window.getTimeSince = function(timestamp) {
  var now = new Date();
  var diff = now - timestamp;
  var seconds = Math.floor(diff / 1000);
  var minutes = Math.floor(seconds / 60);
  var hours = Math.floor(minutes / 60);
  var days = Math.floor(hours / 24);
  
  if (days > 0) return days + 'd ' + (hours % 24) + 'h ago';
  if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm ago';
  if (minutes > 0) return minutes + 'm ago';
  return seconds + 's ago';
};

// ========================================
// DATA PROCESSING
// ========================================

/**
 * Filter out wild spikes caused by communication errors
 * @param {array} dataPoints - Array of {x, y} points
 * @returns {array} - Filtered points
 */
window.filterOutliers = function(dataPoints) {
  if (dataPoints.length < 3) return dataPoints;
  
  // Calculate median and IQR for outlier detection
  var values = dataPoints.map(function(p) { return p.y; }).sort(function(a, b) { return a - b; });
  var q1 = values[Math.floor(values.length * 0.25)];
  var q3 = values[Math.floor(values.length * 0.75)];
  var iqr = q3 - q1;
  
  // Outlier thresholds (more aggressive for comm errors)
  var lowerBound = q1 - (3 * iqr);
  var upperBound = q3 + (3 * iqr);
  
  // Also filter common error values
  var errorValues = [65535, 65534, -999, -9999, 999999];
  
  var filtered = dataPoints.filter(function(point) {
    // Remove known error values
    if (errorValues.indexOf(point.y) !== -1) {
      return false;
    }
    // Remove statistical outliers
    if (point.y < lowerBound || point.y > upperBound) {
      return false;
    }
    return true;
  });
  
  return filtered;
};

/**
 * Downsample data using LTTB (Largest Triangle Three Buckets) algorithm
 * @param {array} data - Array of {x, y} points
 * @param {number} targetPoints - Target number of points
 * @returns {array} - Downsampled points
 */
window.downsampleData = function(data, targetPoints) {
  if (data.length <= targetPoints) {
    return data;
  }
  
  var sampled = [];
  var bucketSize = (data.length - 2) / (targetPoints - 2);
  
  // Always keep first point
  sampled.push(data[0]);
  
  for (var i = 0; i < targetPoints - 2; i++) {
    var avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    var avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length;
    
    var avgX = 0;
    var avgY = 0;
    var avgRangeLength = avgRangeEnd - avgRangeStart;
    
    for (var j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += data[j].x;
      avgY += data[j].y;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;
    
    var rangeOffs = Math.floor((i + 0) * bucketSize) + 1;
    var rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    
    var pointX = data[sampled.length - 1].x;
    var pointY = data[sampled.length - 1].y;
    
    var maxArea = -1;
    var maxAreaPoint = null;
    
    for (var k = rangeOffs; k < rangeTo; k++) {
      var area = Math.abs((pointX - avgX) * (data[k].y - pointY) - (pointX - data[k].x) * (avgY - pointY)) * 0.5;
      if (area > maxArea) {
        maxArea = area;
        maxAreaPoint = data[k];
      }
    }
    
    sampled.push(maxAreaPoint);
  }
  
  // Always keep last point
  sampled.push(data[data.length - 1]);
  
  return sampled;
};

