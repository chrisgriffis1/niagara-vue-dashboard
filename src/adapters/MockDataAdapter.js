/**
 * Mock Data Adapter
 * Loads Niagara site profile data and provides universal data interface
 * Supports both demo data and real extracted Niagara data
 * 
 * Implements the BuildingDataAdapter interface from master-plan.md
 */

class MockDataAdapter {
  constructor() {
    this.data = null;
    this.equipment = [];
    this.points = [];
    this.schedules = [];
    this.histories = [];
    this.taggedComponents = [];
    this.pointsMap = new Map();
    this.equipmentPointsMap = new Map();
    this.subscribers = [];
    this.initialized = false;
    
    // Dataset configuration
    this.availableDatasets = [
      { id: 'demo', name: 'Demo Data', file: '/mock-data/demo-site-profile.json.json' },
      { id: 'real', name: 'Real Niagara Data (83 equip, 3.3k points)', file: '/mock-data/site-profile-1765432578295.json' }
    ];
    this.currentDataset = 'demo'; // Default to demo, can be switched
  }

  /**
   * Switch between available datasets
   * @param {string} datasetId - 'demo' or 'real'
   */
  async switchDataset(datasetId) {
    const dataset = this.availableDatasets.find(d => d.id === datasetId);
    if (!dataset) {
      console.error(`Dataset not found: ${datasetId}`);
      return false;
    }

    console.log(`📊 Switching to dataset: ${dataset.name}`);
    this.currentDataset = datasetId;
    this.initialized = false;
    
    // Clear existing data
    this.equipment = [];
    this.points = [];
    this.schedules = [];
    this.histories = [];
    this.taggedComponents = [];
    this.pointsMap.clear();
    this.equipmentPointsMap.clear();
    
    return await this.initialize();
  }

  /**
   * Get current dataset info
   */
  getCurrentDataset() {
    return this.availableDatasets.find(d => d.id === this.currentDataset);
  }

  /**
   * Initialize adapter and load data
   * Parses JSON and builds lookup maps for fast access
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    const dataset = this.getCurrentDataset();
    console.log(`🔄 Loading ${dataset.name}...`);

    try {
      const response = await fetch(dataset.file);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      this.data = await response.json();
      
      // Parse data based on structure
      this._parseData();
      
      // Build point lookup map for fast access
      this.points.forEach(point => {
        this.pointsMap.set(point.id, point);
      });

      // Associate points with equipment
      this._buildEquipmentPointMapping();
      
      this.initialized = true;
      
      // Log comprehensive stats
      console.log(`✓ ${dataset.name} initialized:`);
      console.log(`  📦 Equipment: ${this.equipment.length}`);
      console.log(`  📍 Points: ${this.points.length}`);
      console.log(`  📅 Schedules: ${this.schedules.length}`);
      console.log(`  📈 Histories: ${this.histories.length}`);
      console.log(`  🏷️  Tagged Components: ${this.taggedComponents.length}`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to load ${dataset.name}:`, error.message);
      
      // If real data fails, try falling back to demo
      if (this.currentDataset === 'real') {
        console.log('⚠️  Falling back to demo data...');
        this.currentDataset = 'demo';
        return await this.initialize();
      }
      
      return false;
    }
  }

  /**
   * Parse data structure - handles both demo and real Niagara formats
   * @private
   */
  _parseData() {
    // Check if data has nested 'data' property (demo format)
    const dataSource = this.data.data || this.data;
    
    // Extract equipment
    if (dataSource.equipment && Array.isArray(dataSource.equipment)) {
      this.equipment = dataSource.equipment;
    } else if (dataSource.devices && Array.isArray(dataSource.devices)) {
      // Alternative naming
      this.equipment = dataSource.devices;
    }
    
    // Extract points
    if (dataSource.points && Array.isArray(dataSource.points)) {
      this.points = dataSource.points;
    }
    
    // Extract schedules (real data)
    if (dataSource.schedules && Array.isArray(dataSource.schedules)) {
      this.schedules = dataSource.schedules;
    }
    
    // Extract histories (real data)
    if (dataSource.histories && Array.isArray(dataSource.histories)) {
      this.histories = dataSource.histories;
    }
    
    // Extract tagged components (real data)
    if (dataSource.tags && dataSource.tags.tagData && Array.isArray(dataSource.tags.tagData)) {
      this.taggedComponents = dataSource.tags.tagData;
    } else if (dataSource.taggedComponents && Array.isArray(dataSource.taggedComponents)) {
      this.taggedComponents = dataSource.taggedComponents;
    } else if (dataSource.components && Array.isArray(dataSource.components)) {
      this.taggedComponents = dataSource.components;
    }
    
    // Normalize equipment structure
    this.equipment = this.equipment.map((equip, index) => this._normalizeEquipment(equip, index));
    
    // Normalize point structure
    this.points = this.points.map((point, index) => this._normalizePoint(point, index));
  }

