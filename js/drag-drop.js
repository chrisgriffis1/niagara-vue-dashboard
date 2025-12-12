/* @noSnoop */
/**
 * Drag and Drop Handlers
 * Handles all drag and drop functionality for cards and points in the dashboard
 */

// ========================================
// CARD DRAG HANDLERS
// ========================================

window.handleCardDragStart = function(event, cardId) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'card', id: cardId }));
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
  
  // Set dragState for tracking
  window.dragState = {
    item: event.currentTarget,
    type: 'card',
    cardId: cardId
  };
};

window.handleCardDragEnd = function(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.device-type-card, .zone-card').forEach(function(card) {
    card.classList.remove('drag-over');
  });
  // Clear dragState
  if (window.dragState && window.dragState.type === 'card') {
    window.dragState = { item: null, type: null, cardId: null };
  }
};

window.handleCardDragOver = function(event) {
  // Check if this is a card drag by checking dragState
  let isCardDrag = false;
  if (window.dragState && window.dragState.type === 'card') {
    isCardDrag = true;
  } else if (event.dataTransfer.types.includes('text/plain')) {
    // Can't read getData during dragover, but we can check types
    // Assume it's a card drag if we have text/plain and the current target is a card
    const targetCard = event.currentTarget;
    if (targetCard.dataset.cardType && targetCard.dataset.cardId) {
      isCardDrag = true;
    }
  }
  
  if (isCardDrag) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
  }
};

window.handleCardDrop = function(event) {
  event.preventDefault();
  event.stopPropagation();
  
  try {
    // Try to get data from dragState first, then dataTransfer
    let sourceCardId = null;
    if (window.dragState && window.dragState.type === 'card') {
      sourceCardId = window.dragState.cardId;
    } else {
      const data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type === 'card') {
        sourceCardId = data.id;
      }
    }
    
    if (sourceCardId) {
      const targetCard = event.currentTarget;
      const targetCardId = targetCard.dataset.cardId;
      const targetCardType = targetCard.dataset.cardType;
      
      // Only reorder if same card type and different cards
      if (sourceCardId && targetCardId && sourceCardId !== targetCardId && sourceCardId.startsWith(targetCardType + '_')) {
        // Get card order from state
        if (!window.DashboardState.cardOrder) {
          window.DashboardState.cardOrder = { types: [], zones: [] };
        }
        
        const orderKey = targetCardType === 'type' ? 'types' : 'zones';
        
        // Get current order from stored state (not from DOM positions!)
        let order = window.DashboardState.cardOrder[orderKey] || [];
        
        // If order is empty, initialize from current DOM order
        if (order.length === 0) {
          const domCards = Array.from(document.querySelectorAll(`[data-card-type="${targetCardType}"]`));
          order = domCards.map(c => c.dataset.cardId);
        }
        
        // Find positions in the stored order
        const sourceIdx = order.indexOf(sourceCardId);
        const targetIdx = order.indexOf(targetCardId);
        
        if (sourceIdx >= 0 && targetIdx >= 0 && sourceIdx !== targetIdx) {
          const before = order.slice();
          
          // Remove source card from its current position
          order.splice(sourceIdx, 1);
          
          // Always insert at targetIdx position
          // This works because:
          // - Moving UP: target position unchanged, insert pushes target right
          // - Moving DOWN: after removal from earlier position, targetIdx in new array 
          //   is exactly where we want (one position after where target now sits)
          let insertIdx = targetIdx;
          
          // Clamp to valid range
          if (insertIdx > order.length) insertIdx = order.length;
          
          order.splice(insertIdx, 0, sourceCardId);
          
          // Save and update
          window.DashboardState.cardOrder[orderKey] = order;
          window.DashboardState.save('cardOrder');
          
          if (typeof window.updateDashboard === 'function') window.updateDashboard();
          if (window.showToast) window.showToast('Cards reordered', 'success');
        }
      }
    }
  } catch(e) {
    // Error in drop operation
  }
  
  event.currentTarget.classList.remove('drag-over');
  // Clear dragState
  if (window.dragState && window.dragState.type === 'card') {
    window.dragState = { item: null, type: null, cardId: null };
  }
};

