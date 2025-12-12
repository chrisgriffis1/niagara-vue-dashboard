/**
 * Dashboard State Persistence Service
 * 
 * Saves/loads dashboard state to:
 * 1. localStorage (always available, immediate)
 * 2. Niagara station JsonHelper program at /JsonHelper
 * 
 * JsonHelper slots:
 * - operation: "save" or "load"
 * - dataKey: file identifier
 * - jsonData: input data for save
 * - loadedData: output data from load
 * - execute: Action to trigger
 */

const STORAGE_KEY = 'niagaraDashboardState'
const JSON_HELPER_ORD = 'station:|slot:/JsonHelper'
const DATA_KEY = 'dashboard_state'

/**
 * Save dashboard state to localStorage (always works)
 */
export function cacheDashboardState(state) {
  if (typeof window === 'undefined') return
  
  try {
    const payload = JSON.stringify({
      ...state,
      savedAt: new Date().toISOString()
    })
    window.localStorage.setItem(STORAGE_KEY, payload)
  } catch (error) {
    console.warn('Failed to save to localStorage:', error)
  }
}

/**
 * Load dashboard state from localStorage
 */
export function loadCachedDashboardState() {
  if (typeof window === 'undefined') return null
  
  try {
    const payload = window.localStorage.getItem(STORAGE_KEY)
    if (!payload) return null
    return JSON.parse(payload)
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Get JsonHelper component from station
 */
async function _getJsonHelper() {
  if (typeof window === 'undefined' || !window.baja) {
    return null
  }
  
  try {
    const baja = window.baja
    const helper = await baja.Ord.make(JSON_HELPER_ORD).get()
    
    if (!helper) {
      console.warn('JsonHelper not found at', JSON_HELPER_ORD)
      return null
    }
    
    return { baja, helper }
  } catch (error) {
    console.warn('Error accessing JsonHelper:', error.message)
    return null
  }
}

/**
 * Save state to Niagara station via JsonHelper
 */
export async function saveStateToStation(state) {
  // Always save to localStorage first
  cacheDashboardState(state)
  
  const ctx = await _getJsonHelper()
  if (!ctx) {
    console.log('💾 Saved to localStorage (JsonHelper not available)')
    return false
  }
  
  const { baja, helper } = ctx
  
  try {
    const payload = JSON.stringify(state)
    console.log('💾 Saving to station via JsonHelper...')
    
    // Set the properties using BString
    const BString = baja.BString || { make: (v) => v }
    
    // Set operation to "save"
    await new Promise((resolve, reject) => {
      try {
        helper.set({ slot: 'operation', value: BString.make('save') })
        resolve()
      } catch (e) {
        // Try alternative method
        try {
          helper.set('operation', BString.make('save'))
          resolve()
        } catch (e2) {
          reject(e2)
        }
      }
    })
    
    // Set dataKey
    await new Promise((resolve, reject) => {
      try {
        helper.set({ slot: 'dataKey', value: BString.make(DATA_KEY) })
        resolve()
      } catch (e) {
        try {
          helper.set('dataKey', BString.make(DATA_KEY))
          resolve()
        } catch (e2) {
          reject(e2)
        }
      }
    })
    
    // Set jsonData
    await new Promise((resolve, reject) => {
      try {
        helper.set({ slot: 'jsonData', value: BString.make(payload) })
        resolve()
      } catch (e) {
        try {
          helper.set('jsonData', BString.make(payload))
          resolve()
        } catch (e2) {
          reject(e2)
        }
      }
    })
    
    // Execute the action
    console.log('  Executing save action...')
    await new Promise((resolve, reject) => {
      try {
        // Try invoke with action name
        if (typeof helper.invoke === 'function') {
          helper.invoke({ slot: 'execute' }).then(resolve).catch(reject)
        } else if (typeof helper.execute === 'function') {
          helper.execute()
          resolve()
        } else {
          // Try to find and invoke the execute action
          const slots = helper.getSlots()
          if (slots) {
            const executeSlot = slots.get('execute')
            if (executeSlot) {
              helper.invoke(executeSlot).then(resolve).catch(reject)
            } else {
              reject(new Error('execute action not found'))
            }
          } else {
            reject(new Error('cannot access slots'))
          }
        }
      } catch (e) {
        reject(e)
      }
    })
    
    console.log('✓ Saved to station')
    return true
    
  } catch (error) {
    console.warn('⚠️ Failed to save to station:', error.message)
    console.log('💾 Data is still saved in localStorage')
    return false
  }
}

/**
 * Load state from Niagara station via JsonHelper
 */
export async function loadStateFromStation() {
  // Always get localStorage as fallback
  const cachedState = loadCachedDashboardState()
  
  const ctx = await _getJsonHelper()
  if (!ctx) {
    return cachedState
  }
  
  const { baja, helper } = ctx
  
  try {
    console.log('📦 Loading from station via JsonHelper...')
    
    const BString = baja.BString || { make: (v) => v }
    
    // Set operation to "load"
    await new Promise((resolve, reject) => {
      try {
        helper.set({ slot: 'operation', value: BString.make('load') })
        resolve()
      } catch (e) {
        try {
          helper.set('operation', BString.make('load'))
          resolve()
        } catch (e2) {
          reject(e2)
        }
      }
    })
    
    // Set dataKey
    await new Promise((resolve, reject) => {
      try {
        helper.set({ slot: 'dataKey', value: BString.make(DATA_KEY) })
        resolve()
      } catch (e) {
        try {
          helper.set('dataKey', BString.make(DATA_KEY))
          resolve()
        } catch (e2) {
          reject(e2)
        }
      }
    })
    
    // Execute the load action
    console.log('  Executing load action...')
    await new Promise((resolve, reject) => {
      try {
        if (typeof helper.invoke === 'function') {
          helper.invoke({ slot: 'execute' }).then(resolve).catch(reject)
        } else if (typeof helper.execute === 'function') {
          helper.execute()
          resolve()
        } else {
          const slots = helper.getSlots()
          if (slots) {
            const executeSlot = slots.get('execute')
            if (executeSlot) {
              helper.invoke(executeSlot).then(resolve).catch(reject)
            } else {
              reject(new Error('execute action not found'))
            }
          } else {
            reject(new Error('cannot access slots'))
          }
        }
      } catch (e) {
        reject(e)
      }
    })
    
    // Wait a moment for the async task to complete
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Read the loadedData property
    const loadedData = helper.get('loadedData')
    if (loadedData) {
      const str = typeof loadedData.getString === 'function' 
        ? loadedData.getString() 
        : loadedData.toString()
      
      if (str && str.length > 0 && str !== '[]' && str !== '{}') {
        console.log('✓ Loaded from station')
        return JSON.parse(str)
      }
    }
    
    console.log('⚠️ No data in loadedData, using localStorage')
    return cachedState
    
  } catch (error) {
    console.warn('⚠️ Failed to load from station:', error.message)
    return cachedState
  }
}