  /**
   * Normalize equipment object to consistent format
   * @private
   */
  _normalizeEquipment(equip, index) {
    // Extract location from path or name
    const location = this._extractLocation(equip);
    
    // ALWAYS infer the type to get customer-friendly names
    const friendlyType = this._inferEquipmentType(equip);
    
    return {
      id: equip.id || equip.equipmentId || equip.slotPath || `equip_${index}`,
      name: equip.name || equip.displayName || equip.navName || `Equipment ${index + 1}`,
      type: friendlyType, // Use inferred friendly type
      location: location,
      ord: equip.ord || equip.slotPath || equip.path || '',
      tags: equip.tags || '',
      technicalType: equip.type, // Keep original technical type for reference
      rawData: equip // Keep original for reference
    };
  }

  /**
   * Extract location/zone from equipment path or name
   * @private
   */
  _extractLocation(equip) {
    // Check if equipment has explicit location
    if (equip.location && equip.location !== 'Unknown') {
      return equip.location;
    }
    
    const path = (equip.ord || equip.slotPath || equip.path || '').toUpperCase();
    const name = (equip.name || '').trim();
    
    // Extract location from equipment name (e.g., "HP21 300 Link Hall" → "300 Link Hall")
    // Pattern: HP## Location Name
    const hpLocationMatch = name.match(/^HP\d+\s+(.+)$/i);
    if (hpLocationMatch) {
      return hpLocationMatch[1].trim();
    }
    
    // Pattern: AHU## Location Name
    const ahuLocationMatch = name.match(/^AHU\d+\s+(.+)$/i);
    if (ahuLocationMatch) {
      return ahuLocationMatch[1].trim();
    }
    
    // Pattern: MAU## Location Name
    const mauLocationMatch = name.match(/^MAU\d+\s+(.+)$/i);
    if (mauLocationMatch) {
      return mauLocationMatch[1].trim();
    }
    
    // Pattern: VAV## Location Name
    const vavLocationMatch = name.match(/^VAV\d+\s+(.+)$/i);
    if (vavLocationMatch) {
      return vavLocationMatch[1].trim();
    }
    
    // Extract from path patterns like /Building/Floor2/Zone3/
    const pathMatch = path.match(/\/(FLOOR|LEVEL|ZONE|AREA|BUILDING|WING|SECTION)[\s_-]?(\w+)/i);
    if (pathMatch) {
      return `${pathMatch[1]} ${pathMatch[2]}`;
    }
    
    // Extract floor numbers from name or path
    const floorMatch = (name + ' ' + path).match(/(FLOOR|LEVEL|FL)\s*(\d+)/i);
    if (floorMatch) {
      return `Floor ${floorMatch[2]}`;
    }
    
    // Extract zone from name or path
    const zoneMatch = (name + ' ' + path).match(/ZONE\s*(\w+)/i);
    if (zoneMatch) {
      return `Zone ${zoneMatch[1]}`;
    }
    
    // Extract room numbers
    const roomMatch = (name + ' ' + path).match(/ROOM\s*(\d+)/i);
    if (roomMatch) {
      return `Room ${roomMatch[1]}`;
    }
    
    // Extract building name
    const buildingMatch = path.match(/\/BUILDING[\s_-]?(\w+)/i);
    if (buildingMatch) {
      return `Building ${buildingMatch[1]}`;
    }
    
    // DON'T use network as location - that's not a physical location!
    // Just return "Unassigned" if we can't find real location data
    return 'Unassigned';
  }

