/**
 * Mock Dataset Service
 * Manages dataset configurations and switching
 */

class MockDatasetService {
  constructor() {
    // Determine base path based on environment
    // In Vite dev mode, base is '/file/web1/', in production it's also '/file/web1/'
    // Files in public/ are served at the root in both cases
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL || '/file/web1/';

    // Dataset configuration - files are served from public/mock-data/
    this.availableDatasets = [
      { id: 'demo', name: 'Demo Data', file: `${base}mock-data/demo-site-profile.json.json` },
      { id: 'real', name: 'Real Niagara Data', file: `${base}mock-data/mock-data/firstTryNeedsWork.json` },
      { id: 'live', name: 'Live Station Export (Dec 12)', file: `${base}mock-data/mock-data/live-station-export.json` }
    ];
    this.currentDataset = 'demo'; // Default to demo, can be switched
  }

  /**
   * Add a custom dataset (e.g., from Niagara export)
   * @param {string} id - Unique ID for dataset
   * @param {string} name - Display name
   * @param {string} file - Path to JSON file in public/mock-data/
   */
  addDataset(id, name, file) {
    // Don't add duplicates
    if (this.availableDatasets.find(d => d.id === id)) {
      console.warn(`Dataset ${id} already exists, skipping`);
      return;
    }

    this.availableDatasets.push({ id, name, file });
    console.log(`✅ Added dataset: ${name} (${id})`);
  }

  /**
   * Get available datasets
   */
  getAvailableDatasets() {
    return this.availableDatasets;
  }

  /**
   * Switch to a different dataset
   * @param {string} datasetId - ID of dataset to switch to
   */
  async switchDataset(datasetId) {
    const dataset = this.availableDatasets.find(d => d.id === datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found. Available: ${this.availableDatasets.map(d => d.id).join(', ')}`);
    }

    console.log(`🔄 Switching to dataset: ${dataset.name}`);
    this.currentDataset = datasetId;

    // Return dataset info for loading
    return dataset;
  }

  /**
   * Get current dataset info
   */
  getCurrentDataset() {
    const dataset = this.availableDatasets.find(d => d.id === this.currentDataset);
    return dataset || this.availableDatasets[0];
  }

  /**
   * Get current dataset ID
   */
  getCurrentDatasetId() {
    return this.currentDataset;
  }
}

export default MockDatasetService;
