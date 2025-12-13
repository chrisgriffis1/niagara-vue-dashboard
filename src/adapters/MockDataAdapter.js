/**
 * Mock Data Adapter
 * Loads Niagara site profile data and provides universal data interface
 * Supports both demo data and real extracted Niagara data
 *
 * Implements the BuildingDataAdapter interface from master-plan.md
 */

import MockDatasetService from './services/MockDatasetService.js';
import MockDataLoaderService from './services/MockDataLoaderService.js';
import MockEquipmentService from './services/MockEquipmentService.js';
import MockAlarmService from './services/MockAlarmService.js';
import MockHistoryService from './services/MockHistoryService.js';
import MockPointService from './services/MockPointService.js';

class MockDataAdapter {
  constructor() {
    // Initialize service instances
    this.datasetService = new MockDatasetService();
    this.dataLoader = new MockDataLoaderService(this.datasetService);
    this.equipmentService = new MockEquipmentService(this.dataLoader);
    this.pointService = new MockPointService();
    this.alarmService = new MockAlarmService();
    this.historyService = new MockHistoryService(this);

    // Core data structures (managed by services)
    this.equipment = [];
    this.alarms = [];
    this.zones = [];
    this.subscribers = [];
    this.initialized = false;

    // Expose to window for debugging
    if (typeof window !== 'undefined') {
      window.mockAdapter = this;
      console.log('💡 Debug: Use window.mockAdapter.getAvailableDatasets() to see datasets');
    }
  }

  /**
   * Add a custom dataset (e.g., from Niagara export)
   */
  addDataset(id, name, file) {
    this.datasetService.addDataset(id, name, file);
  }

  /**
   * Get all available datasets
   */
  getAvailableDatasets() {
    const datasets = this.datasetService.getAvailableDatasets();
    return datasets.map(d => ({
      id: d.id,
      name: d.name,
      current: d.id === this.datasetService.getCurrentDatasetId()
    }));
  }

  /**
   * Switch between available datasets
   */
  async switchDataset(datasetId) {
    console.log('🔄 MockDataAdapter.switchDataset called with:', datasetId);
    await this.datasetService.switchDataset(datasetId);
    console.log('🔄 Dataset switched, new dataset:', this.datasetService.getCurrentDataset());
    this.currentDataset = datasetId;
    this.initialized = false;

    // Clear existing data
    this.equipment = [];
    this.pointService.clear();

    return await this.initialize();
  }

  /**
   * Get current dataset info
   */
  getCurrentDataset() {
    return this.datasetService.getCurrentDataset();
  }

  /**
   * Initialize adapter and load data
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    try {
      // Load data using data loader service
      const rawData = await this.dataLoader.loadData();

      // Parse data using data loader service
      const parsedData = this.dataLoader.parseData(rawData);

      // Process equipment using equipment service
      this.equipment = this.equipmentService.processEquipment(parsedData.equipment);

      // Process points using point service
      this.pointService.processPoints(this.equipment, parsedData.points);

      // Set up alarms using alarm service
      this.alarms = this.alarmService.generateAlarms(this.equipment, this.pointService.points);

      // Set up history service
      this.historyService.setupHistoryIdCache(parsedData.historyIdCache);

      // Store zones
      this.zones = parsedData.zones;

      this.initialized = true;

      // Log stats
      const dataset = this.getCurrentDataset();
      console.log(`✓ ${dataset.name} initialized:`);
      console.log(`  📦 Equipment: ${this.equipment?.length || 0}`);
      console.log(`  📍 Points: ${this.pointService.points?.length || 0}`);
      console.log(`  🚨 Alarms: ${this.alarms?.length || 0}`);
      console.log(`  🏢 Zones: ${this.zones?.length || 0}`);

      return true;
    } catch (error) {
      console.error(`❌ Initialization failed:`, error.message);

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
   * Discover all devices/equipment in the building
   */
  async discoverDevices() {
    if (!this.initialized) {
      await this.initialize();
    }

    // Return equipment data from equipment service
    const equipment = this.equipmentService.getEquipment().map(equip => {
      let currentValue = equip.currentValue;
      
      // For point-devices without a value, try to find matching point data
      if (equip.isPointDevice && (currentValue === undefined || currentValue === null || currentValue === '')) {
        // Look for a point with matching slotPath or name
        const matchingPoint = this.pointService.points.find(p => 
          p.slotPath === equip.slotPath || 
          p.ord === equip.ord ||
          p.name === equip.name
        );
        if (matchingPoint && matchingPoint.value !== undefined) {
          currentValue = matchingPoint.value;
        }
      }
      
      return {
        id: equip.id,
        name: equip.name,
        type: equip.type,
        location: equip.location,
        zone: equip.zone,
        ord: equip.ord,
        slotPath: equip.slotPath,
        unit: equip.unit,
        isPointDevice: equip.isPointDevice || false,
        currentValue: currentValue,
        pointCount: this.pointService.getPointsByEquipment(equip.id)?.length || 0,
        status: this._getEquipmentStatus(equip.id)
      };
    });
    
    // Debug: Count point-devices and show their values
    const pointDevices = equipment.filter(e => e.isPointDevice);
    console.log(`🔍 discoverDevices - ${equipment.length} total, ${pointDevices.length} point-devices`);
    if (pointDevices.length > 0) {
      console.log('📍 First 3 point-devices:', pointDevices.slice(0, 3).map(e => `${e.name}=${e.currentValue}`).join(', '));
    }
    
    return equipment;
  }