  /**
   * Infer equipment type from name or path
   * @private
   */
  _inferEquipmentType(equip) {
    const name = (equip.name || equip.displayName || '').toUpperCase();
    const path = (equip.ord || equip.slotPath || equip.path || '').toUpperCase();
    const type = (equip.type || '').toLowerCase();
    const combined = name + ' ' + path + ' ' + type;
    
    // Check name patterns first (highest priority - actual HVAC equipment)
    if (name.match(/^AHU[\d_-]/i)) return 'AHU';
    if (name.match(/^MAU[\d_-]/i)) return 'MAU';
    if (name.match(/^VAV[\d_-]/i)) return 'VAV';
    if (name.match(/^HP[\d_-]/i) || name.match(/^HEAT.?PUMP[\d_-]/i)) return 'Heat Pump';
    if (name.match(/^RTU[\d_-]/i)) return 'RTU';
    if (name.match(/^FCU[\d_-]/i)) return 'FCU';
    if (name.match(/^BOILER[\d_-]/i)) return 'Boiler';
    if (name.match(/^CHILLER[\d_-]/i)) return 'Chiller';
    if (name.match(/^PUMP[\d_-]/i)) return 'Pump';
    if (name.match(/^FAN[\d_-]/i)) return 'Fan';
    if (name.match(/^TOWER/i) || name.includes('PLANT')) return 'Plant';
    
    // System/Infrastructure devices - NOT equipment
    if (type.includes('thermostat') || type.includes('tc300')) return 'System Infrastructure';
    if (type.includes('station') && type.includes('niagara')) return 'System Infrastructure';
    if (type.includes('irmbacnet') || type.includes('honirm')) return 'Controller';
    if (type.includes('bacnet') && type.includes('device')) {
      // Check if it's actually equipment with a meaningful name
      if (name.match(/^(AHU|MAU|VAV|RTU|FCU|HP|BOILER|CHILLER|PUMP|FAN)/i)) {
        return this._inferEquipmentType({...equip, type: ''}); // Re-run without type
      }
      return 'System Infrastructure';
    }
    if (type.includes('modbus')) return 'System Infrastructure';
    
    // Fallback to generic patterns
    if (combined.includes('VAV')) return 'VAV';
    if (combined.includes('AHU') || combined.includes('AIR HANDLER')) return 'AHU';
    if (combined.includes('MAU') || combined.includes('MAKEUP')) return 'MAU';
    if (combined.includes('RTU') || combined.includes('ROOFTOP')) return 'RTU';
    if (combined.includes('FCU') || combined.includes('FAN COIL')) return 'FCU';
    if (combined.includes('CHILLER')) return 'Chiller';
    if (combined.includes('BOILER')) return 'Boiler';
    if (combined.includes('PUMP')) return 'Pump';
    if (combined.includes('FAN')) return 'Fan';
    
    return 'Other';
  }