// ========================================
// POINT DATA PARSING
// ========================================

function parsePointDataSafe(raw) {
  if (!raw) return null;
  try {
    if (typeof raw !== 'string') return raw;
    let str = raw;
    // If URI-encoded, decode first
    if (str.startsWith('%7B') || str.startsWith('%7b') || str.includes('%22')) {
      str = decodeURIComponent(str);
    }
    // Replace HTML entities
    str = str.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return JSON.parse(str);
  } catch(e) {
    try {
      return JSON.parse(raw);
    } catch(inner) {
      return null;
    }
  }
}

// Export for use in other modules
window.parsePointDataSafe = parsePointDataSafe;

// ========================================
// POINT DRAG HANDLERS
// ========================================

window.handlePointDragStart = function(event, pointDataStr) {
  try {
    const point = event.currentTarget;
    let pointData = parsePointDataSafe(pointDataStr);
    if (!pointData) {
      pointData = parsePointDataSafe(point.dataset.pointData);
    }
    if (!pointData) {
      return;
    }
    
    // Get source container info
    const sourceContainer = point.dataset.containerType || null;
    const sourceContainerId = point.dataset.containerId || null;
    let sourceIndex = point.dataset.pointIndex || null;
    
    // Handle custom_ prefix for custom points (keep as string)
    if (sourceIndex && typeof sourceIndex === 'string' && sourceIndex.startsWith('custom_')) {
      // Keep as string for custom points
    } else if (sourceIndex !== null && sourceIndex !== undefined) {
      sourceIndex = parseInt(sourceIndex);
    }
    
    // Set dragState for improved drop handling
    window.dragState = {
      item: point,
      type: 'point',
      data: pointData,
      sourceContainer: sourceContainer,
      sourceContainerId: sourceContainerId,
      sourceIndex: sourceIndex
    };
    
    event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'point', dragType: 'point', data: pointData }));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.currentTarget.classList.add('dragging');
  } catch(e) {
    // Error in drag start
  }
};

window.handlePointDragEnd = function(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drop-zone, .custom-card, .create-card-zone, .points-container').forEach(function(zone) {
    zone.classList.remove('drag-over');
  });
  // Clear dragState
  if (window.dragState) {
    window.dragState = { item: null, type: null, data: null, sourceContainer: null, sourceIndex: null };
  }
};

// ========================================
// CONTAINER DRAG HANDLERS
// ========================================

window.handlePointContainerDragOver = function(event) {
  // Allow drops if we have a point in dragState
  // If dragState doesn't exist yet, still allow (might be from helper modal)
  if (window.dragState && window.dragState.type !== 'point') {
    // Check if it's a card drag instead
    if (window.dragState.type === 'card') {
      return; // Don't allow card drags on point containers
    }
    return; // Not a point drag
  }
  
  // Allow the dragover (either point drag or dragState not set yet)
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  
  // Add visual feedback
  event.currentTarget.classList.add('drag-over');
};

window.handlePointContainerDragLeave = function(event) {
  // Only clear if we're actually leaving the container (not just moving to a child)
  const container = event.currentTarget;
  const relatedTarget = event.relatedTarget;
  
  // Check if we're moving to a child element
  if (relatedTarget && container.contains(relatedTarget)) {
    return; // Still inside container, don't clear
  }
  
  // Actually leaving the container
  container.classList.remove('drag-over');
};

