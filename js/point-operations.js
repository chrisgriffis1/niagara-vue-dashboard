/* @noSnoop */
/**
 * Point Operations
 * Handles moving, assigning, and managing points between containers
 */

// ========================================
// NORMALIZE ORD HELPER
// ========================================

function normalizeOrd(ord) {
  if (!ord) return '';
  // Remove duplicate "slot:" prefixes
  return ord.replace(/slot:slot:/g, 'slot:');
}

// ========================================
// MOVE POINT FUNCTION
// ========================================

window.movePoint = function(srcType, srcId, srcIdx, destType, destId, destIdx, pointData) {
  // Save state for undo before making changes
  if (window.saveStateForUndo) window.saveStateForUndo();
  
  // Normalize ORD
  let pointOrd = pointData.ord || pointData.slotPath || '';
  pointOrd = normalizeOrd(pointOrd);
  
  // Handle same-card reordering first (before any removal)
  let reorderSucceeded = false;
  
  // Custom cards
  if (srcType === 'custom' && destType === 'custom' && srcId === destId && srcIdx !== null && destIdx !== null) {
    const srcCardIndex = parseInt(srcId);
    if (window.customCards && window.customCards[srcCardIndex] && window.customCards[srcCardIndex].sections) {
      const section = window.customCards[srcCardIndex].sections[srcIdx];
      window.customCards[srcCardIndex].sections.splice(srcIdx, 1);
      let adjustedDestIdx = parseInt(destIdx);
      if (srcIdx < adjustedDestIdx) adjustedDestIdx--;
      window.customCards[srcCardIndex].sections.splice(adjustedDestIdx, 0, section);
      if (window.saveCustomCards) window.saveCustomCards();
      if (typeof updateDashboard === 'function') updateDashboard();
      if (window.showToast) window.showToast('Point reordered', 'success');
      return;
    }
  }
  
  // Type cards - reorder points within same card
  if (srcType === 'type' && destType === 'type' && srcId === destId && srcIdx !== null && destIdx !== null && srcIdx !== destIdx) {
    reorderSucceeded = handleTypeCardReorder(srcId, srcIdx, destIdx, pointData, pointOrd);
    if (reorderSucceeded) return;
  }
  
  // All Devices reorder
  if (srcType === 'alldevices' && destType === 'alldevices' && srcIdx !== null && destIdx !== null) {
    handleAllDevicesReorder(srcIdx, destIdx, pointData, pointOrd);
    return;
  }
  
  // Zone cards - reorder points within same card
  if (srcType === 'zone' && destType === 'zone' && srcId === destId && srcIdx !== null && destIdx !== null) {
    reorderSucceeded = handleZoneCardReorder(srcId, srcIdx, destIdx, pointData, pointOrd);
    if (reorderSucceeded) return;
  }
  
  // Remove from source (if not a same-card reorder)
  const wasReorder = srcType === destType && srcId === destId && srcIdx !== null && destIdx !== null && srcIdx !== destIdx && reorderSucceeded;
  if (!wasReorder) {
    removeFromSource(srcType, srcId, srcIdx, pointOrd);
  }
  
  // Track point assignment
  if (pointOrd) {
    if (!window.DashboardState.pointAssignments) {
      window.DashboardState.pointAssignments = {};
    }
    window.DashboardState.pointAssignments[pointOrd] = {
      containerType: destType,
      containerId: destId,
      index: destIdx,
      timestamp: new Date().toISOString()
    };
    window.DashboardState.save('pointAssignments');
  }
  
  // Add to destination
  addToDestination(destType, destId, destIdx, pointData, pointOrd, srcType, srcId, srcIdx, reorderSucceeded);
};

// ========================================
// TYPE CARD REORDER
// ========================================

