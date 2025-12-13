/**
 * Mock Equipment Service
 * Handles equipment discovery, management, and organization
 */

class MockEquipmentService {
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
    this.equipment = [];
    this.equipmentPointsMap = new Map();
  }

  /**
   * Process and organize equipment data
   */
  processEquipment(rawEquipment, pointsMap, equipmentPointsMap) {
    console.log('🔧 Processing equipment data...');

    this.equipment = rawEquipment.map((equip, index) =>
      this.dataLoader.normalizeEquipment(equip, index)
    );

    this.equipmentPointsMap = equipmentPointsMap;

    // Add location information
    this.equipment.forEach(equip => {
      equip.location = this.dataLoader.extractLocation(equip);
    });

    // Sort equipment by type and name for consistent display
    this.equipment.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name);
    });

    console.log(`✓ Processed ${this.equipment.length} equipment items`);
    return this.equipment;
  }

  /**
   * Get all equipment
   */
  getEquipment() {
    return this.equipment;
  }

  /**
   * Get equipment by ID
   */
  getEquipmentById(id) {
    return this.equipment.find(equip => equip.id === id);
  }

  /**
   * Get equipment types for filtering
   */
  getEquipmentTypes() {
    const types = [...new Set(this.equipment.map(equip => equip.type))].sort();
    return types;
  }

  /**
   * Get locations for filtering
   */
  getLocations() {
    const locations = [...new Set(this.equipment.map(equip => equip.location))].sort();
    return locations;
  }

  /**
   * Filter equipment by criteria
   */
  filterEquipment(filters = {}) {
    let filtered = [...this.equipment];

    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(equip => equip.type === filters.type);
    }

    if (filters.location && filters.location !== 'all') {
      filtered = filtered.filter(equip => equip.location === filters.location);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(equip =>
        equip.name.toLowerCase().includes(search) ||
        equip.type.toLowerCase().includes(search)
      );
    }

    return filtered;
  }

  /**
   * Get equipment statistics
   */
  getStats() {
    const stats = {
      total: this.equipment.length,
      byType: {},
      byLocation: {},
      byStatus: {}
    };

    this.equipment.forEach(equip => {
      // Count by type
      stats.byType[equip.type] = (stats.byType[equip.type] || 0) + 1;

      // Count by location
      stats.byLocation[equip.location] = (stats.byLocation[equip.location] || 0) + 1;

      // Count by status
      stats.byStatus[equip.status] = (stats.byStatus[equip.status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Get points for specific equipment
   */
  getPointsForEquipment(equipmentId, options = {}) {
    const points = this.equipmentPointsMap.get(equipmentId) || [];

    if (options.filter) {
      return points.filter(point => {
        if (options.filter.priority && point.priority !== options.filter.priority) {
          return false;
        }
        if (options.filter.type && point.type !== options.filter.type) {
          return false;
        }
        if (options.filter.search) {
          const search = options.filter.search.toLowerCase();
          return point.name.toLowerCase().includes(search);
        }
        return true;
      });
    }

    return points;
  }
}

export default MockEquipmentService;

