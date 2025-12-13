/* @noSnoop */
/**
 * Point Service for Niagara BQL Adapter
 * Handles all point-related operations and formatting
 */

class PointService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter
  }

  /**
   * Get baja global from parent adapter
   */
  _getBaja() {
    return this.adapter._getBaja();
  }

  /**
   * Load points for a specific equipment using BQL
   */
  async _loadPointsForEquipment(equipmentId) {
    const baja = this._getBaja();

    try {
      const equip = this.adapter.equipment.find(e => e.id === equipmentId);
      if (!equip) {
        console.warn(`⚠️ Equipment not found: ${equipmentId}`);
        return [];
      }

      console.log(`🔍 Loading points for: ${equip.name}`);

      // Query points for this equipment
      const bql = `station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out, status where slotPath like '*${equip.slotPath}*'`;
      const ord = baja.Ord.make(bql);
      const table = await ord.get();

      const points = [];
      const self = this;
      
      return new Promise((resolve) => {
        table.cursor({
          each: function(record) {
            try {
              const point = {
                id: record.get('slotPath')?.toString() || `point_${points.length}`,
                name: record.get('displayName')?.toString() || record.get('name')?.toString() || 'Unknown',
                displayName: record.get('displayName')?.toString() || record.get('name')?.toString() || '',
                type: 'Unknown',
                value: record.get('out')?.getValue?.() || null,
                status: record.get('status')?.toString() || 'unknown',
                ord: record.get('slotPath')?.toString() || '',
                slotPath: record.get('slotPath')?.toString() || '',
                equipmentId: equipmentId
              };

              // Infer point type and check if trendable
              point.type = self._inferPointType(point);
              point.trendable = self._isTrendablePoint(point);

              points.push(point);
            } catch (error) {
              console.warn('⚠️ Error processing point record:', error);
            }
          },
          after: function() {
            // Cache points
            points.forEach(point => {
              self.adapter.pointsMap.set(point.id, point);
            });

            // Update equipment mapping
            self.adapter.equipmentPointsMap.set(equipmentId, points);

            console.log(`✅ Loaded ${points.length} points for ${equip.name}`);
            resolve(points);
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to load points for equipment:', equipmentId, error);
      return [];
    }
  }

  /**
   * Get points for a specific equipment - Tesla style: filtered and prioritized
   */
  async getPointsByEquipment(equipmentId, options = {}) {
    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    let points = this.adapter.equipmentPointsMap.get(equipmentId);

    // Load points if not cached
    if (!points || points.length === 0) {
      points = await this._loadPointsForEquipment(equipmentId);
    }

    if (!points) {
      return [];
    }

    // Apply Tesla-style filtering and prioritization
    const filtered = this._filterAndPrioritizePoints(points, options);

    return filtered.map(point => ({
      id: point.id,
      name: point.displayName || point.name,
      displayName: point.displayName || point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      ord: point.ord,
      slotPath: point.slotPath,
      equipmentId: point.equipmentId,
      displayValue: this._formatPointValue(point),
      trendable: point.trendable,
      hasHistory: this.adapter.historyService._findHistoryId(point) !== null,
      historyId: null, // Lazy loaded
      priority: point.priority || 'normal'
    }));
  }

  /**
   * Tesla-style: Filter and prioritize points
   */
  _filterAndPrioritizePoints(points, options = {}) {
    const showAll = options.showAll || false;
    const maxPoints = showAll ? 100 : 10; // Show more when expanded

    // Define priority prefixes to filter out
    const lowPriorityPrefixes = [
      'no_', 'nvi_', 'nvo_', 'inhibit', 'Cfg_', 'Not', 'Or', 'And', 'Equal'
    ];

    const lowPriorityExact = [
      'inSpaceTemp', 'inSupplyTemp', 'inReturnTemp', 'inOutsideTemp'
    ];

    const lowPriorityContains = [
      'TUNCOS', 'OccStateIn', 'Next', 'inSpace', 'inSupply', 'inReturn', 'inOutside'
    ];

    // Filter out low priority points unless showing all
    let filtered = points;
    if (!showAll) {
      filtered = points.filter(point => {
        const name = (point.displayName || point.name || '').toLowerCase();

        // Check exact matches
        if (lowPriorityExact.some(term => name.includes(term.toLowerCase()))) {
          return false;
        }

        // Check contains
        if (lowPriorityContains.some(term => name.includes(term.toLowerCase()))) {
          return false;
        }

        // Check prefixes
        if (lowPriorityPrefixes.some(prefix => name.startsWith(prefix.toLowerCase()))) {
          return false;
        }

        return true;
      });
    }

    // Prioritize points (Space Temp, Supply Air, etc.)
    const priorityOrder = {
      'Space Temp': 10,
      'Supply Air': 9,
      'Return Air': 8,
      'Outside Air': 7,
      'Cool Call': 6,
      'Heat Call': 5,
      'Fan Status': 4,
      'Exhaust Fan': 4,
      'Temperature': 3,
      'Pressure': 2,
      'Status': 1
    };

    filtered.sort((a, b) => {
      const aName = (a.displayName || a.name || '').toLowerCase();
      const bName = (b.displayName || b.name || '').toLowerCase();

      const aPriority = Object.entries(priorityOrder).find(([key]) =>
        aName.includes(key.toLowerCase()))?.[1] || 0;
      const bPriority = Object.entries(priorityOrder).find(([key]) =>
        bName.includes(key.toLowerCase()))?.[1] || 0;

      return bPriority - aPriority;
    });

    return filtered.slice(0, maxPoints);
  }

  /**
   * Infer point type from name
   */
  _inferPointType(point) {
    const name = (point.name || point.displayName || '').toLowerCase();

    if (name.includes('temp') || name.includes('temperature')) return 'Temperature';
    if (name.includes('pressure') || name.includes('press')) return 'Pressure';
    if (name.includes('humidity') || name.includes('humid')) return 'Humidity';
    if (name.includes('flow')) return 'Flow';
    if (name.includes('power') || name.includes('kw') || name.includes('watt')) return 'Power';
    if (name.includes('current') || name.includes('amp')) return 'Current';
    if (name.includes('voltage') || name.includes('volt')) return 'Voltage';
    if (name.includes('status') || name.includes('state')) return 'Status';
    if (name.includes('alarm')) return 'Alarm';
    if (name.includes(' setpoint') || name.includes('sp')) return 'Setpoint';

    return 'Unknown';
  }

  /**
   * Check if point type is trendable
   */
  _isTrendablePoint(point) {
    const trendableTypes = ['Temperature', 'Pressure', 'Humidity', 'Flow', 'Power', 'Current', 'Voltage'];
    return trendableTypes.includes(point.type);
  }

  /**
   * Format point value for display
   */
  _formatPointValue(point) {
    if (typeof point.value === 'number') {
      const rounded = Math.round(point.value * 100) / 100;
      return point.unit ? `${rounded} ${point.unit}` : rounded.toString();
    }

    if (typeof point.value === 'boolean') {
      // Friendly boolean display
      const name = (point.displayName || point.name || '').toLowerCase();
      if (name.includes('exh') || name.includes('exhaust') || name.includes('fan')) {
        return point.value ? 'Running' : 'Stopped';
      }
      if (name.includes('call') || name.includes('enable')) {
        return point.value ? 'On' : 'Off';
      }
      return point.value ? 'True' : 'False';
    }

    return point.value?.toString() || 'Unknown';
  }

  /**
   * Get current value of a specific point
   */
  async getPointValue(pointId) {
    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    const point = this.adapter.pointsMap.get(pointId);
    if (!point) {
      console.warn(`⚠️ Point not found: ${pointId}`);
      return null;
    }

    // Return cached value
    return point.value;
  }
}

export default PointService;