function handleTypeCardReorder(cardId, srcIdx, destIdx, pointData, pointOrd) {
  const cardKey = 'type_' + cardId;
  
  // Initialize cardCustomizations if needed
  if (!window.DashboardState.cardCustomizations) {
    window.DashboardState.cardCustomizations = {};
  }
  if (!window.DashboardState.cardCustomizations[cardKey]) {
    window.DashboardState.cardCustomizations[cardKey] = { customPoints: [], pointOrder: [] };
  }
  
  const customizations = window.DashboardState.cardCustomizations[cardKey];
  const customPoints = customizations.customPoints || [];
  let pointOrder = customizations.pointOrder || [];
  
  // Parse indices
  let srcIdxNum, destIdxNum;
  let srcIsCustom = false, destIsCustom = false;
  
  if (typeof srcIdx === 'string' && srcIdx.startsWith('custom_')) {
    srcIdxNum = parseInt(srcIdx.replace('custom_', ''));
    srcIsCustom = true;
  } else {
    srcIdxNum = parseInt(srcIdx);
  }
  
  if (typeof destIdx === 'string' && destIdx.startsWith('custom_')) {
    destIdxNum = parseInt(destIdx.replace('custom_', ''));
    destIsCustom = true;
  } else {
    destIdxNum = parseInt(destIdx);
  }
  
  // Reorder custom points
  if (srcIsCustom && destIsCustom && srcIdxNum >= 0 && srcIdxNum < customPoints.length) {
    const point = customPoints[srcIdxNum];
    customPoints.splice(srcIdxNum, 1);
    let targetIdx = Math.max(0, Math.min(destIdxNum, customPoints.length));
    customPoints.splice(targetIdx, 0, point);
      window.DashboardState.save('cardCustomizations');
      if (typeof updateDashboard === 'function') updateDashboard();
      if (window.showToast) window.showToast('Point reordered', 'success');
      return true;
  }
  
  // Reorder regular points
  if (!srcIsCustom && !destIsCustom && srcIdxNum >= 0 && destIdxNum >= 0) {
    const dashboardConfig = window.dashboardConfig || {};
    const global = dashboardConfig.global || {};
    const byType = global.byType || {};
    const components = byType[cardId] || [];
    
    // Initialize pointOrder if needed
    if (pointOrder.length === 0) {
      pointOrder = components.map(c => normalizeOrd(c.ord || c.slotPath || ''));
      customPoints.forEach(cp => {
        const cpOrd = normalizeOrd(cp.ord || cp.data?.ord || '');
        if (cpOrd && pointOrder.indexOf(cpOrd) < 0) {
          pointOrder.push(cpOrd);
        }
      });
      customizations.pointOrder = pointOrder;
    }
    
    // Find point in pointOrder
    const normalizedPointOrd = normalizeOrd(pointOrd);
    const srcOrdIndex = pointOrder.findIndex(ord => normalizeOrd(ord) === normalizedPointOrd);
    
    if (srcOrdIndex >= 0) {
      pointOrder.splice(srcOrdIndex, 1);
      let insertIdx = Math.max(0, Math.min(destIdxNum, pointOrder.length));
      pointOrder.splice(insertIdx, 0, pointOrd);
      customizations.pointOrder = pointOrder;
      window.DashboardState.save('cardCustomizations');
      if (typeof updateDashboard === 'function') updateDashboard();
      if (window.showToast) window.showToast('Point reordered', 'success');
      return true;
    }
  }
  
  return false;
}

// ========================================
// ALL DEVICES REORDER
// ========================================

function handleAllDevicesReorder(srcIdx, destIdx, pointData, pointOrd) {
  if (!window.DashboardState.allDevicesOrder) window.DashboardState.allDevicesOrder = [];
  
  let order = window.normalizeAllDevicesOrder 
    ? window.normalizeAllDevicesOrder(window.dashboardConfig?.global?.snapshot || []) 
    : (window.DashboardState.allDevicesOrder || []);
  
  if (!pointOrd) {
    return;
  }
  
  const sourceIdx = order.indexOf(pointOrd);
  
  // Support ord-targeted drops
  let destIdxNum;
  if (typeof destIdx === 'string' && destIdx.startsWith('ord:')) {
    const parts = destIdx.split(':');
    const targetOrd = normalizeOrd(parts[1] || '');
    const position = parts[2] || 'above';
    const targetPos = order.indexOf(targetOrd);
    destIdxNum = targetPos >= 0 ? (position === 'below' ? targetPos + 1 : targetPos) : order.length;
  } else {
    destIdxNum = parseInt(destIdx) || 0;
    destIdxNum = Math.max(0, Math.min(destIdxNum, order.length));
  }
  
  // Remove from source
  if (sourceIdx >= 0) {
    order.splice(sourceIdx, 1);
    if (sourceIdx < destIdxNum) destIdxNum--;
  }
  
  // Insert at target
  order.splice(destIdxNum, 0, pointOrd);
  window.DashboardState.allDevicesOrder = order;
  window.DashboardState.save('allDevicesOrder');
  
  // Lock sort
  window.deviceListSortLocked = true;
  if (window.deviceListSort) {
    window.deviceListSort = { column: null, direction: 'asc' };
  }
  
  if (typeof updateDashboard === 'function') updateDashboard();
  if (window.showToast) window.showToast('All Devices reordered', 'success');
}

