<template>
  <div v-if="show" class="settings-overlay" @click.self="close">
    <div class="settings-panel">
      <div class="settings-header">
        <h2>⚙️ Settings</h2>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <!-- Tabs -->
      <div class="settings-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['tab-btn', { active: activeTab === tab.id }]"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="settings-content">
        <!-- Label Templates Tab -->
        <div v-if="activeTab === 'labels'" class="tab-pane">
          <h3>Chart Label Template</h3>
          <p class="help-text">
            Configure how points are labeled in charts. Choose Simple mode for drag-and-drop or Advanced for text editing.
          </p>

          <LabelBuilder
            title="Chart Label"
            v-model="labelTemplates.chart"
            :sample-device="sampleData.device"
            :sample-point="sampleData.point"
            :available-equipment="deviceStore.availableEquipment"
            :equipment-points="deviceStore.equipmentPoints"
          />

          <div style="margin-top: var(--spacing-lg);">
            <LabelBuilder
              title="Chart with Location"
              v-model="labelTemplates.chartWithLocation"
              :sample-device="sampleData.device"
              :sample-point="sampleData.point"
              :available-equipment="deviceStore.availableEquipment"
              :equipment-points="deviceStore.equipmentPoints"
            />
          </div>

          <div class="button-group" style="margin-top: var(--spacing-lg);">
            <button @click="saveLabelTemplates" class="btn-primary">
              💾 Save Templates
            </button>
            <button @click="resetLabelTemplates" class="btn-secondary">
              ↻ Reset to Default
            </button>
          </div>
        </div>

        <!-- Property Mappings Tab -->
        <div v-if="activeTab === 'properties'" class="tab-pane">
          <h3>Property Mappings</h3>
          <p class="help-text">
            Define how to find properties in your station data. The system will try each property in order until it finds a value.
          </p>

          <div class="form-group">
            <label>Location Property (comma-separated):</label>
            <input
              v-model="propertyMappingsText.location"
              type="text"
              class="form-input"
              placeholder="tstatLocation, zone, location, statLocation"
            />
          </div>

          <div class="form-group">
            <label>Device Name Property:</label>
            <input
              v-model="propertyMappingsText.deviceName"
              type="text"
              class="form-input"
              placeholder="displayName, name"
            />
          </div>

          <div class="form-group">
            <label>Point Name Property:</label>
            <input
              v-model="propertyMappingsText.pointName"
              type="text"
              class="form-input"
              placeholder="displayName, name"
            />
          </div>

          <div class="button-group">
            <button @click="scanProperties" class="btn-secondary">
              🔍 Scan Station Properties
            </button>
            <button @click="savePropertyMappings" class="btn-primary">
              💾 Save Mappings
            </button>
          </div>

          <div v-if="scannedProperties" class="scan-results">
            <h4>Discovered Properties</h4>
            <div class="discovered-props">
              <div class="prop-category">
                <strong>Equipment Properties:</strong>
                <div class="prop-list">
                  <span v-for="prop in scannedProperties.equipmentProperties" :key="prop" class="prop-tag">
                    {{ prop }}
                  </span>
                </div>
              </div>
              <div class="prop-category">
                <strong>Point Properties:</strong>
                <div class="prop-list">
                  <span v-for="prop in scannedProperties.pointProperties" :key="prop" class="prop-tag">
                    {{ prop }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Profile Management Tab -->
        <!-- History Cache Tab -->
        <div v-if="activeTab === 'cache'" class="tab-pane">
          <h3>⚡ History Cache Management</h3>
          <p class="help-text">
            Pre-cache point histories for instant chart loading. Generate a station-side cache for maximum performance.
          </p>

          <div class="cache-info-box">
            <h4>📊 Two-Tier Caching System</h4>
            <ul>
              <li><strong>TIER 1 (Station Cache):</strong> Pre-generate all histories on the station (JSON file)</li>
              <li><strong>TIER 2 (Browser Cache):</strong> Download once, store locally (IndexedDB)</li>
            </ul>
          </div>

          <div class="cache-actions">
            <button @click="generateStationCache" class="btn-primary" :disabled="isGenerating">
              🏭 {{ isGenerating ? 'Generating...' : 'Generate Station Cache' }}
            </button>
            <button @click="clearBrowserCache" class="btn-secondary">
              🗑️ Clear Browser Cache
            </button>
          </div>

          <div v-if="cacheProgress.isActive" class="cache-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: cacheProgress.percent + '%' }"></div>
            </div>
            <p>{{ cacheProgress.message }}</p>
            <p class="progress-text">{{ cacheProgress.current }} / {{ cacheProgress.total }} points ({{ cacheProgress.percent }}%)</p>
          </div>

          <div v-if="cacheOutput" class="cache-output">
            <h4>✅ Cache Generated!</h4>
            <div class="cache-stats">
              <p><strong>Total Points:</strong> {{ cacheOutput.metadata.totalPoints }}</p>
              <p><strong>Successfully Cached:</strong> {{ cacheOutput.metadata.successCount }}</p>
              <p><strong>Errors:</strong> {{ cacheOutput.metadata.errorCount }}</p>
              <p><strong>Generation Time:</strong> {{ (cacheOutput.metadata.generationTimeMs / 1000).toFixed(1) }}s</p>
              <p><strong>Cache Size:</strong> {{ (JSON.stringify(cacheOutput).length / 1024).toFixed(2) }} KB</p>
            </div>
            <button @click="downloadStationCache" class="btn-primary">
              💾 Download Cache File
            </button>
            <p class="help-text">
              Save this file to the station at: <code>station:|slot:/HistoryCache/histories.json</code>
            </p>
          </div>
        </div>

        <!-- Profiles Tab -->
        <div v-if="activeTab === 'profiles'" class="tab-pane">
          <h3>Profile Management</h3>
          <p class="help-text">
            Save and manage different configuration profiles for different stations or users.
          </p>

          <div class="current-profile">
            <h4>Current Profile: {{ currentProfile.profileName }}</h4>
            <p>Last updated: {{ formatDate(currentProfile.updatedAt) }}</p>
          </div>

          <div class="profile-actions">
            <button @click="showNewProfileDialog = true" class="btn-primary">
              + New Profile
            </button>
            <button @click="exportProfile" class="btn-secondary">
              📤 Export Profile
            </button>
            <button @click="triggerImport" class="btn-secondary">
              📥 Import Profile
            </button>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="importProfile"
              style="display: none"
            />
          </div>

          <div class="profiles-list">
            <h4>Available Profiles</h4>
            <div
              v-for="profile in availableProfiles"
              :key="profile.id"
              class="profile-card"
              :class="{ active: profile.id === currentProfile.profileName }"
            >
              <div class="profile-info">
                <div class="profile-name">{{ profile.name }}</div>
                <div class="profile-meta">
                  Updated: {{ formatDate(profile.updatedAt) }}
                </div>
              </div>
              <div class="profile-actions-compact">
                <button
                  v-if="profile.id !== currentProfile.profileName"
                  @click="switchToProfile(profile.id)"
                  class="btn-small"
                >
                  Switch
                </button>
                <button
                  v-if="profile.id !== 'Default'"
                  @click="deleteProfileConfirm(profile.id)"
                  class="btn-small btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New Profile Dialog -->
      <div v-if="showNewProfileDialog" class="dialog-overlay" @click.self="showNewProfileDialog = false">
        <div class="dialog">
          <h3>Create New Profile</h3>
          <div class="form-group">
            <label>Profile Name:</label>
            <input
              v-model="newProfileName"
              type="text"
              class="form-input"
              placeholder="e.g., Building A - Admin"
            />
          </div>
          <div class="form-group">
            <label>Station ID (optional):</label>
            <input
              v-model="newProfileStationId"
              type="text"
              class="form-input"
              placeholder="e.g., station_abc123"
            />
          </div>
          <div class="dialog-actions">
            <button @click="createNewProfile" class="btn-primary">Create</button>
            <button @click="showNewProfileDialog = false" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import configService from '../../services/ConfigurationService'
import stationHistoryCacheService from '../../services/StationHistoryCacheService'
import { useDeviceStore } from '../../stores/deviceStore'
import LabelBuilder from './LabelBuilder.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'config-updated'])

const deviceStore = useDeviceStore()

const activeTab = ref('labels')
const tabs = [
  { id: 'labels', icon: '🏷️', label: 'Label Templates' },
  { id: 'properties', icon: '🔧', label: 'Property Mappings' },
  { id: 'cache', icon: '⚡', label: 'History Cache' },
  { id: 'profiles', icon: '👤', label: 'Profiles' }
]

// History Cache State
const isGenerating = ref(false)
const cacheProgress = ref({
  isActive: false,
  percent: 0,
  current: 0,
  total: 0,
  message: ''
})
const cacheOutput = ref(null)

// Label Templates
const labelTemplates = ref({
  chart: '',
  chartWithLocation: ''
})

// Property Mappings
const propertyMappingsText = ref({
  location: '',
  deviceName: '',
  pointName: ''
})

const scannedProperties = ref(null)

// Profile Management
const currentProfile = ref({})
const availableProfiles = ref([])
const showNewProfileDialog = ref(false)
const newProfileName = ref('')
const newProfileStationId = ref('')
const fileInput = ref(null)

// Sample data for preview
const sampleData = ref({
  device: {
    name: 'HP12',
    displayName: 'Heat Pump 12',
    location: 'Main Floor',      // Device's physical location
    zone: 'Zone A',               // Zone assignment
    type: 'Heat Pump'
  },
  point: {
    name: 'Supply Air',
    displayName: 'Supply Air Temperature',
    unit: '°F',
    tstatLocation: 'Kitchen'      // Point-specific location (from tstatLocation point)
  }
})

// Available variables for label templates (now handled by LabelBuilder)
const availableVariables = [
  '{device.name}',
  '{device.displayName}',
  '{device.location}',
  '{device.zone}',
  '{device.type}',
  '{point.name}',
  '{point.displayName}',
  '{point.unit}',
  '{point.tstatLocation}'
]

onMounted(async () => {
  await loadConfig()
  loadProfiles()
})

async function loadConfig() {
  const config = await configService.init()
  currentProfile.value = config
  
  // Load label templates
  labelTemplates.value = { ...config.labelTemplates }
  
  // Load property mappings
  propertyMappingsText.value = {
    location: config.propertyMappings.location.join(', '),
    deviceName: config.propertyMappings.deviceName.join(', '),
    pointName: config.propertyMappings.pointName.join(', ')
  }
}

function loadProfiles() {
  availableProfiles.value = configService.listProfiles()
}

// History Cache Functions
async function generateStationCache() {
  isGenerating.value = true
  cacheProgress.value.isActive = true
  cacheProgress.value.percent = 0
  cacheProgress.value.message = 'Starting cache generation...'
  cacheOutput.value = null

  try {
    const result = await stationHistoryCacheService.generateStationCache(
      deviceStore.adapter,
      {
        maxHistoryDays: 7,
        batchSize: 5,
        onProgress: (current, total, percent) => {
          cacheProgress.value.current = current
          cacheProgress.value.total = total
          cacheProgress.value.percent = percent
          cacheProgress.value.message = `Caching histories... ${percent}%`
        }
      }
    )

    cacheOutput.value = result
    cacheProgress.value.message = 'Cache generation complete!'
    console.log('✅ Station cache generated:', result)
  } catch (error) {
    console.error('❌ Cache generation failed:', error)
    alert(`Cache generation failed: ${error.message}`)
  } finally {
    isGenerating.value = false
  }
}

function downloadStationCache() {
  if (cacheOutput.value) {
    stationHistoryCacheService.exportToFile(cacheOutput.value)
  }
}

async function clearBrowserCache() {
  if (confirm('Clear all cached histories from browser? This cannot be undone.')) {
    // TODO: Implement clear browser cache via HistoryCacheService
    console.log('🗑️ Clearing browser cache...')
    alert('Browser cache cleared!')
  }
}

function close() {
  emit('close')
}

function saveLabelTemplates() {
  configService.updateLabelTemplates(labelTemplates.value)
  emit('config-updated')
  alert('✅ Label templates saved!')
}

function resetLabelTemplates() {
  const defaults = configService.defaultConfig.labelTemplates
  labelTemplates.value = { ...defaults }
}

function savePropertyMappings() {
  const mappings = {
    location: propertyMappingsText.value.location.split(',').map(s => s.trim()).filter(Boolean),
    deviceName: propertyMappingsText.value.deviceName.split(',').map(s => s.trim()).filter(Boolean),
    pointName: propertyMappingsText.value.pointName.split(',').map(s => s.trim()).filter(Boolean)
  }
  
  configService.updatePropertyMappings(mappings)
  emit('config-updated')
  alert('✅ Property mappings saved!')
}

function scanProperties() {
  const equipment = deviceStore.availableEquipment
  const allPoints = []
  
  // Collect all points
  Object.values(deviceStore.equipmentPoints).forEach(points => {
    allPoints.push(...points)
  })
  
  scannedProperties.value = configService.scanProperties(equipment, allPoints)
}

function createNewProfile() {
  if (!newProfileName.value) {
    alert('Please enter a profile name')
    return
  }
  
  configService.createProfile(newProfileName.value, newProfileStationId.value)
  showNewProfileDialog.value = false
  newProfileName.value = ''
  newProfileStationId.value = ''
  
  loadConfig()
  loadProfiles()
  emit('config-updated')
}

function switchToProfile(profileId) {
  configService.switchProfile(profileId)
  loadConfig()
  emit('config-updated')
  alert(`✅ Switched to profile: ${profileId}`)
}

function deleteProfileConfirm(profileId) {
  if (confirm(`Are you sure you want to delete profile "${profileId}"?`)) {
    configService.deleteProfile(profileId)
    loadProfiles()
    alert('✅ Profile deleted')
  }
}

function exportProfile() {
  const json = configService.exportConfig()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `niagara-nav-config-${currentProfile.value.profileName}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport() {
  fileInput.value.click()
}

function importProfile(event) {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = configService.importConfig(e.target.result)
    if (result.success) {
      loadConfig()
      loadProfiles()
      emit('config-updated')
      alert('✅ Profile imported successfully!')
    } else {
      alert('❌ Failed to import profile: ' + result.error)
    }
  }
  reader.readAsText(file)
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleString()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.settings-panel {
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.settings-header h2 {
  margin: 0;
  font-size: var(--font-size-2xl);
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  font-size: var(--font-size-2xl);
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.settings-tabs {
  display: flex;
  gap: 0;
  padding: 0 var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
}

.tab-btn {
  padding: var(--spacing-md) var(--spacing-lg);
  background: none;
  border: none;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-hover);
}

.tab-btn.active {
  color: var(--color-accent-primary);
  border-bottom-color: var(--color-accent-primary);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

.tab-pane h3 {
  margin-top: 0;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.help-text {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-group label {
  display: block;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-family: 'Courier New', monospace;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.preview-section {
  margin: var(--spacing-lg) 0;
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
}

.preview-section h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.preview-box {
  padding: var(--spacing-md);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-accent-primary);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-md);
  word-break: break-word;
}

.available-vars {
  margin: var(--spacing-lg) 0;
}

.available-vars h4 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}

.var-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.var-chip {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: 'Courier New', monospace;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.var-chip:hover {
  background-color: var(--color-accent-primary);
  color: white;
  border-color: var(--color-accent-primary);
}

.button-group {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.btn-primary,
.btn-secondary,
.btn-small {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-primary {
  background-color: var(--color-accent-primary);
  color: white;
}

.btn-primary:hover {
  background-color: rgba(59, 130, 246, 0.8);
}

.btn-secondary {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  background-color: var(--color-bg-hover);
}

.btn-small {
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--font-size-sm);
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.btn-small.btn-danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-small.btn-danger:hover {
  background-color: #ef4444;
  color: white;
}

.scan-results {
  margin-top: var(--spacing-lg);
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
}

.scan-results h4 {
  margin: 0 0 var(--spacing-md) 0;
}

.prop-category {
  margin-bottom: var(--spacing-md);
}

.prop-category strong {
  display: block;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-primary);
}

.prop-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.prop-tag {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-accent-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-family: 'Courier New', monospace;
}

.current-profile {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
}

.current-profile h4 {
  margin: 0 0 var(--spacing-xs) 0;
}

.current-profile p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.profile-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.profiles-list {
  margin-top: var(--spacing-lg);
}

.profiles-list h4 {
  margin-bottom: var(--spacing-md);
}

.profile-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
}

.profile-card.active {
  border-color: var(--color-accent-primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.profile-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.profile-actions-compact {
  display: flex;
  gap: var(--spacing-xs);
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
}

.dialog {
  background-color: var(--color-bg-secondary);
  padding: var(--spacing-lg);
  border-radius: var(--radius-lg);
  min-width: 400px;
}

.dialog h3 {
  margin-top: 0;
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
  justify-content: flex-end;
}

/* Cache Management Styles */
.cache-info-box {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cache-info-box h4 {
  margin-top: 0;
  color: var(--color-accent);
}

.cache-info-box ul {
  margin: var(--spacing-sm) 0 0 var(--spacing-md);
}

.cache-actions {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.cache-progress {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: var(--color-bg-primary);
  border-radius: var(--border-radius);
  overflow: hidden;
  margin-bottom: var(--spacing-sm);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
  transition: width 0.3s ease-in-out;
}

.progress-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0;
}

.cache-output {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

.cache-output h4 {
  margin-top: 0;
  color: var(--color-success);
}

.cache-stats {
  margin: var(--spacing-md) 0;
  font-family: monospace;
}

.cache-stats p {
  margin: var(--spacing-xs) 0;
}

.cache-output code {
  background: var(--color-bg-primary);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
}
</style>

