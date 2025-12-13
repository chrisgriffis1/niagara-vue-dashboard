/* @noSnoop */
/**
 * Niagara BQL Adapter
 * Connects to actual Niagara Tridium stations using BQL queries and BajaScript
 * Implements same interface as MockDataAdapter for seamless switching
 *
 * Usage: Only works when running inside Niagara station (requires baja global)
 */

import CacheService from './CacheService.js';
import HistoryService from './HistoryService.js';
import AlarmService from './AlarmService.js';
import SubscriptionService from './SubscriptionService.js';
import DiscoveryService from './DiscoveryService.js';

class NiagaraBQLAdapter {
  constructor() {
    // Core data structures
    this.equipment = [];
    this.points = [];
    this.pointsMap = new Map();
    this.equipmentPointsMap = new Map();
    this.alarms = [];
    this.zones = [];
    this.historyIdCache = new Map();
    this.initialized = false;

    // Service instances
    this.cacheService = new CacheService();
    this.historyService = new HistoryService(this);
    this.alarmService = new AlarmService(this);
    this.subscriptionService = new SubscriptionService(this);
    this.discoveryService = new DiscoveryService(this);

    // Expose adapter to window for debugging
    if (typeof window !== 'undefined') {
      window.adapter = this;
      console.log('💡 Debug: Use window.adapter.forceRefreshNow() in console to clear cache and reload');
    }
  }

  // ===== CACHE METHODS =====
  _saveToCache() { return this.cacheService._saveToCache.call(this); }
  _saveFullCache() { return this.cacheService._saveFullCache.call(this); }
  _loadFullCache() { return this.cacheService._loadFullCache.call(this); }
  _clearOldHistoryData() { return this.cacheService._clearOldHistoryData.call(this); }
  _scheduleBackgroundCache() { return this.cacheService._scheduleBackgroundCache.call(this); }
  _loadFromCache() { return this.cacheService._loadFromCache.call(this); }
  clearCache() { return this.cacheService.clearCache.call(this); }
  forceRefreshNow() { return this.cacheService.forceRefreshNow.call(this); }
  scheduleRefresh() { return this.cacheService.scheduleRefresh.call(this); }

  // ===== HISTORY METHODS =====
  getHistoricalData(pointIdOrObj, timeRange) {
    return this.historyService.getHistoricalData(pointIdOrObj, timeRange);
  }

  // ===== ALARM METHODS =====
  getAlarms() { return this.alarmService.getAlarms(); }
  subscribeToAlarms(callback) { return this.alarmService.subscribeToAlarms(callback); }

  // ===== SUBSCRIPTION METHODS =====
  subscribeToEquipment(equipmentId, callback) {
    return this.subscriptionService.subscribeToEquipment(equipmentId, callback);
  }
  subscribeToPoint(slotPath, callback) {
    return this.subscriptionService.subscribeToPoint(slotPath, callback);
  }
  subscribeToPointDevice(equipment, callback) {
    return this.subscriptionService.subscribeToPointDevice(equipment, callback);
  }

  // ===== DISCOVERY METHODS =====
  discoverDevices() { return this.discoveryService.discoverDevices(); }
  getZones() { return this.discoveryService.getZones(); }

  /**
   * Get baja global (checks both global scope and window.baja)
   */
  _getBaja() {
    return (typeof baja !== 'undefined') ? baja :
           (typeof window !== 'undefined' && window.baja) ? window.baja : null;
  }

  /**
   * Check if running in Niagara environment
   */
  _isNiagaraEnvironment() {
    const baja = this._getBaja();
    return baja && typeof baja.query === 'function';
  }

  /**
   * Initialize adapter - check for Niagara environment
   */
  async initialize() {
    if (this.initialized) return;

    console.log('🔧 Initializing NiagaraBQLAdapter...');

    if (!this._isNiagaraEnvironment()) {
      throw new Error('❌ Niagara environment not detected. This adapter requires BajaScript (baja global). Use MockDataAdapter for local development.');
    }

    // BUILD MARKER: 2025-12-11 11:58PM - Zone discovery fix
    try {
      // Try full cache first
      if (this._loadFullCache()) {
        console.log('✅ Loaded from full cache');
        this._scheduleBackgroundCache();
        this.initialized = true;
        return;
      }

      // Try basic cache
      if (this._loadFromCache()) {
        console.log('✅ Loaded from basic cache');
        // Start background loading
        this._startBackgroundDiscovery();
        this._scheduleBackgroundCache();
        this.initialized = true;
        return;
      }

      // Fresh discovery
      await this._performFullDiscovery();

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }

    this.initialized = true;
  }

