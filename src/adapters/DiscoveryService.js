/* @noSnoop */
/**
 * Discovery Service for Niagara BQL Adapter
 * Handles all equipment and point discovery operations
 */

class DiscoveryService {
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
   * Discover all equipment using BQL query
   */
  async _discoverAllEquipment() {
    const baja = this._getBaja();

    try {
      console.log('🔍 Discovering all equipment...');

      // Query for control points (equipment)
      const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, navName, type from control:ControlPoint";
      const ord = baja.Ord.make(bql);
      const result = await baja.query(ord);

      const equipment = [];
      result.getRows().each((record) => {
        try {
          const equip = {
            id: record.get('slotPath')?.toString() || `equip_${equipment.length}`,
            name: record.get('displayName')?.toString() || record.get('name')?.toString() || 'Unknown',
            type: 'Unknown',
            ord: record.get('slotPath')?.toString() || '',
            slotPath: record.get('slotPath')?.toString() || '',
            rawType: record.get('type')?.toString() || ''
          };

          // Infer equipment type and location
          equip.type = this._inferEquipmentType(equip);
          equip.location = this._extractLocation(equip);

          equipment.push(equip);
        } catch (error) {
          console.warn('⚠️ Error processing equipment record:', error);
        }
      });

      console.log(`✅ Discovered ${equipment.length} equipment`);
      return equipment;
    } catch (error) {
      console.error('❌ Failed to discover equipment:', error);
      return [];
    }
  }

  /**
   * Discover point-devices (control points that act like equipment)
   */
  async _discoverPointDevices(baja) {
    console.log('🔍 Discovering point-devices (ExhFan, Freezer, Heater, etc.)...');

    try {
      // Query for points that might be equipment-like
      const pointDeviceOrd = baja.Ord.make("station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out from control:ControlPoint where displayName like '*Exh*' or displayName like '*Freezer*' or displayName like '*Heater*' or displayName like '*Fan*'");
      const result = await baja.query(pointDeviceOrd);

      const pointDevices = [];
      result.getRows().each((record) => {
        try {
          const slotPath = record.get('slotPath')?.toString() || '';
          const displayName = record.get('displayName')?.toString() || record.get('name')?.toString() || '';

          if (slotPath && displayName) {
            pointDevices.push({
              id: slotPath,
              name: displayName,
              type: this._inferEquipmentType({ name: displayName }),
              ord: slotPath,
              slotPath: slotPath,
              isPointDevice: true,
              status: 'unknown'
            });
          }
        } catch (error) {
          console.warn('⚠️ Error processing point-device record:', error);
        }
      });

      console.log(`✅ Found ${pointDevices.length} point-devices`);
      return pointDevices;
    } catch (error) {
      console.error('❌ Failed to discover point-devices:', error);
      return [];
    }
  }

  /**
   * Discover all points using BQL query
   */
  async _discoverAllPoints() {
    const baja = this._getBaja();

    try {
      console.log('🔍 Discovering all points...');

      const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out, status from control:ControlPoint";
      const ord = baja.Ord.make(bql);
      const result = await baja.query(ord);

      const points = [];
      result.getRows().each((record) => {
        try {
          const point = {
            id: record.get('slotPath')?.toString() || `point_${points.length}`,
            name: record.get('displayName')?.toString() || record.get('name')?.toString() || 'Unknown',
            displayName: record.get('displayName')?.toString() || record.get('name')?.toString() || '',
            type: 'Unknown',
            value: record.get('out')?.getValue?.() || null,
            status: record.get('status')?.toString() || 'unknown',
            ord: record.get('slotPath')?.toString() || '',
            slotPath: record.get('slotPath')?.toString() || ''
          };

          // Infer point type
          point.type = this._inferPointType(point);

          // Check if trendable
          point.trendable = this._isTrendablePoint(point);

          points.push(point);
        } catch (error) {
          console.warn('⚠️ Error processing point record:', error);
        }
      });

      console.log(`✅ Discovered ${points.length} points`);
      return points;
    } catch (error) {
      console.error('❌ Failed to discover points:', error);
      return [];
    }
  }