  /**
   * Normalize point object to consistent format
   * @private
   */
  _normalizePoint(point, index) {
    // Extract value from curVal field (format: "value {status}")
    let value = point.value;
    
    // Handle curVal format: "value {status} @ source" or "value {status}"
    if (point.curVal) {
      const curValStr = String(point.curVal);
      const match = curValStr.match(/^(.+?)\s*\{/);
      if (match) {
        const rawValue = match[1].trim();
        // Try to parse as number or boolean
        if (rawValue === 'true') value = true;
        else if (rawValue === 'false') value = false;
        else if (!isNaN(rawValue) && rawValue !== '') value = parseFloat(rawValue);
        else value = rawValue;
      } else {
        value = curValStr;
      }
    }
    
    // Fallback to other value fields
    if (value === undefined && point.out !== undefined) value = point.out;
    if (value === undefined && point.currentValue !== undefined) value = point.currentValue;
    
    // Handle old format too: "value {status} @ source"
    if (typeof value === 'string' && value.includes('{')) {
      const match = value.match(/^(.+?)\s*\{/);
      if (match) {
        const rawValue = match[1].trim();
        if (rawValue === 'true') value = true;
        else if (rawValue === 'false') value = false;
        else if (!isNaN(rawValue) && rawValue !== '') value = parseFloat(rawValue);
        else value = rawValue;
      }
    }
    
    if (value === undefined) value = null;
    
    return {
      id: point.id || point.pointId || point.slotPath || `point_${index}`,
      name: point.name || point.displayName || point.navName || `Point ${index + 1}`,
      type: point.type || point.pointType || this._inferPointType(point),
      unit: point.unit || point.units || '',
      value: value,
      ord: point.ord || point.slotPath || point.path || '',
      equipmentId: point.equipmentId || point.equipmentPath || point.parentEquipment || null,
      facets: point.facets || [],
      trendable: point.trendable === 'true' || point.trendable === true,
      category: point.category || '',
      rawData: point // Keep original for reference
    };
  }

  /**
   * Infer point type from name, facets, or other properties
   * @private
   */
  _inferPointType(point) {
    // Check facets
    if (point.facets) {
      if (point.facets.includes('numeric') || point.facets.includes('number')) return 'Numeric';
      if (point.facets.includes('boolean') || point.facets.includes('bool')) return 'Boolean';
      if (point.facets.includes('enum')) return 'Enum';
      if (point.facets.includes('str') || point.facets.includes('string')) return 'String';
    }
    
    // Check value type
    const val = point.value || point.out || point.currentValue;
    if (typeof val === 'number') return 'Numeric';
    if (typeof val === 'boolean') return 'Boolean';
    if (typeof val === 'string') return 'String';
    
    return 'Unknown';
  }

  /**
   * Build equipment-to-points mapping
   * Uses explicit equipmentId if available, otherwise distributes points across equipment
   * @private
   */
  _buildEquipmentPointMapping() {
    // First, try to use explicit equipment associations
    const pointsWithEquipment = this.points.filter(p => p.equipmentId);
    const pointsWithoutEquipment = this.points.filter(p => !p.equipmentId);
    
    // Clear the map
    this.equipmentPointsMap.clear();
    
    // Map points that have explicit equipment IDs
    pointsWithEquipment.forEach(point => {
      if (!this.equipmentPointsMap.has(point.equipmentId)) {
        this.equipmentPointsMap.set(point.equipmentId, []);
      }
      this.equipmentPointsMap.get(point.equipmentId).push(point);
    });
    
    // If we have points without equipment, try to infer from path/ord
    pointsWithoutEquipment.forEach(point => {
      const equipId = this._inferEquipmentFromPoint(point);
      if (equipId) {
        if (!this.equipmentPointsMap.has(equipId)) {
          this.equipmentPointsMap.set(equipId, []);
        }
        this.equipmentPointsMap.get(equipId).push(point);
        point.equipmentId = equipId; // Update the point
      }
    });
    
    // For remaining unmapped points, distribute them across equipment
    const unmappedPoints = this.points.filter(p => !p.equipmentId);
    if (unmappedPoints.length > 0 && this.equipment.length > 0) {
      const pointsPerEquipment = Math.floor(unmappedPoints.length / this.equipment.length);
      const remainder = unmappedPoints.length % this.equipment.length;
      
      let pointIndex = 0;
      this.equipment.forEach((equip, equipIndex) => {
        const pointCount = equipIndex < remainder ? pointsPerEquipment + 1 : pointsPerEquipment;
        const equipPoints = unmappedPoints.slice(pointIndex, pointIndex + pointCount);
        
        if (!this.equipmentPointsMap.has(equip.id)) {
          this.equipmentPointsMap.set(equip.id, []);
        }
        this.equipmentPointsMap.get(equip.id).push(...equipPoints);
        pointIndex += pointCount;
      });
    }
    
    // Ensure all equipment has at least an empty array
    this.equipment.forEach(equip => {
      if (!this.equipmentPointsMap.has(equip.id)) {
        this.equipmentPointsMap.set(equip.id, []);
      }
    });
  }

  /**
   * Try to infer equipment ID from point's path/ord
   * @private
   */
  _inferEquipmentFromPoint(point) {
    const path = point.ord || '';
    
    // Try to match against equipment paths
    for (const equip of this.equipment) {
      const equipPath = equip.ord || '';
      // If point path starts with equipment path, it likely belongs to it
      if (path && equipPath && path.startsWith(equipPath)) {
        return equip.id;
      }
    }
    
    return null;
  }

  /**
   * Discover all devices/equipment in the building
   * @returns {Promise<Array>} List of equipment with basic info
   */
  async discoverDevices() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Return enriched equipment data with point counts
    return this.equipment.map(equip => ({
      id: equip.id,
      name: equip.name,
      type: equip.type,
      location: equip.location,
      ord: equip.ord,
      pointCount: this.equipmentPointsMap.get(equip.id)?.length || 0,
      status: this._getEquipmentStatus(equip.id)
    }));
  }

  /**
   * Get equipment status based on its points
   * @private
   * @param {string} equipmentId - Equipment identifier
   * @returns {string} Status: 'ok', 'warning', 'error'
   */
  _getEquipmentStatus(equipmentId) {
    const points = this.equipmentPointsMap.get(equipmentId) || [];
    
    // Simple status logic based on point values
    // In real implementation, this would check actual alarm states
    const hasIssue = points.some(point => {
      // Check if any numeric values are out of normal range
      if (typeof point.value === 'number') {
        return point.value > 95 || point.value < 5;
      }
      return false;
    });

    return hasIssue ? 'warning' : 'ok';
  }

  /**
   * Get all points for a specific equipment
   * @param {string} equipmentId - Equipment identifier
   * @returns {Promise<Array>} Array of points belonging to equipment
   */
  async getPointsByEquipment(equipmentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const points = this.equipmentPointsMap.get(equipmentId) || [];
    
    // Return formatted point data
    return points.map(point => ({
      id: point.id,
      name: point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      ord: point.ord,
      displayValue: this._formatPointValue(point)
    }));
  }

  /**
   * Format point value with unit for display
   * @private
   */
  _formatPointValue(point) {
    if (typeof point.value === 'number') {
      const rounded = Math.round(point.value * 100) / 100;
      return point.unit ? `${rounded} ${point.unit}` : rounded.toString();
    }
    return point.value;
  }

  /**
   * Get current value of a specific point
   * @param {string} pointId - Unique point identifier
   * @returns {Promise<Object|null>} Point data with current value
   */
  async getPointValue(pointId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointsMap.get(pointId);
    
    if (!point) {
      console.warn(`Point not found: ${pointId}`);
      return null;
    }

    return {
      id: point.id,
      name: point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      displayValue: this._formatPointValue(point),
      timestamp: new Date()
    };
  }

  /**
   * Get historical data for trending (Chart.js)
   * Generates mock historical data based on current point value
   * @param {string} pointId - Unique point identifier
   * @param {Object} timeRange - { start: Date, end: Date }
   * @returns {Promise<Array>} Historical data points
   */
  async getHistoricalData(pointId, timeRange = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointsMap.get(pointId);
    
    if (!point || typeof point.value !== 'number') {
      return [];
    }

    // Generate mock historical data
    const now = new Date();
    const hoursBack = 24;
    const dataPoints = 48; // 30-minute intervals
    const history = [];

    const baseValue = point.value;
    const variance = baseValue * 0.1; // 10% variance

    for (let i = dataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 30 * 60 * 1000));
      
      // Add some realistic variation
      const randomVariation = (Math.random() - 0.5) * variance;
      const trendVariation = Math.sin(i / 5) * (variance / 2); // Sine wave pattern
      const value = baseValue + randomVariation + trendVariation;

      history.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100,
        pointId: pointId
      });
    }

    return history;
  }

  /**
   * Get all equipment of a specific type
   * @param {string} type - Equipment type (VAV, AHU, Chiller, etc.)
   * @returns {Promise<Array>} Filtered equipment list
   */
  async getEquipmentByType(type) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.equipment.filter(equip => equip.type === type);
  }

  /**
   * Get all unique equipment types
   * @returns {Promise<Array>} Array of equipment types
   */
  async getEquipmentTypes() {
    if (!this.initialized) {
      await this.initialize();
    }

    const types = [...new Set(this.equipment.map(e => e.type))];
    return types.sort();
  }

  /**
   * Get building summary statistics
   * @returns {Promise<Object>} Building stats
   */
  async getBuildingStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    const stats = {
      datasetName: this.getCurrentDataset().name,
      equipmentCount: this.equipment.length,
      pointCount: this.points.length,
      scheduleCount: this.schedules.length,
      historyCount: this.histories.length,
      taggedComponentCount: this.taggedComponents.length,
      equipmentTypes: await this.getEquipmentTypes(),
      locations: [...new Set(this.equipment.map(e => e.location))].sort(),
      
      // Equipment type breakdown
      equipmentByType: {},
      
      // Point type breakdown
      pointTypes: {},
      
      // Points per equipment stats
      pointsPerEquipment: {
        min: 0,
        max: 0,
        avg: 0
      }
    };

    // Count equipment by type
    this.equipment.forEach(equip => {
      stats.equipmentByType[equip.type] = (stats.equipmentByType[equip.type] || 0) + 1;
    });

    // Count points by type
    this.points.forEach(point => {
      stats.pointTypes[point.type] = (stats.pointTypes[point.type] || 0) + 1;
    });

    // Calculate points per equipment stats
    if (this.equipment.length > 0) {
      const pointCounts = this.equipment.map(equip => 
        this.equipmentPointsMap.get(equip.id)?.length || 0
      );
      stats.pointsPerEquipment.min = Math.min(...pointCounts);
      stats.pointsPerEquipment.max = Math.max(...pointCounts);
      stats.pointsPerEquipment.avg = Math.round(
        pointCounts.reduce((a, b) => a + b, 0) / this.equipment.length
      );
    }

    return stats;
  }

  /**
   * Get comprehensive data statistics
   * @returns {Promise<Object>} Detailed stats about the loaded data
   */
  async getDataStats() {
    return await this.getBuildingStats();
  }

  /**
   * Subscribe to alarm updates
   * @param {Function} callback - Called when alarms update
   * @returns {Function} Unsubscribe function
   */
  subscribeToAlarms(callback) {
    this.subscribers.push(callback);
    
    // Simulate initial alarm state
    setTimeout(() => {
      callback(this._generateMockAlarms());
    }, 100);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Generate mock alarms for testing
   * @private
   */
  _generateMockAlarms() {
    // Return empty array for real data - alarms should come from actual Niagara alarm database
    if (this.currentDataset === 'real') {
      return [];
    }
    
    // Only return mock alarms for demo data
    return [
      {
        id: 'alarm_1',
        message: 'CRITICAL: System pressure exceeds safe limits in AHU-006',
        priority: 'critical',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        active: true,
        acknowledged: false,
        equipmentId: 'equip_6'
      },
      {
        id: 'alarm_2',
        message: 'High temperature detected in AHU-006',
        priority: 'high',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        active: true,
        acknowledged: false,
        equipmentId: 'equip_6'
      },
      {
        id: 'alarm_3',
        message: 'Low pressure warning in Chiller-002',
        priority: 'medium',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        active: true,
        acknowledged: false,
        equipmentId: 'equip_2'
      },
      {
        id: 'alarm_4',
        message: 'Routine maintenance due for VAV-001',
        priority: 'low',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        active: true,
        acknowledged: false,
        equipmentId: 'equip_1'
      }
    ];
  }
}

export default MockDataAdapter;

