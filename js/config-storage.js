/* @noSnoop */
/**
 * Config Storage Module
 * Handles loading and saving configuration files using localStorage and file system
 * 
 * PERSISTENCE STRATEGY:
 * Primary: localStorage (works immediately, no setup required, browser-specific)
 * Optional: RPC file creation (requires Java component - see saveConfigFileViaRpc)
 * Fallback: HTTP PUT (only works for existing files)
 */

// ========================================
// FILE LOADING
// ========================================

/**
 * Load a configuration file from the file system
 * @param {string} filePath - Path to the file
 * @param {object} baja - BajaScript reference (passed from main context)
 * @returns {Promise<object|null>} - Parsed JSON config or null
 */
window.loadConfigFile = async function(filePath, baja) {
  try {
    // Normalize file path
    let normalizedPath = filePath;
    if (!normalizedPath.startsWith('files/')) {
      // Path is relative to HTML file directory
    } else {
      normalizedPath = normalizedPath.substring(6);
    }
    const fileOrd = 'file:^' + normalizedPath;
    
    let file;
    try {
      file = await baja.Ord.make(fileOrd).get();
    } catch (ordError) {
      return null;
    }
    
    if (!file || file.isDirectory()) {
      return null;
    }
    
    const readUri = file.getReadUri();
    if (!readUri) {
      return null;
    }
    
    const res = await fetch(readUri);
    if (!res.ok) {
      return null;
    }
    
    const text = await res.text();
    const config = JSON.parse(text);
    return config;
  } catch (err) {
    return null;
  }
};

// ========================================
// RPC-BASED FILE SAVING
// ========================================

/**
 * Save configuration file via RPC (requires Java component)
 * @param {string} filePath - Path to the file
 * @param {object} data - Data to save
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.saveConfigFileViaRpc = async function(filePath, data, baja) {
  try {
    let normalizedPath = filePath;
    if (normalizedPath.startsWith('files/')) {
      normalizedPath = normalizedPath.substring(6);
    }
    
    // Try to find a file service component
    const possibleServiceOrds = [
      'station:|slot:/Services/FileService',
      'station:|slot:/Services/DashboardFileService',
      'station:|slot:/FileService',
      'station:|slot:/Services/ConfigService'
    ];
    
    for (const serviceOrd of possibleServiceOrds) {
      try {
        const service = await baja.Ord.make(serviceOrd).get();
        if (service) {
          await service.rpc('writeFile', normalizedPath, JSON.stringify(data, null, 2));
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try HTTP RPC servlet approach
    const rpcServiceOrds = [
      'type:web:FileService',
      'station:|slot:/Services/FileService',
      'station:|slot:/Services/DashboardFileService'
    ];
    
    for (const rpcOrd of rpcServiceOrds) {
      try {
        let csrfToken = '';
        try {
          const csrfMeta = document.querySelector('meta[name="csrf-token"]');
          if (csrfMeta) {
            csrfToken = csrfMeta.getAttribute('content');
          } else if (window.csrfToken) {
            csrfToken = window.csrfToken;
          }
        } catch (e) {}
        
        const rpcUrl = '/rpc/writeFile/' + encodeURIComponent(rpcOrd);
        const headers = { 'Content-Type': 'application/json' };
        if (csrfToken) {
          headers['x-niagara-csrfToken'] = csrfToken;
        }
        
        const rpcRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify([normalizedPath, JSON.stringify(data, null, 2)])
        });
        
        if (rpcRes.ok) {
          return true;
        }
      } catch (e) {
        continue;
      }
    }
    
    return false;
  } catch (err) {
    return false;
  }
};

// ========================================
// MAIN SAVE FUNCTION
// ========================================

/**
 * Save configuration file (localStorage primary, file system optional)
 * @param {string} filePath - Path to the file
 * @param {object} data - Data to save
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.saveConfigFile = async function(filePath, data, baja) {
  try {
    // PRIMARY: Use localStorage (works immediately, no setup needed)
    try {
      const storageKey = 'dashboard_config_' + filePath.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(storageKey, JSON.stringify(data, null, 2));
      return true;
    } catch (storageErr) {
      // localStorage failed
    }
    
    // OPTIONAL: Try RPC-based file creation
    if (baja) {
      const rpcResult = await window.saveConfigFileViaRpc(filePath, data, baja);
      if (rpcResult) {
        return true;
      }
      
      // Try direct file write
      let normalizedPath = filePath;
      if (!normalizedPath.startsWith('files/')) {
        // Path is relative to HTML file directory
      } else {
        normalizedPath = normalizedPath.substring(6);
      }
      
      const fileOrd = 'file:^' + normalizedPath;
      
      // Ensure directory exists
      const dirPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
      if (dirPath) {
        await window.ensureDirectoryExists(dirPath, baja);
      }
      
      // Try to get write URI
      let file;
      try {
        file = await baja.Ord.make(fileOrd).get();
      } catch (e) {
        file = null;
      }
      
      let writeUri = file ? file.getWriteUri() : '/ord/file:^' + normalizedPath;
      
      if (writeUri) {
        const res = await fetch(writeUri, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data, null, 2)
        });
        
        if (res.ok) {
          return true;
        }
      }
    }
    
    // localStorage already saved above
    return true;
  } catch (err) {
    // Try localStorage as final fallback
    try {
      const storageKey = 'dashboard_config_' + filePath.replace(/[^a-zA-Z0-9]/g, '_');
      localStorage.setItem(storageKey, JSON.stringify(data, null, 2));
      return true;
    } catch (storageErr) {
      return false;
    }
  }
};

// ========================================
// DIRECTORY UTILITIES
// ========================================

/**
 * Ensure a directory exists (creates parent directories as needed)
 * @param {string} dirPath - Path to the directory
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.ensureDirectoryExists = async function(dirPath, baja) {
  try {
    let normalizedPath = dirPath;
    if (normalizedPath.startsWith('files/')) {
      normalizedPath = normalizedPath.substring(6);
    }
    const dirOrd = 'file:^' + normalizedPath;
    
    try {
      const dir = await baja.Ord.make(dirOrd).get();
      if (dir && dir.isDirectory()) {
        return true;
      }
    } catch (e) {
      // Directory doesn't exist
    }
    
    // Try to create parent directory first
    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    if (parentPath) {
      await window.ensureDirectoryExists(parentPath, baja);
    }
    
    return true;
  } catch (err) {
    return false;
  }
};

// ========================================
// DEFAULT CONFIG
// ========================================

/**
 * Get default configuration object
 * @returns {object} - Default config
 */
