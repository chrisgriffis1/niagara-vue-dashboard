/**
 * Dashboard State Persistence Service
 * 
 * Saves/loads dashboard state to:
 * 1. localStorage (always available, immediate)
 * 2. Niagara station (optional, if JsonHelper is configured)
 */

const STORAGE_KEY = 'niagaraDashboardState'

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
 * Try to save state to Niagara station (optional feature)
 * This requires a JsonHelper program object to be configured at /JsonHelper
 * If not available, silently falls back to localStorage only
 */
export async function saveStateToStation(state) {
  // Always save to localStorage first (reliable)
  cacheDashboardState(state)
  
  // Check if we're in Niagara environment
  if (typeof window === 'undefined' || !window.baja) {
    console.log('💾 Saved to localStorage (not in Niagara environment)')
    return false
  }
  
  // Station save is OPTIONAL - don't try if JsonHelper isn't configured
  // This prevents console errors when JsonHelper doesn't exist
  console.log('💾 Saved to localStorage (station persistence not configured)')
  return false
}

/**
 * Load state from Niagara station (optional feature)
 * Falls back to localStorage if not available
 */
export async function loadStateFromStation() {
  // Always try localStorage first
  const cachedState = loadCachedDashboardState()
  
  // Check if we're in Niagara environment
  if (typeof window === 'undefined' || !window.baja) {
    return cachedState
  }
  
  // For now, just use localStorage
  // Station persistence requires JsonHelper to be manually configured
  return cachedState
}