  /**
   * Infer equipment type from name
   */
  _inferEquipmentType(equip) {
    const name = (equip.name || equip.displayName || '').toUpperCase();
    const path = (equip.ord || equip.slotPath || '').toUpperCase();
    const combined = name + ' ' + path;

    // Check name patterns first (highest priority)
    if (name.match(/^AHU[\d_-]/i)) return 'AHU';
    if (name.match(/^MAU[\d_-]/i)) return 'MAU';
    if (name.match(/^VAV[\d_-]/i)) return 'VAV';
    if (name.match(/^FCU[\d_-]/i)) return 'FCU';
    if (name.match(/^RTU[\d_-]/i)) return 'RTU';
    if (name.match(/^CHILLER[\d_-]/i)) return 'Chiller';
    if (name.match(/^BOILER[\d_-]/i)) return 'Boiler';
    if (name.match(/^PUMP[\d_-]/i)) return 'Pump';
    if (name.match(/^FAN[\d_-]/i)) return 'Fan';
    if (name.match(/^HEAT[\d_-]/i)) return 'Heat Pump';
    if (name.match(/^COOL[\d_-]/i)) return 'Cooling Tower';

    // Path-based patterns
    if (path.includes('AHU')) return 'AHU';
    if (path.includes('VAV')) return 'VAV';
    if (path.includes('CHILLER')) return 'Chiller';

    // Default
    return 'Equipment';
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
   * Extract location from equipment name
   */
  _extractLocation(equip) {
    const path = (equip.ord || equip.slotPath || '').toUpperCase();
    const name = (equip.name || '').trim();

    // Extract location from equipment name (e.g., "HP21 300 Link Hall" → "300 Link Hall")
    const hpLocationMatch = name.match(/^HP\d+\s+(.+)$/i);
    if (hpLocationMatch) {
      return hpLocationMatch[1];
    }

    // Extract from path
    if (path.includes('WING')) return 'Wing';
    if (path.includes('LEVEL')) return 'Level';

    return 'Unknown';
  }

  /**
   * Discover all equipment/devices
   * Note: Should only be called AFTER adapter is initialized to avoid circular calls
   */
  async discoverDevices() {
    try {
      console.log('🏭 Starting full device discovery...');

      // Discover regular equipment
      const equipment = await this._discoverAllEquipment();

      // Discover point-devices
      const baja = this._getBaja();
      const pointDevices = await this._discoverPointDevices(baja);

      // Combine and deduplicate
      const allDevices = [...equipment, ...pointDevices];

      // Remove duplicates based on ID
      const uniqueDevices = allDevices.filter((device, index, self) =>
        index === self.findIndex(d => d.id === device.id)
      );

      console.log(`✅ Total discovered: ${uniqueDevices.length} devices (${equipment.length} equipment + ${pointDevices.length} point-devices)`);

      return uniqueDevices;
    } catch (error) {
      console.error('❌ Device discovery failed:', error);
      return [];
    }
  }

  /**
   * Build mapping of equipment to points
   */
  _buildEquipmentPointMapping() {
    console.log('🔗 Building equipment-point mappings...');

    // Clear existing mappings
    this.adapter.equipmentPointsMap.clear();

    // Group points by equipment
    for (const point of this.adapter.points) {
      let equipmentId = point.equipmentId;

      // If point doesn't have equipmentId, try to match it
      if (!equipmentId) {
        equipmentId = this._findEquipmentForPoint(point);
        if (equipmentId) {
          point.equipmentId = equipmentId;
        }
      }

      // Add to equipment mapping
      if (equipmentId) {
        if (!this.adapter.equipmentPointsMap.has(equipmentId)) {
          this.adapter.equipmentPointsMap.set(equipmentId, []);
        }
        this.adapter.equipmentPointsMap.get(equipmentId).push(point);
      }
    }

    console.log(`🔗 Mapped ${this.adapter.points.length} points to ${this.adapter.equipmentPointsMap.size} equipment`);
  }

  /**
   * Find equipment for a point by path matching
   */
  _findEquipmentForPoint(point) {
    const pointPath = point.slotPath || point.ord || '';

    // Try to match against equipment paths
    for (const equip of this.adapter.equipment) {
      const equipPath = equip.ord || '';
      // If point path starts with equipment path, it likely belongs to it
      if (pointPath && equipPath && pointPath.startsWith(equipPath)) {
        return equip.id;
      }
    }

    return null;
  }

  /**
   * Discover tstatLocation points and match them to equipment
   */
  async _discoverLocations() {
    const baja = this._getBaja();

    try {
      console.log('📍 Discovering location points...');

      // Query for location-related points
      const locationOrd = baja.Ord.make("station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, out from control:ControlPoint where displayName like '%ocation%' or displayName like '%Location%'");
      const result = await baja.query(locationOrd);

      const locations = [];
      result.getRows().each((record) => {
        try {
          const slotPath = record.get('slotPath')?.toString() || '';
          const displayName = record.get('displayName')?.toString() || '';
          const value = record.get('out')?.getValue?.()?.toString() || '';

          if (slotPath && displayName && value) {
            locations.push({
              slotPath: slotPath,
              name: displayName,
              value: value,
              equipmentId: null // Will be matched later
            });
          }
        } catch (error) {
          console.warn('⚠️ Error processing location record:', error);
        }
      });

      console.log(`📍 Found ${locations.length} location points`);
      return locations;
    } catch (error) {
      console.error('❌ Failed to discover locations:', error);
      return [];
    }
  }

  /**
   * Discover Location enum points for zone filtering
   */
  async _discoverZones() {
    console.log('>>> ZONE DISCOVERY CALLED <<<');

    const baja = this._getBaja();

    try {
      console.log('🏷️ Discovering zone/location enums...');

      // Query for enum points that might represent zones/locations
      const zoneOrd = baja.Ord.make("station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, facets from control:ControlPoint where facets like '%Enum%'");
      const result = await baja.query(zoneOrd);

      const zones = [];
      result.getRows().each((record) => {
        try {
          const slotPath = record.get('slotPath')?.toString() || '';
          const displayName = record.get('displayName')?.toString() || '';
          const facets = record.get('facets')?.toString() || '';

          // Check if this is a location/zone enum
          if (displayName.toLowerCase().includes('location') ||
              displayName.toLowerCase().includes('zone') ||
              displayName.toLowerCase().includes('wing') ||
              displayName.toLowerCase().includes('level')) {

            // Extract enum values from facets
            const enumValues = this._extractEnumValues(facets);
            if (enumValues.length > 0) {
              zones.push({
                id: slotPath,
                name: displayName,
                values: enumValues
              });
            }
          }
        } catch (error) {
          console.warn('⚠️ Error processing zone record:', error);
        }
      });

      console.log(`🏷️ Found ${zones.length} zone enums`);
      return zones;
    } catch (error) {
      console.error('❌ Failed to discover zones:', error);
      return [];
    }
  }

  /**
   * Extract enum values from facets string
   */
  _extractEnumValues(facets) {
    try {
      // Parse enum facets - this is a simplified extraction
      // Real implementation would need to parse Baja enum facets properly
      const enumMatch = facets.match(/Enum\(([^)]+)\)/);
      if (enumMatch) {
        return enumMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
      }
    } catch (error) {
      console.warn('⚠️ Failed to extract enum values:', error);
    }
    return [];
  }

  /**
   * Get all unique zones for filtering
   */
  getZones() {
    return this.adapter.zones || [];
  }
}

export default DiscoveryService;