window.getDefaultConfig = function() {
  return {
    "global": {
      "rules": [
        {"pattern": ".*hp.*|.*heat.?pump.*|.*heater.*|.*htr.*", "type": "heatpump", "icon": "heatpump.svg"},
        {"pattern": ".*exh.*fan.*|.*exfan.*|.*ef\\d.*", "type": "exhaustfan", "icon": "fan.svg"},
        {"pattern": ".*boiler.*|.*blr.*", "type": "boiler", "icon": "boiler.svg"},
        {"pattern": ".*genset.*|.*generator.*", "type": "generator", "icon": "generator.svg"},
        {"pattern": ".*charger.*|.*battery.*", "type": "charger", "icon": "battery.svg"},
        {"pattern": ".*cooling.*tower.*|.*tower.*plant.*", "type": "coolingtower", "icon": "tower.svg"},
        {"pattern": ".*pump.*|.*clp.*|.*ctp.*", "type": "pump", "icon": "pump.svg"},
        {"pattern": ".*freezer.*|.*frzr.*|.*fridge.*|.*walk.?in.*", "type": "freezer", "icon": "freezer.svg"},
        {"pattern": ".*ahu.*|.*air.?handler.*|.*rtu.*", "type": "ahu", "icon": "ahu.svg"},
        {"pattern": ".*mau.*|.*make.?up.*", "type": "mau", "icon": "mau.svg"},
        {"pattern": ".*vav.*|.*zone.?box.*|.*terminal.*", "type": "vav", "icon": "vav.svg"},
        {"pattern": ".*kitchen.*|.*hood.*|.*cooking.*", "type": "kitchen", "icon": "kitchen.svg"}
      ],
      "zones": [],
      "groups": {},
      "snapshot": null,
      "lastSync": null,
      "syncMode": "manual"
    },
    "users": {},
    "presets": {},
    "dashboardAssignments": {}
  };
};

// ========================================
// HIGH-LEVEL CONFIG API
// ========================================

/**
 * Load the main dashboard configuration
 * @param {object} baja - BajaScript reference
 * @returns {Promise<object>} - Config object
 */
window.loadDashboardConfig = async function(baja) {
  try {
    // PRIMARY: Try localStorage first
    try {
      const storageKey = 'dashboard_config_files_dashboard_config_json';
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (storageErr) {
      // No localStorage config found
    }
    
    // OPTIONAL: Try file system
    if (baja) {
      // Try same directory as HTML
      const sameDirConfig = await window.loadConfigFile('dashboard-config.json', baja);
      if (sameDirConfig) {
        if (!sameDirConfig.dashboardAssignments) {
          sameDirConfig.dashboardAssignments = {};
        }
        // Cache to localStorage
        try {
          const storageKey = 'dashboard_config_files_dashboard_config_json';
          localStorage.setItem(storageKey, JSON.stringify(sameDirConfig, null, 2));
        } catch (e) {}
        return sameDirConfig;
      }
      
      // Try standard location
      const globalConfig = await window.loadConfigFile('files/dashboard/config.json', baja);
      if (globalConfig) {
        try {
          const storageKey = 'dashboard_config_files_dashboard_config_json';
          localStorage.setItem(storageKey, JSON.stringify(globalConfig, null, 2));
        } catch (e) {}
        return globalConfig;
      }
    }
    
    // No config found - create default
    const defaultConfig = window.getDefaultConfig();
    if (!defaultConfig.dashboardAssignments) {
      defaultConfig.dashboardAssignments = {};
    }
    
    // Save to localStorage and optionally file system
    await window.saveConfigFile('dashboard-config.json', defaultConfig, baja);
    
    return defaultConfig;
  } catch (err) {
    return window.getDefaultConfig();
  }
};

/**
 * Save the main dashboard configuration
 * @param {object} config - Config object to save
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.saveDashboardConfig = async function(config, baja) {
  try {
    const saved = await window.saveConfigFile('files/dashboard/config.json', config, baja);
    return saved;
  } catch (err) {
    return false;
  }
};
