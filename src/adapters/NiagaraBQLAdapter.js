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
import PointService from './PointService.js';
import ExportService from './ExportService.js';
import StatsService from './StatsService.js';

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
    this.pointService = new PointService(this);
    this.exportService = new ExportService(this);
    this.statsService = new StatsService(this);

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

  // ===== POINT METHODS =====
  getPointsByEquipment(equipmentId, options) {
    return this.pointService.getPointsByEquipment(equipmentId, options);
  }
  getPointValue(pointId) { return this.pointService.getPointValue(pointId); }

  // ===== EXPORT METHODS =====
  exportForLocalTesting() { return this.exportService.exportForLocalTesting(); }

  // ===== STATS METHODS =====
  getEquipmentTypes() { return this.statsService.getEquipmentTypes(); }
  getBuildingStats() { return this.statsService.getBuildingStats(); }

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

    // Preload important historical data for instant charts
    await this.historyService.preloadImportantHistories();

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


}

export default NiagaraBQLAdapter;