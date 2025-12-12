/**
 * Niagara BQL Adapter
 * Connects to actual Niagara Tridium stations using BQL queries and BajaScript
 * Implements same interface as MockDataAdapter for seamless switching
 * 
 * Usage: Only works when running inside Niagara station (requires baja global)
 */

class NiagaraBQLAdapter {
  constructor() {
    this.equipment = [];
    this.points = [];
    this.pointsMap = new Map();
    this.equipmentPointsMap = new Map();
    this.initialized = false;
    this.subscribers = [];
    this.subscribedPoints = new Map(); // Map of equipmentId -> subscribed point component
    this.subscriber = null; // Main subscriber for live updates
    this.alarms = [];
    this.alarmCallbacks = [];
    this.cacheKey = 'niagara_dashboard_cache';
  }
  
  /**
   * Save discovered data to localStorage cache
   * @private
   */
  _saveToCache() {
    try {
      const cacheData = {
        timestamp: Date.now(),
        equipment: this.equipment,
        alarms: this.alarms || [],
        // Don't cache points - they're loaded on demand
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('💾 Saved equipment and alarms to cache');
    } catch (e) {
      console.warn('⚠️ Failed to save cache:', e);
    }
  }
  
  /**
   * Load cached data from localStorage
   * @private
   */
  _loadFromCache() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      // Cache expires after 4 hours
      if (Date.now() - data.timestamp > 4 * 60 * 60 * 1000) {
        console.log('📦 Cache expired (>4 hours), refreshing...');
        return null;
      }
      
      return data;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get baja global (checks both global scope and window.baja)
   */
  _getBaja() {
    if (typeof baja !== 'undefined' && baja) {
      return baja
    }
    if (typeof window !== 'undefined' && typeof window.baja !== 'undefined' && window.baja) {
      return window.baja
    }
    return null
  }

  /**
   * Check if running in Niagara environment
   */
  _isNiagara() {
    const bajaGlobal = this._getBaja()
    return bajaGlobal && bajaGlobal.Ord
  }

  /**
   * Initialize adapter - check for Niagara environment
   * Tesla-style: Fast startup, only load equipment. Points load lazily per equipment.
   */
  async initialize() {
    if (this.initialized) {
      return true;
    }

    if (!this._isNiagara()) {
      throw new Error('NiagaraBQLAdapter requires Niagara station environment (baja global not found)');
    }

    console.log('🔄 Initializing Niagara BQL Adapter (fast mode)...');
    
    try {
      // Try to load from cache first for instant startup
      const cached = this._loadFromCache();
      if (cached && cached.equipment && cached.equipment.length > 0) {
        console.log('⚡ Using cached data - INSTANT LOAD!');
        this.equipment = cached.equipment;
        this.alarms = cached.alarms || [];
        console.log(`✓ Loaded ${this.equipment.length} equipment from cache`);
        
        // Notify alarm callbacks if we have cached alarms
        if (this.alarms.length > 0 && this.alarmCallbacks && this.alarmCallbacks.length > 0) {
          this.alarmCallbacks.forEach(cb => {
            try {
              cb(this.alarms)
            } catch (e) {}
          })
        }
        
        // Mark as initialized immediately for instant UI
        this.initialized = true;
        
        // Refresh data in background (non-blocking, silent)
        setTimeout(() => {
          Promise.all([
            this._discoverAllEquipment(),
            this._discoverLocations(),
            this._startLiveSubscriptions(),
            this._startAlarmMonitoring(),
            this._backgroundLoadHistoryPoints()
          ]).then(() => {
            this._saveToCache();
            console.log('✓ Background refresh complete');
          }).catch(e => console.warn('Background refresh failed:', e));
        }, 500); // Small delay to let UI render first
        
        return true; // Exit early - we're done!
      }
      
      // No cache - do full discovery
      console.log('📡 No cache - discovering equipment...');
      // No cache - do full discovery
      console.log('📡 No cache - discovering equipment...');
      
      // Tesla-style: Only discover equipment at startup - FAST!
      // Points load lazily when user expands equipment card
      await this._discoverAllEquipment();
      console.log(`✓ Found ${this.equipment.length} equipment items`);
      
      // Save to cache
      this._saveToCache();
      
      // Discover locations BLOCKING - needed for equipment names
      try {
        await this._discoverLocations();
      } catch (err) {
        console.warn('⚠️ Location discovery failed:', err)
      }
      
      // Update cache with locations
      this._saveToCache();
      
      // Start live subscriptions for equipment status (non-blocking)
      this._startLiveSubscriptions().catch(err => {
        console.warn('⚠️ Live subscriptions failed:', err)
      })
      
      // Start alarm monitoring (non-blocking)
      this._startAlarmMonitoring().catch(err => {
        console.warn('⚠️ Alarm monitoring failed:', err)
      })
      
      // Start background loading of points with history (non-blocking)
      this._backgroundLoadHistoryPoints().catch(err => {
        console.warn('⚠️ Background history loading failed:', err)
      })
      
      this.initialized = true;
      
      const locCount = this.equipment.filter(e => e.location && e.location !== 'Unknown').length;
      console.log(`✓ Niagara BQL Adapter initialized:`);
      console.log(`  📦 Equipment: ${this.equipment.length}`);
      console.log(`  📍 With locations: ${locCount}`);
      console.log(`  📊 Points: Load on demand + background`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Niagara adapter:', error);
      throw error;
    }
  }
  
  /**
   * Load all points (for full discovery if needed)
   * Call this explicitly if you need ALL points
   */
  async loadAllPoints() {
    if (this.points.length > 0) {
      return; // Already loaded
    }
    
    console.log('📡 Loading all points (full discovery)...');
    await this._discoverAllPoints();
    console.log(`✓ Found ${this.points.length} points`);
    
    // Build lookup maps
    this.points.forEach(point => {
      this.pointsMap.set(point.id, point);
    });
    
    this._buildEquipmentPointMapping();
  }

  // Point device rules - control points that act like equipment
  static POINT_DEVICE_RULES = {
    "Exhaust Fan": { patterns: [/exhfan/i, /exfan/i, /exhaustfan/i] },
    "Freezer": { patterns: [/freezer/i] },
    "Fridge": { patterns: [/fridge/i, /refrigerator/i] },
    "Heater": { patterns: [/heater/i, /wallheater/i, /unitheater/i] },
    "Cooling Tower": { patterns: [/towerplant/i, /coolingtower/i, /tower/i] },
    "Water Sensor": { patterns: [/h20/i, /watersensor/i, /dhw/i, /dcw/i] },
    "Pressure Sensor": { patterns: [/psi/i, /pressure/i] }
  };

  /**
   * Discover all equipment using BQL query
   * @private
   */
  async _discoverAllEquipment() {
    const baja = this._getBaja()
    if (!baja) {
      throw new Error('baja not available')
    }
    
    console.log('🔍 Querying equipment via BQL...');
    
    // First discover BACnet devices
    const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name from bacnet:BacnetDevice";
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Equipment discovery timeout (30s)'));
      }, 30000);
      
      baja.Ord.make(bql).get().then(table => {
        clearTimeout(timeout);
        this.equipment = [];
        
        console.log('✓ BQL query completed, processing results...');
        
        let count = 0;
        let cursorStarted = false;
        
        const cursorTimeout = setTimeout(() => {
          if (!cursorStarted) {
            reject(new Error('Cursor processing timeout - cursor never started'));
          }
        }, 5000);
        
        try {
          const self = this;
          table.cursor({
            limit: 1000,
            each: function(record) {
              cursorStarted = true;
              clearTimeout(cursorTimeout);
              count++;
              try {
                let slotPath = record.get('slotPath')?.toString() || '';
                const displayName = record.get('displayName')?.toString() || '';
                const name = record.get('name')?.toString() || '';
                
                if (!slotPath) return;
                
                slotPath = slotPath.replace(/^slot:/, '').trim();
                if (!slotPath.startsWith('/')) slotPath = '/' + slotPath;
                
                const pathParts = slotPath.split('/');
                const equipId = pathParts[pathParts.length - 1] || slotPath;
                const friendlyType = self._inferEquipmentType(name || displayName);
                
                self.equipment.push({
                  id: equipId,
                  name: displayName || name || equipId,
                  type: friendlyType,
                  location: null, // Will be filled by _discoverLocations
                  ord: slotPath,
                  slotPath: slotPath,
                  status: 'ok' // Default status, will be updated by _startLiveSubscriptions
                });
              } catch (e) {}
            },
            after: function() {
              clearTimeout(cursorTimeout);
              console.log(`✓ BACnet devices: ${self.equipment.length} found`);
              
              // Now discover point-devices (ExhFan, Freezers, etc.)
              self._discoverPointDevices(baja).then(() => {
                console.log(`✓ Total equipment: ${self.equipment.length}`);
                resolve();
              }).catch(resolve); // Continue even if point devices fail
            }
          });
        } catch (cursorError) {
          clearTimeout(cursorTimeout);
          console.error('❌ Error calling cursor:', cursorError);
          reject(cursorError);
        }
      }).catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Discover point-devices (control points that act like equipment)
   * ExhFans, Freezers, Fridges, Heaters, Cooling Tower, etc.
   * Also extracts location from path (e.g., "Dairy Fridge" from parent folder)
   * @private
   */
  async _discoverPointDevices(baja) {
    console.log('🔍 Discovering point-devices (ExhFan, Freezer, Heater, etc.)...');
    
    // Build combined WHERE clause for all point device types
    const patterns = ['ExhFan', 'ExFan', 'Freezer', 'Fridge', 'Heater', 'TowerPlant', 'Tower', 'H20', 'Water'];
    const whereClause = patterns.map(p => `displayName like '*${p}*'`).join(' or ');
    
    const bql = `station:|slot:/Drivers/BacnetNetwork|bql:select slotPath as 'slotPath\\',displayName as 'displayName\\',toString as 'toString\\',out as 'out\\' from control:ControlPoint where ${whereClause}`;
    
    try {
      const table = await baja.Ord.make(bql).get();
      if (!table || !table.cursor) {
        console.log('📦 No point-devices found');
        return;
      }
      
      const self = this;
      const existingIds = new Set(this.equipment.map(e => e.id));
      let addedCount = 0;
      
      await new Promise(resolve => {
        table.cursor({
          limit: 5000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || '';
              const displayName = record.get('displayName')?.toString() || '';
              const outValue = record.get('out')?.toString() || '';
              
              if (!slotPath || !displayName) return;
              
              let cleanPath = slotPath.replace(/^slot:/, '').trim();
              if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
              
              const pathParts = cleanPath.split('/').filter(p => p);
              const pointName = pathParts[pathParts.length - 1] || '';
              
              // Match to category
              let category = null;
              for (const [type, rule] of Object.entries(NiagaraBQLAdapter.POINT_DEVICE_RULES)) {
                if (rule.patterns.some(p => p.test(displayName) || p.test(pointName))) {
                  category = type;
                  break;
                }
              }
              
              if (!category) return;
              
              // Create unique ID
              const equipId = displayName.replace(/\s+/g, '_') || pointName;
              
              // Skip if we already have this
              if (existingIds.has(equipId)) return;
              existingIds.add(equipId);
              
              // Extract location from path or displayName
              // e.g., "Dairy Fridge CD8" -> location is in parent folder or displayName
              let location = null;
              
              // Try to find location from parent folder name
              // Path: /Drivers/BacnetNetwork/SomeDevice/points/Dairy/FridgeCD8
              // The "Dairy" or device folder might indicate location
              if (pathParts.length >= 4) {
                // Look for meaningful folder names (not generic ones)
                const skipFolders = ['drivers', 'bacnetnetwork', 'points', 'monitor', 'inputs', 'outputs'];
                for (let i = pathParts.length - 2; i >= 0; i--) {
                  const folder = pathParts[i].toLowerCase();
                  if (!skipFolders.includes(folder) && folder.length > 2) {
                    // Check if it's a device ID (like HP35) - skip those
                    if (!/^(hp|ahu|mau|rtu|vav)\d+/i.test(pathParts[i])) {
                      location = pathParts[i];
                      break;
                    }
                  }
                }
              }
              
              // Extract location from displayName if present
              // e.g., "Dairy Fridge CD8" -> "Dairy"
              // e.g., "Kitchen ExFan37" -> "Kitchen"
              if (!location) {
                const nameMatch = displayName.match(/^([A-Za-z]+)\s+/);
                if (nameMatch && nameMatch[1].length > 2) {
                  const possibleLoc = nameMatch[1];
                  // Check it's not the device type
                  if (!/^(exh?fan|fridge|freezer|heater|tower|water|h20)/i.test(possibleLoc)) {
                    location = possibleLoc;
                  }
                }
              }
              
              // Get current value/status from 'out'
              let currentValue = null;
              let status = 'ok';
              if (outValue) {
                const valMatch = outValue.match(/^(.+?)\s*\{([^}]+)\}/);
                if (valMatch) {
                  currentValue = valMatch[1].trim();
                  const statusStr = valMatch[2].toLowerCase();
                  if (statusStr.includes('fault') || statusStr.includes('alarm')) {
                    status = 'error';
                  } else if (statusStr.includes('warn')) {
                    status = 'warning';
                  }
                }
              }
              
              self.equipment.push({
                id: equipId,
                name: displayName || pointName,
                displayName: location ? `${location} - ${displayName}` : displayName,
                type: category,
                location: location || 'Unknown',
                ord: cleanPath,
                slotPath: cleanPath,
                isPointDevice: true,
                currentValue: currentValue,
                status: status,
                pointCount: 0 // Point-devices don't have sub-points, they ARE the point
              });
              
              addedCount++;
            } catch (e) {}
          },
          after: function() {
            console.log(`✓ Point-devices: ${addedCount} found`);
            resolve();
          }
        });
      });
    } catch (e) {
      console.warn('⚠️ Point device discovery error:', e);
    }
  }

  /**
   * Discover all points using BQL query
   * @private
   */
  async _discoverAllPoints() {
    const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name, out, status from control:ControlPoint";
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Point discovery timeout'));
      }, 60000);
      
      const baja = this._getBaja()
      if (!baja) {
        clearTimeout(timeout)
        reject(new Error('baja not available'))
        return
      }
      
      const self = this; // Save reference for use in callbacks
      baja.Ord.make(bql).get().then(table => {
        clearTimeout(timeout);
        self.points = [];
        
        console.log('✓ BQL query completed, processing results...');
        console.log('📊 Starting cursor iteration...');
        let pointCount = 0;
        
        table.cursor({
          limit: 10000,
          each: function(record) {
            pointCount++;
            if (pointCount === 1) {
              console.log(`  Processing first point record...`);
            }
            if (pointCount % 500 === 0) {
              console.log(`  Processing point ${pointCount}...`);
            }
            try {
              const slotPath = record.get('slotPath')?.toString() || '';
              const displayName = record.get('displayName')?.toString() || '';
              const name = record.get('name')?.toString() || '';
              
              if (!slotPath) {
                console.warn(`  Skipping point ${pointCount} - no slotPath`);
                return;
              }
              
              // Get point value and status
              let outValue = null;
              let outStatus = 'ok';
              let unit = '';
              
              try {
                const outVal = record.get('out');
                if (outVal) {
                  const outStr = outVal.toString();
                  // Parse format: "value {status}" or just "value"
                  const match = outStr.match(/^(.+?)\s*\{([^}]+)\}/);
                  if (match) {
                    outValue = match[1].trim();
                    outStatus = match[2].trim();
                  } else {
                    outValue = outStr;
                  }
                  
                  // Try to parse as number
                  const numVal = parseFloat(outValue);
                  if (!isNaN(numVal)) {
                    outValue = numVal;
                    // Extract unit if present (e.g., "72.5 °F" → 72.5, unit="°F")
                    const unitMatch = outStr.match(/(°F|°C|%|psi|cfm|rpm|kw|v|a)/i);
                    if (unitMatch) {
                      unit = unitMatch[1];
                    }
                  }
                }
              } catch (e) {
                // Value parsing failed
              }
              
              // Extract equipment ID from slotPath
              // Format: slot:/Drivers/BacnetNetwork/AHU1/points/Monitor/SupplyTemp
              const pathParts = slotPath.split('/');
              const equipIndex = pathParts.findIndex(p => p === 'Drivers') + 2;
              const equipId = pathParts[equipIndex] || '';
              
              // Create point ID
              const pointId = `${equipId}_${name || displayName}`;
              
              // Determine point type
              const pointType = self._inferPointType(name || displayName);
              
              self.points.push({
                id: pointId,
                name: displayName || name || 'Unknown',
                type: pointType,
                unit: unit,
                value: outValue,
                status: outStatus,
                ord: slotPath,
                slotPath: slotPath,
                equipmentId: equipId,
                trendable: self._isTrendable(pointType)
              });
              
              if (pointCount === 1) {
                console.log(`  ✓ First point processed: ${pointId}`);
              }
            } catch (e) {
              console.warn(`Error processing point record ${pointCount}:`, e);
            }
          },
          after: function() {
            console.log(`✓ Point discovery complete: ${self.points.length} points processed`);
            resolve();
          }
        });
      }).catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Build mapping of equipment to points
   * @private
   */
  _buildEquipmentPointMapping() {
    this.equipmentPointsMap.clear();
    
    this.points.forEach(point => {
      if (point.equipmentId) {
        if (!this.equipmentPointsMap.has(point.equipmentId)) {
          this.equipmentPointsMap.set(point.equipmentId, []);
        }
        this.equipmentPointsMap.get(point.equipmentId).push(point);
      }
    });
  }

  /**
   * Infer equipment type from name
   * @private
   */
  _inferEquipmentType(name) {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('ahu') || nameLower.match(/^ahu\d+/i)) return 'AHU';
    if (nameLower.includes('mau') || nameLower.match(/^mau\d+/i)) return 'MAU';
    if (nameLower.includes('vav')) return 'VAV';
    if (nameLower.includes('hp') || nameLower.match(/^hp\d+/i)) return 'Heat Pump';
    if (nameLower.includes('chiller')) return 'Chiller';
    if (nameLower.includes('boiler')) return 'Boiler';
    if (nameLower.includes('pump')) return 'Pump';
    if (nameLower.includes('fan')) return 'Fan';
    if (nameLower.includes('tower') || nameLower.includes('plant')) return 'Cooling Tower';
    
    return 'Equipment';
  }

  /**
   * Infer point type from name
   * @private
   */
  _inferPointType(name) {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('temp')) return 'Temperature';
    if (nameLower.includes('pressure')) return 'Pressure';
    if (nameLower.includes('flow')) return 'Flow';
    if (nameLower.includes('speed')) return 'Speed';
    if (nameLower.includes('power')) return 'Power';
    if (nameLower.includes('current')) return 'Current';
    if (nameLower.includes('voltage')) return 'Voltage';
    if (nameLower.includes('setpoint') || nameLower.includes('sp')) return 'Setpoint';
    if (nameLower.includes('status') || nameLower.includes('run')) return 'Status';
    
    return 'Point';
  }

  /**
   * Check if point type is trendable
   * @private
   */
  _isTrendable(pointType) {
    const trendableTypes = ['Temperature', 'Pressure', 'Flow', 'Speed', 'Power', 'Current', 'Voltage', 'Setpoint'];
    return trendableTypes.includes(pointType);
  }

  /**
   * Extract location from equipment name
   * @private
   */
  _extractLocation(name) {
    if (!name) return 'Unknown';
    
    // Pattern: "HP21 300 Link Hall" → "300 Link Hall"
    const match = name.match(/^[A-Z]+\d+\s+(.+)$/);
    if (match) {
      return match[1];
    }
    
    return 'Unknown';
  }

  /**
   * Discover all equipment/devices
   */
  async discoverDevices() {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.equipment.map(equip => ({
      id: equip.id,
      name: equip.displayName || equip.name, // Use displayName with location if available
      type: equip.type,
      location: equip.location,
      ord: equip.ord,
      pointCount: this.equipmentPointsMap.get(equip.id)?.length || 0,
      status: equip.status || 'ok'
    }));
  }

  /**
   * Get points for a specific equipment - Tesla style: filtered and prioritized
   * Lazy loads points for this equipment if not already loaded
   * @param {string} equipmentId - Equipment ID
   * @param {object} options - { showAll: false } to show filtered, true for all
   */
  async getPointsByEquipment(equipmentId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if we already have points for this equipment
    let points = this.equipmentPointsMap.get(equipmentId);
    
    // Lazy load points for this equipment if not loaded
    if (!points || points.length === 0) {
      points = await this._loadPointsForEquipment(equipmentId);
    }
    
    // Tesla-style filtering - only show important points by default
    let filteredPoints = points;
    if (!options.showAll) {
      filteredPoints = this._filterAndPrioritizePoints(points);
    }
    
    return filteredPoints.map(point => ({
      id: point.id,
      name: point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      ord: point.ord,
      slotPath: point.slotPath, // CRITICAL: needed for history lookup
      equipmentId: point.equipmentId,
      displayValue: this._formatPointValue(point),
      trendable: point.trendable,
      hasHistory: !!point.hasHistory,
      historyId: point.historyId, // Cache history ID if already found
      priority: point.priority || 'normal'
    }));
  }
  
  /**
   * Tesla-style: Filter and prioritize points
   * HIGH: Points with history, status points, non-prefixed names
   * LOW: nvo_, nvi_, no_, inhibit prefixed points
   * @private
   */
  _filterAndPrioritizePoints(points) {
    // Define low-priority prefixes (BACnet network variable prefixes, etc.)
    const lowPriorityPrefixes = ['nvo', 'nvi', 'no_', 'inhibit', 'clear', 'enable'];
    const lowPriorityTypes = ['Unknown', 'Command'];
    
    // Separate high and low priority points
    const highPriority = [];
    const normalPriority = [];
    const lowPriority = [];
    
    points.forEach(point => {
      const nameLower = (point.name || '').toLowerCase();
      
      // Check for low-priority prefixes
      const isLowPriority = lowPriorityPrefixes.some(prefix => nameLower.startsWith(prefix.toLowerCase()));
      const isLowType = lowPriorityTypes.includes(point.type);
      
      if (isLowPriority || isLowType) {
        point.priority = 'low';
        lowPriority.push(point);
      } else if (point.hasHistory || point.type === 'Temperature' || point.type === 'Status') {
        // High priority: has history, temperature readings, status
        point.priority = 'high';
        highPriority.push(point);
      } else {
        point.priority = 'normal';
        normalPriority.push(point);
      }
    });
    
    // Return high priority first, then normal - skip low priority by default
    // Limit to top 10 for clean UI
    const result = [...highPriority, ...normalPriority].slice(0, 10);
    
    console.log(`  📊 Filtered points: ${highPriority.length} high, ${normalPriority.length} normal, ${lowPriority.length} low (showing ${result.length})`);
    
    return result;
  }
  
  /**
   * Lazy load points for a specific equipment using BQL
   * @private
   */
  async _loadPointsForEquipment(equipmentId) {
    const baja = this._getBaja();
    if (!baja) {
      return [];
    }
    
    // Find the equipment to get its path
    const equipment = this.equipment.find(e => e.id === equipmentId);
    if (!equipment || !equipment.slotPath) {
      console.warn(`Equipment not found: ${equipmentId}`);
      return [];
    }
    
    console.log(`  📡 Loading points for ${equipment.name}...`);
    
    // Clean slotPath: remove "slot:" prefix if present, ensure starts with /
    let cleanPath = (equipment.slotPath || '').toString().trim();
    cleanPath = cleanPath.replace(/^slot:/, '');
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    console.log(`  📝 Clean path: ${cleanPath}`);
    
    // Query points for this specific equipment
    const bql = `station:|slot:${cleanPath}|bql:select slotPath, displayName, name, out from control:ControlPoint`;
    console.log(`  📝 BQL: ${bql}`);
    
    try {
      const table = await baja.Ord.make(bql).get();
      if (!table || !table.cursor) {
        console.log(`  ⚠️ No table/cursor returned for ${equipment.name}`);
        return [];
      }
      
      const points = [];
      const self = this;
      
      return new Promise((resolve) => {
        table.cursor({
          limit: 500, // Limit per equipment
          each: function(record) {
            try {
              let slotPath = record.get('slotPath')?.toString() || '';
              const displayName = record.get('displayName')?.toString() || '';
              const name = record.get('name')?.toString() || '';
              
              if (!slotPath) return;
              
              // Clean slotPath for history lookup
              slotPath = slotPath.replace(/^slot:/, '').trim();
              if (!slotPath.startsWith('/')) {
                slotPath = '/' + slotPath;
              }
              
              // Parse value and status
              let outValue = null;
              let outStatus = 'ok';
              let unit = '';
              
              try {
                const outVal = record.get('out');
                if (outVal) {
                  const outStr = outVal.toString();
                  const match = outStr.match(/^(.+?)\s*\{([^}]+)\}/);
                  if (match) {
                    outValue = match[1].trim();
                    outStatus = match[2].trim();
                  } else {
                    outValue = outStr;
                  }
                  
                  const numVal = parseFloat(outValue);
                  if (!isNaN(numVal)) {
                    outValue = numVal;
                    const unitMatch = outStr.match(/(°F|°C|%|psi|cfm|rpm|kw|v|a)/i);
                    if (unitMatch) unit = unitMatch[1];
                  }
                }
              } catch (e) {}
              
              const pointId = `${equipmentId}_${name || displayName}`;
              const pointType = self._inferPointType(name || displayName);
              
              // Check if displayName differs from name (more important)
              const hasCustomName = displayName && name && displayName !== name;
              
              points.push({
                id: pointId,
                name: displayName || name || 'Unknown',
                type: pointType,
                unit: unit,
                value: outValue,
                status: outStatus,
                ord: slotPath,
                slotPath: slotPath,
                equipmentId: equipmentId,
                trendable: self._isTrendable(pointType),
                hasHistory: false, // Will be set when history is queried
                hasCustomName: hasCustomName
              });
            } catch (e) {}
          },
          after: function() {
            // Store in map for caching
            self.equipmentPointsMap.set(equipmentId, points);
            
            // Also add to main points array and map
            points.forEach(point => {
              self.points.push(point);
              self.pointsMap.set(point.id, point);
            });
            
            // Match points to history configs (async, but don't wait)
            self._matchPointsToHistory(points, equipment.name).then(matchedCount => {
              if (matchedCount > 0) {
                console.log(`  📊 ${matchedCount} points have history`);
              }
            }).catch(() => {});
            
            console.log(`  ✓ Loaded ${points.length} points for ${equipment.name}`);
            resolve(points);
          }
        });
      });
    } catch (e) {
      console.error(`Error loading points for ${equipmentId}:`, e);
      return [];
    }
  }

  /**
   * Match points to history configs to determine which have history
   * @private
   */
  async _matchPointsToHistory(points, equipmentName) {
    const baja = this._getBaja();
    if (!baja || points.length === 0) return 0;
    
    try {
      // Query history configs for this equipment
      const historyBql = `station:|slot:/|bql:select * from history:HistoryConfig where slotPath like '*${equipmentName}*'`;
      
      const table = await baja.Ord.make(historyBql).get();
      if (!table || !table.cursor) return 0;
      
      const historyPaths = [];
      
      await new Promise(resolve => {
        table.cursor({
          limit: 500,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || '';
              if (slotPath) {
                historyPaths.push(slotPath.toLowerCase());
              }
            } catch (e) {}
          },
          after: function() {
            resolve();
          }
        });
      });
      
      // Match points to history paths
      let matchCount = 0;
      for (const point of points) {
        const pointPath = (point.slotPath || point.ord || '').toLowerCase();
        const pointName = (point.name || '').toLowerCase();
        
        // Check if any history path contains this point
        for (const histPath of historyPaths) {
          if (histPath.includes(pointName) || histPath.includes(pointPath.split('/').pop())) {
            point.hasHistory = true;
            matchCount++;
            break;
          }
        }
      }
      
      return matchCount;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Format point value for display
   * @private
   */
  _formatPointValue(point) {
    if (typeof point.value === 'number') {
      const rounded = Math.round(point.value * 100) / 100;
      return point.unit ? `${rounded} ${point.unit}` : rounded.toString();
    }
    return point.value?.toString() || 'N/A';
  }

  /**
   * Get current value of a specific point
   */
  async getPointValue(pointId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointsMap.get(pointId);
    
    if (!point) {
      console.warn(`Point not found: ${pointId}`);
      return null;
    }

    // Try to get live value
    try {
      const baja = this._getBaja()
      if (!baja) {
        throw new Error('baja not available')
      }
      const component = await baja.Ord.make(point.slotPath).get();
      const outVal = component.get('out');
      if (outVal) {
        const valueStr = outVal.toString();
        const numVal = parseFloat(valueStr);
        point.value = !isNaN(numVal) ? numVal : valueStr;
      }
    } catch (e) {
      console.warn(`Could not get live value for ${pointId}:`, e);
    }

    return {
      id: point.id,
      name: point.name,
      type: point.type,
      unit: point.unit,
      value: point.value,
      displayValue: this._formatPointValue(point),
      timestamp: new Date()
    };
  }

  /**
   * Get historical data for trending
   */
  async getHistoricalData(pointIdOrObj, timeRange = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Accept either point ID string or full point object
    let point;
    if (typeof pointIdOrObj === 'object' && pointIdOrObj !== null) {
      // Full point object passed
      point = pointIdOrObj;
    } else {
      // Point ID string - look up in map
      point = this.pointsMap.get(pointIdOrObj);
    }
    
    if (!point) {
      console.warn(`Point not found: ${pointIdOrObj}`);
      return [];
    }
    
    console.log(`📈 Getting history for: ${point.name || point.id}`);

    // Find history ID for this point
    // History IDs are typically the point's path relative to station root
    const historyId = point.historyId || await this._findHistoryId(point);
    
    if (!historyId) {
      console.log(`⚠️ No history config found for: ${point.name || point.id}`);
      return [];
    }
    
    console.log(`   historyId: ${historyId}`);

    // Default to 1 year lookback for COV histories which may have sparse data
    // COV = Change of Value - only records when significant change happens
    const startDate = timeRange.start || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = timeRange.end || new Date();

    return this._queryHistory(historyId, startDate, endDate);
  }

  /**
   * Find history ID for a point using BQL query on HistoryConfig
   * Based on LivePoints.html pattern - queries history:HistoryConfig
   * @private
   */
  async _findHistoryId(point) {
    const baja = this._getBaja()
    if (!baja) {
      throw new Error('baja not available')
    }
    
    try {
      // Extract equipment name and slot name from slotPath
      // Format: /Drivers/BacnetNetwork/HP12/points/Monitor/no_CtrlSpaceTemp
      const pathParts = point.slotPath.toString().split('/').filter(p => p);
      if (pathParts.length < 3) {
        console.log(`  ⚠️ Cannot find history - invalid path: ${point.slotPath}`);
        return null;
      }
      
      const equipmentName = point.equipmentId || pathParts[2]; // e.g., "HP12"
      const slotName = pathParts[pathParts.length - 1]; // Last part of path, e.g., "no_CtrlSpaceTemp"
      
      // Escape single quotes for BQL (SQL-style: ' becomes '')
      const escapedEquipment = equipmentName.replace(/'/g, "''");
      const escapedSlotName = slotName.replace(/'/g, "''");
      
      // Use BQL to find HistoryConfig - EXACT pattern from 04-bql-device-fuzzy-matching.html line 629
      // Query from station root (station:|slot:/) not /Drivers - this is how you discovered histories on your station!
      const bqlQuery = `select toString as 'To String\\',id as 'id\\',slotPath as 'slotPath' from history:HistoryConfig where slotPath like '%/${escapedEquipment}/%' and slotPath like '%${escapedSlotName}%'`;
      const bqlOrd = `station:|slot:/|bql:${bqlQuery}`;
      
      // Reduced logging - only log if debugging needed
      // console.log(`  🔍 Finding history for ${point.id}: ${equipmentName}/${slotName}`);
      
      const table = await baja.Ord.make(bqlOrd).get();
      if (!table || !table.cursor) {
        console.log(`  ❌ BQL query returned no table for ${point.id}`);
        return null;
      }
      
      // Find matching history
      return new Promise((resolve) => {
        let foundId = null;
        let foundPath = null;
        let recordCount = 0;
        const self = this;
        
        table.cursor({
          each: function(record) {
            recordCount++;
            
            try {
              const id = record.get('id');
              const slotPath = record.get('slotPath');
              
              console.log(`     Found history record ${recordCount}:`);
              console.log(`       ID: ${id ? id.toString() : 'null'}`);
              console.log(`       SlotPath: ${slotPath ? slotPath.toString() : 'null'}`);
              
              // Take the first match
              if (id && !foundId) {
                foundId = id.toString();
                foundPath = slotPath ? slotPath.toString() : '';
              }
            } catch (e) {
              console.warn(`     Error reading history record:`, e);
            }
          },
          after: function() {
            if (foundId) {
              console.log(`  ✓ Found history ID for ${point.id}: ${foundId}`);
            } else {
              console.log(`  ⚠️ No history found for ${point.id} (checked ${recordCount} records)`);
            }
            resolve(foundId);
          }
        });
      });
    } catch (e) {
      console.warn(`❌ Error finding history ID for ${point.id}:`, e);
      return null;
    }
  }

  /**
   * Start live status monitoring for equipment
   * Queries status points directly via BQL (doesn't require pre-loaded points)
   * @private
   */
  async _startLiveSubscriptions() {
    const baja = this._getBaja()
    if (!baja) {
      console.warn('⚠️ Cannot start status monitoring - baja not available')
      return
    }
    
    console.log(`🔔 Querying equipment status...`)
    
    try {
      // Query for all status/fault/online points in one BQL call
      const statusBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath as 'slotPath\\',displayName as 'displayName\\',out as 'out\\' from control:ControlPoint where displayName like '*online*' or displayName like '*fault*' or displayName like '*alarm*' or displayName like '*status*'"
      
      const table = await baja.Ord.make(statusBql).get()
      if (!table || !table.cursor) {
        console.log('🔔 No status points found')
        // Update status based on alarms instead
        this._updateStatusFromAlarms()
        return
      }
      
      const statusPoints = []
      const self = this
      
      await new Promise(resolve => {
        table.cursor({
          limit: 1000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || ''
              const displayName = record.get('displayName')?.toString() || ''
              const outValue = record.get('out')?.toString() || ''
              
              if (slotPath && outValue) {
                statusPoints.push({
                  path: slotPath.toLowerCase(),
                  name: displayName,
                  value: outValue.toLowerCase()
                })
              }
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`🔔 Found ${statusPoints.length} status points`)
      
      // Match status points to equipment and update status
      let errorCount = 0
      let warningCount = 0
      let okCount = 0
      
      for (const equip of this.equipment) {
        const equipIdLower = (equip.id || '').toLowerCase()
        
        // Find status points for this equipment
        const equipStatusPoints = statusPoints.filter(sp => 
          sp.path.includes('/' + equipIdLower + '/')
        )
        
        if (equipStatusPoints.length > 0) {
          // Check for any fault/offline/alarm conditions
          let hasError = false
          let hasWarning = false
          
          for (const sp of equipStatusPoints) {
            const val = sp.value
            const name = sp.name.toLowerCase()
            
            // Check for error conditions
            if (name.includes('fault') || name.includes('alarm')) {
              if (val.includes('true') || val.includes('active') || val === '1' || val.includes('fault')) {
                hasError = true
              }
            } else if (name.includes('online')) {
              if (val.includes('false') || val.includes('offline') || val === '0') {
                hasError = true
              }
            } else if (name.includes('status')) {
              if (val.includes('fault') || val.includes('alarm') || val.includes('error') || val.includes('fail')) {
                hasError = true
              } else if (val.includes('warn')) {
                hasWarning = true
              }
            }
          }
          
          if (hasError) {
            equip.status = 'error'
            errorCount++
          } else if (hasWarning) {
            equip.status = 'warning'
            warningCount++
          } else {
            equip.status = 'ok'
            okCount++
          }
        } else {
          // No status points - default to ok
          okCount++
        }
      }
      
      // Also update status from alarms
      this._updateStatusFromAlarms()
      
      console.log(`🔔 Status updated: ${errorCount} errors, ${warningCount} warnings, ${okCount} ok`)
      
    } catch (error) {
      console.warn('⚠️ Failed to query status:', error)
      // Try to update from alarms as fallback
      this._updateStatusFromAlarms()
    }
  }
  
  /**
   * Update equipment status based on alarms
   * @private
   */
  _updateStatusFromAlarms() {
    if (!this.alarms || this.alarms.length === 0) return
    
    console.log(`🔔 Updating status from ${this.alarms.length} alarms...`)
    
    for (const alarm of this.alarms) {
      const sourceStr = (alarm.source || '').toLowerCase()
      
      // Find equipment that matches this alarm source
      for (const equip of this.equipment) {
        const equipIdLower = (equip.id || '').toLowerCase()
        const equipNameLower = (equip.name || '').toLowerCase()
        
        if (sourceStr.includes(equipIdLower) || sourceStr.includes(equipNameLower)) {
          // Update status based on alarm priority
          if (alarm.priority === 'critical') {
            equip.status = 'error'
          } else if (alarm.priority === 'warning' && equip.status !== 'error') {
            equip.status = 'warning'
          }
          break
        }
      }
    }
  }

  /**
   * Query history data using history: scheme
   * @private
   */
  async _queryHistory(historyId, startDate, endDate) {
    const baja = this._getBaja()
    if (!baja) {
      throw new Error('baja not available')
    }
    
    try {
      // Format history ID for history: scheme
      let historyOrd = historyId;
      if (historyOrd.startsWith('/')) {
        historyOrd = "history:" + historyOrd.substring(1);
      } else {
        historyOrd = "history:" + historyOrd;
      }

      console.log(`  📊 Querying history: ${historyOrd}`);
      console.log(`     Time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

      const history = await baja.Ord.make(historyOrd).get();
      if (!history) {
        console.log(`  ❌ History object not found for: ${historyOrd}`);
        return [];
      }

      const dataPoints = [];
      const startMillis = startDate.getTime();
      const endMillis = endDate.getTime();

      return new Promise((resolve, reject) => {
        let recordCount = 0;
        
        history.cursor({
          each: function(record) {
            recordCount++;
            
            try {
              const ts = record.get('timestamp');
              const tsMillis = ts.getMillis();
              
              // Filter by date range
              if (tsMillis < startMillis || tsMillis > endMillis) {
                return;
              }

              const val = record.get('value');
              const valueStr = val.encodeToString();
              const numVal = parseFloat(valueStr);
              
              if (!isNaN(numVal)) {
                dataPoints.push({
                  timestamp: new Date(tsMillis).toISOString(),
                  value: numVal,
                  pointId: historyId
                });
              }
            } catch (e) {
              // Skip invalid records
            }
          },
          after: function() {
            // Sort by timestamp
            dataPoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            console.log(`  ✓ History: ${dataPoints.length} points from ${recordCount} records`);
            resolve(dataPoints);
          }
        });
      });
    } catch (e) {
      console.error(`❌ Error querying history for ${historyId}:`, e);
      return [];
    }
  }

  /**
   * Discover tstatLocation points and match them to equipment
   * tstatLocation.out.value contains the actual room name (e.g., "M-Dish", "Kitchen")
   * Path pattern: /Drivers/BacnetNetwork/HP35/points/Monitor/tstatLocation
   * @private
   */
  async _discoverLocations() {
    const baja = this._getBaja()
    if (!baja) return
    
    console.log('📍 Discovering tstatLocation points...')
    
    try {
      // Query specifically for tstatLocation points - they have the room names in 'out'
      // Format: out = "M-Dish {ok} @ def" where "M-Dish" is the room name
      const locationBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath as 'slotPath\\',out as 'out\\',displayName as 'displayName\\' from control:ControlPoint where displayName like '*tstatLocation*'"
      
      console.log('📍 BQL:', locationBql)
      
      const table = await baja.Ord.make(locationBql).get()
      if (!table || !table.cursor) {
        console.log('📍 No tstatLocation points found, trying fallback query...')
        // Fallback: try broader search
        await this._discoverLocationsFallback()
        return
      }
      
      const locationPoints = []
      
      await new Promise(resolve => {
        table.cursor({
          limit: 2000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || ''
              const outValue = record.get('out')?.toString() || ''
              const displayName = record.get('displayName')?.toString() || ''
              
              console.log(`📍 Found: ${displayName} = "${outValue}" at ${slotPath}`)
              
              if (slotPath && outValue) {
                let cleanPath = slotPath.replace(/^slot:/, '').trim()
                if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath
                
                // Extract room name from out value
                // Format: "M-Dish {ok} @ def" -> "M-Dish"
                // Format: "Kitchen {ok}" -> "Kitchen"
                let roomName = outValue.split('{')[0].trim()
                
                // Remove trailing @ info if still present
                roomName = roomName.split('@')[0].trim()
                
                // Validate room name - must be a real name, not status/number
                const isValidRoom = roomName && 
                  roomName.length >= 2 &&
                  roomName !== 'null' &&
                  roomName !== '-' &&
                  !/^\d+$/.test(roomName) // Not just a number
                
                if (isValidRoom) {
                  locationPoints.push({
                    path: cleanPath,
                    value: roomName,
                    displayName: displayName
                  })
                  console.log(`📍 Valid location: "${roomName}" for path ${cleanPath}`)
                }
              }
            } catch (e) {
              console.warn('📍 Error processing location record:', e)
            }
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`📍 Found ${locationPoints.length} tstatLocation points with room names`)
      
      // Match locations to equipment by equipment ID in path
      let matchCount = 0
      for (const equip of this.equipment) {
        const equipId = equip.id || ''
        const equipIdLower = equipId.toLowerCase()
        
        // Find tstatLocation for this equipment
        // Equipment ID: HP35
        // Location path: /Drivers/BacnetNetwork/HP35/points/Monitor/tstatLocation
        for (const loc of locationPoints) {
          const locPathLower = loc.path.toLowerCase()
          
          // Check if this tstatLocation belongs to this equipment
          if (locPathLower.includes('/' + equipIdLower + '/')) {
            equip.location = loc.value
            
            // Update display name: "M-Dish - HP35" format
            if (equip.name && !equip.name.toLowerCase().includes(loc.value.toLowerCase())) {
              equip.displayName = `${loc.value} - ${equip.name}`
            }
            
            matchCount++
            console.log(`📍 Matched: ${equip.id} → "${loc.value}"`)
            break
          }
        }
      }
      
      console.log(`📍 Location matching complete: ${matchCount}/${this.equipment.length} equipment have locations`)
      
    } catch (e) {
      console.warn('⚠️ Error discovering locations:', e.message || e)
    }
  }
  
  /**
   * Fallback location discovery using broader search
   * @private
   */
  async _discoverLocationsFallback() {
    const baja = this._getBaja()
    if (!baja) return
    
    console.log('📍 Trying fallback location discovery...')
    
    try {
      // Broader query for any Location-related points
      const locationBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath as 'slotPath\\',out as 'out\\',displayName as 'displayName\\' from control:ControlPoint where displayName like '*ocation*'"
      
      const table = await baja.Ord.make(locationBql).get()
      if (!table || !table.cursor) {
        console.log('📍 No location points found')
        return
      }
      
      const locationPoints = []
      
      await new Promise(resolve => {
        table.cursor({
          limit: 2000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || ''
              const outValue = record.get('out')?.toString() || ''
              
              if (slotPath && outValue) {
                let cleanPath = slotPath.replace(/^slot:/, '').trim()
                if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath
                
                let roomName = outValue.split('{')[0].trim().split('@')[0].trim()
                
                if (roomName && roomName.length >= 2 && roomName !== '-' && roomName !== 'null') {
                  locationPoints.push({ path: cleanPath, value: roomName })
                }
              }
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`📍 Fallback found ${locationPoints.length} location points`)
      
      // Match to equipment
      let matchCount = 0
      for (const equip of this.equipment) {
        const equipIdLower = (equip.id || '').toLowerCase()
        
        for (const loc of locationPoints) {
          if (loc.path.toLowerCase().includes('/' + equipIdLower + '/')) {
            equip.location = loc.value
            if (equip.name && !equip.name.toLowerCase().includes(loc.value.toLowerCase())) {
              equip.displayName = `${loc.value} - ${equip.name}`
            }
            matchCount++
            break
          }
        }
      }
      
      console.log(`📍 Fallback matching: ${matchCount}/${this.equipment.length}`)
    } catch (e) {
      console.warn('⚠️ Fallback location error:', e)
    }
  }
  
  /**
   * Background load points for equipment with history (for sparklines)
   * @private
   */
  async _backgroundLoadHistoryPoints() {
    const baja = this._getBaja()
    if (!baja) return
    
    console.log('🔄 Starting background history point loading...')
    
    try {
      // Query all history configs to find which equipment have histories
      const historyBql = "station:|slot:/|bql:select slotPath as 'slotPath\\',id as 'id\\' from history:HistoryConfig"
      
      const table = await baja.Ord.make(historyBql).get()
      if (!table || !table.cursor) {
        console.log('🔄 No history configs found')
        return
      }
      
      const historyPaths = new Set()
      const equipmentWithHistory = new Set()
      
      await new Promise(resolve => {
        table.cursor({
          limit: 5000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || ''
              if (slotPath) {
                historyPaths.add(slotPath.toLowerCase())
                // Extract equipment ID from history path
                const parts = slotPath.split('/')
                for (const part of parts) {
                  if (part && part.length > 0) {
                    equipmentWithHistory.add(part.toLowerCase())
                  }
                }
              }
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`🔄 Found ${historyPaths.size} history configs`)
      
      // Mark equipment that likely has history
      for (const equip of this.equipment) {
        const equipIdLower = (equip.id || '').toLowerCase()
        if (equipmentWithHistory.has(equipIdLower)) {
          equip.hasHistory = true
        }
      }
      
      // Load points for first few equipment with history (for immediate sparklines)
      const equipWithHistory = this.equipment.filter(e => e.hasHistory).slice(0, 5)
      console.log(`🔄 Pre-loading points for ${equipWithHistory.length} equipment with history`)
      
      for (const equip of equipWithHistory) {
        try {
          await this._loadPointsForEquipment(equip.id)
        } catch (e) {}
      }
      
      console.log('🔄 Background history loading complete')
    } catch (e) {
      console.warn('⚠️ Background history loading error:', e)
    }
  }
  
  /**
   * Start alarm monitoring using alarm:AlarmService subscription
   * @private
   */
  async _startAlarmMonitoring() {
    const baja = this._getBaja()
    if (!baja || !baja.Subscriber) {
      console.log('⚠️ Alarm monitoring not available')
      return
    }
    
    console.log('🔔 Starting alarm monitoring...')
    this.alarms = []
    this.alarmCallbacks = []
    
    try {
      // Query current alarms using BQL with specific fields (not *)
      // alarm:AlarmRecord schema requires explicit field selection
      const alarmFields = "uuid, sourceState, ackState, alarmClass, timestamp, sourceName, alarmData"
      const alarmQueries = [
        `station:|slot:/Services/AlarmService|bql:select ${alarmFields} from alarm:AlarmRecord`,
        `station:|slot:/|bql:select ${alarmFields} from alarm:AlarmRecord`
      ]
      
      let table = null
      
      for (const query of alarmQueries) {
        try {
          table = await baja.Ord.make(query).get()
          if (table && table.cursor) {
            console.log(`🔔 Using alarm query: ${query.substring(0, 80)}...`)
            break
          }
        } catch (e) {
          console.log(`🔔 Alarm query failed, trying next...`)
        }
      }
      
      if (!table || !table.cursor) {
        console.log('🔔 No alarm service or alarms found - alarms may not be configured')
        // Still notify callbacks with empty array
        if (this.alarmCallbacks && this.alarmCallbacks.length > 0) {
          this.alarmCallbacks.forEach(cb => {
            try {
              cb([])
            } catch (e) {}
          })
        }
        return
      }
      
      const self = this
      
      await new Promise(resolve => {
        table.cursor({
          limit: 100,
          each: function(record) {
            try {
              const uuid = record.get('uuid')?.toString() || ''
              const sourceState = record.get('sourceState')?.toString() || ''
              const ackState = record.get('ackState')?.toString() || ''
              const alarmClass = record.get('alarmClass')?.toString() || ''
              const timestamp = record.get('timestamp')?.toString() || ''
              const sourceName = record.get('sourceName')?.toString() || ''
              const alarmData = record.get('alarmData')?.toString() || ''
              
              // Parse priority from alarmClass
              let priority = 'normal'
              const classLower = (alarmClass || '').toLowerCase()
              if (classLower.includes('critical') || classLower.includes('emergency')) {
                priority = 'critical'
              } else if (classLower.includes('warning') || classLower.includes('caution')) {
                priority = 'warning'
              }
              
              // Extract equipment ID from source name/path
              let equipmentId = null
              if (sourceName) {
                // Try to match source to equipment ID
                for (const equip of self.equipment) {
                  if (sourceName.includes(equip.id) || sourceName.includes(equip.name)) {
                    equipmentId = equip.id
                    break
                  }
                }
              }
              
              // Parse timestamp
              let alarmTimestamp = new Date()
              if (timestamp) {
                try {
                  // Try to parse timestamp - might be Baja timestamp object
                  if (timestamp.getMillis) {
                    alarmTimestamp = new Date(timestamp.getMillis())
                  } else if (typeof timestamp === 'string') {
                    alarmTimestamp = new Date(timestamp)
                  }
                } catch (e) {
                  alarmTimestamp = new Date()
                }
              }
              
              self.alarms.push({
                id: uuid || `alarm_${Date.now()}_${Math.random()}`,
                source: sourceName,
                message: alarmData || sourceName || 'Alarm',
                priority: priority,
                state: sourceState,
                ackState: ackState,
                timestamp: alarmTimestamp.toISOString(),
                alarmClass: alarmClass,
                active: true, // All queried alarms are active
                acknowledged: ackState && ackState.toLowerCase().includes('ack'),
                equipmentId: equipmentId
              })
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`🔔 Found ${this.alarms.length} alarms`)
      
      // Update equipment status from alarms
      this._updateStatusFromAlarms()
      
      // Notify any existing callbacks
      if (this.alarmCallbacks && this.alarmCallbacks.length > 0) {
        this.alarmCallbacks.forEach(cb => {
          try {
            cb(this.alarms)
          } catch (e) {
            console.warn('Error in alarm callback:', e)
          }
        })
      }
      
    } catch (e) {
      console.warn('⚠️ Error monitoring alarms:', e)
    }
  }
  
  /**
   * Get current alarms
   */
  getAlarms() {
    return this.alarms || []
  }

  /**
   * Get all unique equipment types
   */
  async getEquipmentTypes() {
    if (!this.initialized) {
      await this.initialize();
    }

    const types = [...new Set(this.equipment.map(e => e.type))];
    return types.sort();
  }

  /**
   * Get building summary statistics
   */
  async getBuildingStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    const equipmentTypes = await this.getEquipmentTypes();
    const locations = [...new Set(this.equipment.map(e => e.location).filter(l => l && l !== 'Unknown'))].sort();

    return {
      datasetName: 'Niagara Station (Live)',
      equipmentCount: this.equipment.length,
      pointCount: this.points.length,
      scheduleCount: 0,
      historyCount: 0,
      taggedComponentCount: 0,
      equipmentTypes: equipmentTypes,
      locations: locations,
      alarmCount: (this.alarms || []).length,
      equipmentByType: {},
      pointTypes: {}
    };
  }

  /**
   * Subscribe to alarms (callback receives array of alarms)
   */
  subscribeToAlarms(callback) {
    if (!this.alarmCallbacks) {
      this.alarmCallbacks = []
    }
    this.alarmCallbacks.push(callback)
    
    // Immediately call with current alarms
    if (this.alarms && this.alarms.length > 0) {
      callback(this.alarms)
    }
    
    // Return unsubscribe function
    return () => {
      const idx = this.alarmCallbacks.indexOf(callback)
      if (idx > -1) {
        this.alarmCallbacks.splice(idx, 1)
      }
    }
  }
}

export default NiagaraBQLAdapter;


