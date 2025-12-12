/* @noSnoop */
/**
 * Loading Overlay Module
 * Handles showing/hiding loading overlays with progress messages
 */

/**
 * Show the loading overlay with a message
 * @param {string} message - Main loading message
 * @param {string} subtext - Secondary message (optional)
 */
window.showLoadingOverlay = function(message, subtext) {
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
  
  // Update the refresh discovery button if it exists
  const btn = document.getElementById('refreshDiscoveryBtn');
  if (btn) {
    btn.classList.add('loading');
    btn.innerHTML = '⏳ Discovering...';
  }
};

/**
 * Hide the loading overlay
 */
window.hideLoadingOverlay = function() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  
  // Restore the refresh discovery button if it exists
  const btn = document.getElementById('refreshDiscoveryBtn');
  if (btn) {
    btn.classList.remove('loading');
    btn.innerHTML = '🔄 Refresh Discovery';
  }
};

/**
 * Update the loading overlay text without hiding it
 * @param {string} message - Main loading message
 * @param {string} subtext - Secondary message (optional)
 */
window.updateLoadingText = function(message, subtext) {
  const loadingText = document.getElementById('loadingText');
  const loadingSubtext = document.getElementById('loadingSubtext');
  if (loadingText) loadingText.textContent = message || '';
  if (loadingSubtext) loadingSubtext.textContent = subtext || '';
};

