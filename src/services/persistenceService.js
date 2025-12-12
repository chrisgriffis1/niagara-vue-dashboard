/**
 * Dashboard State Persistence Service
 * 
 * Saves/loads dashboard state to:
 * 1. localStorage (always available, immediate)
 * 2. Niagara station JsonHelper (if configured at /JsonHelper)
 */

const STORAGE_KEY = 'niagaraDashboardState'
const JSON_HELPER_ORD = 'station:|slot:/JsonHelper'

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
    console.log('💾 Dashboard state saved to localStorage')
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
    
    const state = JSON.parse(payload)
    console.log('📦 Dashboard state loaded from localStorage')
    return state
  } catch (error) {
    console.warn('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Check if JsonHelper is available on the station
 */
async function _getJsonHelper() {
  if (typeof window === 'undefined' || !window.baja) {
    return null
  }
  
  try {
    const baja = window.baja
    console.log('🔍 Looking for JsonHelper at:', JSON_HELPER_ORD)
    
    const helper = await baja.Ord.make(JSON_HELPER_ORD).get()
    
    if (!helper) {
      console.log('⚠️ JsonHelper not found')
      return null
    }
    
    // Check if it's a valid component with expected structure
    console.log('✓ JsonHelper found, type:', helper.getType ? helper.getType().toString() : 'unknown')
    
    return { baja, helper }
  } catch (error) {
    console.warn('⚠️ Error accessing JsonHelper:', error.message)
    return null
  }
}

/**
 * Save state to Niagara station via JsonHelper
 */
export async function saveStateToStation(state) {
  // Always save to localStorage first (reliable)
  cacheDashboardState(state)
  
  const ctx = await _getJsonHelper()
  if (!ctx) {
    console.log('💾 Saved to localStorage only (JsonHelper not available)')
    return false
  }
  
  const { baja, helper } = ctx
  
  try {
    const payload = JSON.stringify(state)
    console.log('💾 Saving to station via JsonHelper...')
    
    // Try to set properties on the JsonHelper
    // The exact property names depend on how JsonHelper is configured
    // Common patterns: 'data', 'jsonData', 'input', 'value'
    
    const possibleDataSlots = ['jsonData', 'data', 'input', 'value', 'content']
    const possibleKeySlots = ['dataKey', 'key', 'filename', 'name']
    
    let dataSlotFound = false
    
    // Try to find and set the data slot
    for (const slotName of possibleDataSlots) {
      try {
        // Check if slot exists before setting
        const slots = helper.getSlots ? helper.getSlots() : null
        if (slots) {
          const slot = slots.toArray().find(s => s.getName && s.getName() === slotName)
          if (slot) {
            console.log(`  Setting ${slotName}...`)
            helper.set(slotName, payload)
            dataSlotFound = true
            break
          }
        }
      } catch (e) {
        // Slot doesn't exist, try next
      }
    }
    
    if (!dataSlotFound) {
      console.log('⚠️ Could not find data slot on JsonHelper')
      return false
    }
    
    // Try to trigger the save action
    const possibleActions = ['save', 'execute', 'run', 'write', 'commit']
    
    for (const actionName of possibleActions) {
      try {
        if (typeof helper[actionName] === 'function') {
          console.log(`  Calling ${actionName}()...`)
          await helper[actionName]()
          console.log('✓ Saved to station')
          return true
        }
      } catch (e) {
        // Action doesn't exist or failed, try next
      }
    }
    
    // If no explicit action, the set might have been enough
    console.log('✓ Data written to JsonHelper (no action required)')
    return true
    
  } catch (error) {
    console.warn('⚠️ Failed to save to station:', error.message)
    return false
  }
}

/**
 * Load state from Niagara station via JsonHelper
 */
export async function loadStateFromStation() {
  // Always try localStorage first
  const cachedState = loadCachedDashboardState()
  
  const ctx = await _getJsonHelper()
  if (!ctx) {
    return cachedState
  }
  
  const { baja, helper } = ctx
  
  try {
    console.log('📦 Loading from station via JsonHelper...')
    
    // Try to trigger load action first
    const possibleLoadActions = ['load', 'read', 'get', 'fetch']
    
    for (const actionName of possibleLoadActions) {
      try {
        if (typeof helper[actionName] === 'function') {
          console.log(`  Calling ${actionName}()...`)
          await helper[actionName]()
          break
        }
      } catch (e) {
        // Action doesn't exist, try next
      }
    }
    
    // Try to read the data
    const possibleOutputSlots = ['loadedData', 'output', 'result', 'data', 'jsonData', 'value']
    
    for (const slotName of possibleOutputSlots) {
      try {
        const value = helper.get(slotName)
        if (value) {
          const str = typeof value.toString === 'function' ? value.toString() : String(value)
          if (str && str.length > 0 && str !== 'null') {
            console.log(`  Found data in ${slotName}`)
            const state = JSON.parse(str)
            console.log('✓ Loaded from station')
            return state
          }
        }
      } catch (e) {
        // Slot doesn't exist or can't be read, try next
      }
    }
    
    console.log('⚠️ No data found in JsonHelper, using localStorage')
    return cachedState
    
  } catch (error) {
    console.warn('⚠️ Failed to load from station:', error.message)
    return cachedState
  }
}
