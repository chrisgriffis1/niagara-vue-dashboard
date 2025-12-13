/* @noSnoop */
/**
 * Alarm Service for Niagara BQL Adapter
 * Handles all alarm monitoring, querying, and subscriptions
 */

class AlarmService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter for baja access
    this.alarmCallbacks = [];
    this.alarmRefreshInterval = null;
  }

  /**
   * Get baja global from parent adapter
   */
  _getBaja() {
    return this.adapter._getBaja();
  }

  /**
   * Setup automatic alarm refresh every 10 minutes
   */
  _setupAutoRefresh() {
    // Clear existing interval
    if (this.alarmRefreshInterval) {
      clearInterval(this.alarmRefreshInterval);
    }

    // Refresh every 10 minutes
    this.alarmRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 Auto-refreshing alarms...');
        await this._startAlarmMonitoring();
      } catch (error) {
        console.warn('⚠️ Auto alarm refresh failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('⏰ Alarm auto-refresh scheduled (10 min intervals)');
  }

  /**
   * Start alarm monitoring using alarm:AlarmService subscription
   */
  async _startAlarmMonitoring() {
    const baja = this._getBaja();

    try {
      console.log('🚨 Starting alarm monitoring...');

      // Query all current alarms
      const alarmOrd = baja.Ord.make('alarm:|bql:select timestamp,alarmData.sourceName,sourceState,ackState,ackRequired,alarmData.msgText,alarmClass,alarmData.presentValue,alarmData.normalValue,alarmData.location,alarmData.toState order by timestamp desc');
      const table = await alarmOrd.get();

      const alarms = [];
      const self = this;
      
      return new Promise((resolve) => {
        let alarmCount = 0;
        table.cursor({
          each: function(record) {
            try {
              alarmCount++;
              const alarmData = {
                id: `alarm_${alarms.length}`,
                timestamp: record.get('timestamp')?.toString() || new Date().toISOString(),
                sourceName: record.get('alarmData.sourceName')?.toString() || '',
                sourceState: record.get('sourceState')?.toString() || 'normal',
                ackState: record.get('ackState')?.toString() || 'unacked',
                ackRequired: record.get('ackRequired')?.toString() === 'true',
                msgText: record.get('alarmData.msgText')?.toString() || '',
                alarmClass: record.get('alarmClass')?.toString() || 'default',
                presentValue: record.get('alarmData.presentValue')?.toString() || '',
                normalValue: record.get('alarmData.normalValue')?.toString() || '',
                location: record.get('alarmData.location')?.toString() || '',
                toState: record.get('alarmData.toState')?.toString() || ''
              };

              // Enhanced alarm processing
              const alarm = self._processAlarmRecord(alarmData);
              alarms.push(alarm);

              console.log(`🔔 DEBUG: sourceState="${alarmData.sourceState}"`);
            } catch (error) {
              console.warn('⚠️ Error processing alarm record:', error);
            }
          },
          after: function() {
            console.log(`🚨 Found ${alarmCount} alarms in system`);
            
            // Update alarms in adapter
            self.adapter.alarms = alarms;

            // Notify subscribers
            self._notifyAlarmSubscribers(alarms);

            console.log(`✅ Loaded ${alarms.length} alarms`);
            resolve(alarms);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to start alarm monitoring:', error);
      return [];
    }
  }

  /**
   * Process raw alarm record into user-friendly format
   */
  _processAlarmRecord(alarmData) {
    // Determine if alarm is active (not normal)
    const isActive = alarmData.sourceState !== 'normal';
    const isAcknowledged = alarmData.ackState === 'acked';

    // Priority mapping
    const priorityMap = {
      'critical': { level: 4, color: '#ef4444' },
      'high': { level: 3, color: '#f97316' },
      'medium': { level: 2, color: '#eab308' },
      'low': { level: 1, color: '#6b7280' },
      'default': { level: 1, color: '#6b7280' }
    };

    // Map alarm class to priority
    let priority = 'medium';
    const alarmClass = alarmData.alarmClass?.toLowerCase() || '';

    if (alarmClass.includes('critical') || alarmClass.includes('emergency')) {
      priority = 'critical';
    } else if (alarmClass.includes('high') || alarmClass.includes('fault')) {
      priority = 'high';
    } else if (alarmClass.includes('low') || alarmClass.includes('info') ||
               alarmClass.includes('default') || alarmClass.includes('defaultalarmclass')) {
      priority = 'low';
    }

    // Create readable message
    let message = alarmData.msgText || '';

    // Fallback message construction
    if (!message) {
      const sourceName = alarmData.sourceName || 'Unknown';
      const location = alarmData.location || '';
      const presentValue = alarmData.presentValue || '';
      const toState = alarmData.toState || alarmData.sourceState || '';

      if (presentValue && toState) {
        message = `${sourceName}${location ? ` (${location})` : ''} is ${toState} (${presentValue})`;
      } else if (toState) {
        message = `${sourceName}${location ? ` (${location})` : ''} is ${toState}`;
      } else {
        message = `${sourceName}${location ? ` (${location})` : ''} - ${alarmData.sourceState}`;
      }
    }

    // Extract equipment ID from source name
    let equipmentId = null;
    if (alarmData.sourceName) {
      // Try to match against known equipment
      for (const equip of this.adapter.equipment) {
        if (alarmData.sourceName.includes(equip.name) ||
            equip.name.includes(alarmData.sourceName)) {
          equipmentId = equip.id;
          break;
        }
      }
    }

    return {
      id: alarmData.id,
      timestamp: alarmData.timestamp,
      message: message,
      sourceName: alarmData.sourceName || '',
      sourceState: alarmData.sourceState || 'normal',
      alarmClass: alarmData.alarmClass || 'default',
      alarmClassFriendly: priority.charAt(0).toUpperCase() + priority.slice(1),
      priority: priority,
      priorityLevel: priorityMap[priority].level,
      color: priorityMap[priority].color,
      acknowledged: isAcknowledged,
      active: isActive,
      equipmentId: equipmentId,
      location: alarmData.location || '',
      presentValue: alarmData.presentValue || '',
      rawData: alarmData
    };
  }

  /**
   * Get current alarms
   */
  getAlarms() {
    return this.adapter.alarms || [];
  }

  /**
   * Subscribe to alarms (callback receives array of alarms)
   */
  subscribeToAlarms(callback) {
    if (!this.alarmCallbacks) {
      this.alarmCallbacks = [];
    }

    this.alarmCallbacks.push(callback);

    // Send current alarms immediately if available
    if (this.adapter.alarms && this.adapter.alarms.length > 0) {
      callback(this.adapter.alarms);
    }

    // Return unsubscribe function
    return () => {
      const index = this.alarmCallbacks.indexOf(callback);
      if (index > -1) {
        this.alarmCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify all alarm subscribers
   */
  _notifyAlarmSubscribers(alarms) {
    if (this.alarmCallbacks) {
      this.alarmCallbacks.forEach(callback => {
        try {
          callback(alarms);
        } catch (error) {
          console.warn('⚠️ Alarm subscriber callback failed:', error);
        }
      });
    }
  }

  /**
   * Acknowledge an alarm
   */
  async acknowledgeAlarm(alarmId) {
    try {
      // Find the alarm
      const alarm = this.adapter.alarms.find(a => a.id === alarmId);
      if (!alarm) {
        console.warn('⚠️ Alarm not found for acknowledgement:', alarmId);
        return false;
      }

      // In a real implementation, this would call baja to acknowledge the alarm
      // For now, just mark it as acknowledged locally
      alarm.acknowledged = true;
      alarm.ackState = 'acked';

      console.log('✓ Alarm acknowledged:', alarmId);

      // Notify subscribers
      this._notifyAlarmSubscribers(this.adapter.alarms);

      return true;
    } catch (error) {
      console.error('❌ Failed to acknowledge alarm:', error);
      return false;
    }
  }

  /**
   * Clean up alarm service
   */
  cleanup() {
    if (this.alarmRefreshInterval) {
      clearInterval(this.alarmRefreshInterval);
      this.alarmRefreshInterval = null;
    }
    this.alarmCallbacks = [];
  }
}

export default AlarmService;