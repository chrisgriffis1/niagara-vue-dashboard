/**
 * Mock Data Adapter
 * Loads demo-site-profile.json and provides universal data interface
 * This adapter simulates real Niagara data for local development
 */

class MockDataAdapter {
  constructor() {
    this.data = null;
    this.subscribers = [];
  }

  /**
   * Initialize adapter and load mock data
   */
  async initialize() {
    try {
      const response = await fetch('/mock-data/demo-site-profile.json.json');
      this.data = await response.json();
      return true;
    } catch (error) {
      console.error('Failed to load mock data:', error);
      return false;
    }
  }

  /**
   * Discover all devices/equipment in the building
   * @returns {Promise<Array>} List of devices
   */
  async discoverDevices() {
    if (!this.data) {
      await this.initialize();
    }
    // This will be implemented based on the JSON structure
    return [];
  }

  /**
   * Get current value of a specific point
   * @param {string} pointId - Unique point identifier
   * @returns {Promise<any>} Point value
   */
  async getPointValue(pointId) {
    if (!this.data) {
      await this.initialize();
    }
    // Implementation to come
    return null;
  }

  /**
   * Get historical data for trending
   * @param {string} pointId - Unique point identifier
   * @param {Object} timeRange - Start and end timestamps
   * @returns {Promise<Array>} Historical data points
   */
  async getHistoricalData(pointId, timeRange) {
    if (!this.data) {
      await this.initialize();
    }
    // Mock historical data for Chart.js
    return [];
  }

  /**
   * Subscribe to alarm updates
   * @param {Function} callback - Called when alarms update
   * @returns {Function} Unsubscribe function
   */
  subscribeToAlarms(callback) {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}

export default MockDataAdapter;

