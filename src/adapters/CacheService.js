/* @noSnoop */
/**
 * Cache Service for Niagara BQL Adapter
 * Handles all localStorage caching operations for instant loading
 */

class CacheService {
  constructor() {
    this.version = 2; // Increment when cache structure changes
  }

  /**
   * Save discovered data to localStorage cache
   */
  _saveToCache() {
    try {
      const cacheData = {
        version: this.version,
        timestamp: new Date().toISOString(),
        equipment: this.equipment,
        alarms: this.alarms,
        zones: this.zones,
        historyIdCache: Array.from(this.historyIdCache.entries()),
        equipmentPointsMap: Array.from(this.equipmentPointsMap.entries())
      };

      localStorage.setItem('niagara_dashboard_cache', JSON.stringify(cacheData));
      console.log('💾 Saved basic cache to localStorage');
    } catch (error) {
      console.warn('⚠️ Failed to save cache:', error);
    }
  }

  /**
   * FULL CACHE: Save everything for instant load (equipment, points, history data)
   */
  _saveFullCache() {
    try {
      // Don't save if we don't have the data yet
      if (!this.equipment || this.equipment.length === 0) {
        console.log('💾 Skipping full cache save - no equipment data yet');
        return;
      }

      const fullCacheData = {
        version: this.version,
        timestamp: new Date().toISOString(),
        equipment: this.equipment,
        points: this.points,
        alarms: this.alarms,
        zones: this.zones,
        historyIdCache: Array.from(this.historyIdCache.entries()),
        equipmentPointsMap: Array.from(this.equipmentPointsMap.entries()),
        histories: this.histories
      };

      localStorage.setItem('niagara-full-cache', JSON.stringify(fullCacheData));
      console.log('💾 Saved FULL cache to localStorage (instant load ready)');
    } catch (error) {
      console.warn('⚠️ Failed to save full cache:', error);
    }
  }

  /**
   * Load full cache for instant startup
   * @returns {boolean} true if full cache was loaded successfully
   */
  _loadFullCache() {
    try {
      const cached = localStorage.getItem('niagara-full-cache');
      if (!cached) {
        console.log('💾 No full cache found');
        return false;
      }

      const cacheData = JSON.parse(cached);

      // Check version and expiry (8 hours)
      if (cacheData.version !== this.version) {
        console.log('💾 Cache version mismatch, discarding');
        localStorage.removeItem('niagara-full-cache');
        return false;
      }

      const cacheAge = new Date() - new Date(cacheData.timestamp);
      const maxAge = 8 * 60 * 60 * 1000; // 8 hours
      if (cacheAge > maxAge) {
        console.log('💾 Cache expired, discarding');
        localStorage.removeItem('niagara-full-cache');
        return false;
      }

      // Load all data
      this.equipment = cacheData.equipment || [];
      this.points = cacheData.points || [];
      this.alarms = cacheData.alarms || [];
      this.zones = cacheData.zones || [];
      this.histories = cacheData.histories || [];

      // Restore Maps
      this.historyIdCache = new Map(cacheData.historyIdCache || []);
      this.equipmentPointsMap = new Map(cacheData.equipmentPointsMap || []);

      console.log(`💾 Loaded FULL cache: ${this.equipment.length} equipment, ${this.points.length} points, ${this.alarms.length} alarms`);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to load full cache:', error);
      localStorage.removeItem('niagara-full-cache');
      return false;
    }
  }

  /**
   * Clear old history data from localStorage to free space
   */
  _clearOldHistoryData() {
    try {
      const keysToRemove = [];
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('niagara-history-data-')) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.timestamp) {
              const age = now - new Date(data.timestamp).getTime();
              if (age > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Invalid data, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      if (keysToRemove.length > 0) {
        console.log(`🧹 Cleared ${keysToRemove.length} old history cache entries`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear old history data:', error);
    }
  }

  /**
   * Schedule background caching when user is idle
   */
  _scheduleBackgroundCache() {
    // Use requestIdleCallback if available, fallback to setTimeout
    const scheduleFn = window.requestIdleCallback ||
      ((callback) => setTimeout(callback, 1));

    scheduleFn(() => {
      console.log('💾 Background caching started');
      this._clearOldHistoryData();
      this._saveFullCache();
      console.log('💾 Background caching complete');
    });
  }

  /**
   * Load cached data from localStorage
   */
  _loadFromCache() {
    try {
      const cached = localStorage.getItem('niagara_dashboard_cache');
      if (!cached) {
        console.log('💾 No basic cache found');
        return false;
      }

      const cacheData = JSON.parse(cached);

      // Check version and expiry (24 hours for basic cache)
      if (cacheData.version !== this.version) {
        console.log('💾 Cache version mismatch, discarding');
        localStorage.removeItem('niagara_dashboard_cache');
        return false;
      }

      const cacheAge = new Date() - new Date(cacheData.timestamp);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (cacheAge > maxAge) {
        console.log('💾 Cache expired, discarding');
        localStorage.removeItem('niagara_dashboard_cache');
        return false;
      }

      // Load basic data
      this.equipment = cacheData.equipment || [];
      this.alarms = cacheData.alarms || [];
      this.zones = cacheData.zones || [];

      // Restore Maps
      this.historyIdCache = new Map(cacheData.historyIdCache || []);
      this.equipmentPointsMap = new Map(cacheData.equipmentPointsMap || []);

      console.log(`💾 Loaded basic cache: ${this.equipment.length} equipment, ${this.alarms.length} alarms`);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to load basic cache:', error);
      localStorage.removeItem('niagara_dashboard_cache');
      return false;
    }
  }

  /**
   * Clear all cached data and force fresh load
   */
  clearCache() {
    console.log('🗑️ Clearing all cached data...');

    // Clear all niagara-related localStorage keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('niagara-')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear in-memory caches
    this.equipment = [];
    this.points = [];
    this.alarms = [];
    this.zones = [];
    this.historyIdCache.clear();
    this.equipmentPointsMap.clear();

    console.log(`🗑️ Cleared ${keysToRemove.length} cache entries`);
  }

  /**
   * Force clear cache and reload page (call from console)
   */
  forceRefreshNow() {
    this.clearCache();
    localStorage.setItem('niagara-force-refresh', 'true');
    window.location.reload();
  }

  /**
   * Force refresh on next page load
   */
  scheduleRefresh() {
    localStorage.setItem('niagara-force-refresh', 'true');
  }
}

export default CacheService;