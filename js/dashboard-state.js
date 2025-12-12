/* @noSnoop */
/**
 * Dashboard State Management
 * Handles all state persistence (localStorage and file-based), undo/redo functionality,
 * and state synchronization for the LivePoints dashboard.
 */

const STORAGE_KEYS = {
  CUSTOM_CARDS: 'dashboard_custom_cards',
  HIDDEN_CARDS: 'dashboard_hidden_cards',
  HIDDEN_POINTS: 'dashboard_hidden_points',
  CARD_TITLES: 'dashboard_card_titles',
  CARD_SIZES: 'dashboard_card_sizes',
  EXPANDED_SECTIONS: 'dashboard_expanded_sections',
  EXPANDED_DEVICES: 'dashboard_expanded_devices',
  UNDO_HISTORY: 'dashboard_undo_history',
  POINT_ASSIGNMENTS: 'dashboard_point_assignments', // Track where points are assigned
  CARD_ORDER: 'dashboard_card_order', // Custom card ordering
  CARD_CUSTOMIZATIONS: 'dashboard_card_customizations' // Card-level customizations
};

// Initialize global state
window.DashboardState = {
  customCards: [],
  hiddenCards: {},
  hiddenPoints: {},
  cardTitles: {},
  cardSizes: {},
  expandedSections: {},
  expandedDevices: {},
  undoHistory: [],
  redoHistory: [],
  maxUndoSteps: 30,
  dragState: { item: null, type: null, data: null, sourceContainer: null, sourceContainerId: null, sourceIndex: null },
  // NEW: Editable card state - track point assignments and card customizations
  pointAssignments: {}, // { pointOrd: { containerType, containerId, index } }
  cardOrder: { types: [], zones: [] }, // Custom order for cards
  cardCustomizations: {}, // { 'type_AHU': { assignedPoints: [], hiddenPoints: [], pointOrder: [] }, etc. }
  // NOTE: "assignedPoints" replaces "customPoints" - all points are Niagara points,
  // this just tracks which ones have been manually assigned to this card

  // Load all state from localStorage or files
  load: async function() {
    try {
      if (window.USE_FILE_PERSISTENCE) {
        // Try loading from files, fallback to localStorage
        await this.loadFromFiles();
      } else {
        this.loadFromLocalStorage();
      }
    } catch(e) {
      // Fallback to localStorage
      this.loadFromLocalStorage();
    }
  },

  // Load from localStorage
  loadFromLocalStorage: function() {
    try {
      this.customCards = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_CARDS) || '[]');
      this.hiddenCards = JSON.parse(localStorage.getItem(STORAGE_KEYS.HIDDEN_CARDS) || '{}');
      this.hiddenPoints = JSON.parse(localStorage.getItem(STORAGE_KEYS.HIDDEN_POINTS) || '{}');
      this.cardTitles = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_TITLES) || '{}');
      this.cardSizes = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_SIZES) || '{}');
      this.expandedSections = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPANDED_SECTIONS) || '{}');
      this.expandedDevices = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPANDED_DEVICES) || '{}');
      this.pointAssignments = JSON.parse(localStorage.getItem(STORAGE_KEYS.POINT_ASSIGNMENTS) || '{}');
      this.cardOrder = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_ORDER) || JSON.stringify({ types: [], zones: [] }));
      this.cardCustomizations = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARD_CUSTOMIZATIONS) || '{}');
    } catch(e) {
      // Error loading from localStorage
    }
  },

  // Load from files using program object
  loadFromFiles: async function() {
    const keys = [
      { key: 'customCards', storageKey: STORAGE_KEYS.CUSTOM_CARDS, defaultValue: '[]' },
      { key: 'hiddenCards', storageKey: STORAGE_KEYS.HIDDEN_CARDS, defaultValue: '{}' },
      { key: 'hiddenPoints', storageKey: STORAGE_KEYS.HIDDEN_POINTS, defaultValue: '{}' },
      { key: 'cardTitles', storageKey: STORAGE_KEYS.CARD_TITLES, defaultValue: '{}' },
      { key: 'cardSizes', storageKey: STORAGE_KEYS.CARD_SIZES, defaultValue: '{}' },
      { key: 'expandedSections', storageKey: STORAGE_KEYS.EXPANDED_SECTIONS, defaultValue: '{}' },
      { key: 'expandedDevices', storageKey: STORAGE_KEYS.EXPANDED_DEVICES, defaultValue: '{}' },
      { key: 'pointAssignments', storageKey: STORAGE_KEYS.POINT_ASSIGNMENTS, defaultValue: '{}' },
      { key: 'cardOrder', storageKey: STORAGE_KEYS.CARD_ORDER, defaultValue: JSON.stringify({ types: [], zones: [] }) },
      { key: 'cardCustomizations', storageKey: STORAGE_KEYS.CARD_CUSTOMIZATIONS, defaultValue: '{}' }
    ];

    for (let item of keys) {
      try {
        const jsonData = await window.loadDashboardDataFromFile(item.key);
        if (jsonData) {
        this[item.key] = JSON.parse(jsonData);
        } else {
          // Fallback to localStorage
          this[item.key] = JSON.parse(localStorage.getItem(item.storageKey) || item.defaultValue);
        }
      } catch(e) {
        this[item.key] = JSON.parse(localStorage.getItem(item.storageKey) || item.defaultValue);
      }
    }
  },

  // Save specific state to localStorage or files
  save: function(key) {
    try {
      let jsonData = '';
      let storageKey = '';

      if (key === 'customCards') {
        jsonData = JSON.stringify(this.customCards);
        storageKey = STORAGE_KEYS.CUSTOM_CARDS;
      } else if (key === 'hiddenCards') {
        jsonData = JSON.stringify(this.hiddenCards);
        storageKey = STORAGE_KEYS.HIDDEN_CARDS;
      } else if (key === 'hiddenPoints') {
        jsonData = JSON.stringify(this.hiddenPoints);
        storageKey = STORAGE_KEYS.HIDDEN_POINTS;
      } else if (key === 'cardTitles') {
        jsonData = JSON.stringify(this.cardTitles);
        storageKey = STORAGE_KEYS.CARD_TITLES;
      } else if (key === 'cardSizes') {
        jsonData = JSON.stringify(this.cardSizes);
        storageKey = STORAGE_KEYS.CARD_SIZES;
      } else if (key === 'expandedSections') {
        jsonData = JSON.stringify(this.expandedSections);
        storageKey = STORAGE_KEYS.EXPANDED_SECTIONS;
      } else if (key === 'expandedDevices') {
        jsonData = JSON.stringify(this.expandedDevices);
        storageKey = STORAGE_KEYS.EXPANDED_DEVICES;
      } else if (key === 'pointAssignments') {
        jsonData = JSON.stringify(this.pointAssignments);
        storageKey = STORAGE_KEYS.POINT_ASSIGNMENTS;
      } else if (key === 'cardOrder') {
        jsonData = JSON.stringify(this.cardOrder);
        storageKey = STORAGE_KEYS.CARD_ORDER;
      } else if (key === 'cardCustomizations') {
        jsonData = JSON.stringify(this.cardCustomizations);
        storageKey = STORAGE_KEYS.CARD_CUSTOMIZATIONS;
      }

      if (window.USE_FILE_PERSISTENCE && jsonData) {
        // Try to save to file, fallback to localStorage
        window.saveDashboardDataToFile(key, jsonData).then(function(success) {
          if (!success) {
            // Fallback to localStorage
            localStorage.setItem(storageKey, jsonData);
          } else {
            // Also save to localStorage as backup
            localStorage.setItem(storageKey, jsonData);
          }
        });
      } else {
        // Use localStorage
        localStorage.setItem(storageKey, jsonData);
      }
    } catch(e) {
      // Error saving dashboard state
    }
  },

  // Save all state
  saveAll: function() {
    ['customCards', 'hiddenCards', 'hiddenPoints', 'cardTitles', 'cardSizes', 'expandedSections', 'expandedDevices', 'pointAssignments', 'cardOrder', 'cardCustomizations'].forEach(k => this.save(k));
  },

  // Create snapshot for undo
  snapshot: function() {
    return JSON.stringify({
      customCards: this.customCards,
      hiddenCards: this.hiddenCards,
      cardTitles: this.cardTitles,
      cardSizes: this.cardSizes
    });
  },

  // Restore from snapshot
  restore: function(snapshot) {
    const data = JSON.parse(snapshot);
    this.customCards = data.customCards || [];
    this.hiddenCards = data.hiddenCards || {};
    this.cardTitles = data.cardTitles || {};
    this.cardSizes = data.cardSizes || {};
    this.saveAll();
  },

  // Save state before making changes (for undo)
  saveForUndo: function() {
    this.undoHistory.push(this.snapshot());
    if (this.undoHistory.length > this.maxUndoSteps) {
      this.undoHistory.shift();
    }
    this.redoHistory = []; // Clear redo on new action
    this.updateUndoButtons();
  },

  // Undo last action
  undo: function() {
    if (this.undoHistory.length === 0) return false;
    this.redoHistory.push(this.snapshot());
    const prev = this.undoHistory.pop();
    this.restore(prev);
    this.updateUndoButtons();
    return true;
  },

  // Redo last undone action
  redo: function() {
    if (this.redoHistory.length === 0) return false;
    this.undoHistory.push(this.snapshot());
    const next = this.redoHistory.pop();
    this.restore(next);
    this.updateUndoButtons();
    return true;
  },

  // Update undo/redo button states
  updateUndoButtons: function() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = this.undoHistory.length === 0;
    if (redoBtn) redoBtn.disabled = this.redoHistory.length === 0;
  },

  // Reset all dashboard customizations
  resetAll: function() {
    if (!confirm('Reset all dashboard customizations? This cannot be undone.')) return;
    this.customCards = [];
    this.hiddenCards = {};
    this.cardTitles = {};
    this.cardSizes = {};
    this.undoHistory = [];
    this.redoHistory = [];
    this.saveAll();
    if (typeof updateDashboard === 'function') updateDashboard();
  }
};

// Load state on initialization (async if using file persistence)
if (window.USE_FILE_PERSISTENCE) {
  window.DashboardState.load().then(function() {
    // Sync exposed variables after loading
    window.customCards = window.DashboardState.customCards;
    window.hiddenCards = window.DashboardState.hiddenCards;
    window.hiddenPoints = window.DashboardState.hiddenPoints;
    window.cardTitles = window.DashboardState.cardTitles;
    window.cardSizes = window.DashboardState.cardSizes;
    window.dashboardExpandedSections = window.DashboardState.expandedSections;
    window.expandedDevices = window.DashboardState.expandedDevices;
  });
} else {
  window.DashboardState.load();
}

// Expose shortcuts for backward compatibility
window.customCards = window.DashboardState.customCards;
window.hiddenCards = window.DashboardState.hiddenCards;
window.hiddenPoints = window.DashboardState.hiddenPoints;
window.cardTitles = window.DashboardState.cardTitles;
window.cardSizes = window.DashboardState.cardSizes;
window.dashboardExpandedSections = window.DashboardState.expandedSections;
window.expandedDevices = window.DashboardState.expandedDevices;
window.dragState = window.DashboardState.dragState;
