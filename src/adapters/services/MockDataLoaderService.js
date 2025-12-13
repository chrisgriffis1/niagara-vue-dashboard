/**
 * Mock Data Loader Service
 * Handles loading and parsing of JSON data files
 */

class MockDataLoaderService {
  constructor(datasetService) {
    this.datasetService = datasetService;
  }

  /**
   * Load data from current dataset
   */
  async loadData() {
    const dataset = this.datasetService.getCurrentDataset();

    console.log(`📦 Loading ${dataset.name} from: ${dataset.file}`);

    try {
      const response = await fetch(dataset.file);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Loaded ${dataset.name}:`, {
        equipment: data.equipment?.length || 0,
        points: data.points?.length || 0,
        alarms: data.alarms?.length || 0,
        zones: data.zones?.length || 0
      });

      return data;
    } catch (error) {
      console.error(`❌ Failed to load ${dataset.name}:`, error);
      throw error;
    }
  }

  /**
   * Parse loaded data into structured format
   * Handles multiple data formats:
   * 1. Demo format: { metadata: {...}, data: { equipment: [...], points: [...] } }
   * 2. Live export format: { equipment: [...], points: [...] }
   */
  parseData(data) {
    const result = {
      equipment: [],
      points: [],
      schedules: [],
      histories: [],
      taggedComponents: [],
      alarms: [],
      zones: [],
      historyIdCache: []
    };

    // Handle different data structures
    let dataSource;

    if (data.data && typeof data.data === 'object') {
      // Demo/real format: { metadata: {...}, data: { equipment: [...], points: [...] } }
      dataSource = data.data;
    } else if (data.equipment || data.points) {
      // Live export format: { equipment: [...], points: [...] }
      dataSource = data;
    } else {
      console.warn('⚠️ Unknown data format:', Object.keys(data));
      return result;
    }

    // Parse equipment
    if (dataSource.equipment && Array.isArray(dataSource.equipment)) {
      result.equipment = dataSource.equipment;
      console.log(`✓ Found ${result.equipment.length} equipment`);
    }

    // Parse points
    if (dataSource.points && Array.isArray(dataSource.points)) {
      result.points = dataSource.points;
      console.log(`✓ Found ${result.points.length} points`);
    }

    // Parse schedules
    if (dataSource.schedules && Array.isArray(dataSource.schedules)) {
      result.schedules = dataSource.schedules;
      console.log(`✓ Found ${result.schedules.length} schedules`);
    }

    // Parse histories
    if (dataSource.histories && Array.isArray(dataSource.histories)) {
      result.histories = dataSource.histories;
      console.log(`✓ Found ${result.histories.length} histories`);
    }

    // Parse tagged components
    if (dataSource.tags && dataSource.tags.tagData && Array.isArray(dataSource.tags.tagData)) {
      result.taggedComponents = dataSource.tags.tagData;
      console.log(`✓ Found ${result.taggedComponents.length} tagged components`);
    }

    // Parse alarms
    if (dataSource.alarms && Array.isArray(dataSource.alarms)) {
      result.alarms = dataSource.alarms;
      console.log(`✓ Found ${result.alarms.length} alarms`);
    }

    // Parse zones
    if (dataSource.zones && Array.isArray(dataSource.zones)) {
      result.zones = dataSource.zones;
      console.log(`✓ Found ${result.zones.length} zones`);
    }

    // Parse history ID cache
    if (dataSource.historyIdCache && Array.isArray(dataSource.historyIdCache)) {
      result.historyIdCache = dataSource.historyIdCache;
      console.log(`✓ Found ${result.historyIdCache.length} cached history IDs`);
    }

    return result;
  }

  /**
   * Build point mappings from equipment and points data
   */
  buildPointMappings(equipment, points) {
    const pointsMap = new Map();
    const equipmentPointsMap = new Map();

    // Build points map
    points.forEach(point => {
      pointsMap.set(point.id, point);
    });

    // Extract embedded points from equipment and build equipment->points mapping
    equipment.forEach(equip => {
      const equipPoints = [];

      if (equip.points && Array.isArray(equip.points)) {
        equip.points.forEach(point => {
          // Ensure point has ID
          if (!point.id) {
            point.id = `${equip.id}-${point.name || 'point'}-${Math.random().toString(36).substr(2, 9)}`;
          }

          // Add to global points array if not already there
          if (!pointsMap.has(point.id)) {
            pointsMap.set(point.id, point);
            points.push(point);
          }

          equipPoints.push(point);
        });
      }

      equipmentPointsMap.set(equip.id, equipPoints);
    });

    if (points.length > 0) {
      console.log(`✓ Built point mappings: ${pointsMap.size} points, ${equipmentPointsMap.size} equipment entries`);
    }

    return { pointsMap, equipmentPointsMap, points };
  }

  /**
   * Normalize equipment data
   */
  normalizeEquipment(equip, index) {
    // Ensure equipment has required fields
    if (!equip.id) {
      equip.id = `equip-${index}`;
    }
    if (!equip.name) {
      equip.name = `Equipment ${index}`;
    }
    if (!equip.type) {
      equip.type = 'Unknown';
    }

    // Normalize status
    if (typeof equip.status === 'undefined') {
      equip.status = 'online';
    }

    // Normalize location
    if (!equip.location) {
      equip.location = 'Unknown';
    }

    return equip;
  }

  /**
   * Extract location from equipment path or name
   */
  extractLocation(equip) {
    // Try to extract location from various fields
    const locationCandidates = [
      equip.location,
      equip.path,
      equip.name
    ].filter(Boolean);

    for (const candidate of locationCandidates) {
      // Look for floor patterns
      const floorMatch = candidate.match(/(floor|fl|level|lvl)\s*(\d+)/i);
      if (floorMatch) {
        return `Floor ${floorMatch[2]}`;
      }

      // Look for building/area patterns
      const areaMatch = candidate.match(/(building|bldg|area|zone|wing)\s*([A-Z]|\d+)/i);
      if (areaMatch) {
        return `${areaMatch[1]} ${areaMatch[2]}`;
      }
    }

    return 'Main Building';
  }
}

export default MockDataLoaderService;
