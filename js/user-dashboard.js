/* @noSnoop */
/**
 * User and Dashboard Management
 * Handles user-specific configurations, dashboard CRUD operations,
 * and permission management
 */

// ========================================
// USER CONFIG MANAGEMENT
// ========================================

/**
 * Load user-specific configuration
 * @param {string} username - Username
 * @param {object} baja - BajaScript reference
 * @returns {Promise<object>} - User config object
 */
window.loadUserConfig = async function(username, baja) {
  try {
    const userConfigPath = 'files/dashboard/users/' + username + '/config.json';
    
    // PRIMARY: Try localStorage first
    try {
      const storageKey = 'dashboard_config_' + userConfigPath.replace(/[^a-zA-Z0-9]/g, '_');
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (storageErr) {
      // No localStorage user config found
    }
    
    // OPTIONAL: Try file system
    if (baja && window.loadConfigFile) {
      const userConfig = await window.loadConfigFile(userConfigPath, baja);
      if (userConfig) {
        try {
          const storageKey = 'dashboard_config_' + userConfigPath.replace(/[^a-zA-Z0-9]/g, '_');
          localStorage.setItem(storageKey, JSON.stringify(userConfig, null, 2));
        } catch (e) {}
        return userConfig;
      }
    }
    
    // No config found - create default
    const defaultUserConfig = {
      dashboards: [],
      activeDashboard: null,
      restrictions: null,
      pxGraphics: []
    };
    
    // Save default config
    if (window.saveConfigFile) {
      await window.saveConfigFile(userConfigPath, defaultUserConfig, baja);
    }
    
    return defaultUserConfig;
  } catch (err) {
    return {
      dashboards: [],
      activeDashboard: null,
      restrictions: null,
      pxGraphics: []
    };
  }
};

/**
 * Save user-specific configuration
 * @param {string} username - Username
 * @param {object} config - Config object
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.saveUserConfig = async function(username, config, baja) {
  try {
    const filePath = 'files/dashboard/users/' + username + '/config.json';
    const saved = await window.saveConfigFile(filePath, config, baja);
    return saved || false;
  } catch (err) {
    return false;
  }
};

// ========================================
// DASHBOARD CRUD OPERATIONS
// ========================================

/**
 * Get all dashboards from all users (for admins)
 * @param {object} baja - BajaScript reference
 * @param {object} dashboardConfig - Global dashboard config
 * @returns {Promise<array>} - Array of dashboards
 */
window.getAllDashboards = async function(baja, dashboardConfig) {
  const allDashboards = [];
  const allUsers = await window.getAllUsers(baja);
  
  for (let user of allUsers) {
    const userDashboards = await window.getUserDashboards(user.name, dashboardConfig, baja);
    userDashboards.forEach(function(dashboard) {
      dashboard.owner = user.name;
      allDashboards.push(dashboard);
    });
  }
  
  return allDashboards;
};

/**
 * Get dashboards visible to a specific user based on permissions
 * @param {string} username - Username
 * @param {string} userRole - User role (super/maintenance/user)
 * @param {object} dashboardConfig - Global dashboard config
 * @param {object} baja - BajaScript reference
 * @returns {Promise<array>} - Array of visible dashboards
 */
window.getVisibleDashboards = async function(username, userRole, dashboardConfig, baja) {
  const isSuperUser = userRole === 'super' || (window.currentUser && window.currentUser.isSuperUser);
  const isMaintenance = userRole === 'maintenance';
  
  // Super users and maintenance see all dashboards
  if (isSuperUser || isMaintenance) {
    return await window.getAllDashboards(baja, dashboardConfig);
  }
  
  // Regular users only see dashboards assigned to them
  const assignments = (dashboardConfig && dashboardConfig.dashboardAssignments) || {};
  const visibleDashboardIds = new Set();
  
  // Find dashboards assigned to this user
  Object.keys(assignments).forEach(function(dashboardId) {
    const assignment = assignments[dashboardId];
    if (assignment.assignedTo && assignment.assignedTo.includes(username)) {
      visibleDashboardIds.add(dashboardId);
    } else if (assignment.isPublic) {
      visibleDashboardIds.add(dashboardId);
    }
  });
  
  // Also include dashboards owned by this user
  const userConfig = await window.loadUserConfig(username, baja);
  const userDashboards = userConfig.dashboards || [];
  userDashboards.forEach(function(dashboard) {
    visibleDashboardIds.add(dashboard.id);
  });
  
  // Load all visible dashboards
  const visibleDashboards = [];
  const allDashboards = await window.getAllDashboards(baja, dashboardConfig);
  allDashboards.forEach(function(dashboard) {
    if (visibleDashboardIds.has(dashboard.id)) {
      visibleDashboards.push(dashboard);
    }
  });
  
  return visibleDashboards;
};

/**
 * Get dashboards for a specific user
 * @param {string} username - Username
 * @param {object} dashboardConfig - Global dashboard config
 * @param {object} baja - BajaScript reference
 * @returns {Promise<array>} - Array of dashboards
 */
window.getUserDashboards = async function(username, dashboardConfig, baja) {
  // Try to get from in-memory config first
  if (dashboardConfig && dashboardConfig.users && dashboardConfig.users[username]) {
    return dashboardConfig.users[username].dashboards || [];
  }
  
  // Fallback: load from file
  try {
    const userConfig = await window.loadUserConfig(username, baja);
    return userConfig.dashboards || [];
  } catch (err) {
    return [];
  }
};

/**
 * Save a dashboard for a user
 * @param {string} username - Username
 * @param {object} dashboardData - Dashboard data
 * @param {object} dashboardConfig - Global dashboard config (will be modified)
 * @param {object} baja - BajaScript reference
 * @returns {Promise<string|null>} - Dashboard ID or null on error
 */
window.saveDashboard = async function(username, dashboardData, dashboardConfig, baja) {
  try {
    let userConfig = await window.loadUserConfig(username, baja);
    
    // Ensure structure exists
    if (!userConfig.dashboards) userConfig.dashboards = [];
    if (userConfig.activeDashboard === undefined) userConfig.activeDashboard = null;
    if (userConfig.restrictions === undefined) userConfig.restrictions = null;
    
    // Add or update dashboard
    const dashboards = userConfig.dashboards;
    const existingIndex = dashboards.findIndex(d => d.id === dashboardData.id);
    const isNew = existingIndex < 0;
    
    if (existingIndex >= 0) {
      dashboards[existingIndex] = dashboardData;
    } else {
      if (!dashboardData.id) {
        dashboardData.id = 'dashboard_' + Date.now();
      }
      dashboards.push(dashboardData);
    }
    
    // Initialize dashboard assignments if new
    if (isNew) {
      if (!dashboardConfig.dashboardAssignments) {
        dashboardConfig.dashboardAssignments = {};
      }
      dashboardConfig.dashboardAssignments[dashboardData.id] = {
        owner: username,
        assignedTo: [username],
        isPublic: false,
        createdAt: new Date().toISOString()
      };
      if (window.saveDashboardConfig) {
        await window.saveDashboardConfig(dashboardConfig, baja);
      }
    }
    
    // Save user config
    await window.saveUserConfig(username, userConfig, baja);
    
    // Handle file persistence for customCards
    if (window.USE_FILE_PERSISTENCE && dashboardData.customCards) {
      const jsonData = JSON.stringify(dashboardData.customCards);
      if (window.saveDashboardDataToFile) {
        await window.saveDashboardDataToFile('customCards', jsonData);
      }
    }
    
    // Update in-memory config
    if (!dashboardConfig.users) dashboardConfig.users = {};
    dashboardConfig.users[username] = userConfig;
    
    return dashboardData.id;
  } catch (err) {
    return null;
  }
};

/**
 * Load a specific dashboard
 * @param {string} username - Username
 * @param {string} dashboardId - Dashboard ID
 * @param {object} dashboardConfig - Global dashboard config
 * @param {object} baja - BajaScript reference
 * @returns {Promise<object|null>} - Dashboard object or null
 */
window.loadDashboard = async function(username, dashboardId, dashboardConfig, baja) {
  try {
    const dashboards = await window.getUserDashboards(username, dashboardConfig, baja);
    const dashboard = dashboards.find(d => d.id === dashboardId);
    return dashboard || null;
  } catch (err) {
    return null;
  }
};

/**
 * Delete a dashboard
 * @param {string} username - Username
 * @param {string} dashboardId - Dashboard ID
 * @param {object} dashboardConfig - Global dashboard config (will be modified)
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.deleteDashboard = async function(username, dashboardId, dashboardConfig, baja) {
  try {
    const userConfig = await window.loadUserConfig(username, baja);
    
    if (!userConfig.dashboards) return false;
    
    const dashboards = userConfig.dashboards;
    const index = dashboards.findIndex(d => d.id === dashboardId);
    if (index >= 0) {
      dashboards.splice(index, 1);
      
      if (userConfig.activeDashboard === dashboardId) {
        userConfig.activeDashboard = null;
      }
      
      await window.saveUserConfig(username, userConfig, baja);
      
      // Update in-memory config
      if (!dashboardConfig.users) dashboardConfig.users = {};
      dashboardConfig.users[username] = userConfig;
      
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};

// ========================================
// USER SERVICE INTEGRATION
// ========================================

/**
 * Get all users from UserService
 * @param {object} baja - BajaScript reference
 * @returns {Promise<array>} - Array of user objects
 */
window.getAllUsers = async function(baja) {
  try {
    const userService = await window.getUserService(baja);
    if (!userService) return [];
    
    const users = [];
    const slots = userService.getSlots();
    if (slots) {
      slots.properties().each(function(slot) {
        try {
          const userName = slot.getName();
          users.push({ name: userName });
        } catch (e) {}
      });
    }
    
    return users;
  } catch (err) {
    return [];
  }
};

/**
 * Get the UserService component
 * @param {object} baja - BajaScript reference
 * @returns {Promise<object|null>} - UserService or null
 */
window.getUserService = async function(baja) {
  try {
    return await baja.Ord.make("service:baja:UserService").get();
  } catch (err) {
    return null;
  }
};

/**
 * Get the current user information
 * @param {object} baja - BajaScript reference
 * @returns {Promise<object>} - Current user object
 */
window.getCurrentUser = async function(baja) {
  try {
    if (!baja || typeof baja.getUserName !== 'function') {
      return { name: 'anonymous', isSuperUser: false };
    }
    
    const userName = baja.getUserName();
    if (!userName) {
      return { name: 'anonymous', isSuperUser: false };
    }
    
    const currentUser = {
      name: userName,
      isSuperUser: false,
      permissions: null
    };
    
    // Try to check permissions
    try {
      const userService = await baja.Ord.make("service:baja:UserService").get();
      if (userService) {
        const escapedName = baja.SlotPath.escape(userName);
        const user = userService.get(escapedName);
        if (user) {
          const permissions = user.get('permissions');
          if (permissions) {
            currentUser.permissions = permissions;
            if (permissions.isSuperUser && permissions.isSuperUser()) {
              currentUser.isSuperUser = true;
            }
          }
        }
      }
    } catch (e) {
      // Could not check user permissions
    }
    
    window.currentUser = currentUser;
    return currentUser;
  } catch (err) {
    return { name: 'anonymous', isSuperUser: false };
  }
};

/**
 * Check if current user is a super user
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Is super user
 */
window.isSuperUser = async function(baja) {
  if (!window.currentUser || !window.currentUser.name) {
    await window.getCurrentUser(baja);
  }
  return window.currentUser && window.currentUser.isSuperUser;
};

// ========================================
// PRESET MANAGEMENT
// ========================================

/**
 * Assign a preset to a user
 * @param {string} username - Username
 * @param {string} presetId - Preset ID
 * @param {object} dashboardConfig - Global dashboard config (will be modified)
 * @param {object} baja - BajaScript reference
 * @returns {Promise<boolean>} - Success status
 */
window.assignPresetToUser = async function(username, presetId, dashboardConfig, baja) {
  try {
    if (!dashboardConfig.presets || !dashboardConfig.presets[presetId]) {
      return false;
    }
    
    const preset = dashboardConfig.presets[presetId];
    let userConfig = await window.loadUserConfig(username, baja);
    
    // Apply preset restrictions
    userConfig.restrictions = preset.restrictions || null;
    
    // Create a dashboard from preset if user doesn't have one
    if (!userConfig.dashboards || userConfig.dashboards.length === 0) {
      if (!userConfig.dashboards) userConfig.dashboards = [];
      const presetDashboard = {
        id: 'preset_' + presetId + '_' + Date.now(),
        name: preset.name,
        tabs: preset.tabs || [],
        pxGraphics: [],
        expandedSections: {},
        isPreset: true,
        presetId: presetId
      };
      userConfig.dashboards.push(presetDashboard);
      userConfig.activeDashboard = presetDashboard.id;
    }
    
    await window.saveUserConfig(username, userConfig, baja);
    
    // Update in-memory config
    if (!dashboardConfig.users) dashboardConfig.users = {};
    dashboardConfig.users[username] = userConfig;
    
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Set user restrictions
 * @param {string} username - Username
 * @param {array} allowedTabs - Allowed tabs
 * @param {object} dashboardConfig - Global dashboard config (will be modified)
 * @param {object} baja - BajaScript reference
 */
window.setUserRestrictions = async function(username, allowedTabs, dashboardConfig, baja) {
  let userConfig = await window.loadUserConfig(username, baja);
  userConfig.restrictions = allowedTabs;
  
  await window.saveUserConfig(username, userConfig, baja);
  
  if (!dashboardConfig.users) dashboardConfig.users = {};
  dashboardConfig.users[username] = userConfig;
};

/**
 * Create a new preset
 * @param {object} presetData - Preset data
 * @param {object} dashboardConfig - Global dashboard config (will be modified)
 * @param {object} baja - BajaScript reference
 * @returns {Promise<string|null>} - Preset ID or null
 */
window.createPreset = async function(presetData, dashboardConfig, baja) {
  try {
    if (!dashboardConfig.presets) dashboardConfig.presets = {};
    
    const presetId = presetData.id || 'preset_' + Date.now();
    dashboardConfig.presets[presetId] = {
      id: presetId,
      name: presetData.name,
      tabs: presetData.tabs || [],
      restrictions: presetData.restrictions || null
    };
    
    if (window.saveDashboardConfig) {
      await window.saveDashboardConfig(dashboardConfig, baja);
    }
    return presetId;
  } catch (err) {
    return null;
  }
};

/**
 * Get a user's active preset
 * @param {string} username - Username
 * @param {object} dashboardConfig - Global dashboard config
 * @returns {object|null} - Preset or null
 */
window.getUserPreset = function(username, dashboardConfig) {
  if (!dashboardConfig.users || !dashboardConfig.users[username]) {
    return null;
  }
  
  const userConfig = dashboardConfig.users[username];
  if (userConfig.dashboards && userConfig.dashboards.length > 0) {
    const presetDashboard = userConfig.dashboards.find(d => d.isPreset);
    if (presetDashboard) {
      return dashboardConfig.presets[presetDashboard.presetId] || null;
    }
  }
  return null;
};

