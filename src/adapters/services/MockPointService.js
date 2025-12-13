/**
 * Mock Point Service
 * Handles point normalization, mapping, and processing
 */

class MockPointService {
  constructor() {
    // Point processing state
    this.points = [];
    this.pointsMap = new Map();
    this.equipmentPointsMap = new Map();
  }

  /**
   * Process points data and build mappings
   */
  processPoints(equipment, points) {
    // Clear existing data
    this.points = [];
    this.pointsMap.clear();
    this.equipmentPointsMap.clear();

    // Process embedded points from equipment first
    this._extractEmbeddedPoints(equipment);

    // Normalize all points
    if (points && Array.isArray(points)) {
      points.forEach((point, index) => {
        const normalizedPoint = this._normalizePoint(point, index);
        this.points.push(normalizedPoint);
        this.pointsMap.set(normalizedPoint.id, normalizedPoint);
      });
    }

    // Build equipment-to-points mapping
    this._buildEquipmentPointMapping(equipment);

    console.log(`✓ Processed ${this.points.length} points, ${this.equipmentPointsMap.size} equipment mappings`);

    return {
      points: this.points,
      pointsMap: this.pointsMap,
      equipmentPointsMap: this.equipmentPointsMap
    };
  }

  /**
   * Extract embedded points from equipment
   */
  _extractEmbeddedPoints(equipment) {
    equipment.forEach(equip => {
      if (equip.points && Array.isArray(equip.points)) {
        equip.points.forEach(point => {
          // Ensure point has ID
          if (!point.id) {
            point.id = `${equip.id}-${point.name || 'point'}-${Math.random().toString(36).substr(2, 9)}`;
          }

          // Add equipment reference
          point.equipmentId = equip.id;

          // Add to global points array if not already there
          if (!this.pointsMap.has(point.id)) {
            const normalizedPoint = this._normalizePoint(point, this.points.length);
            this.points.push(normalizedPoint);
            this.pointsMap.set(normalizedPoint.id, normalizedPoint);
          }
        });
      }
    });
  }

  /**
   * Normalize point object to consistent format
   */
  _normalizePoint(point, index) {
    // Extract value from curVal field (format: "value {status}")
    let value = point.value;

    // Handle curVal format: "value {status} @ source" or "value {status}"
    if (point.curVal) {
      const curValStr = String(point.curVal);
      const match = curValStr.match(/^(.+?)\s*\{/);
      if (match) {
        const rawValue = match[1].trim();
        // Try to parse as number or boolean
        if (rawValue === 'true') value = true;
        else if (rawValue === 'false') value = false;
        else if (!isNaN(rawValue) && rawValue !== '') value = parseFloat(rawValue);
        else value = rawValue;
      } else {
        value = curValStr;
      }
    }

    // Fallback to other value fields
    if (value === undefined && point.out !== undefined) value = point.out;
    if (value === undefined && point.currentValue !== undefined) value = point.currentValue;

    if (value === undefined) value = null;

    return {
      id: point.id || point.pointId || point.slotPath || `point_${index}`,
      name: point.name || point.displayName || point.navName || `Point ${index + 1}`,
      type: point.type || point.pointType || this._inferPointType(point),
      unit: point.unit || point.units || '',
      value: value,
      ord: point.ord || point.slotPath || point.path || '',
      equipmentId: point.equipmentId || point.equipmentPath || point.parentEquipment || null,
      facets: point.facets || [],
      trendable: point.trendable === 'true' || point.trendable === true,
      category: point.category || '',
      rawData: point // Keep original for reference
    };
  }

  /**
   * Infer point type from name, facets, or other properties
   */
  _inferPointType(point) {
    // Check facets
    if (point.facets) {
      if (point.facets.includes('numeric') || point.facets.includes('number')) return 'Numeric';
      if (point.facets.includes('boolean') || point.facets.includes('bool')) return 'Boolean';
      if (point.facets.includes('enum')) return 'Enum';
      if (point.facets.includes('str') || point.facets.includes('string')) return 'String';
    }

    // Check value type
    const val = point.value || point.out || point.currentValue;
    if (typeof val === 'number') return 'Numeric';
    if (typeof val === 'boolean') return 'Boolean';
    if (typeof val === 'string') return 'String';

    return 'Unknown';
  }

  /**
   * Build equipment-to-points mapping
   */
  _buildEquipmentPointMapping(equipment) {
    // First, try to use explicit equipment associations
    const pointsWithEquipment = this.points.filter(p => p.equipmentId);
    const pointsWithoutEquipment = this.points.filter(p => !p.equipmentId);

    // Map points that have explicit equipment IDs
    pointsWithEquipment.forEach(point => {
      if (!this.equipmentPointsMap.has(point.equipmentId)) {
        this.equipmentPointsMap.set(point.equipmentId, []);
      }
      this.equipmentPointsMap.get(point.equipmentId).push(point);
    });

    // If we have points without equipment, try to infer from path/ord
    pointsWithoutEquipment.forEach(point => {
      const equipId = this._inferEquipmentFromPoint(point, equipment);
      if (equipId) {
        if (!this.equipmentPointsMap.has(equipId)) {
          this.equipmentPointsMap.set(equipId, []);
        }
        this.equipmentPointsMap.get(equipId).push(point);
        point.equipmentId = equipId; // Update the point
      }
    });

    // For remaining unmapped points, distribute them across equipment
    const unmappedPoints = this.points.filter(p => !p.equipmentId);
    if (unmappedPoints.length > 0 && equipment.length > 0) {
      const pointsPerEquipment = Math.floor(unmappedPoints.length / equipment.length);
      const remainder = unmappedPoints.length % equipment.length;

      let pointIndex = 0;
      equipment.forEach((equip, equipIndex) => {
        const pointCount = equipIndex < remainder ? pointsPerEquipment + 1 : pointsPerEquipment;
        const equipPoints = unmappedPoints.slice(pointIndex, pointIndex + pointCount);

        if (!this.equipmentPointsMap.has(equip.id)) {
          this.equipmentPointsMap.set(equip.id, []);
        }
        this.equipmentPointsMap.get(equip.id).push(...equipPoints);
        pointIndex += pointCount;
      });
    }

    // Ensure all equipment has at least an empty array
    equipment.forEach(equip => {
      if (!this.equipmentPointsMap.has(equip.id)) {
        this.equipmentPointsMap.set(equip.id, []);
      }
    });
  }

  /**
   * Try to infer equipment ID from point's path/ord
   */
  _inferEquipmentFromPoint(point, equipment) {
    const path = point.ord || '';

    // Try to match against equipment paths
    for (const equip of equipment) {
      const equipPath = equip.ord || '';
      // If point path starts with equipment path, it likely belongs to it
      if (path && equipPath && path.startsWith(equipPath)) {
        return equip.id;
      }
    }

    return null;
  }

  /**
   * Get points for a specific equipment
   */
  getPointsByEquipment(equipmentId) {
    return this.equipmentPointsMap.get(equipmentId) || [];
  }

  /**
   * Format point value with unit for display
   */
  formatPointValue(point) {
    if (typeof point.value === 'number') {
      const rounded = Math.round(point.value * 100) / 100;
      return point.unit ? `${rounded} ${point.unit}` : rounded.toString();
    }
    return point.value;
  }

  /**
   * Get point by ID
   */
  getPointById(pointId) {
    return this.pointsMap.get(pointId);
  }

  /**
   * Clear all point data
   */
  clear() {
    this.points = [];
    this.pointsMap.clear();
    this.equipmentPointsMap.clear();
  }
}

export default MockPointService;

