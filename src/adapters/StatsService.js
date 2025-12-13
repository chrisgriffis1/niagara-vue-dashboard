/* @noSnoop */
/**
 * Stats Service for Niagara BQL Adapter
 * Handles building statistics and equipment type calculations
 */

class StatsService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter
  }

  /**
   * Get all unique equipment types
   */
  async getEquipmentTypes() {
    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    const types = [...new Set(this.adapter.equipment.map(e => e.type))];
    return types.sort();
  }

  /**
   * Get building summary statistics
   */
  async getBuildingStats() {
    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    const stats = {
      datasetName: 'Niagara Station (Live)',
      equipmentCount: this.adapter.equipment.length,
      pointCount: this.adapter.points.length,
      scheduleCount: 0, // Not implemented yet
      historyCount: this.adapter.historyIdCache.size,
      alarmCount: this.adapter.alarms.length,
      zoneCount: this.adapter.zones.length,

      // Equipment type breakdown
      equipmentByType: {},
      pointTypes: {},
      locations: [...new Set(this.adapter.equipment.map(e => e.location))].sort(),

      // Points per equipment stats
      pointsPerEquipment: {
        min: 0,
        max: 0,
        avg: 0
      }
    };

    // Count equipment by type
    this.adapter.equipment.forEach(equip => {
      stats.equipmentByType[equip.type] = (stats.equipmentByType[equip.type] || 0) + 1;
    });

    // Count points by type
    this.adapter.points.forEach(point => {
      stats.pointTypes[point.type] = (stats.pointTypes[point.type] || 0) + 1;
    });

    // Calculate points per equipment stats
    if (this.adapter.equipment.length > 0) {
      const pointCounts = this.adapter.equipment.map(equip =>
        this.adapter.equipmentPointsMap.get(equip.id)?.length || 0
      );
      stats.pointsPerEquipment.min = Math.min(...pointCounts);
      stats.pointsPerEquipment.max = Math.max(...pointCounts);
      stats.pointsPerEquipment.avg = Math.round(
        pointCounts.reduce((a, b) => a + b, 0) / this.adapter.equipment.length
      );
    }

    return stats;
  }
}

export default StatsService;