/**
 * History Cache Service
 * Pre-fetches and caches historical data for instant chart loading
 * 
 * Two-Tier Strategy:
 * TIER 1 (Station Cache): Pre-cached JSON on station (fast download)
 * TIER 2 (Browser Cache): IndexedDB for instant access
 * 
 * Flow:
 * 1. Check for station-side pre-cache → Download if available (FAST!)
 * 2. Fall back to individual queries if no station cache
 * 3. Store in IndexedDB for instant subsequent access
 * 4. Auto-refresh periodically
 */

import stationHistoryCacheService from './StationHistoryCacheService'

class HistoryCacheService {
  constructor() {
    this.db = null
    this.dbName = 'NiagaraHistoryCache'
    this.storeName = 'histories'
    this.version = 1
    
    this.cacheStatus = {
      isInitialized: false,
      isCaching: false,
      totalPoints: 0,
      cachedPoints: 0,
      lastUpdate: null,
      errors: []
    }
    
    // Config
    this.config = {
      refreshIntervalMinutes: 10,
      idleTimeBeforeRefreshSeconds: 300, // 5 minutes idle
      maxHistoryDays: 7, // Cache last 7 days
      batchSize: 10 // Fetch 10 histories at a time
    }
    
    this.lastActivity = Date.now()
    this.refreshTimer = null
    this.idleTimer = null
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log('✅ IndexedDB opened successfully')
        this.cacheStatus.isInitialized = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        
        // Create object store for histories
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'pointId' })
          store.createIndex('equipmentId', 'equipmentId', { unique: false })
          store.createIndex('lastUpdate', 'lastUpdate', { unique: false })
          console.log('📦 Created history cache store')
        }
      }
    })
  }

  /**
   * Start background caching process
   * TIER 1: Try to load from station cache first (FAST!)
   * TIER 2: Fall back to individual queries
   */
  async startCaching(adapter, deviceStore) {
    if (!this.cacheStatus.isInitialized) {
      await this.init()
    }

    console.log('🚀 Starting history cache process...')
    this.cacheStatus.isCaching = true

    try {
      // TIER 1: Try to load station-side pre-cache
      console.log('🏭 Checking for station-side cache...')
      const stationCache = await stationHistoryCacheService.loadCacheFromStation()
      
      if (stationCache && stationCache.points) {
        console.log('⚡ FOUND STATION CACHE! Loading pre-cached data...')
        await this.loadStationCache(stationCache)
        console.log(`✅ Loaded ${Object.keys(stationCache.points).length} histories from station cache!`)
        this.cacheStatus.isCaching = false
        this.cacheStatus.lastUpdate = new Date()
        
        // Schedule next refresh
        this.scheduleRefresh(adapter, deviceStore)
        return
      }
      
      console.log('ℹ️ No station cache found, fetching histories individually...')
      
      // TIER 2: Fall back to individual queries
      // Get all equipment
      const equipment = deviceStore.allDevices || []
      console.log(`📋 Found ${equipment.length} equipment to cache`)

      // Collect all points with history
      const pointsToCache = []
      for (const device of equipment) {
        const points = deviceStore.equipmentPoints[device.id] || []
        const historyPoints = points.filter(p => p.hasHistory)
        
        historyPoints.forEach(point => {
          pointsToCache.push({
            pointId: point.id,
            equipmentId: device.id,
            pointName: point.name,
            equipmentName: device.name
          })
        })
      }

      this.cacheStatus.totalPoints = pointsToCache.length
      console.log(`🎯 Total points with history: ${pointsToCache.length}`)

      // Fetch histories in batches
      for (let i = 0; i < pointsToCache.length; i += this.config.batchSize) {
        const batch = pointsToCache.slice(i, i + this.config.batchSize)
        await this.cacheBatch(adapter, batch)
        
        // Log progress
        this.cacheStatus.cachedPoints = Math.min(i + this.config.batchSize, pointsToCache.length)
        const progress = ((this.cacheStatus.cachedPoints / this.cacheStatus.totalPoints) * 100).toFixed(1)
        console.log(`📊 Cache progress: ${progress}% (${this.cacheStatus.cachedPoints}/${this.cacheStatus.totalPoints})`)
      }

      this.cacheStatus.lastUpdate = new Date()
      this.cacheStatus.isCaching = false
      console.log('✅ History caching complete!')

      // Start periodic refresh
      this.scheduleRefresh(adapter, deviceStore)

    } catch (error) {
      console.error('❌ History caching failed:', error)
      this.cacheStatus.errors.push(error.message)
      this.cacheStatus.isCaching = false
    }
  }

  /**
   * Load histories from station-side cache into IndexedDB
   * This is MUCH faster than querying each point individually
   */
  async loadStationCache(stationCache) {
    console.log('📥 Loading station cache into IndexedDB...')
    const points = Object.values(stationCache.points)
    this.cacheStatus.totalPoints = points.length
    this.cacheStatus.cachedPoints = 0
    
    for (const pointData of points) {
      try {
        // Store in IndexedDB with same format as individual cache
        await this.storeHistory(
          pointData.pointId,
          pointData.equipmentId,
          pointData.data
        )
        this.cacheStatus.cachedPoints++
      } catch (error) {
        console.warn(`⚠️ Failed to store ${pointData.pointName}:`, error)
        this.cacheStatus.errors.push(`${pointData.pointName}: ${error.message}`)
      }
    }
    
    console.log(`✅ Loaded ${this.cacheStatus.cachedPoints}/${this.cacheStatus.totalPoints} histories from station cache`)
  }

  /**
   * Cache a batch of histories
   */
  async cacheBatch(adapter, batch) {
    const promises = batch.map(async ({ pointId, equipmentId, pointName, equipmentName }) => {
      try {
        // Calculate date range (last 7 days)
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - this.config.maxHistoryDays)

        // Fetch history from adapter
        const history = await adapter.getHistoricalData(pointId, start, end)

        // Store in IndexedDB
        await this.storeHistory({
          pointId,
          equipmentId,
          pointName,
          equipmentName,
          data: history,
          lastUpdate: new Date(),
          startDate: start,
          endDate: end
        })

        return { success: true, pointId }
      } catch (error) {
        console.warn(`⚠️ Failed to cache ${pointName}:`, error.message)
        return { success: false, pointId, error: error.message }
      }
    })

    await Promise.all(promises)
  }

  /**
   * Store history in IndexedDB
   */
  async storeHistory(historyRecord) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(historyRecord)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get history from cache (INSTANT!)
   */
  async getHistory(pointId) {
    if (!this.db) {
      throw new Error('Cache not initialized')
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(pointId)

      request.onsuccess = () => {
        const record = request.result
        if (record) {
          console.log(`⚡ Loaded history from cache: ${record.pointName} (${record.data.length} points)`)
          resolve(record.data)
        } else {
          console.warn(`⚠️ No cached history for point: ${pointId}`)
          resolve(null)
        }
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get history for a specific time range (subset of cache)
   */
  async getHistoryRange(pointId, startDate, endDate) {
    const fullHistory = await this.getHistory(pointId)
    
    if (!fullHistory) {
      return null
    }

    // Filter by date range
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    
    return fullHistory.filter(point => {
      const timestamp = new Date(point.timestamp).getTime()
      return timestamp >= start && timestamp <= end
    })
  }

  /**
   * Check if point has cached history
   */
  async hasCachedHistory(pointId) {
    const history = await this.getHistory(pointId)
    return history !== null && history.length > 0
  }

  /**
   * Start periodic refresh (renamed from startPeriodicRefresh)
   */
  scheduleRefresh(adapter, deviceStore) {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Refresh every X minutes
    const intervalMs = this.config.refreshIntervalMinutes * 60 * 1000
    this.refreshTimer = setInterval(() => {
      console.log('🔄 Starting periodic cache refresh...')
      this.startCaching(adapter, deviceStore)
    }, intervalMs)

    console.log(`⏰ Periodic refresh set for every ${this.config.refreshIntervalMinutes} minutes`)
  }

  /**
   * Track user activity
   */
  recordActivity() {
    this.lastActivity = Date.now()
  }

  /**
   * Check if user is idle
   */
  isUserIdle() {
    const idleMs = this.config.idleTimeBeforeRefreshSeconds * 1000
    return (Date.now() - this.lastActivity) > idleMs
  }

  /**
   * Clear all cached histories
   */
  async clearCache() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        console.log('🗑️ Cache cleared')
        this.cacheStatus.cachedPoints = 0
        this.cacheStatus.lastUpdate = null
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cacheStatus,
      cacheAge: this.cacheStatus.lastUpdate 
        ? Math.floor((Date.now() - this.cacheStatus.lastUpdate.getTime()) / 1000 / 60) 
        : null,
      isStale: this.cacheStatus.lastUpdate
        ? (Date.now() - this.cacheStatus.lastUpdate.getTime()) > (this.config.refreshIntervalMinutes * 60 * 1000)
        : true
    }
  }

  /**
   * Export cache to JSON (for debugging/backup)
   */
  async exportCache() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => {
        const allData = request.result
        const json = JSON.stringify(allData, null, 2)
        console.log(`📤 Exported ${allData.length} cached histories (${(json.length / 1024 / 1024).toFixed(2)} MB)`)
        resolve(json)
      }

      request.onerror = () => reject(request.error)
    })
  }
}

// Create singleton instance
const historyCacheService = new HistoryCacheService()

export default historyCacheService