// ========================================
// ZONE CARD REORDER
// ========================================

function handleZoneCardReorder(zoneId, srcIdx, destIdx, pointData, pointOrd) {
  const cardKey = 'zone_' + zoneId;
  
  if (!window.DashboardState.cardCustomizations) {
    window.DashboardState.cardCustomizations = {};
  }
  if (!window.DashboardState.cardCustomizations[cardKey]) {
    window.DashboardState.cardCustomizations[cardKey] = { customPoints: [], pointOrder: [] };
  }
  
  const customizations = window.DashboardState.cardCustomizations[cardKey];
  const customPoints = customizations.customPoints || [];
  let pointOrder = customizations.pointOrder || [];
  
  // Parse indices
  let srcIdxNum, destIdxNum;
  let srcIsCustom = false, destIsCustom = false;
  
  if (typeof srcIdx === 'string' && srcIdx.startsWith('custom_')) {
    srcIdxNum = parseInt(srcIdx.replace('custom_', ''));
    srcIsCustom = true;
  } else {
    srcIdxNum = parseInt(srcIdx);
  }
  
  if (typeof destIdx === 'string' && destIdx.startsWith('custom_')) {
    destIdxNum = parseInt(destIdx.replace('custom_', ''));
    destIsCustom = true;
  } else {
    destIdxNum = parseInt(destIdx);
  }
  
  // Reorder custom points
  if (srcIsCustom && destIsCustom && srcIdxNum >= 0 && srcIdxNum < customPoints.length) {
    const point = customPoints[srcIdxNum];
    customPoints.splice(srcIdxNum, 1);
    let targetIdx = Math.max(0, Math.min(destIdxNum, customPoints.length));
    customPoints.splice(targetIdx, 0, point);
    window.DashboardState.save('cardCustomizations');
    if (typeof updateDashboard === 'function') updateDashboard();
    if (window.showToast) window.showToast('Point reordered', 'success');
    return true;
  }
  
  // Reorder regular points
  if (!srcIsCustom && !destIsCustom && srcIdxNum >= 0 && destIdxNum >= 0) {
    const dashboardConfig = window.dashboardConfig || {};
    const global = dashboardConfig.global || {};
    const byZone = global.byZone || {};
    const components = byZone[zoneId] || [];
    
    if (srcIdxNum < components.length && destIdxNum <= components.length) {
      if (pointOrder.length === 0) {
        pointOrder = components.map(c => c.ord || c.slotPath || '');
        customizations.pointOrder = pointOrder;
      }
      
      const ord = pointOrder[srcIdxNum];
      pointOrder.splice(srcIdxNum, 1);
      let insertIdx = Math.max(0, Math.min(destIdxNum, pointOrder.length));
      pointOrder.splice(insertIdx, 0, ord);
      customizations.pointOrder = pointOrder;
      
      window.DashboardState.save('cardCustomizations');
      if (typeof updateDashboard === 'function') updateDashboard();
      if (window.showToast) window.showToast('Point reordered', 'success');
      return true;
    }
  }
  
  return false;
}

// ========================================
// REMOVE FROM SOURCE
// ========================================

