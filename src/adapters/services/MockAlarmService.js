/**
 * Mock Alarm Service
 * Handles alarm data from exported JSON
 */

class MockAlarmService {
  constructor() {
    this.alarms = [];
    this.subscribers = [];
  }

  /**
   * Load alarms from parsed data or generate fallback alarms
   * @param {Array} equipment - Equipment list (for fallback generation)
   * @param {Array} points - Points list (unused, kept for API compatibility)
   * @param {Array} alarmsData - Pre-loaded alarm data from JSON
   */
  generateAlarms(equipment, points, alarmsData = null) {
    console.log('🚨 Loading alarms...');

    // If we have real alarm data from the JSON, use it
    if (alarmsData && Array.isArray(alarmsData) && alarmsData.length > 0) {
      this.alarms = alarmsData.map(alarm => ({
        ...alarm,
        // Ensure required fields exist
        active: alarm.active !== false,
        acknowledged: alarm.acknowledged || alarm.ackState === 'Acked',
        timestamp: alarm.timestamp ? new Date(alarm.timestamp) : new Date()
      }));
      console.log(`✓ Loaded ${this.alarms.length} alarms from data`);
    } else {
      // Fallback: generate mock alarms if no data provided
      this.alarms = this._generateFallbackAlarms(equipment);
      console.log(`✓ Generated ${this.alarms.length} fallback mock alarms`);
    }

    // Sort by priority and timestamp (most recent first)
    this.alarms.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return this.alarms;
  }

  /**
   * Generate fallback alarms when no data is available
   */
  _generateFallbackAlarms(equipment) {
    const alarms = [];
    
    equipment.forEach((equip, index) => {
      // About 10% of equipment should have alarms
      if (Math.random() < 0.1) {
        const alarmTypes = ['critical', 'high', 'medium', 'low'];
        const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];

        alarms.push({
          id: `alarm-${equip.id}-${Date.now()}-${index}`,
          equipmentId: equip.id,
          equipmentName: equip.name,
          priority: alarmType,
          message: `${equip.name} - System alert`,
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          acknowledged: Math.random() < 0.3,
          active: true,
          source: equip.name
        });
      }
    });

    return alarms;
  }

  /**
   * Get all alarms
   */
  getAlarms() {
    return this.alarms;
  }

  /**
   * Get alarms by priority
   */
  getAlarmsByPriority(priority) {
    return this.alarms.filter(alarm => alarm.priority === priority);
  }

  /**
   * Get unacknowledged alarms
   */
  getUnacknowledgedAlarms() {
    return this.alarms.filter(alarm => !alarm.acknowledged);
  }

  /**
   * Acknowledge alarm
   */
  acknowledgeAlarm(alarmId) {
    const alarm = this.alarms.find(a => a.id === alarmId);
    if (alarm) {
      alarm.acknowledged = true;
      this.notifySubscribers();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to alarm changes
   */
  subscribeToAlarms(callback) {
    this.subscribers.push(callback);

    // Immediately call callback with current alarms
    callback(this.alarms);
    console.log(`📡 Alarm subscriber added, sent ${this.alarms.length} initial alarms`);

    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  /**
   * Notify subscribers of alarm changes
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.alarms);
      } catch (error) {
        console.error('Error notifying alarm subscriber:', error);
      }
    });
  }

  /**
   * Get alarm statistics
   */
  getStats() {
    const stats = {
      total: this.alarms.length,
      unacknowledged: this.getUnacknowledgedAlarms().length,
      byPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    this.alarms.forEach(alarm => {
      stats.byPriority[alarm.priority]++;
    });

    return stats;
  }
}

export default MockAlarmService;
