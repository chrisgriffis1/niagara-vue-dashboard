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
    hasDevices: (state) => state.devices.length > 0
  },

  actions: {
    /**
     * Initialize data adapter
     */
    async initializeAdapter() {
      if (!this.adapter) {
        this.adapter = new MockDataAdapter()
        await this.adapter.initialize()
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
      } catch (err) {
        this.error = err.message
        console.error('Failed to load devices:', err)
      } finally {
        this.loading = false
      }
    },

    /**
     * Select a device for detailed view
     */
    selectDevice(device) {
      this.selectedDevice = device
    },

    /**
     * Clear selected device
     */
    clearSelection() {
      this.selectedDevice = null
    }
  }
})

