/* @noSnoop */

/**
 * UI Handlers and Utilities
 * Toast notifications, loading overlays, error displays, and other UI interactions
 */

// Toast Notifications
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toastContainer') || (function() {
    const div = document.createElement('div');
    div.id = 'toastContainer';
    div.className = 'toast-container';
    document.body.appendChild(div);
    return div;
  })();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function() {
    toast.remove();
  }, 3000);
};

// Undo/Redo Functions
window.undo = function() {
  if (window.DashboardState.undo()) {
    window.showToast('Undid last action', 'info');
    if (typeof updateDashboard === 'function') updateDashboard();
  } else {
    window.showToast('Nothing to undo', 'warning');
  }
};

window.redo = function() {
  if (window.DashboardState.redo()) {
    window.showToast('Redid action', 'info');
    if (typeof updateDashboard === 'function') updateDashboard();
  } else {
    window.showToast('Nothing to redo', 'warning');
  }
};

// Save state for undo
window.saveStateForUndo = function() {
  window.DashboardState.saveForUndo();
};

// Show error message
function showError(message) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = 'status error';
    statusDiv.style.display = 'block';
  } else {
    window.showToast(message, 'error');
  }
}

// Loading Overlay Functions
function showLoadingOverlay(message, subtext) {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text" id="loadingText">${message || 'Loading...'}</div>
      <div class="loading-subtext" id="loadingSubtext">${subtext || ''}</div>
    `;
    document.body.appendChild(overlay);
  } else {
    overlay.style.display = 'flex';
    const textEl = document.getElementById('loadingText');
    const subtextEl = document.getElementById('loadingSubtext');
    if (textEl) textEl.textContent = message || 'Loading...';
    if (subtextEl) subtextEl.textContent = subtext || '';
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function updateLoadingText(message, subtext) {
  const textEl = document.getElementById('loadingText');
  const subtextEl = document.getElementById('loadingSubtext');
  if (textEl) textEl.textContent = message || 'Loading...';
  if (subtextEl) subtextEl.textContent = subtext || '';
}

// Tab Switching
window.switchTab = function(tabName) {
  // Hide all view panels
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach(function(panel) {
    panel.classList.remove('active');
  });

  // Show selected panel
  const selectedPanel = document.getElementById(tabName + 'View');
  if (selectedPanel) {
    selectedPanel.classList.add('active');
  }

  // Update tab buttons
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(function(tab) {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
};

// Section Toggle (expand/collapse)
window.toggleSection = function(sectionType, sectionKey) {
  const key = sectionType + '_' + sectionKey;

  if (!window.DashboardState.expandedSections) {
    window.DashboardState.expandedSections = {};
  }

  window.DashboardState.expandedSections[key] = !window.DashboardState.expandedSections[key];
  window.DashboardState.save('expandedSections');

  if (typeof updateDashboard === 'function') updateDashboard();
};

// Device Points Toggle
window.toggleDevicePoints = function(deviceId) {
  if (!window.expandedDevices) {
    window.expandedDevices = {};
  }
  window.expandedDevices[deviceId] = !window.expandedDevices[deviceId];

  const pointsDiv = document.getElementById('points_' + deviceId);
  if (pointsDiv) {
    pointsDiv.style.display = window.expandedDevices[deviceId] ? 'block' : 'none';
  }
};

// Quick Hide Card
window.quickHideCard = function(cardId) {
  if (!confirm('Hide this card? You can unhide it from the menu.')) return;

  window.DashboardState.hiddenCards[cardId] = true;
  window.DashboardState.save('hiddenCards');

  if (typeof updateDashboard === 'function') updateDashboard();
  window.showToast('Card hidden', 'info');
};

// Show Hidden Cards Panel
window.showHiddenCardsPanel = function() {
  const panel = document.getElementById('hiddenCardsPanel');
  if (panel) {
    panel.classList.toggle('show');
    renderHiddenCardsList();
  }
};

// Render Hidden Cards List
function renderHiddenCardsList() {
  const listEl = document.getElementById('hiddenCardsList');
  if (!listEl) return;

  const hiddenCards = window.DashboardState.hiddenCards || {};
  const keys = Object.keys(hiddenCards).filter(function(key) {
    return hiddenCards[key] === true;
  });

  if (keys.length === 0) {
    listEl.innerHTML = '<div class="hidden-points-empty">No hidden cards</div>';
    return;
  }

  let html = '';
  keys.forEach(function(cardId) {
    const displayName = cardId.replace('type_', 'Device Type: ').replace('zone_', 'Zone: ');
    html += `
      <div class="hidden-point-item">
        <span class="hidden-point-name">${displayName}</span>
        <button class="unhide-btn" onclick="window.unhideCard('${cardId}')">Show</button>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

// Unhide Card
window.unhideCard = function(cardId) {
  delete window.DashboardState.hiddenCards[cardId];
  window.DashboardState.save('hiddenCards');

  if (typeof updateDashboard === 'function') updateDashboard();
  renderHiddenCardsList();
  window.showToast('Card restored', 'success');
};

// Hide Point
window.hidePoint = function(pointKey) {
  if (!window.DashboardState.hiddenPoints) {
    window.DashboardState.hiddenPoints = {};
  }

  window.DashboardState.hiddenPoints[pointKey] = true;
  window.DashboardState.save('hiddenPoints');

  if (typeof updateDashboard === 'function') updateDashboard();
  window.showToast('Point hidden', 'info');
};

// Format Value for Display
window.formatValue = function(value) {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (typeof value === 'number') return value.toFixed(2);
  return String(value);
};

// Export UI handlers
window.UIHandlers = {
  showError: showError,
  showLoadingOverlay: showLoadingOverlay,
  hideLoadingOverlay: hideLoadingOverlay,
  updateLoadingText: updateLoadingText,
  renderHiddenCardsList: renderHiddenCardsList
};