  /**
   * Perform full discovery (equipment, points, zones, history)
   */
  async _performFullDiscovery() {
    console.log('🔍 Performing full discovery...');

    // Discover equipment
    this.equipment = await this.discoveryService.discoverDevices();

    // Build point mappings
    this.discoveryService._buildEquipmentPointMapping();

    // Discover zones
    this.zones = await this.discoveryService._discoverZones();

    // Cache history IDs
    await this.historyService._cacheAllHistoryIds();

    // Start alarm monitoring
    await this.alarmService._startAlarmMonitoring();
    this.alarmService._setupAutoRefresh();

    // Start live subscriptions
    await this.subscriptionService._startLiveSubscriptions();

    console.log('✅ Full discovery complete');
  }

  /**
   * Start background discovery for cached scenarios
   */
  async _startBackgroundDiscovery() {
    setTimeout(async () => {
      try {
        console.log('🔄 Starting background discovery...');

        // Load points for equipment
        await this._loadPointsForEquipment();

        // Cache history IDs
        await this.historyService._cacheAllHistoryIds();

        // Start alarm monitoring
        await this.alarmService._startAlarmMonitoring();
        this.alarmService._setupAutoRefresh();

        // Start live subscriptions
        await this.subscriptionService._startLiveSubscriptions();

        console.log('✅ Background discovery complete');
      } catch (error) {
        console.warn('⚠️ Background discovery failed:', error);
      }
    }, 100);
  }

  /**
   * Load points for equipment
   */
  async _loadPointsForEquipment() {
    // Load a few points per equipment for initial display
    const pointsToLoad = [];
    for (const equip of this.equipment.slice(0, 10)) { // Limit to first 10 equipment
      const points = this.equipmentPointsMap.get(equip.id) || [];
      pointsToLoad.push(...points.slice(0, 5)); // 5 points per equipment
    }

    if (pointsToLoad.length > 0) {
      console.log(`📊 Loading ${pointsToLoad.length} points for equipment...`);
      // Points are already loaded from cache, just ensure mappings
      this.discoveryService._buildEquipmentPointMapping();
    }
  }

  /**
   * Get points for a specific equipment - Tesla style: filtered and prioritized
   */
  async getPointsByEquipment(equipmentId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const points = this.equipmentPointsMap.get(equipmentId) || [];

    // Apply Tesla-style filtering and prioritization
    const filtered = this._filterAndPrioritizePoints(points, options);

    return filtered.map(point => ({
      id: point.id,
      name: point.displayName || point.name,
      displayName: point.displayName || point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      ord: point.ord,
      slotPath: point.slotPath,
      equipmentId: point.equipmentId,
      displayValue: this._formatPointValue(point),
      trendable: point.trendable,
      hasHistory: this.historyService._findHistoryId(point) !== null,
      historyId: null, // Lazy loaded
      priority: point.priority || 'normal'
    }));
  }

