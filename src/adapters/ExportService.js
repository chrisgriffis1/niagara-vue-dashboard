/* @noSnoop */
/**
 * Export Service for Niagara BQL Adapter
 * Handles data export functionality for local testing
 */

class ExportService {
  constructor(adapter) {
    this.adapter = adapter; // Reference to main adapter
  }

  /**
   * Export ALL data for local testing (equipment, points, alarms, histories)
   */
  async exportForLocalTesting() {
    console.log('📦 Exporting data for local testing...');

    if (!this.adapter.initialized) {
      await this.adapter.initialize();
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      stationName: 'Niagara Station Export',
      equipment: this.adapter.equipment.map(equip => ({
        ...equip,
        points: this.adapter.equipmentPointsMap.get(equip.id) || []
      })),
      alarms: this.adapter.alarms,
      zones: this.adapter.zones,
      historyIdCache: Array.from(this.adapter.historyIdCache.entries())
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);

    try {
      // Try to download directly
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niagara-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ Data exported successfully');
      alert('✅ Export complete! Check your downloads folder.');
    } catch (downloadError) {
      console.warn('⚠️ Direct download failed, trying alternatives...');

      // Fallback: Open in new tab
      try {
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);
        window.open(dataUrl, '_blank');
        alert('📋 Export opened in new tab. Copy and save as JSON file.');
      } catch (tabError) {
        // Final fallback: Copy to clipboard
        try {
          navigator.clipboard.writeText(jsonString).then(() => {
            alert('📋 Data copied to clipboard! Paste into a JSON file.');
          });
        } catch (clipboardError) {
          // Last resort: Log to console
          console.log('📋 Export data:', jsonString);
          alert('❌ All export methods failed. Check console for JSON data.');
        }
      }
    }

    // Store for console access
    if (typeof window !== 'undefined') {
      window.lastExport = exportData;
      console.log('💡 Access exported data: window.lastExport');
    }
  }
}

export default ExportService;