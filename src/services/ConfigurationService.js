/**
 * Configuration Service
 * Manages user/station-specific configuration profiles
 */

const CONFIG_VERSION = '1.0'
const STORAGE_KEY_PREFIX = 'niagara_nav_config_'
const CURRENT_PROFILE_KEY = 'niagara_nav_current_profile'

class ConfigurationService {
  constructor() {
    this.currentConfig = null
    this.defaultConfig = this.getDefaultConfig()
  }

  /**
   * Get the default configuration structure
   */
  getDefaultConfig() {
    return {
      profileName: 'Default',
      stationId: null,
      userId: null,
      version: CONFIG_VERSION,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Label templates for different contexts
      labelTemplates: {
        chart: '{device.name} | {point.name} ({point.unit})',
        chartWithLocation: '{point.tstatLocation} | {device.name} | {point.name} ({point.unit})',
        card: '{device.name}',
        list: '{point.name}',
        tooltip: '{device.name} - {point.name}'
      },
      
      // Property mapping - how to find properties in your data
      propertyMappings: {
        location: ['tstatLocation', 'zone', 'location', 'statLocation', 'displayName'],
        deviceName: ['displayName', 'name'],
        pointName: ['displayName', 'name']
      },
      
      // Device type-specific settings
      deviceTypeSettings: {},
      
      // Device-specific overrides (for individual devices)
      deviceSpecificSettings: {},
      
      // Global point visibility rules
      pointVisibility: {
        globalHidden: [],  // Regex patterns for globally hidden points
        showLowPriority: false  // Show nvo_, nvi_, no_ points by default
      }
    }
  }

  /**
   * Initialize and load current configuration
   */
  async init() {
    const currentProfileId = localStorage.getItem(CURRENT_PROFILE_KEY)
    
    if (currentProfileId) {
      this.currentConfig = this.loadProfile(currentProfileId)
    } else {
      this.currentConfig = { ...this.defaultConfig }
    }
    
    return this.currentConfig
  }

  /**
   * Get current active configuration
   */
  getCurrentConfig() {
    if (!this.currentConfig) {
      this.currentConfig = { ...this.defaultConfig }
    }
    return this.currentConfig
  }

