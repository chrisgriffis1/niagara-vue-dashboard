/* @noSnoop */
/**
 * Subscription Service for Niagara BQL Adapter
 * Handles all live data subscriptions for real-time updates
 */

class SubscriptionService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter for baja access
    this.subscriptions = new Map(); // Map of subscription IDs to callbacks
    this.subscriptionCounter = 0;
  }

  /**
   * Get baja global from parent adapter
   */
  _getBaja() {
    return this.adapter._getBaja();
  }

  /**
   * Start live status monitoring for equipment
   */
  async _startLiveSubscriptions() {
    const baja = this._getBaja();

    try {
      console.log('🔄 Starting live equipment subscriptions...');

      // Subscribe to all points that have subscribers
      let subscriptionCount = 0;

      for (const [equipmentId, callbacks] of this.subscriptions) {
        if (callbacks && callbacks.length > 0) {
          const points = this.adapter.equipmentPointsMap.get(equipmentId) || [];

          for (const point of points) {
            if (point.slotPath) {
              try {
                await this.subscribeToPoint(point.slotPath, (value) => {
                  // Update point value in our cache
                  point.value = value;
                  point.lastUpdate = new Date().toISOString();

                  // Notify equipment subscribers
                  callbacks.forEach(callback => {
                    try {
                      callback(point, value);
                    } catch (error) {
                      console.warn('⚠️ Equipment subscription callback failed:', error);
                    }
                  });
                });
                subscriptionCount++;
              } catch (error) {
                console.warn(`⚠️ Failed to subscribe to point ${point.name}:`, error);
              }
            }
          }
        }
      }

      console.log(`✅ Started ${subscriptionCount} live subscriptions`);
    } catch (error) {
      console.error('❌ Failed to start live subscriptions:', error);
    }
  }

  /**
   * Subscribe to live updates for a single point
   */
  async subscribeToPoint(slotPath, callback) {
    const baja = this._getBaja();

    try {
      const subscriptionId = `point_${this.subscriptionCounter++}`;

      // Create Baja subscriber
      const subscriber = new baja.Subscriber();

      // Set up event handlers
      subscriber.on('changed', (event) => {
        try {
          const value = event.get('value');
          callback(value);
        } catch (error) {
          console.warn('⚠️ Point subscription callback failed:', error);
        }
      });

      // Subscribe to the point
      const ord = baja.Ord.make(slotPath);
      subscriber.subscribe(ord, { subscriber: subscriber });

      console.log(`📡 Subscribed to point: ${slotPath}`);
      return subscriptionId;
    } catch (error) {
      console.error('❌ Failed to subscribe to point:', slotPath, error);
      return null;
    }
  }

  /**
   * Subscribe to live updates for all points in an equipment
   */
  async subscribeToEquipment(equipmentId, callback) {
    if (!this.subscriptions.has(equipmentId)) {
      this.subscriptions.set(equipmentId, []);
    }

    this.subscriptions.get(equipmentId).push(callback);

    // If we already have live subscriptions running, this will get updates
    // Otherwise, _startLiveSubscriptions() will handle it when called

    console.log(`📡 Equipment subscription added: ${equipmentId}`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(equipmentId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.subscriptions.delete(equipmentId);
        }
      }
    };
  }

  /**
   * Subscribe to a point-device (single-point equipment) for live updates
   */
  async subscribeToPointDevice(equipment, callback) {
    if (!equipment.isPointDevice || !equipment.slotPath) {
      console.warn('⚠️ Cannot subscribe to non-point-device equipment');
      return null;
    }

    try {
      const subscriber = new baja.Subscriber();

      subscriber.on('changed', (event) => {
        try {
          const value = event.get('value');

          // Update equipment status based on value
          const status = this._determinePointDeviceStatus(equipment, value);

          // Call callback with status update
          callback({
            equipmentId: equipment.id,
            value: value,
            status: status,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.warn('⚠️ Point-device subscription callback failed:', error);
        }
      });

      // Subscribe to the point
      const ord = baja.Ord.make(equipment.slotPath);
      subscriber.subscribe(ord, { subscriber: subscriber });

      console.log(`📡 Subscribed to point-device: ${equipment.name}`);
      return subscriber;
    } catch (error) {
      console.error('❌ Failed to subscribe to point-device:', equipment.name, error);
      return null;
    }
  }

  /**
   * Determine status for point-device equipment based on value
   */
  _determinePointDeviceStatus(equipment, value) {
    // This is equipment-specific logic
    const name = equipment.name.toLowerCase();

    if (name.includes('exh') || name.includes('exhaust')) {
      // Exhaust fan - running when value is true
      return value === true || value === 'true' || value === 1 ? 'running' : 'stopped';
    }

    if (name.includes('temp') || name.includes('temperature')) {
      // Temperature sensor - status based on range
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        if (numValue < 32) return 'cold';
        if (numValue > 90) return 'hot';
        return 'normal';
      }
    }

    // Default logic
    if (typeof value === 'boolean') {
      return value ? 'on' : 'off';
    }

    if (typeof value === 'number') {
      return value > 0 ? 'active' : 'inactive';
    }

    return 'unknown';
  }

  /**
   * Unsubscribe from all subscriptions for an equipment
   */
  unsubscribeFromEquipment(equipmentId) {
    this.subscriptions.delete(equipmentId);
    console.log(`📡 Unsubscribed from equipment: ${equipmentId}`);
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    this.subscriptions.clear();
    this.subscriptionCounter = 0;
    console.log('🧹 Subscription service cleaned up');
  }
}

export default SubscriptionService;