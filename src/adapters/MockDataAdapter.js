/**
 * Mock Data Adapter
 * Loads demo-site-profile.json and provides universal data interface
 * This adapter simulates real Niagara data for local development
 * 
 * Implements the BuildingDataAdapter interface from master-plan.md
 */

class MockDataAdapter {
  constructor() {
    this.data = null;
    this.equipment = [];
    this.points = [];
    this.pointsMap = new Map();
    this.equipmentPointsMap = new Map();
    this.subscribers = [];
    this.initialized = false;
  }

  /**
   * Initialize adapter and load mock data
   * Parses JSON and builds lookup maps for fast access
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      const response = await fetch('/mock-data/demo-site-profile.json.json');
      this.data = await response.json();
      
      // Extract equipment and points from nested data structure
      this.equipment = this.data.data.equipment || [];
      this.points = this.data.data.points || [];
      
      // Build point lookup map for fast access
      this.points.forEach(point => {
        this.pointsMap.set(point.id, point);
      });

      // Associate points with equipment
      // Since there's no explicit mapping, distribute points evenly across equipment
      this._buildEquipmentPointMapping();
      
      this.initialized = true;
      console.log(`✓ MockDataAdapter initialized: ${this.equipment.length} equipment, ${this.points.length} points`);
      return true;
    } catch (error) {
      console.error('Failed to load mock data:', error);
      return false;
    }
  }

  /**
   * Build equipment-to-points mapping
   * Distributes points across equipment for realistic simulation
   * @private
   */
  _buildEquipmentPointMapping() {
    const pointsPerEquipment = Math.floor(this.points.length / this.equipment.length);
    const remainder = this.points.length % this.equipment.length;

    let pointIndex = 0;

    this.equipment.forEach((equip, equipIndex) => {
      const pointCount = pointIndex < remainder ? pointsPerEquipment + 1 : pointsPerEquipment;
      const equipPoints = this.points.slice(pointIndex, pointIndex + pointCount);
      
      this.equipmentPointsMap.set(equip.id, equipPoints);
      pointIndex += pointCount;
    });
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
      equipmentCount: this.equipment.length,
      pointCount: this.points.length,
      equipmentTypes: await this.getEquipmentTypes(),
      locations: [...new Set(this.equipment.map(e => e.location))].sort()
    };

    return stats;
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
    return [
      {
        id: 'alarm_1',
        message: 'High temperature detected in AHU-006',
        priority: 'high',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        active: true,
        acknowledged: false,
        equipmentId: 'equip_6'
      },
      {
        id: 'alarm_2',
        message: 'Low pressure warning in Chiller-002',
        priority: 'medium',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        active: true,
        acknowledged: false,
        equipmentId: 'equip_2'
      }
    ];
  }
}

export default MockDataAdapter;

