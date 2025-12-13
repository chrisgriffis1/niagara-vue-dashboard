/* @noSnoop */
/**
 * History Service for Niagara BQL Adapter
 * Handles all history data operations, caching, and queries
 */

class HistoryService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter for baja access
  }

  /**
   * Get baja global from parent adapter
   */
  _getBaja() {
    return this.adapter._getBaja();
  }

  /**
   * Load history ID cache from localStorage (INSTANT)
   */
  _loadHistoryIdCache() {
    try {
      const cached = localStorage.getItem('niagara-history-id-cache');
      if (!cached) return false;

      const cacheData = JSON.parse(cached);

      // Check expiry (24 hours)
      const cacheAge = new Date() - new Date(cacheData.timestamp);
      const maxAge = 24 * 60 * 60 * 1000;
      if (cacheAge > maxAge) {
        localStorage.removeItem('niagara-history-id-cache');
        return false;
      }

      // Restore Map
      this.adapter.historyIdCache = new Map(cacheData.historyIdCache);
      console.log(`📚 Loaded ${this.adapter.historyIdCache.size} history IDs from cache`);
      return true;
    } catch (error) {
      console.warn('⚠️ Failed to load history ID cache:', error);
      return false;
    }
  }

  /**
   * Save history ID cache to localStorage for instant loading next time
   */
  _saveHistoryIdCache() {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        historyIdCache: Array.from(this.adapter.historyIdCache.entries())
      };

      localStorage.setItem('niagara-history-id-cache', JSON.stringify(cacheData));
      console.log(`📚 Saved ${this.adapter.historyIdCache.size} history IDs to cache`);
    } catch (error) {
      console.warn('⚠️ Failed to save history ID cache:', error);
    }
  }

  /**
   * Fast cache of ALL history IDs for instant sparkline lookups
   */
  async _cacheAllHistoryIds() {
    const baja = this._getBaja();

    try {
      console.log('🔄 Finding all history configs...');

      // Query all history configs from station root
      const historyOrd = baja.Ord.make('station:|slot:/|bql:select slotPath as \'slotPath\\\\\',id as \'id\\\\\',toString as \'toString\\\\\' from history:HistoryConfig');
      const result = await baja.query(historyOrd);

      console.log(`🔄 Found ${result.getRows().length} history configs`);

      // Process each history config
      result.getRows().each((record) => {
        try {
          const slotPath = record.get('slotPath')?.toString() || '';
          const historyId = record.get('toString')?.toString() || record.get('id')?.toString() || '';

          if (slotPath && historyId) {
            // Clean slotPath to remove "slot:" prefix and ensure starts with "/"
            let cleanSlotPath = slotPath.replace(/^slot:/, '');
            if (!cleanSlotPath.startsWith('/')) {
              cleanSlotPath = '/' + cleanSlotPath;
            }

            // Create lookup key from slotPath (remove /historyConfig suffix for point matching)
            const lookupKey = cleanSlotPath.replace(/\/historyConfig$/, '').toLowerCase();

            this.adapter.historyIdCache.set(lookupKey, historyId);
          }
        } catch (error) {
          console.warn('⚠️ Error processing history config:', error);
        }
      });

      // Save to localStorage for instant loading next time
      this._saveHistoryIdCache();

      console.log(`✅ Cached ${this.adapter.historyIdCache.size} history IDs`);
    } catch (error) {
      console.error('❌ Failed to cache history IDs:', error);
    }
  }

  /**
   * Load history data from localStorage cache
   */
  _loadHistoryDataFromCache(historyId) {
    try {
      const cacheKey = `niagara-history-data-${historyId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);

      // Check expiry (30 minutes for history data)
      const cacheAge = new Date() - new Date(cacheData.timestamp);
      const maxAge = 30 * 60 * 1000;
      if (cacheAge > maxAge) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`📈 Loaded cached history for ${historyId}: ${cacheData.data.length} points`);
      return cacheData.data;
    } catch (error) {
      console.warn('⚠️ Failed to load cached history data:', error);
      return null;
    }
  }

  /**
   * Save history data to localStorage cache
   */
  _saveHistoryDataToCache(historyId, data) {
    try {
      const cacheData = {
        timestamp: new Date().toISOString(),
        data: data
      };

      const cacheKey = `niagara-history-data-${historyId}`;
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Failed to save history data to cache:', error);
    }
  }

  /**
   * Find history ID for a point using BQL query on HistoryConfig
   */
  async _findHistoryId(point) {
    // First check instant cache
    const slotPath = point.slotPath || point.ord || '';
    if (slotPath) {
      let cleanSlotPath = slotPath.replace(/^slot:/, '');
      if (!cleanSlotPath.startsWith('/')) {
        cleanSlotPath = '/' + cleanSlotPath;
      }
      const lookupKey = cleanSlotPath.toLowerCase();
      const cachedId = this.adapter.historyIdCache.get(lookupKey);
      if (cachedId) {
        return cachedId;
      }
    }

    // Fall back to BQL query
    const baja = this._getBaja();

    try {
      // Find history config that matches this point's slotPath
      const bql = `station:|slot:/|bql:select slotPath as 'slotPath\\\\',id as 'id\\\\',toString as 'toString\\\\' from history:HistoryConfig where slotPath like '*${point.slotPath || point.ord}*'`;
      const ord = baja.Ord.make(bql);
      const result = await baja.query(ord);

      if (result.getRows().length > 0) {
        const record = result.getRows().get(0);
        const historyId = record.get('toString')?.toString() || record.get('id')?.toString() || '';

        if (historyId) {
          // Cache for future lookups
          if (slotPath) {
            const lookupKey = cleanSlotPath.toLowerCase();
            this.adapter.historyIdCache.set(lookupKey, historyId);
          }
          return historyId;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to find history ID for point:', point.name, error);
    }

    return null;
  }

  /**
   * Query history data using history: scheme
   */
  async _queryHistory(historyId, startDate, endDate, maxRecords = 500) {
    const baja = this._getBaja();

    try {
      console.log(`📊 Querying history: ${historyId} (${maxRecords} max records)`);

      const historyOrd = baja.Ord.make(`history:${historyId}`);
      const cursor = historyOrd.get({
        start: startDate,
        end: endDate,
        limit: maxRecords
      });

      const history = [];
      let recordCount = 0;

      // Process history records
      cursor.each((record) => {
        try {
          if (recordCount >= maxRecords) return;

          const timestamp = record.get('timestamp');
          const value = record.get('value');

          if (timestamp && value !== null && value !== undefined) {
            history.push({
              timestamp: timestamp.toString(),
              value: typeof value === 'number' ? Math.round(value * 100) / 100 : value,
              pointId: historyId
            });
            recordCount++;
          }
        } catch (error) {
          console.warn('⚠️ Error processing history record:', error);
        }
      });

      console.log(`📊 Got ${history.length} history records`);
      return history;
    } catch (error) {
      console.error('❌ Failed to query history:', error);
      return [];
    }
  }

  /**
   * Get historical data for trending
   */
  async getHistoricalData(pointIdOrObj, timeRange = {}) {
    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    // Accept either point ID string or full point object
    let point;
    let pointId;
    if (typeof pointIdOrObj === 'object' && pointIdOrObj !== null) {
      point = pointIdOrObj;
      pointId = point.id;
    } else {
      pointId = pointIdOrObj;
      // Find point in our data
      point = this.adapter.points.find(p => p.id === pointId);
    }

    if (!point) {
      console.log(`⚠️ No point found for: ${pointId}`);
      return [];
    }

    // Find history ID
    const historyId = await this._findHistoryId(point);
    if (!historyId) {
      console.log(`⚠️ No history found for point: ${point.name}`);
      return [];
    }

    // Check cache first
    const cachedData = this._loadHistoryDataFromCache(historyId);
    if (cachedData) {
      return cachedData;
    }

    // Calculate date range (default to last 24 hours)
    const endDate = timeRange.endDate ? new Date(timeRange.endDate) : new Date();
    const startDate = timeRange.startDate ? new Date(timeRange.startDate) :
      new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    // Determine max records based on time range
    const hoursDiff = (endDate - startDate) / (1000 * 60 * 60);
    const maxRecords = timeRange.explicitRange ? 2000 : Math.min(500, Math.max(100, hoursDiff * 10));

    // Query history
    const history = await this._queryHistory(historyId, startDate, endDate, maxRecords);

    // Cache for future use
    if (history.length > 0) {
      this._saveHistoryDataToCache(historyId, history);
    }

    return history;
  }

  /**
   * Background load points for equipment with history (for sparklines)
   */
  async _backgroundLoadHistoryPoints() {
    const baja = this._getBaja();

    try {
      console.log('🔄 Starting background history point loading...');

      // Find equipment that has points with history
      const equipmentWithHistory = [];

      for (const equip of this.adapter.equipment) {
        const points = this.adapter.equipmentPointsMap.get(equip.id) || [];
        const pointsWithHistory = points.filter(p => p.hasHistory);

        if (pointsWithHistory.length > 0) {
          equipmentWithHistory.push({
            equipment: equip,
            points: pointsWithHistory
          });
        }
      }

      console.log(`🔄 Found ${equipmentWithHistory.length} equipment with history points`);

      // Load points in background (limit to first 5 equipment for performance)
      const toLoad = equipmentWithHistory.slice(0, 5);

      for (const item of toLoad) {
        console.log(`🔄 Pre-loading points for ${item.equipment.name}...`);

        // Load recent history for each point to cache it
        for (const point of item.points.slice(0, 3)) { // Limit to 3 points per equipment
          try {
            await this.getHistoricalData(point, {
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
              endDate: new Date()
            });
          } catch (error) {
            console.warn(`⚠️ Failed to preload history for ${point.name}:`, error);
          }
        }
      }

      console.log('✅ Background history loading complete');
    } catch (error) {
      console.error('❌ Background history loading failed:', error);
    }
  }

  /**
   * Schedule idle history preload - loads more history data when user is inactive
   */
  _scheduleIdleHistoryPreload() {
    // Use requestIdleCallback if available, fallback to setTimeout
    const scheduleFn = window.requestIdleCallback ||
      ((callback) => setTimeout(callback, 1));

    scheduleFn(() => {
      console.log('📊 Starting idle history preload...');
      this._backgroundLoadHistoryPoints();
    });
  }
}

export default HistoryService;