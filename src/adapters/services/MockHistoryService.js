/**
 * Mock History Service
 * Generates mock historical data for trending
 */

class MockHistoryService {
  constructor(adapter = null) {
    this.historyIdCache = new Map();
    this.adapter = adapter;
  }

  /**
   * Generate mock historical data for a point
   * @param {Object} point - Point object with id, name, value
   * @param {Object} timeRange - Time range options
   * @returns {Array} Historical data points
   */
  generateHistoricalData(point, timeRange = {}) {
    // Default to last 24 hours
    const endDate = timeRange.endDate ? new Date(timeRange.endDate) : new Date();
    const startDate = timeRange.startDate ? new Date(timeRange.startDate) :
      new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    // Determine number of data points based on time range
    const hoursDiff = (endDate - startDate) / (1000 * 60 * 60);
    const dataPoints = timeRange.explicitRange ? 200 : Math.min(500, Math.max(48, hoursDiff * 2));

    // Use point's current value as base, or generate one
    let baseValue = typeof point.value === 'number' ? point.value : 70;

    // Generate historical data
    const history = [];
    const variance = Math.abs(baseValue) * 0.15; // 15% variance

    for (let i = dataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(startDate.getTime() + (i / (dataPoints - 1)) * (endDate - startDate));

      // Add realistic variation
      const randomVariation = (Math.random() - 0.5) * variance;
      const trendVariation = Math.sin(i / 10) * (variance / 2); // Sine wave pattern
      const seasonalVariation = Math.sin(i / 24) * (variance / 3); // Daily pattern

      const value = baseValue + randomVariation + trendVariation + seasonalVariation;

      history.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 100) / 100,
        pointId: point.id
      });
    }

    return history;
  }

  /**
   * Set up history ID cache from loaded data
   */
  setupHistoryIdCache(cacheData) {
    this.historyIdCache.clear();

    if (cacheData && Array.isArray(cacheData)) {
      cacheData.forEach(entry => {
        if (entry.key && entry.historyId) {
          this.historyIdCache.set(entry.key, entry.historyId);
        }
      });
    }

    console.log(`✓ Loaded ${this.historyIdCache.size} history ID mappings`);
  }

  /**
   * Find history ID for a point (mock implementation)
   */
  findHistoryId(point) {
    // In mock data, we generate history IDs based on point ID
    const mockHistoryId = `history-${point.id}`;
    this.historyIdCache.set(point.id, mockHistoryId);
    return mockHistoryId;
  }

  /**
   * Get historical data with caching
   */
  getHistoricalData(pointIdOrObj, timeRange = {}) {
    // Handle both point ID string and point object
    let point;
    if (typeof pointIdOrObj === 'object' && pointIdOrObj !== null) {
      point = pointIdOrObj;
    } else if (typeof pointIdOrObj === 'string') {
      // Look up point by ID from adapter's pointService
      if (this.adapter && this.adapter.pointService) {
        point = this.adapter.pointService.points.find(p => p.id === pointIdOrObj);
      }
      if (!point) {
        console.warn(`⚠️ Point with ID ${pointIdOrObj} not found for historical data`);
        console.log('📍 Trying to find point in equipment...');
        
        // Try to find it as equipment (for point-devices)
        if (this.adapter && this.adapter.equipment) {
          const equipment = this.adapter.equipment.find(e => e.id === pointIdOrObj);
          if (equipment && equipment.isPointDevice) {
            console.log(`✓ Found as point-device equipment: ${equipment.name}`);
            point = {
              id: equipment.id,
              name: equipment.name,
              value: equipment.currentValue,
              type: equipment.type,
              unit: equipment.unit
            };
          }
        }
        
        if (!point) {
          console.warn(`❌ Could not find point or equipment with ID: ${pointIdOrObj}`);
          return [];
        }
      }
    } else {
      console.log(`⚠️ Invalid parameter for getHistoricalData: ${typeof pointIdOrObj}`);
      return [];
    }

    // Generate mock historical data
    const historyData = this.generateHistoricalData(point, timeRange);
    console.log(`📈 Generated ${historyData.length} mock history points for ${point.name}`);

    return historyData;
  }

  /**
   * Get available history configurations
   */
  getAvailableHistories() {
    return Array.from(this.historyIdCache.entries()).map(([key, historyId]) => ({
      key,
      historyId
    }));
  }

  /**
   * Clear history cache
   */
  clearCache() {
    this.historyIdCache.clear();
    console.log('🧹 Cleared history cache');
  }
}

export default MockHistoryService;