function removeFromSource(srcType, srcId, srcIdx, pointOrd) {
  // Remove from type card customizations
  if (srcType === 'type' && srcId !== undefined) {
    const srcCardKey = 'type_' + srcId;
    if (window.DashboardState.cardCustomizations && window.DashboardState.cardCustomizations[srcCardKey]) {
      const customizations = window.DashboardState.cardCustomizations[srcCardKey];
      const customPoints = customizations.customPoints || [];
      const pointIndex = typeof srcIdx === 'string' && srcIdx.startsWith('custom_') 
        ? parseInt(srcIdx.replace('custom_', '')) : null;
      
      if (pointIndex !== null && pointIndex >= 0 && pointIndex < customPoints.length) {
        customPoints.splice(pointIndex, 1);
      } else if (pointOrd) {
        const normalizedPointOrd = normalizeOrd(pointOrd);
        const foundIndex = customPoints.findIndex(cp => 
          normalizeOrd(cp.ord || cp.data?.ord || '') === normalizedPointOrd
        );
        if (foundIndex >= 0) {
          customPoints.splice(foundIndex, 1);
        }
      }
      
      // Also remove from pointOrder
      if (customizations.pointOrder && pointOrd) {
        const normalizedPointOrd = normalizeOrd(pointOrd);
        const ordIndex = customizations.pointOrder.findIndex(ord => 
          normalizeOrd(ord) === normalizedPointOrd
        );
        if (ordIndex >= 0) {
          customizations.pointOrder.splice(ordIndex, 1);
        }
      }
      window.DashboardState.save('cardCustomizations');
    }
  }
  
  // Remove from zone card customizations
  if (srcType === 'zone' && srcId !== undefined) {
    const srcCardKey = 'zone_' + srcId;
    if (window.DashboardState.cardCustomizations && window.DashboardState.cardCustomizations[srcCardKey]) {
      const customPoints = window.DashboardState.cardCustomizations[srcCardKey].customPoints || [];
      const pointIndex = typeof srcIdx === 'string' && srcIdx.startsWith('custom_') 
        ? parseInt(srcIdx.replace('custom_', '')) : null;
      
      if (pointIndex !== null && pointIndex >= 0 && pointIndex < customPoints.length) {
        customPoints.splice(pointIndex, 1);
      } else if (pointOrd) {
        const normalizedPointOrd = normalizeOrd(pointOrd);
        const foundIndex = customPoints.findIndex(cp => 
          normalizeOrd(cp.ord || cp.data?.ord || '') === normalizedPointOrd
        );
        if (foundIndex >= 0) {
          customPoints.splice(foundIndex, 1);
        }
      }
      window.DashboardState.save('cardCustomizations');
    }
  }
  
  // Remove from custom card
  if (srcType === 'custom' && srcId !== undefined && srcIdx !== null) {
    const srcCardIndex = parseInt(srcId);
    if (window.customCards && window.customCards[srcCardIndex] && window.customCards[srcCardIndex].sections) {
      window.customCards[srcCardIndex].sections.splice(srcIdx, 1);
      if (window.saveCustomCards) window.saveCustomCards();
    }
  }
}

// ========================================
// ADD TO DESTINATION
// ========================================

function addToDestination(destType, destId, destIdx, pointData, pointOrd, srcType, srcId, srcIdx, reorderSucceeded) {
  // Handle drops to device type cards
  const isTypeReorderAttempt = srcType === 'type' && destType === 'type' && srcId === destId && srcIdx !== null && destIdx !== null && srcIdx !== destIdx;
  if (destType === 'type' && !isTypeReorderAttempt) {
    addToTypeCard(destId, destIdx, pointData, pointOrd);
    return;
  }
  
  // Handle drops to zone cards
  const isZoneReorderAttempt = srcType === 'zone' && destType === 'zone' && srcId === destId && srcIdx !== null && destIdx !== null && srcIdx !== destIdx && reorderSucceeded;
  if (destType === 'zone' && !isZoneReorderAttempt) {
    addToZoneCard(destId, destIdx, pointData, pointOrd);
    return;
  }
  
  // Handle drops to custom cards
  if (destType === 'custom') {
    addToCustomCard(destId, destIdx, pointData);
    return;
  }
  
  // Unknown destination type
  if (window.showToast) {
    window.showToast('Point assignment saved', 'success');
  }
}