  /**
   * Get equipment status based on its points
   */
  _getEquipmentStatus(equipmentId) {
    const points = this.pointService.getPointsByEquipment(equipmentId) || [];

    // Simple status logic based on point values
    const hasIssue = points.some(point => {
      if (typeof point.value === 'number') {
        return point.value > 95 || point.value < 5;
      }
      return false;
    });

    return hasIssue ? 'warning' : 'ok';
  }

  /**
   * Get all points for a specific equipment
   */
  async getPointsByEquipment(equipmentId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const points = this.pointService.getPointsByEquipment(equipmentId);

    // Return formatted point data with all fields needed for sparklines
    return points.map(point => ({
      id: point.id,
      name: point.name,
      displayName: point.displayName || point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      ord: point.ord,
      slotPath: point.slotPath || point.ord,
      equipmentId: point.equipmentId || equipmentId,
      displayValue: this.pointService.formatPointValue(point),
      trendable: true, // All points are "trendable" in mock mode
      hasHistory: true, // Enable history for all points in mock mode
      historyId: point.historyId || `mock_${point.id}`,
      priority: point.priority || 'normal'
    }));
  }

  /**
   * Get current value of a specific point
   */
  async getPointValue(pointId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointService.getPointById(pointId);

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
      displayValue: this.pointService.formatPointValue(point),
      timestamp: new Date()
    };
  }

  /**
   * Get historical data for trending
   */
  async getHistoricalData(pointIdOrObj, timeRange = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.historyService.getHistoricalData(pointIdOrObj, timeRange);
  }

  /**
   * Get all equipment of a specific type
   */
  async getEquipmentByType(type) {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.equipment.filter(equip => equip.type === type);
  }

  /**
   * Get all unique equipment types
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
   */
  async getBuildingStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.equipment) {
      throw new Error('Adapter not properly initialized - missing equipment data');
    }

    const stats = {
      datasetName: this.getCurrentDataset().name,
      equipmentCount: this.equipment.length,
      pointCount: this.pointService.points.length,
      scheduleCount: 0,
      historyCount: this.historyService ? 69 : 0,
      taggedComponentCount: 0,
      equipmentTypes: this.equipmentService.getEquipmentTypes(),
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
    this.pointService.points.forEach(point => {
      stats.pointTypes[point.type] = (stats.pointTypes[point.type] || 0) + 1;
    });

    // Calculate points per equipment stats
    if (this.equipment.length > 0) {
      const pointCounts = this.equipment.map(equip =>
        this.pointService.getPointsByEquipment(equip.id).length
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
   * Subscribe to alarm updates
   */
  subscribeToAlarms(callback) {
    return this.alarmService.subscribeToAlarms(callback);
  }

  /**
   * Get current alarms
   */
  getAlarms() {
    return this.alarmService.getAlarms();
  }

  /**
   * Get zones
   */
  getZones() {
    return this.zones || [];
  }
}

export default MockDataAdapter;