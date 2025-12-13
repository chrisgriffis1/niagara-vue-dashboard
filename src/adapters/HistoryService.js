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
      const table = await historyOrd.get();

      const self = this;
      let configCount = 0;
      
      return new Promise((resolve) => {
        table.cursor({
          each: function(record) {
            try {
              configCount++;
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

                self.adapter.historyIdCache.set(lookupKey, historyId);
              }
            } catch (error) {
              console.warn('⚠️ Error processing history config:', error);
            }
          },
          after: function() {
            console.log(`🔄 Found ${configCount} history configs`);
            // Save to localStorage for instant loading next time
            self._saveHistoryIdCache();
            console.log(`✅ Cached ${self.adapter.historyIdCache.size} history IDs`);
            resolve();
          }
        });
      });
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
   * Preload historical data for important points to make charts instant
   */
  async preloadImportantHistories() {
    if (!this.adapter.initialized) return;

    try {
      console.log('🔄 Preloading important historical data for instant charts...');

      // Get points that should have instant history access
      const pointsToPreload = this._getPointsForPreloading();

      console.log(`📊 Preloading history for ${pointsToPreload.length} points...`);

      // Preload history in batches to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < pointsToPreload.length; i += batchSize) {
        const batch = pointsToPreload.slice(i, i + batchSize);

        // Load batch in parallel
        const promises = batch.map(async (point) => {
          try {
            // Check if already cached
            const historyId = await this._findHistoryId(point);
            if (!historyId) return;

            const cachedData = this._loadHistoryDataFromCache(historyId);
            if (cachedData) {
              console.log(`✅ History already cached for ${point.name}`);
              return;
            }

            // Load and cache history data
            const historyData = await this._queryHistory(historyId, new Date(Date.now() - 24 * 60 * 60 * 1000), new Date(), 48);
            if (historyData && historyData.length > 0) {
              this._saveHistoryDataToCache(historyId, historyData);
              console.log(`✅ Preloaded history for ${point.name}: ${historyData.length} points`);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to preload history for ${point.name}:`, error);
          }
        });

        await Promise.all(promises);

        // Small delay between batches to be gentle on the server
        if (i + batchSize < pointsToPreload.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log('✅ History preloading complete');
    } catch (error) {
      console.warn('⚠️ History preloading failed:', error);
    }
  }

  /**
   * Determine which points should have their history preloaded for instant access
   */
  _getPointsForPreloading() {
    const pointsToPreload = [];

    // Priority 1: Points with active alarms (most important for instant access)
    const alarmedPoints = this.adapter.points.filter(point => point.hasAlarm);
    pointsToPreload.push(...alarmedPoints.slice(0, 10)); // Limit to 10

    // Priority 2: High-priority points (Temperature, Status, Pressure)
    const highPriorityPoints = this.adapter.points.filter(point =>
      point.name.toLowerCase().includes('temp') ||
      point.name.toLowerCase().includes('status') ||
      point.name.toLowerCase().includes('pressure') ||
      point.name.toLowerCase().includes('alarm')
    );
    pointsToPreload.push(...highPriorityPoints.slice(0, 15)); // Limit to 15

    // Priority 3: Recently viewed points (from localStorage)
    const recentlyViewed = this._getRecentlyViewedPoints();
    pointsToPreload.push(...recentlyViewed.slice(0, 10)); // Limit to 10

    // Priority 4: Points from first few equipment items (for initial browsing)
    const equipmentPoints = [];
    for (const equip of this.adapter.equipment.slice(0, 5)) { // First 5 equipment
      const points = this.adapter.equipmentPointsMap.get(equip.id) || [];
      equipmentPoints.push(...points.slice(0, 3)); // 3 points per equipment
    }
    pointsToPreload.push(...equipmentPoints.slice(0, 15)); // Limit to 15

    // Remove duplicates
    const uniquePoints = pointsToPreload.filter((point, index, self) =>
      index === self.findIndex(p => p.id === point.id)
    );

    return uniquePoints.slice(0, 30); // Max 30 points to preload
  }

  /**
   * Track a point as recently viewed for future preloading
   */
  _trackRecentlyViewedPoint(pointId) {
    try {
      const recentKey = 'niagara-recent-points';
      let recentPoints = [];

      const existing = localStorage.getItem(recentKey);
      if (existing) {
        recentPoints = JSON.parse(existing);
      }

      // Remove if already exists (to move to front)
      const index = recentPoints.indexOf(pointId);
      if (index > -1) {
        recentPoints.splice(index, 1);
      }

      // Add to front of array
      recentPoints.unshift(pointId);

      // Keep only last 20
      recentPoints = recentPoints.slice(0, 20);

      localStorage.setItem(recentKey, JSON.stringify(recentPoints));
    } catch (error) {
      console.warn('⚠️ Failed to track recently viewed point:', error);
    }
  }

  /**
   * Get recently viewed points from localStorage
   */
  _getRecentlyViewedPoints() {
    try {
      const recent = localStorage.getItem('niagara-recent-points');
      if (!recent) return [];

      const pointIds = JSON.parse(recent);
      return pointIds.map(id => this.adapter.pointsMap.get(id)).filter(Boolean);
    } catch (error) {
      return [];
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
      const table = await ord.get();

      const self = this;
      // Compute cleanSlotPath here so it's accessible in the closure
      let cleanSlotPath = slotPath.replace(/^slot:/, '');
      if (!cleanSlotPath.startsWith('/')) {
        cleanSlotPath = '/' + cleanSlotPath;
      }
      
      return new Promise((resolve) => {
        let found = false;
        table.cursor({
          each: function(record) {
            if (!found) {
              const historyId = record.get('toString')?.toString() || record.get('id')?.toString() || '';

              if (historyId) {
                found = true;
                // Cache for future lookups
                if (slotPath) {
                  const lookupKey = cleanSlotPath.toLowerCase();
                  self.adapter.historyIdCache.set(lookupKey, historyId);
                }
                resolve(historyId);
              }
            }
          },
          after: function() {
            if (!found) {
              resolve(null);
            }
          }
        });
      });
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

    // Track this point as recently viewed for future preloading
    this._trackRecentlyViewedPoint(pointId);

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