  /**
   * Tesla-style: Filter and prioritize points
   */
  _filterAndPrioritizePoints(points, options = {}) {
    const showAll = options.showAll || false;
    const maxPoints = showAll ? 100 : 10; // Show more when expanded

    // Define priority prefixes to filter out
    const lowPriorityPrefixes = [
      'no_', 'nvi_', 'nvo_', 'inhibit', 'Cfg_', 'Not', 'Or', 'And', 'Equal'
    ];

    const lowPriorityExact = [
      'inSpaceTemp', 'inSupplyTemp', 'inReturnTemp', 'inOutsideTemp'
    ];

    const lowPriorityContains = [
      'TUNCOS', 'OccStateIn', 'Next', 'inSpace', 'inSupply', 'inReturn', 'inOutside'
    ];

    // Filter out low priority points unless showing all
    let filtered = points;
    if (!showAll) {
      filtered = points.filter(point => {
        const name = (point.displayName || point.name || '').toLowerCase();

        // Check exact matches
        if (lowPriorityExact.some(term => name.includes(term.toLowerCase()))) {
          return false;
        }

        // Check contains
        if (lowPriorityContains.some(term => name.includes(term.toLowerCase()))) {
          return false;
        }

        // Check prefixes
        if (lowPriorityPrefixes.some(prefix => name.startsWith(prefix.toLowerCase()))) {
          return false;
        }

        return true;
      });
    }

    // Prioritize points (Space Temp, Supply Air, etc.)
    const priorityOrder = {
      'Space Temp': 10,
      'Supply Air': 9,
      'Return Air': 8,
      'Outside Air': 7,
      'Cool Call': 6,
      'Heat Call': 5,
      'Fan Status': 4,
      'Exhaust Fan': 4,
      'Temperature': 3,
      'Pressure': 2,
      'Status': 1
    };

    filtered.sort((a, b) => {
      const aName = (a.displayName || a.name || '').toLowerCase();
      const bName = (b.displayName || b.name || '').toLowerCase();

      const aPriority = Object.entries(priorityOrder).find(([key]) =>
        aName.includes(key.toLowerCase()))?.[1] || 0;
      const bPriority = Object.entries(priorityOrder).find(([key]) =>
        bName.includes(key.toLowerCase()))?.[1] || 0;

      return bPriority - aPriority;
    });

    return filtered.slice(0, maxPoints);
  }

  /**
   * Format point value for display
   */
  _formatPointValue(point) {
    if (typeof point.value === 'number') {
      const rounded = Math.round(point.value * 100) / 100;
      return point.unit ? `${rounded} ${point.unit}` : rounded.toString();
    }

    if (typeof point.value === 'boolean') {
      // Friendly boolean display
      const name = (point.displayName || point.name || '').toLowerCase();
      if (name.includes('exh') || name.includes('exhaust') || name.includes('fan')) {
        return point.value ? 'Running' : 'Stopped';
      }
      if (name.includes('call') || name.includes('enable')) {
        return point.value ? 'On' : 'Off';
      }
      return point.value ? 'True' : 'False';
    }

    return point.value?.toString() || 'Unknown';
  }

  /**
   * Get current value of a specific point
   */
  async getPointValue(pointId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointsMap.get(pointId);
    if (!point) {
      console.warn(`⚠️ Point not found: ${pointId}`);
      return null;
    }

    // Return cached value
    return point.value;
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

    const stats = {
      datasetName: 'Niagara Station (Live)',
      equipmentCount: this.equipment.length,
      pointCount: this.points.length,
      scheduleCount: 0, // Not implemented yet
      historyCount: this.historyIdCache.size,
      alarmCount: this.alarms.length,
      zoneCount: this.zones.length,

      // Equipment type breakdown
      equipmentByType: {},
      pointTypes: {},
      locations: [...new Set(this.equipment.map(e => e.location))].sort(),

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
   * Export ALL data for local testing (equipment, points, alarms, histories)
   */
  async exportForLocalTesting() {
    console.log('📦 Exporting data for local testing...');

    if (!this.initialized) {
      await this.initialize();
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      stationName: 'Niagara Station Export',
      equipment: this.equipment.map(equip => ({
        ...equip,
        points: this.equipmentPointsMap.get(equip.id) || []
      })),
      alarms: this.alarms,
      zones: this.zones,
      historyIdCache: Array.from(this.historyIdCache.entries())
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    try {
      // Try to download directly
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niagara-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Data exported successfully');
      alert('✅ Export complete! Check your downloads folder.');
    } catch (downloadError) {
      console.warn('⚠️ Direct download failed, trying alternatives...');

      // Fallback: Open in new tab
      try {
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
        window.open(dataUrl, '_blank');
        alert('📋 Export opened in new tab. Copy and save as JSON file.');
      } catch (tabError) {
        // Final fallback: Copy to clipboard
        try {
          navigator.clipboard.writeText(jsonString).then(() => {
            alert('📋 Data copied to clipboard! Paste into a JSON file.');
          });
        } catch (clipboardError) {
          // Last resort: Log to console
          console.log('📋 Export data:', jsonString);
          alert('❌ All export methods failed. Check console for JSON data.');
        }
      }
    }

    // Store for console access
    if (typeof window !== 'undefined') {
      window.lastExport = exportData;
      console.log('💡 Access exported data: window.lastExport');
    }
  }
}

export default NiagaraBQLAdapter;