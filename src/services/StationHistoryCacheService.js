/**
 * Station-Side History Pre-Cache Service
 * 
 * Purpose: Pre-fetch and cache all point histories on the Niagara station
 * This eliminates the need for individual BQL queries from the browser
 * 
 * Strategy:
 * 1. Run as scheduled job on station (nightly/hourly)
 * 2. Query all points with history
 * 3. Fetch historical data for each
 * 4. Save to JSON file on station
 * 5. Browser downloads ONE file instead of hundreds of queries
 * 
 * Benefits:
 * - Drastically faster initial load (1 download vs 100+ queries)
 * - Less load on station (queries run once, cached for all users)
 * - Can run during off-hours
 * - Browser still gets instant access
 */

class StationHistoryCacheService {
  constructor() {
    this.cacheFilePath = 'station:|slot:/HistoryCache/histories.json'
    this.statusFilePath = 'station:|slot:/HistoryCache/cache-status.json'
    this.metadataFilePath = 'station:|slot:/HistoryCache/metadata.json'
  }

  /**
   * Generate the station-side cache
   * This runs ON THE STATION (via browser or scheduled job)
   */
  async generateStationCache(adapter, options = {}) {
    const {
      maxHistoryDays = 7,
      batchSize = 5,
      onProgress = null
    } = options

    console.log('🏭 Starting station-side history cache generation...')
    
    const startTime = Date.now()
    const cacheData = {
      version: '1.0',
      generated: new Date().toISOString(),
      historyDays: maxHistoryDays,
      points: {},
      metadata: {
        totalPoints: 0,
        successCount: 0,
        errorCount: 0,
        errors: [],
        generationTimeMs: 0
      }
    }

    try {
      // Step 1: Discover all equipment
      console.log('📋 Discovering equipment...')
      const equipment = await adapter.discoverDevices()
      console.log(`✅ Found ${equipment.length} equipment`)

      // Step 2: Collect all points with history
      const pointsToCache = []
      for (const device of equipment) {
        const points = await adapter.getPointsByEquipment(device.id)
        const historyPoints = points.filter(p => p.hasHistory)
        
        historyPoints.forEach(point => {
          pointsToCache.push({
            pointId: point.id,
            pointName: point.name,
            equipmentId: device.id,
            equipmentName: device.name,
            equipmentType: device.type,
            unit: point.unit,
            type: point.type
          })
        })
      }

      cacheData.metadata.totalPoints = pointsToCache.length
      console.log(`🎯 Found ${pointsToCache.length} points with history`)

      // Step 3: Fetch histories in batches
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - maxHistoryDays)

      for (let i = 0; i < pointsToCache.length; i += batchSize) {
        const batch = pointsToCache.slice(i, i + batchSize)
        
        await Promise.all(batch.map(async (pointInfo) => {
          try {
            const history = await adapter.getHistoricalData(pointInfo.pointId, {
              startDate,
              endDate
            })

            // Store in cache
            cacheData.points[pointInfo.pointId] = {
              ...pointInfo,
              data: history,
              dataPoints: history.length,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              cachedAt: new Date().toISOString()
            }

            cacheData.metadata.successCount++
            console.log(`✅ Cached ${pointInfo.pointName}: ${history.length} points`)
          } catch (error) {
            cacheData.metadata.errorCount++
            cacheData.metadata.errors.push({
              pointId: pointInfo.pointId,
              pointName: pointInfo.pointName,
              error: error.message
            })
            console.warn(`⚠️ Failed to cache ${pointInfo.pointName}:`, error.message)
          }
        }))

        // Report progress
        const progress = Math.min(i + batchSize, pointsToCache.length)
        const percent = Math.round((progress / pointsToCache.length) * 100)
        console.log(`📊 Progress: ${percent}% (${progress}/${pointsToCache.length})`)
        
        if (onProgress) {
          onProgress(progress, pointsToCache.length, percent)
        }
      }

      cacheData.metadata.generationTimeMs = Date.now() - startTime
      
      console.log('✅ Station cache generation complete!')
      console.log(`   Total points: ${cacheData.metadata.totalPoints}`)
      console.log(`   Successful: ${cacheData.metadata.successCount}`)
      console.log(`   Errors: ${cacheData.metadata.errorCount}`)
      console.log(`   Time: ${(cacheData.metadata.generationTimeMs / 1000).toFixed(1)}s`)

      return cacheData
    } catch (error) {
      console.error('❌ Station cache generation failed:', error)
      throw error
    }
  }

  /**
   * Save cache to station
   * Uses JsonHelper to write the file
   */
  async saveCacheToStation(cacheData) {
    if (!window.baja) {
      console.warn('⚠️ Not in Niagara environment, cannot save to station')
      return false
    }

    try {
      console.log('💾 Saving cache to station...')
      
      const json = JSON.stringify(cacheData)
      const sizeKB = (json.length / 1024).toFixed(2)
      console.log(`📦 Cache size: ${sizeKB} KB`)

      // TODO: Use JsonHelper or FileHelper to write to station
      // This requires the same mechanism as the dashboard state save
      // For now, return the JSON for manual save
      
      console.log('✅ Cache ready to save')
      return json
    } catch (error) {
      console.error('❌ Failed to save cache to station:', error)
      return false
    }
  }

  /**
   * Load cache from station
   * Browser calls this to get the pre-cached data
   */
  async loadCacheFromStation() {
    if (!window.baja) {
      console.warn('⚠️ Not in Niagara environment')
      return null
    }

    try {
      console.log('📥 Loading pre-cached histories from station...')
      
      // TODO: Use JsonHelper or FileHelper to read from station
      // For now, return null (will fall back to direct queries)
      
      return null
    } catch (error) {
      console.error('❌ Failed to load cache from station:', error)
      return null
    }
  }

  /**
   * Check cache status
   */
  async getCacheStatus() {
    try {
      // TODO: Read status file from station
      return {
        exists: false,
        lastGenerated: null,
        pointCount: 0,
        sizeBytes: 0
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Export cache to download
   * For manual deployment or backup
   */
  exportToFile(cacheData) {
    const json = JSON.stringify(cacheData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `niagara-history-cache-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    console.log('💾 Cache exported to file')
  }

  /**
   * Import cache from file
   * For loading a pre-generated cache
   */
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const cacheData = JSON.parse(e.target.result)
          console.log('📥 Cache imported from file')
          console.log(`   Points: ${Object.keys(cacheData.points).length}`)
          console.log(`   Generated: ${cacheData.generated}`)
          resolve(cacheData)
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }
}

// Singleton instance
const stationHistoryCacheService = new StationHistoryCacheService()

export default stationHistoryCacheService