function addToTypeCard(destId, destIdx, pointData, pointOrd) {
  if (!window.DashboardState.cardCustomizations) {
    window.DashboardState.cardCustomizations = {};
  }
  const cardKey = 'type_' + destId;
  if (!window.DashboardState.cardCustomizations[cardKey]) {
    window.DashboardState.cardCustomizations[cardKey] = { customPoints: [], hiddenPoints: [] };
  }
  if (!window.DashboardState.cardCustomizations[cardKey].customPoints) {
    window.DashboardState.cardCustomizations[cardKey].customPoints = [];
  }
  
  const customPoints = window.DashboardState.cardCustomizations[cardKey].customPoints;
  const insertIndex = (destIdx !== null && destIdx !== undefined && !isNaN(destIdx)) 
    ? Math.max(0, Math.min(parseInt(destIdx), customPoints.length)) 
    : customPoints.length;
  
  customPoints.splice(insertIndex, 0, {
    ord: pointOrd,
    data: pointData,
    index: insertIndex
  });
  
  // Also add to pointOrder
  const customizations = window.DashboardState.cardCustomizations[cardKey];
  if (!customizations.pointOrder) {
    const dashboardConfig = window.dashboardConfig || {};
    const global = dashboardConfig.global || {};
    const byType = global.byType || {};
    const components = byType[destId] || [];
    customizations.pointOrder = components.map(c => normalizeOrd(c.ord || c.slotPath || ''));
  }
  
  const normalizedPointOrd = normalizeOrd(pointOrd);
  const ordExists = customizations.pointOrder.some(ord => normalizeOrd(ord) === normalizedPointOrd);
  if (pointOrd && !ordExists) {
    const pointOrderInsertIndex = Math.max(0, Math.min(insertIndex, customizations.pointOrder.length));
    customizations.pointOrder.splice(pointOrderInsertIndex, 0, pointOrd);
  }
  
  window.DashboardState.save('cardCustomizations');
  if (typeof updateDashboard === 'function') updateDashboard();
  if (window.showToast) window.showToast('Point moved to ' + destId + ' card', 'success');
}

function addToZoneCard(destId, destIdx, pointData, pointOrd) {
  if (!window.DashboardState.cardCustomizations) {
    window.DashboardState.cardCustomizations = {};
  }
  const cardKey = 'zone_' + destId;
  if (!window.DashboardState.cardCustomizations[cardKey]) {
    window.DashboardState.cardCustomizations[cardKey] = { customPoints: [], hiddenPoints: [] };
  }
  if (!window.DashboardState.cardCustomizations[cardKey].customPoints) {
    window.DashboardState.cardCustomizations[cardKey].customPoints = [];
  }
  
  const customPoints = window.DashboardState.cardCustomizations[cardKey].customPoints;
  const insertIndex = (destIdx !== null && destIdx !== undefined && !isNaN(destIdx)) 
    ? Math.max(0, Math.min(parseInt(destIdx), customPoints.length)) 
    : customPoints.length;
  
  customPoints.splice(insertIndex, 0, {
    ord: pointOrd,
    data: pointData,
    index: insertIndex
  });
  
  // Also add to pointOrder
  const customizations = window.DashboardState.cardCustomizations[cardKey];
  if (!customizations.pointOrder) {
    const dashboardConfig = window.dashboardConfig || {};
    const global = dashboardConfig.global || {};
    const byZone = global.byZone || {};
    const zoneComponents = byZone[destId] || [];
    customizations.pointOrder = zoneComponents.map(c => normalizeOrd(c.ord || c.slotPath || ''));
  }
  
  const normalizedPointOrd = normalizeOrd(pointOrd);
  const ordExists = customizations.pointOrder.some(ord => normalizeOrd(ord) === normalizedPointOrd);
  if (pointOrd && !ordExists) {
    const pointOrderInsertIndex = Math.max(0, Math.min(insertIndex, customizations.pointOrder.length));
    customizations.pointOrder.splice(pointOrderInsertIndex, 0, pointOrd);
  }
  
  window.DashboardState.save('cardCustomizations');
  if (typeof updateDashboard === 'function') updateDashboard();
  if (window.showToast) window.showToast('Point moved to zone ' + destId, 'success');
}

function addToCustomCard(destId, destIdx, pointData) {
  const cardIndex = parseInt(destId);
  if (!window.customCards) window.customCards = [];
  if (!window.customCards[cardIndex]) {
    window.customCards[cardIndex] = { title: 'New Card', sections: [] };
  }
  if (!window.customCards[cardIndex].sections) {
    window.customCards[cardIndex].sections = [];
  }
  
  window.customCards[cardIndex].sections.splice(destIdx, 0, { type: 'point', data: pointData });
  if (window.saveCustomCards) window.saveCustomCards();
  if (typeof updateDashboard === 'function') updateDashboard();
  if (window.showToast) window.showToast('Point moved to card', 'success');
}

// ========================================
// POINT HELPER MODAL
// ========================================