window.handlePointContainerDrop = function(event) {
  event.preventDefault();
  event.stopPropagation();
  
  // Try to get data from dragState or dataTransfer
  let pointData = null;
  let sourceContainer = null;
  let sourceContainerId = null;
  let sourceIndex = null;
  let wasFromHelper = false;
  
  if (window.dragState && window.dragState.type === 'point') {
    pointData = window.dragState.data;
    sourceContainer = window.dragState.sourceContainer;
    sourceContainerId = window.dragState.sourceContainerId;
    sourceIndex = window.dragState.sourceIndex;
    wasFromHelper = sourceContainer === 'helper';
  } else {
    // Fallback: read from dataTransfer
    try {
      const transferData = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ((transferData.type === 'point' || transferData.dragType === 'point') && transferData.data) {
        pointData = transferData.data;
        sourceContainer = 'helper'; // Assume helper if we're reading from dataTransfer
        sourceContainerId = null;
        sourceIndex = null;
        wasFromHelper = true;
      }
    } catch(e) {
      return;
    }
  }
  
  if (!pointData) return;
  
  const container = event.currentTarget;
  const targetContainerType = container.dataset.containerType;
  const targetContainerId = container.dataset.containerId;
  
  // Calculate target index (append to end)
  let targetIndex = 0;
  if (targetContainerType === 'custom' && targetContainerId !== undefined) {
    const cardIndex = parseInt(targetContainerId);
    if (window.customCards && window.customCards[cardIndex] && window.customCards[cardIndex].sections) {
      targetIndex = window.customCards[cardIndex].sections.length;
    }
  }
  
  // Use movePoint function to handle the move
  window.movePoint(
    sourceContainer,
    sourceContainerId,
    sourceIndex,
    targetContainerType,
    targetContainerId,
    targetIndex,
    pointData
  );
  
  // Clear drag state
  window.dragState = { item: null, type: null, data: null, sourceContainer: null, sourceIndex: null };
  
  // Remove dragging-active class and close helper modal if item was dragged from it
  if (wasFromHelper) {
    const modal = document.querySelector('.point-helper-modal');
    if (modal) {
      modal.classList.remove('dragging-active');
      setTimeout(function() {
        const closeBtn = modal.querySelector('.point-helper-close');
        if (closeBtn) closeBtn.click();
      }, 100);
    }
  }
};

// ========================================
// POINT DRAG OVER/DROP FOR REORDERING
// ========================================

