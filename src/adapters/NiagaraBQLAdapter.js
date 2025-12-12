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
      // Tesla-style: Only discover equipment at startup - FAST!
      // Points load lazily when user expands equipment card
      console.log('📡 Discovering equipment...');
      await this._discoverAllEquipment();
      console.log(`✓ Found ${this.equipment.length} equipment items`);
      
      // Start live subscriptions for equipment status (non-blocking)
      this._startLiveSubscriptions().catch(err => {
        console.warn('⚠️ Live subscriptions failed:', err)
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
                const slotPath = record.get('slotPath')?.toString() || '';
                const displayName = record.get('displayName')?.toString() || '';
                const name = record.get('name')?.toString() || '';
                
                if (!slotPath) {
                  console.warn(`  Skipping record ${count} - no slotPath`);
                  return;
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
      name: equip.name,
      type: equip.type,
      location: equip.location,
      ord: equip.ord,
      pointCount: this.equipmentPointsMap.get(equip.id)?.length || 0,
      status: equip.status || 'ok' // Status from live subscription or default
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
      displayValue: this._formatPointValue(point),
      trendable: point.trendable,
      hasHistory: !!point.hasHistory,
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
    
    // Query points for this specific equipment
    const bql = `station:|slot:${equipment.slotPath}|bql:select slotPath, displayName, name, out from control:ControlPoint`;
    
    try {
      const table = await baja.Ord.make(bql).get();
      if (!table || !table.cursor) {
        return [];
      }
      
      const points = [];
      const self = this;
      
      return new Promise((resolve) => {
        table.cursor({
          limit: 500, // Limit per equipment
          each: function(record) {
            try {
              const slotPath = record.get('slotPath')?.toString() || '';
              const displayName = record.get('displayName')?.toString() || '';
              const name = record.get('name')?.toString() || '';
              
              if (!slotPath) return;
              
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
  async getHistoricalData(pointId, timeRange = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const point = this.pointsMap.get(pointId);
    
    if (!point || !point.trendable) {
      return [];
    }

    // Find history ID for this point
    // History IDs are typically the point's path relative to station root
    const historyId = await this._findHistoryId(point);
    
    if (!historyId) {
      console.warn(`No history found for point: ${pointId}`);
      return [];
    }

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
      
      console.log(`  🔍 Finding history for ${point.id}:`);
      console.log(`     Equipment: ${equipmentName}, SlotName: ${slotName}`);
      console.log(`     BQL: ${bqlQuery}`);
      
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

      console.log(`  ✓ History object retrieved, querying records...`);

      const dataPoints = [];
      const startMillis = startDate.getTime();
      const endMillis = endDate.getTime();

      return new Promise((resolve, reject) => {
        const self = this;
        let recordCount = 0;
        let filteredCount = 0;
        let firstRecordTime = null;
        let lastRecordTime = null;
        
        history.cursor({
          each: function(record) {
            recordCount++;
            
            if (recordCount === 1) {
              console.log(`     Processing first history record...`);
            }
            if (recordCount % 100 === 0) {
              console.log(`     Processed ${recordCount} records...`);
            }
            
            try {
              const ts = record.get('timestamp');
              const tsMillis = ts.getMillis();
              const recordDate = new Date(tsMillis);
              
              // Track first and last record times
              if (!firstRecordTime) firstRecordTime = recordDate;
              lastRecordTime = recordDate;
              
              // Filter by date range
              if (tsMillis < startMillis || tsMillis > endMillis) {
                filteredCount++;
                if (filteredCount <= 3) {
                  console.log(`     Filtered record ${recordCount}: ${recordDate.toISOString()} (outside range)`);
                }
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
            console.log(`  ✓ History query complete: Found ${dataPoints.length} records (checked ${recordCount} total, filtered ${filteredCount})`);
            if (firstRecordTime && lastRecordTime) {
              console.log(`     History data spans: ${firstRecordTime.toISOString()} to ${lastRecordTime.toISOString()}`);
            }
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
    const locations = [...new Set(this.equipment.map(e => e.location))].sort();

    return {
      datasetName: 'Niagara Station (Live)',
      equipmentCount: this.equipment.length,
      pointCount: this.points.length,
      scheduleCount: 0, // TODO: Discover schedules
      historyCount: 0, // TODO: Count histories
      taggedComponentCount: 0,
      equipmentTypes: equipmentTypes,
      locations: locations,
      equipmentByType: {},
      pointTypes: {}
    };
  }

  /**
   * Subscribe to alarms (WebSocket)
   */
  subscribeToAlarms(callback) {
    // TODO: Implement WebSocket subscription to alarm service
    console.warn('Alarm subscription not yet implemented');
    return () => {}; // Return unsubscribe function
  }
}

export default NiagaraBQLAdapter;