window.showPointHelper = function(event, pointData) {
  event.stopPropagation();
  event.preventDefault();
  
  // Fallback to dataset if not provided
  if (!pointData && event && event.currentTarget && event.currentTarget.dataset) {
    pointData = window.parsePointDataSafe ? window.parsePointDataSafe(event.currentTarget.dataset.pointData) : null;
  }
  
  if (!pointData) {
    return;
  }
  
  // Parse pointData if it's a string
  if (typeof pointData === 'string') {
    try {
      pointData = window.parsePointDataSafe ? window.parsePointDataSafe(pointData) : JSON.parse(pointData);
    } catch(e) {
      return;
    }
  }
  
  if (!pointData) {
    return;
  }
  
  // Get device ORD to find similar points
  const deviceOrd = pointData.ord || pointData.deviceOrd || '';
  const pointName = pointData.name || pointData.originalName || 'Unknown';
  
  // Get snapshot from global config
  const global = window.dashboardConfig?.global || window.dashboardConfig || {};
  const snapshot = global.snapshot || window.foundEquipment || [];
  
  // Find similar points from snapshot (same device)
  const similarPoints = [];
  const allDevices = [];
  const seenDevices = {};
  
  snapshot.forEach(function(comp) {
    const compOrd = comp.ord || '';
    const compDeviceOrd = comp.deviceOrd || '';
    const compName = comp.name || comp.originalName || 'Unknown';
    
    const devicePath = deviceOrd.split('/').slice(0, -1).join('/');
    const compPath = compOrd.split('/').slice(0, -1).join('/');
    
    if (devicePath && compPath === devicePath && comp.ord !== pointData.ord) {
      similarPoints.push({
        name: compName,
        ord: comp.ord,
        value: comp.outValue,
        status: comp.outStatus || comp.status || 'ok',
        type: comp.inferredType || 'generic',
        deviceOrd: compDeviceOrd
      });
    }
    
    if (compPath && compPath !== devicePath && !seenDevices[compPath]) {
      seenDevices[compPath] = true;
      allDevices.push({
        name: compName,
        ord: comp.ord,
        value: comp.outValue,
        status: comp.outStatus || comp.status || 'ok',
        type: comp.inferredType || 'generic',
        deviceOrd: compDeviceOrd
      });
    }
  });
  
  const limitedSimilar = similarPoints.slice(0, 10);
  const limitedDevices = allDevices.slice(0, 10);
  
  let html = '<div class="point-helper-modal" onclick="if(event.target===this)window.closePointHelper()">';
  html += '<div class="point-helper-content" onclick="event.stopPropagation()">';
  html += '<div class="point-helper-header">';
  html += '<div class="point-helper-title">🔍 ' + pointName + '</div>';
  html += '<button class="point-helper-close" onclick="window.closePointHelper()">✕ Close</button>';
  html += '</div>';
  
  if (limitedSimilar.length > 0) {
    html += '<div class="point-helper-section">';
    html += '<div class="point-helper-section-title">🔗 Similar Points (Same Device)</div>';
    limitedSimilar.forEach(function(similar) {
      const similarDataAttr = encodeURIComponent(JSON.stringify(similar));
      html += '<div class="point-helper-item" draggable="true" data-point-data="' + similarDataAttr + '" ondragstart="window.handleHelperItemDragStart(event)" ondragend="window.handleHelperItemDragEnd(event)">';
      html += '<div>' + similar.name;
      if (similar.value !== undefined && similar.value !== null) {
        html += ' <span style="color:#888;">(' + similar.value + ')</span>';
      }
      html += '</div>';
      html += '<span class="status-dot ' + (similar.status || 'ok') + '"></span>';
      html += '</div>';
    });
    html += '</div>';
  }
  
  if (limitedDevices.length > 0) {
    html += '<div class="point-helper-section">';
    html += '<div class="point-helper-section-title">🏢 Other Devices (Drag to add to cards)</div>';
    limitedDevices.forEach(function(device) {
      const deviceDataAttr = encodeURIComponent(JSON.stringify(device));
      html += '<div class="point-helper-item" draggable="true" data-point-data="' + deviceDataAttr + '" ondragstart="window.handleHelperItemDragStart(event)" ondragend="window.handleHelperItemDragEnd(event)">';
      html += '<div>' + device.name;
      if (device.value !== undefined && device.value !== null) {
        html += ' <span style="color:#888;">(' + device.value + ')</span>';
      }
      html += '</div>';
      html += '<span class="status-dot ' + (device.status || 'ok') + '"></span>';
      html += '</div>';
    });
    html += '</div>';
  }
  
  html += '</div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
};

window.closePointHelper = function() {
  const modal = document.querySelector('.point-helper-modal');
  if (modal) modal.remove();
};