window.handlePointDragOver = function(event) {
  // Allow drag over if we have a point in dragState OR if dataTransfer has point data
  let isPointDrag = false;
  if (window.dragState && window.dragState.type === 'point') {
    isPointDrag = true;
  } else {
    // Check dataTransfer
    try {
      const types = event.dataTransfer.types;
      if (types && types.length > 0) {
        // Try to get data
        const data = event.dataTransfer.getData('text/plain');
        if (data) {
          const transferData = JSON.parse(data);
          if (transferData.type === 'point' || transferData.dragType === 'point') {
            isPointDrag = true;
          }
        }
      }
    } catch(e) {
      // Ignore errors
    }
  }
  
  if (!isPointDrag) return;
  
  event.preventDefault();
  event.stopPropagation();
  
  const targetPoint = event.currentTarget;
  if (window.dragState && targetPoint === window.dragState.item) return;
  
  // Clear other indicators
  document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(function(el) {
    if (el !== targetPoint) {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });
  
  // Determine if drop is above or below
  const rect = targetPoint.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  
  if (event.clientY < midY) {
    targetPoint.classList.remove('drag-over-bottom');
    targetPoint.classList.add('drag-over-top');
  } else {
    targetPoint.classList.remove('drag-over-top');
    targetPoint.classList.add('drag-over-bottom');
  }
};

window.handlePointDrop = function(event) {
  event.preventDefault();
  event.stopPropagation();
  
  const targetPoint = event.currentTarget;
  const isDropAbove = targetPoint.classList.contains('drag-over-top');
  targetPoint.classList.remove('drag-over-top', 'drag-over-bottom');
  
  // Try to get data from dragState or dataTransfer
  let pointData = null;
  let sourceContainer = null;
  let sourceContainerId = null;
  let sourceIndex = null;
  let wasFromHelper = false;
  
  if (window.dragState && window.dragState.type === 'point') {
    if (targetPoint === window.dragState.item) {
      return;
    }
    pointData = window.dragState.data;
    sourceContainer = window.dragState.sourceContainer;
    sourceContainerId = window.dragState.sourceContainerId;
    sourceIndex = window.dragState.sourceIndex;
    wasFromHelper = sourceContainer === 'helper';
  } else {
    // Fallback: read from dataTransfer
    try {
      const transferData = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ((transferData.type === 'point' || transferData.dragType === 'point') && transferData.data) {
        pointData = transferData.data;
        sourceContainer = 'helper';
        sourceContainerId = null;
        sourceIndex = null;
        wasFromHelper = true;
      }
    } catch(e) {
      return;
    }
  }
  
  if (!pointData) {
    return;
  }
  
  const targetContainerType = targetPoint.dataset.containerType;
  const targetContainerId = targetPoint.dataset.containerId;
  let targetIndex = targetPoint.dataset.pointIndex;
  const targetOrdAttr = targetPoint.dataset.pointOrd;
  
  // Handle custom_ prefix for custom points
  if (typeof targetIndex === 'string' && targetIndex.startsWith('custom_')) {
    // Keep as string for custom points
    if (!isDropAbove) {
      // If dropping below, increment the index
      const idxNum = parseInt(targetIndex.replace('custom_', ''));
      targetIndex = 'custom_' + (idxNum + 1);
    }
  } else {
    // Regular point index
    targetIndex = parseInt(targetIndex) || 0;
    if (!isDropAbove) targetIndex++;
  }
  
  // For All Devices, prefer ord-based targeting to avoid index drift after sorts
  if (targetContainerType === 'alldevices' && targetOrdAttr) {
    targetIndex = 'ord:' + targetOrdAttr + (isDropAbove ? ':above' : ':below');
  }
  
  // Use movePoint function to handle the move
  window.movePoint(
    sourceContainer,
    sourceContainerId,
    sourceIndex,
    targetContainerType,
    targetContainerId,
    targetIndex,
    pointData
  );
  
  // Clear drag state
  window.dragState = { item: null, type: null, data: null, sourceContainer: null, sourceIndex: null };
  
  // Close helper modal if item was dragged from it
  if (wasFromHelper) {
    const modal = document.querySelector('.point-helper-modal');
    if (modal) {
      modal.classList.remove('dragging-active');
      setTimeout(function() {
        const closeBtn = modal.querySelector('.point-helper-close');
        if (closeBtn) closeBtn.click();
      }, 100);
    }
  }
};

// ========================================
// HELPER MODAL DRAG HANDLERS
// ========================================

window.handleHelperItemDragStart = function(event) {
  event.stopPropagation(); // Prevent closing modal
  const item = event.currentTarget;
  let pointData = null;
  
  try {
    // Try to get point data from data attribute
    if (item.dataset.pointData) {
      pointData = JSON.parse(decodeURIComponent(item.dataset.pointData));
    } else {
      return;
    }
  } catch(e) {
    return;
  }
  
  window.dragState = {
    item: item,
    type: 'point',
    data: pointData,
    sourceContainer: 'helper',
    sourceContainerId: null,
    sourceIndex: null
  };
  
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'point', dragType: 'point', data: pointData }));
  
  // Make modal backdrop allow pointer events through during drag
  const modal = document.querySelector('.point-helper-modal');
  if (modal) {
    modal.classList.add('dragging-active');
  }
  
  setTimeout(function() {
    item.classList.add('dragging');
  }, 0);
};

window.handleHelperItemDragEnd = function(event) {
  event.stopPropagation(); // Prevent closing modal
  event.currentTarget.classList.remove('dragging');
  
  // Remove dragging-active class from modal
  const modal = document.querySelector('.point-helper-modal');
  if (modal) {
    modal.classList.remove('dragging-active');
  }
  
  // Only close modal if drop was NOT successful (no drop happened)
  // Successful drops will close the modal themselves
  setTimeout(function() {
    // Check if dragState still exists and is from helper (means drop didn't happen)
    if (window.dragState && window.dragState.sourceContainer === 'helper') {
      const modal = document.querySelector('.point-helper-modal');
      if (modal) modal.remove();
      // Clear drag state
      window.dragState = { item: null, type: null, data: null, sourceContainer: null, sourceIndex: null };
    }
  }, 300);
};

// ========================================
// DROP ZONE HANDLERS
// ========================================

window.handleDropZoneDragOver = function(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
};

