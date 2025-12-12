const STORAGE_KEY = 'niagaraDashboardState'
const DATA_KEY = 'Chris_customCards'

const normalize = (value = '') => {
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

export function cacheDashboardState(state) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, normalize(state))
  } catch (error) {
    console.warn('Failed to write dashboard cache:', error)
  }
}

export function loadCachedDashboardState() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const payload = window.localStorage.getItem(STORAGE_KEY)
    if (!payload) return null
    return JSON.parse(payload)
  } catch (error) {
    console.warn('Failed to read dashboard cache:', error)
    return null
  }
}

async function _ensureBaja() {
  if (typeof window === 'undefined' || typeof window.baja === 'undefined') {
    throw new Error('BajaScript not available')
  }
  return window.baja
}

async function _invokeJsonHelper(data) {
  const baja = await _ensureBaja()
  const helperOrd = 'station:|slot:/JsonHelper'
  const helper = await baja.Ord.make(helperOrd).get()
  if (!helper) {
    throw new Error('JsonHelper cannot be found on this station')
  }

  const bstring = baja.BString && baja.BString.make ? baja.BString.make : (value) => value
  helper.set('operation', bstring(data.operation))
  helper.set('dataKey', bstring(DATA_KEY))
  helper.set('jsonData', bstring(data.jsonData || ''))

  if (typeof helper.invoke === 'function') {
    await helper.invoke()
  } else if (typeof helper.onExecute === 'function') {
    helper.onExecute()
  } else {
    throw new Error('JsonHelper cannot be executed from JavaScript')
  }

  return helper.get('loadedData')
}

export async function saveStateToStation(state) {
  const payload = normalize(state)
  try {
    await _invokeJsonHelper({ operation: 'save', jsonData: payload })
    return true
  } catch (error) {
    console.warn('Failed to persist dashboard to station:', error)
    return false
  }
}

export async function loadStateFromStation() {
  try {
    const loaded = await _invokeJsonHelper({ operation: 'load' })
    if (!loaded) {
      return null
    }
    if (typeof loaded.toString === 'function') {
      const text = loaded.toString()
      if (!text) return null
      return JSON.parse(text)
    }
    return null
  } catch (error) {
    console.warn('Failed to load dashboard state from station:', error)
    return null
  }
}

