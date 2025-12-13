/**
 * Mock Alarm Service
 * Handles alarm simulation and management
 */

class MockAlarmService {
  constructor() {
    this.alarms = [];
    this.subscribers = [];
  }

  /**
   * Generate mock alarms from equipment and points
   */
  generateAlarms(equipment, points) {
    console.log('🚨 Generating mock alarms...');

    this.alarms = [];

    // Generate some realistic alarms based on equipment and points
    equipment.forEach((equip, index) => {
      // About 10% of equipment should have alarms
      if (Math.random() < 0.1) {
        const alarmTypes = ['critical', 'high', 'medium', 'low'];
        const alarmType = alarmTypes[Math.floor(Math.random() * alarmTypes.length)];

        const alarm = {
          id: `alarm-${equip.id}-${Date.now()}`,
          equipmentId: equip.id,
          equipmentName: equip.name,
          priority: alarmType,
          message: this.generateAlarmMessage(equip, alarmType),
          timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24 hours
          acknowledged: Math.random() < 0.3, // 30% acknowledged
          source: `${equip.name} - ${this.getAlarmSource(equip)}`
        };

        this.alarms.push(alarm);
      }
    });

    // Sort by priority and timestamp (most recent first)
    this.alarms.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.timestamp - a.timestamp;
    });

    console.log(`✓ Generated ${this.alarms.length} mock alarms`);
    return this.alarms;
  }

  /**
   * Generate realistic alarm message
   */
  generateAlarmMessage(equip, priority) {
    const messages = {
      critical: [
        'Critical temperature exceeded',
        'Equipment offline',
        'Power failure detected',
        'Sensor malfunction'
      ],
      high: [
        'High temperature warning',
        'Communication lost',
        'Pressure out of range',
        'Flow rate abnormal'
      ],
      medium: [
        'Temperature elevated',
        'Minor communication issue',
        'Slight pressure deviation',
        'Maintenance required'
      ],
      low: [
        'Temperature slightly high',
        'Periodic check needed',
        'Minor adjustment recommended',
        'Information only'
      ]
    };

    const messageList = messages[priority] || messages.medium;
    return messageList[Math.floor(Math.random() * messageList.length)];
  }

  /**
   * Get alarm source based on equipment type
   */
  getAlarmSource(equip) {
    const sources = {
      'VAV': ['Temperature Sensor', 'Damper Actuator', 'Flow Sensor'],
      'AHU': ['Supply Fan', 'Return Fan', 'Coil Valve', 'Temperature Sensor'],
      'Chiller': ['Compressor', 'Pump', 'Temperature Sensor', 'Pressure Sensor'],
      'Pump': ['Motor', 'Pressure Sensor', 'Flow Sensor'],
      'Boiler': ['Burner', 'Temperature Sensor', 'Pressure Sensor']
    };

    const equipSources = sources[equip.type] || ['Sensor', 'Actuator', 'Controller'];
    return equipSources[Math.floor(Math.random() * equipSources.length)];
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