window.handleCreateCardDrop = function(event) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  
  // Try to get data from dragState or dataTransfer
  let pointData = null;
  
  if (window.dragState && window.dragState.type === 'point') {
    pointData = window.dragState.data;
  } else {
    try {
      const transferData = JSON.parse(event.dataTransfer.getData('text/plain'));
      if ((transferData.type === 'point' || transferData.dragType === 'point') && transferData.data) {
        pointData = transferData.data;
      }
    } catch(e) {
      return;
    }
  }
  
  if (!pointData) return;
  
  // Create new custom card with this point
  if (!window.customCards) window.customCards = [];
  const newCard = {
    title: pointData.name || pointData.originalName || 'New Card',
    sections: [{ type: 'point', data: pointData }]
  };
  window.customCards.push(newCard);
  
  if (window.saveCustomCards) window.saveCustomCards();
  if (typeof window.updateDashboard === 'function') window.updateDashboard();
  if (window.showToast) window.showToast('Created new card', 'success');
  
  // Clear drag state
  window.dragState = { item: null, type: null, data: null, sourceContainer: null, sourceIndex: null };
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

window.clearDropIndicators = function() {
  document.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(function(el) {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });
};

window.clearAllDragClasses = function() {
  document.querySelectorAll('.dragging, .drag-over, .drag-over-top, .drag-over-bottom').forEach(function(el) {
    el.classList.remove('dragging', 'drag-over', 'drag-over-top', 'drag-over-bottom');
  });
};

// ========================================
// CUSTOM CARD DRAG HANDLERS
// ========================================

window.handleCustomCardDragStart = function(event, cardIndex) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'customCard', index: cardIndex }));
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
  
  window.dragState = {
    item: event.currentTarget,
    type: 'customCard',
    cardIndex: cardIndex
  };
};

window.handleCustomCardDragEnd = function(event) {
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.custom-card').forEach(function(card) {
    card.classList.remove('drag-over');
  });
  
  if (window.dragState && window.dragState.type === 'customCard') {
    window.dragState = { item: null, type: null, cardIndex: null };
  }
};

window.handleCardDragLeave = function(event, cardIndex) {
  event.currentTarget.classList.remove('drag-over');
};

window.handleCardContentDrop = function(event, targetCardIndex) {
  event.preventDefault();
  event.stopPropagation();
  event.currentTarget.classList.remove('drag-over');
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    
    // Handle custom card reordering
    if (data.type === 'customCard' && data.index !== targetCardIndex) {
      const sourceIndex = data.index;
      if (window.customCards && window.customCards[sourceIndex]) {
        const card = window.customCards.splice(sourceIndex, 1)[0];
        let insertIdx = targetCardIndex;
        if (sourceIndex < targetCardIndex) insertIdx--;
        window.customCards.splice(insertIdx, 0, card);
        
        if (window.saveCustomCards) window.saveCustomCards();
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
        if (window.showToast) window.showToast('Cards reordered', 'success');
      }
    }
    // Handle point drop to card
    else if ((data.type === 'point' || data.dragType === 'point') && data.data) {
      const pointData = data.data;
      if (window.customCards && window.customCards[targetCardIndex]) {
        if (!window.customCards[targetCardIndex].sections) {
          window.customCards[targetCardIndex].sections = [];
        }
        window.customCards[targetCardIndex].sections.push({ type: 'point', data: pointData });
        
        if (window.saveCustomCards) window.saveCustomCards();
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
        if (window.showToast) window.showToast('Point added to card', 'success');
      }
    }
  } catch(e) {
    // Error in card content drop
  }
  
  // Clear drag state
  if (window.dragState) {
    window.dragState = { item: null, type: null, data: null };
  }
};

// ========================================
// SECTION DRAG HANDLERS
// ========================================

window.handleSectionDragStart = function(event, cardIndex, sectionIndex) {
  event.dataTransfer.setData('text/plain', JSON.stringify({ 
    type: 'section', 
    cardIndex: cardIndex, 
    sectionIndex: sectionIndex 
  }));
  event.dataTransfer.effectAllowed = 'move';
  event.currentTarget.classList.add('dragging');
};

window.handleSectionDragEnd = function(event) {
  event.currentTarget.classList.remove('dragging');
};

