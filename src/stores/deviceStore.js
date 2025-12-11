/**
 * Device Store - Pinia State Management
 * Manages equipment/device data from building automation system
 */

import { defineStore } from 'pinia'
import MockDataAdapter from '../adapters/MockDataAdapter'

export const useDeviceStore = defineStore('device', {
  state: () => ({
    devices: [],
    selectedDevice: null,
    devicePoints: {}, // Cache points by device ID
    buildingStats: null,
    loading: false,
    error: null,
    adapter: null
  }),

  getters: {
    /**
     * Get all devices
     */
    allDevices: (state) => state.devices,

    /**
     * Get device by ID
     */
    getDeviceById: (state) => (id) => {
      return state.devices.find(device => device.id === id)
    },

    /**
     * Check if devices are loaded
     */
    hasDevices: (state) => state.devices.length > 0,

    /**
     * Get points for selected device
     */
    selectedDevicePoints: (state) => {
      if (!state.selectedDevice) return []
      return state.devicePoints[state.selectedDevice.id] || []
    },

    /**
     * Get equipment count by type
     */
    equipmentByType: (state) => {
      const types = {}
      state.devices.forEach(device => {
        types[device.type] = (types[device.type] || 0) + 1
      })
      return types
    }
  },

  actions: {
    /**
     * Initialize data adapter
     */
    async initializeAdapter() {
      if (!this.adapter) {
        this.adapter = new MockDataAdapter()
        // Load REAL Niagara data by default
        console.log('🔄 Loading Real Niagara Data...')
        await this.adapter.switchDataset('real')
        console.log('✅ Real data loaded! 83 equipment, 38k+ points')
      }
    },

    /**
     * Load all devices from adapter
     */
    async loadDevices() {
      this.loading = true
      this.error = null

      try {
        await this.initializeAdapter()
        this.devices = await this.adapter.discoverDevices()
        this.buildingStats = await this.adapter.getBuildingStats()
      } catch (err) {
        this.error = err.message
        console.error('Failed to load devices:', err)
      } finally {
        this.loading = false
      }
    },

    /**
     * Load points for a specific device
     */
    async loadDevicePoints(deviceId) {
      try {
        await this.initializeAdapter()
        const points = await this.adapter.getPointsByEquipment(deviceId)
        this.devicePoints[deviceId] = points
        return points
      } catch (err) {
        console.error('Failed to load device points:', err)
        return []
      }
    },

    /**
     * Get historical data for a point
     */
    async getPointHistory(pointId, timeRange) {
      try {
        await this.initializeAdapter()
        return await this.adapter.getHistoricalData(pointId, timeRange)
      } catch (err) {
        console.error('Failed to load point history:', err)
        return []
      }
    },

    /**
     * Get current value of a point
     */
    async getPointValue(pointId) {
      try {
        await this.initializeAdapter()
        return await this.adapter.getPointValue(pointId)
      } catch (err) {
        console.error('Failed to get point value:', err)
        return null
      }
    },

    /**
     * Select a device for detailed view
     */
    async selectDevice(device) {
      this.selectedDevice = device
      // Automatically load points for selected device
      if (device && !this.devicePoints[device.id]) {
        await this.loadDevicePoints(device.id)
      }
    },

    /**
     * Clear selected device
     */
    clearSelection() {
      this.selectedDevice = null
    },

    /**
     * Get the adapter instance (for direct access if needed)
     */
    getAdapter() {
      return this.adapter
    }
  }
})

