<template>
  <div class="card-expanded-content">
    <!-- Graphics Section -->
    <ExpandableSection
      v-if="hasGraphics"
      title="📊 Graphic"
      :expanded="true"
      :count="null"
    >
      <div class="graphics-section">
        <p class="coming-soon">Graphics feature coming soon...</p>
      </div>
    </ExpandableSection>

    <!-- Setpoints Section -->
    <ExpandableSection
      v-if="setpoints.length > 0"
      title="🎯 Setpoints"
      :expanded="expandedSections.setpoints"
      :count="setpoints.length"
      @toggle="expandedSections.setpoints = !expandedSections.setpoints"
    >
      <div class="points-grid">
        <PointItem
          v-for="point in displayedSetpoints"
          :key="point.id"
          :point="point"
          :points="points"
          :alarms="alarms"
          @click="$emit('point-click', point)"
        />
      </div>
      <button 
        v-if="setpoints.length > 3 && !showAllSetpoints" 
        @click="showAllSetpoints = true"
        class="show-more-compact"
      >
        + {{ setpoints.length - 3 }} more
      </button>
    </ExpandableSection>

    <!-- Sensors Section -->
    <ExpandableSection
      v-if="sensors.length > 0"
      title="📡 Sensors"
      :expanded="expandedSections.sensors"
      :count="sensors.length"
      @toggle="expandedSections.sensors = !expandedSections.sensors"
    >
      <div class="points-grid">
        <PointItem
          v-for="point in displayedSensors"
          :key="point.id"
          :point="point"
          :points="points"
          :alarms="alarms"
          @click="$emit('point-click', point)"
        />
      </div>
      <button 
        v-if="sensors.length > 5 && !showAllSensors" 
        @click="showAllSensors = true"
        class="show-more-compact"
      >
        + {{ sensors.length - 5 }} more
      </button>
    </ExpandableSection>

    <!-- Config Points Section -->
    <ExpandableSection
      v-if="configPoints.length > 0"
      title="⚙️ Configuration"
      :expanded="expandedSections.config"
      :count="configPoints.length"
      @toggle="expandedSections.config = !expandedSections.config"
    >
      <div class="points-grid">
        <PointItem
          v-for="point in displayedConfigPoints"
          :key="point.id"
          :point="point"
          :points="points"
          :alarms="alarms"
          @click="$emit('point-click', point)"
        />
      </div>
      <button 
        v-if="configPoints.length > 5 && !showAllConfig" 
        @click="showAllConfig = true"
        class="show-more-compact"
      >
        + {{ configPoints.length - 5 }} more
      </button>
    </ExpandableSection>

    <!-- Schedule Section -->
    <ExpandableSection
      v-if="hasSchedule"
      title="📅 Schedule"
      :expanded="expandedSections.schedule"
      :count="null"
      @toggle="expandedSections.schedule = !expandedSections.schedule"
    >
      <div class="schedule-section">
        <p class="coming-soon">Schedule feature coming soon...</p>
      </div>
    </ExpandableSection>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ExpandableSection from './ExpandableSection.vue'
import PointItem from './PointItem.vue'

const props = defineProps({
  points: {
    type: Object,
    required: true
  },
  alarms: {
    type: Object,
    required: true
  },
  equipment: {
    type: Object,
    required: true
  }
})

defineEmits(['point-click'])

// Expanded section states (all collapsed initially for Tesla-style progressive disclosure)
const expandedSections = ref({
  setpoints: true,  // Setpoints visible by default as they're most important
  sensors: false,
  config: false,
  schedule: false
})

// Show all toggles
const showAllSetpoints = ref(false)
const showAllSensors = ref(false)
const showAllConfig = ref(false)

// Feature flags
const hasGraphics = computed(() => false) // Will be enabled later
const hasSchedule = computed(() => false) // Will be enabled later

// Categorize points based on BQL facets and properties
const setpoints = computed(() => {
  return props.points.points.value.filter(point => isSetpoint(point))
})

const sensors = computed(() => {
  const allPoints = props.points.points.value
  const setpointIds = new Set(setpoints.value.map(p => p.id))
  
  return allPoints.filter(point => 
    !setpointIds.has(point.id) &&
    !isConfigPoint(point)
  )
})

const configPoints = computed(() => {
  const allPoints = props.points.points.value
  const setpointIds = new Set(setpoints.value.map(p => p.id))
  
  return allPoints.filter(point => 
    !setpointIds.has(point.id) &&
    isConfigPoint(point)
  )
})

// Check if point is a setpoint (writable control point)
function isSetpoint(point) {
  // Check writable flag first
  if (point.writable || point.isSetpoint) return true
  
  // Check facets from BQL discovery
  if (point.facets) {
    const facetsStr = Array.isArray(point.facets) ? point.facets.join(',').toLowerCase() : point.facets.toString().toLowerCase()
    if (facetsStr.includes('writable') || facetsStr.includes('setpoint')) return true
  }
  
  // Check type
  const type = point.type?.toLowerCase() || ''
  if (type.includes('setpoint')) return true
  
  // Check name patterns
  const name = point.name?.toLowerCase() || ''
  return name.includes('setpoint') || name.includes(' sp') || name.endsWith('sp')
}

function isConfigPoint(point) {
  // Check facets first - most reliable
  if (point.facets) {
    const facetsStr = Array.isArray(point.facets) ? point.facets.join(',').toLowerCase() : point.facets.toString().toLowerCase()
    if (facetsStr.includes('enum') || facetsStr.includes('boolean') || facetsStr.includes('bool')) return true
  }
  
  // Check type
  const type = point.type?.toLowerCase() || ''
  if (type.includes('bool') || type.includes('enum') || type.includes('mode')) return true
  
  // Check name patterns
  const name = point.name?.toLowerCase() || ''
  return name.includes('config') ||
         name.includes('enable') ||
         name.includes('disable') ||
         name.includes('mode') ||
         name.includes('option') ||
         name.includes('setting')
}

// Display limits
const displayedSetpoints = computed(() => 
  showAllSetpoints.value ? setpoints.value : setpoints.value.slice(0, 3)
)

const displayedSensors = computed(() => 
  showAllSensors.value ? sensors.value : sensors.value.slice(0, 5)
)

const displayedConfigPoints = computed(() => 
  showAllConfig.value ? configPoints.value : configPoints.value.slice(0, 5)
)
</script>

<style scoped>
.card-expanded-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.points-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.show-more-compact {
  width: 100%;
  padding: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  background: var(--color-background-secondary);
  border: 1px dashed var(--color-border);
  border-radius: var(--border-radius);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.show-more-compact:hover {
  background: var(--color-background-tertiary);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.graphics-section,
.schedule-section {
  padding: var(--spacing-md);
  text-align: center;
}

.coming-soon {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  font-style: italic;
}
</style>

