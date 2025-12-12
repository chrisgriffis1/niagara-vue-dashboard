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
        // Don't cache points - they're loaded on demand
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log('💾 Saved equipment to cache');
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
      // Cache expires after 1 hour
      if (Date.now() - data.timestamp > 60 * 60 * 1000) {
        console.log('📦 Cache expired, refreshing...');
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
        console.log('📦 Using cached equipment data...');
        this.equipment = cached.equipment;
        console.log(`✓ Loaded ${this.equipment.length} equipment from cache`);
        
        // Refresh data in background
        this._discoverAllEquipment().then(() => {
          this._saveToCache();
          console.log('✓ Background refresh complete');
        }).catch(e => console.warn('Background refresh failed:', e));
      } else {
        // Tesla-style: Only discover equipment at startup - FAST!
        // Points load lazily when user expands equipment card
        console.log('📡 Discovering equipment...');
        await this._discoverAllEquipment();
        console.log(`✓ Found ${this.equipment.length} equipment items`);
        
        // Save to cache
        this._saveToCache();
      }
      
      // Discover locations (parallel, non-blocking)
      this._discoverLocations().catch(err => {
        console.warn('⚠️ Location discovery failed:', err)
      })
      
      // Start live subscriptions for equipment status (non-blocking)
      this._startLiveSubscriptions().catch(err => {
        console.warn('⚠️ Live subscriptions failed:', err)
      })
      
      // Start alarm monitoring (non-blocking)
      this._startAlarmMonitoring().catch(err => {
        console.warn('⚠️ Alarm monitoring failed:', err)
      })
      
      this.initialized = true;
      
      console.log(`✓ Niagara BQL Adapter initialized (fast mode):`);
      console.log(`  📦 Equipment: ${this.equipment.length}`);
      console.log(`  📍 Points: Load on demand`);
      
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
    const bql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath, displayName, name from bacnet:BacnetDevice";
    console.log('📝 BQL:', bql);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Equipment discovery timeout (30s)'));
      }, 30000);
      
      console.log('⏳ Waiting for BQL response...');
      baja.Ord.make(bql).get().then(table => {
        clearTimeout(timeout);
        this.equipment = [];
        
        console.log('✓ BQL query completed, processing results...');
        console.log('📊 Table type:', typeof table);
        console.log('📊 Table cursor type:', typeof table.cursor);
        
        let count = 0;
        let cursorStarted = false;
        
        // Add a timeout to detect if cursor never starts
        const cursorTimeout = setTimeout(() => {
          if (!cursorStarted) {
            console.error('❌ Cursor never started - timeout after 5 seconds');
            reject(new Error('Cursor processing timeout - cursor never started'));
          }
        }, 5000);
        
        try {
          console.log('📊 Starting cursor iteration...');
          const self = this; // Save reference for use in callbacks
          table.cursor({
            limit: 1000,
            each: function(record) {
              cursorStarted = true;
              clearTimeout(cursorTimeout);
              count++;
              if (count === 1) {
                console.log(`  ✓ Processing first equipment record...`);
              }
              if (count % 50 === 0) {
                console.log(`  Processing equipment ${count}...`);
              }
              try {
                let slotPath = record.get('slotPath')?.toString() || '';
                const displayName = record.get('displayName')?.toString() || '';
                const name = record.get('name')?.toString() || '';
                
                if (!slotPath) {
                  console.warn(`  Skipping record ${count} - no slotPath`);
                  return;
                }
                
                // Clean slotPath: remove "slot:" prefix, ensure starts with /
                slotPath = slotPath.replace(/^slot:/, '').trim();
                if (!slotPath.startsWith('/')) {
                  slotPath = '/' + slotPath;
                }
                
                // Extract equipment ID from slotPath
                const pathParts = slotPath.split('/');
                const equipId = pathParts[pathParts.length - 1] || slotPath;
                
                // Infer equipment type from name/displayName
                const friendlyType = self._inferEquipmentType(name || displayName);
                
                // Extract location from name (e.g., "HP21 300 Link Hall" → "300 Link Hall")
                const location = self._extractLocation(name || displayName);
                
                self.equipment.push({
                  id: equipId,
                  name: displayName || name || equipId,
                  type: friendlyType,
                  location: location,
                  ord: slotPath,
                  slotPath: slotPath
                });
                
                if (count === 1) {
                  console.log(`  ✓ First equipment processed: ${equipId}`);
                }
              } catch (e) {
                console.error(`  ❌ Error processing equipment record ${count}:`, e);
                console.error('  Error stack:', e.stack);
              }
            },
            after: function() {
              clearTimeout(cursorTimeout);
              console.log(`✓ Equipment discovery complete: ${self.equipment.length} items processed`);
              resolve();
            }
          });
          console.log('📊 Cursor call completed, waiting for callbacks...');
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
   * Start live subscriptions for equipment status monitoring
   * Subscribes to key points (like online/offline status) for each equipment
   * @private
   */
  async _startLiveSubscriptions() {
    const baja = this._getBaja()
    if (!baja || !baja.Subscriber) {
      console.warn('⚠️ Cannot start live subscriptions - Subscriber not available')
      return
    }
    
    console.log(`🔔 Starting live subscriptions for ${this.equipment.length} equipment...`)
    
    try {
      // Create subscriber for live updates
      const subscriber = new baja.Subscriber()
      this.subscriber = subscriber
      
      // Subscribe to a sample of points from each equipment for status monitoring
      // Limit to first 20 equipment to avoid overwhelming the system
      const equipmentToMonitor = this.equipment.slice(0, 20)
      const subscriptionPromises = []
      
      console.log(`  📊 Will monitor ${equipmentToMonitor.length} equipment`)
      
      for (const equip of equipmentToMonitor) {
        const points = this.equipmentPointsMap.get(equip.id) || []
        if (points.length === 0) {
          console.log(`  ⚠️ No points found for equipment: ${equip.id}`)
          continue
        }
        
        // Find status-related points (online, fault, alarm, etc.)
        const statusPoints = points.filter(p => {
          const name = (p.name || '').toLowerCase()
          return name.includes('online') || name.includes('fault') || 
                 name.includes('alarm') || name.includes('status')
        })
        
        // Subscribe to first status point found, or first point if none found
        const pointToSubscribe = statusPoints[0] || points[0]
        if (!pointToSubscribe || !pointToSubscribe.slotPath) {
          console.log(`  ⚠️ No valid point to subscribe for equipment: ${equip.id}`)
          continue
        }
        
        // Create subscription promise
        const subscriptionPromise = (async () => {
          try {
            let cleanSlotPath = pointToSubscribe.slotPath.toString().trim().replace(/^slot:/, '')
            if (!cleanSlotPath.startsWith('/')) {
              cleanSlotPath = '/' + cleanSlotPath
            }
            const pointOrd = 'station:|slot:' + cleanSlotPath
            
            console.log(`  🔌 Subscribing to ${pointToSubscribe.name} for ${equip.name}...`)
            
            // Subscribe to point
            const pointComponent = await baja.Ord.make(pointOrd).get({ subscriber: subscriber })
            this.subscribedPoints.set(equip.id, pointComponent)
            
            // Find the equipment object in the array by id
            const equipIndex = this.equipment.findIndex(e => e.id === equip.id)
            if (equipIndex === -1) {
              console.warn(`  ⚠️ Equipment not found in array: ${equip.id}`)
              return
            }
            
            const equipRef = this.equipment[equipIndex]
            
            // Update equipment status based on point value
            const updateStatus = () => {
              try {
                const out = pointComponent.get('out')
                if (out) {
                  const valueStr = out.toString().toLowerCase()
                  // Check for offline/fault indicators
                  if (valueStr.includes('offline') || valueStr.includes('fault') || 
                      valueStr.includes('alarm') || valueStr === 'false' || valueStr === '0') {
                    equipRef.status = 'error'
                  } else if (valueStr.includes('warning')) {
                    equipRef.status = 'warning'
                  } else {
                    equipRef.status = 'ok'
                  }
                  console.log(`  ✓ Status for ${equipRef.name}: ${equipRef.status} (value: ${valueStr})`)
                }
              } catch (e) {
                console.warn(`  ❌ Error updating status for ${equip.id}:`, e)
              }
            }
            
            // Initial status check
            updateStatus()
            
            // Listen for changes using regular function to preserve 'this' context
            const self = this
            subscriber.attach('changed', function(prop) {
              // 'this' in the callback refers to the component that changed
              if (prop && prop.getName && prop.getName() === 'out') {
                // Check if this is the point we're monitoring
                const navOrd = this.getNavOrd ? this.getNavOrd().toString() : ''
                if (navOrd.includes(cleanSlotPath)) {
                  console.log(`  🔄 Live update for ${equipRef.name}`)
                  updateStatus()
                }
              }
            })
            
            console.log(`  ✓ Subscribed to ${equip.name}`)
            return equip.id
          } catch (err) {
            console.warn(`  ❌ Failed to subscribe to point for ${equip.id}:`, err)
            return null
          }
        })()
        
        subscriptionPromises.push(subscriptionPromise)
      }
      
      // Wait for all subscriptions to complete
      const results = await Promise.all(subscriptionPromises)
      const successCount = results.filter(r => r !== null).length
      
      console.log(`✓ Started live subscriptions for ${successCount} equipment`)
    } catch (error) {
      console.warn('⚠️ Failed to start live subscriptions:', error)
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
   * Discover Location points and match them to equipment
   * Based on pattern from 04-bql-device-fuzzy-matching.html
   * @private
   */
  async _discoverLocations() {
    const baja = this._getBaja()
    if (!baja) return
    
    console.log('📍 Discovering location points...')
    
    try {
      // BQL query for Location points - pattern from 04-bql-device-fuzzy-matching.html
      const locationBql = "station:|slot:/Drivers/BacnetNetwork|bql:select slotPath as 'slotPath\\',toString as 'toString\\' from control:ControlPoint where displayName like '*ocation*'"
      
      const table = await baja.Ord.make(locationBql).get()
      if (!table || !table.cursor) {
        console.log('📍 No location points found')
        return
      }
      
      const locationPoints = []
      const self = this
      
      await new Promise(resolve => {
        table.cursor({
          limit: 1000,
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || ''
              const toString = record.get('toString')?.toString() || ''
              
              if (slotPath) {
                const cleanPath = slotPath.replace(/^slot:/, '').trim()
                // Extract location value from toString (e.g., "Kitchen {ok}" -> "Kitchen")
                let locationValue = toString.split('{')[0].trim()
                if (!locationValue) {
                  locationValue = toString.split('[')[0].trim()
                }
                
                locationPoints.push({
                  path: cleanPath,
                  value: locationValue || 'Unknown'
                })
              }
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`📍 Found ${locationPoints.length} location points`)
      
      // Match locations to equipment by equipment ID in path
      let matchCount = 0
      for (const equip of this.equipment) {
        const equipId = equip.id || ''
        
        // Find location point that contains this equipment ID in its path
        for (const loc of locationPoints) {
          // Check if location path contains the equipment ID
          // e.g., /Drivers/BacnetNetwork/HP12/points/.../Location
          if (loc.path.includes(`/${equipId}/`) && loc.value && loc.value !== 'Unknown') {
            equip.location = loc.value
            
            // Update equipment name to include location (for HPs especially)
            // "HP21" → "Kitchen - HP21"
            if (equip.name && !equip.name.includes(loc.value)) {
              equip.displayName = `${loc.value} - ${equip.name}`
            }
            
            matchCount++
            break
          }
        }
      }
      
      console.log(`📍 Location discovery complete: ${matchCount} equipment matched`)
    } catch (e) {
      console.warn('⚠️ Error discovering locations:', e)
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
      // Query current alarms using BQL
      const alarmBql = "station:|slot:/Services/AlarmService|bql:select * from alarm:AlarmRecord"
      
      const table = await baja.Ord.make(alarmBql).get()
      if (!table) {
        console.log('🔔 No alarm service or alarms found')
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
              
              self.alarms.push({
                id: uuid,
                source: sourceName,
                message: alarmData || sourceName,
                priority: priority,
                state: sourceState,
                ackState: ackState,
                timestamp: timestamp,
                alarmClass: alarmClass
              })
            } catch (e) {}
          },
          after: function() {
            resolve()
          }
        })
      })
      
      console.log(`🔔 Found ${this.alarms.length} alarms`)
      
      // Notify any existing callbacks
      this.alarmCallbacks.forEach(cb => cb(this.alarms))
      
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