  /**
   * Update configuration (partial update)
   */
  updateConfig(updates) {
    this.currentConfig = {
      ...this.currentConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    this.saveCurrentProfile()
    return this.currentConfig
  }

  /**
   * Update label templates
   */
  updateLabelTemplates(templates) {
    this.currentConfig.labelTemplates = {
      ...this.currentConfig.labelTemplates,
      ...templates
    }
    this.saveCurrentProfile()
  }

  /**
   * Update property mappings
   */
  updatePropertyMappings(mappings) {
    this.currentConfig.propertyMappings = {
      ...this.currentConfig.propertyMappings,
      ...mappings
    }
    this.saveCurrentProfile()
  }

  /**
   * Get device type settings
   */
  getDeviceTypeSettings(deviceType) {
    return this.currentConfig.deviceTypeSettings[deviceType] || {
      pointOrder: [],
      hiddenPoints: [],
      sparklinePoint: null,
      priority: 'normal'
    }
  }

  /**
   * Update device type settings
   */
  updateDeviceTypeSettings(deviceType, settings) {
    if (!this.currentConfig.deviceTypeSettings) {
      this.currentConfig.deviceTypeSettings = {}
    }
    
    this.currentConfig.deviceTypeSettings[deviceType] = {
      ...this.currentConfig.deviceTypeSettings[deviceType],
      ...settings
    }
    
    this.saveCurrentProfile()
  }

  /**
   * Get device-specific settings
   */
  getDeviceSettings(deviceId) {
    return this.currentConfig.deviceSpecificSettings[deviceId] || null
  }

  /**
   * Update device-specific settings
   */
  updateDeviceSettings(deviceId, settings) {
    if (!this.currentConfig.deviceSpecificSettings) {
      this.currentConfig.deviceSpecificSettings = {}
    }
    
    this.currentConfig.deviceSpecificSettings[deviceId] = {
      ...this.currentConfig.deviceSpecificSettings[deviceId],
      ...settings
    }
    
    this.saveCurrentProfile()
  }

  /**
   * Apply point ordering to a list of points
   */
  applyPointOrder(points, deviceType, deviceId) {
    // Check for device-specific order first
    const deviceSettings = this.getDeviceSettings(deviceId)
    let order = deviceSettings?.pointOrder
    
    // Fall back to device type order
    if (!order || order.length === 0) {
      const typeSettings = this.getDeviceTypeSettings(deviceType)
      order = typeSettings.pointOrder
    }
    
    // If no custom order, return original
    if (!order || order.length === 0) {
      return points
    }
    
    // Sort points according to order
    const ordered = []
    const pointMap = new Map(points.map(p => [p.name, p]))
    
    // Add ordered points first
    order.forEach(name => {
      if (pointMap.has(name)) {
        ordered.push(pointMap.get(name))
        pointMap.delete(name)
      }
    })
    
    // Add remaining points that weren't in order
    pointMap.forEach(point => ordered.push(point))
    
    return ordered
  }

  /**
   * Check if a point should be hidden
   */
  isPointHidden(point, deviceType, deviceId) {
    // Check device-specific hidden points
    const deviceSettings = this.getDeviceSettings(deviceId)
    if (deviceSettings?.hiddenPoints) {
      if (this.matchesPattern(point.name, deviceSettings.hiddenPoints)) {
        return true
      }
    }
    
    // Check device type hidden points
    const typeSettings = this.getDeviceTypeSettings(deviceType)
    if (typeSettings.hiddenPoints) {
      if (this.matchesPattern(point.name, typeSettings.hiddenPoints)) {
        return true
      }
    }
    
    // Check global hidden patterns
    if (this.currentConfig.pointVisibility.globalHidden) {
      if (this.matchesPattern(point.name, this.currentConfig.pointVisibility.globalHidden)) {
        return true
      }
    }
    
    return false
  }

  /**
   * Check if a point name matches any pattern in a list
   */
  matchesPattern(pointName, patterns) {
    if (!patterns || patterns.length === 0) return false
    
    return patterns.some(pattern => {
      // Treat as regex if it looks like one
      try {
        const regex = new RegExp(pattern, 'i')
        return regex.test(pointName)
      } catch (e) {
        // Fall back to simple string matching
        return pointName.toLowerCase().includes(pattern.toLowerCase())
      }
    })
  }

  /**
   * Resolve a property value using property mappings
   */
  resolveProperty(obj, propertyType) {
    const mappings = this.currentConfig.propertyMappings[propertyType]
    if (!mappings) return null
    
    for (const key of mappings) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key]
      }
    }
    
    return null
  }

  /**
   * Format a label using a template
   */
  formatLabel(template, device, point) {
    let label = template
    
    // Replace device properties
    label = label.replace(/\{device\.(\w+)\}/g, (match, prop) => {
      // Try direct property first
      if (device[prop] !== undefined && device[prop] !== null && device[prop] !== '') {
        return device[prop]
      }
      return ''
    })
    
    // Replace point properties
    label = label.replace(/\{point\.(\w+)\}/g, (match, prop) => {
      if (point[prop] !== undefined && point[prop] !== null && point[prop] !== '') {
        return point[prop]
      }
      return ''
    })
    
    // Clean up: remove empty sections (e.g., "| |" becomes "|")
    label = label.replace(/\s*\|\s*\|\s*/g, ' | ')
    label = label.replace(/^\s*\|\s*/, '')
    label = label.replace(/\s*\|\s*$/, '')
    label = label.replace(/\s+/g, ' ')
    
    return label.trim()
  }

  /**
   * Save current profile to localStorage
   */
  saveCurrentProfile() {
    const profileId = this.currentConfig.profileName || 'default'
    const key = STORAGE_KEY_PREFIX + profileId
    
    try {
      localStorage.setItem(key, JSON.stringify(this.currentConfig))
      localStorage.setItem(CURRENT_PROFILE_KEY, profileId)
      console.log('💾 Configuration saved:', profileId)
    } catch (e) {
      console.error('Failed to save configuration:', e)
    }
  }

  /**
   * Load a profile from localStorage
   */
  loadProfile(profileId) {
    const key = STORAGE_KEY_PREFIX + profileId
    
    try {
      const data = localStorage.getItem(key)
      if (data) {
        return JSON.parse(data)
      }
    } catch (e) {
      console.error('Failed to load configuration:', e)
    }
    
    return { ...this.defaultConfig }
  }

  /**
   * List all available profiles
   */
  listProfiles() {
    const profiles = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key))
          profiles.push({
            id: key.replace(STORAGE_KEY_PREFIX, ''),
            name: data.profileName,
            stationId: data.stationId,
            updatedAt: data.updatedAt
          })
        } catch (e) {
          console.error('Failed to parse profile:', key, e)
        }
      }
    }
    
    return profiles
  }

  /**
   * Switch to a different profile
   */
  switchProfile(profileId) {
    this.currentConfig = this.loadProfile(profileId)
    localStorage.setItem(CURRENT_PROFILE_KEY, profileId)
    return this.currentConfig
  }

  /**
   * Create a new profile
   */
  createProfile(profileName, stationId = null, userId = null) {
    const newConfig = {
      ...this.defaultConfig,
      profileName,
      stationId,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    this.currentConfig = newConfig
    this.saveCurrentProfile()
    
    return newConfig
  }

  /**
   * Delete a profile
   */
  deleteProfile(profileId) {
    const key = STORAGE_KEY_PREFIX + profileId
    localStorage.removeItem(key)
    
    // If deleting current profile, switch to default
    const currentProfileId = localStorage.getItem(CURRENT_PROFILE_KEY)
    if (currentProfileId === profileId) {
      this.currentConfig = { ...this.defaultConfig }
      localStorage.removeItem(CURRENT_PROFILE_KEY)
    }
  }

  /**
   * Export configuration as JSON
   */
  exportConfig() {
    return JSON.stringify(this.currentConfig, null, 2)
  }

  /**
   * Import configuration from JSON
   */
  importConfig(jsonString) {
    try {
      const config = JSON.parse(jsonString)
      
      // Validate version
      if (config.version !== CONFIG_VERSION) {
        console.warn('Configuration version mismatch')
      }
      
      this.currentConfig = config
      this.saveCurrentProfile()
      
      return { success: true, config }
    } catch (e) {
      console.error('Failed to import configuration:', e)
      return { success: false, error: e.message }
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefault() {
    this.currentConfig = { ...this.defaultConfig }
    this.saveCurrentProfile()
    return this.currentConfig
  }

  /**
   * Scan equipment and points to discover available properties
   */
  scanProperties(equipment, points) {
    const discovered = {
      equipmentProperties: new Set(),
      pointProperties: new Set(),
      sampleEquipment: null,
      samplePoint: null
    }
    
    // Scan equipment
    if (equipment && equipment.length > 0) {
      discovered.sampleEquipment = equipment[0]
      Object.keys(equipment[0]).forEach(key => {
        discovered.equipmentProperties.add(key)
      })
    }
    
    // Scan points
    if (points && points.length > 0) {
      discovered.samplePoint = points[0]
      Object.keys(points[0]).forEach(key => {
        discovered.pointProperties.add(key)
      })
    }
    
    return {
      equipmentProperties: Array.from(discovered.equipmentProperties),
      pointProperties: Array.from(discovered.pointProperties),
      sampleEquipment: discovered.sampleEquipment,
      samplePoint: discovered.samplePoint
    }
  }
}

// Export singleton instance
export const configService = new ConfigurationService()
export default configService

