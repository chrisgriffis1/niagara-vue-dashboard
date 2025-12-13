<template>
  <div v-if="showFilter" class="filter-section card">
    <!-- Equipment Type Filter -->
    <div class="filter-group">
      <label>Equipment Type</label>
      <div class="filter-chips">
        <button
          :class="['chip', { active: selectedType === null }]"
          @click="$emit('update:selectedType', null)"
        >
          All ({{ totalCount }})
        </button>
        <button
          v-for="type in equipmentTypes"
          :key="type"
          :class="['chip', { active: selectedType === type }]"
          @click="$emit('update:selectedType', type)"
        >
          {{ type }} ({{ getTypeCount(type) }})
        </button>
      </div>
    </div>

    <!-- Location/Zone Filter -->
    <div class="filter-group">
      <label>Location / Zone</label>
      <div class="filter-chips">
        <button
          :class="['chip', { active: selectedLocation === null }]"
          @click="$emit('update:selectedLocation', null)"
        >
          All Locations
        </button>
        <button
          v-for="location in equipmentLocations"
          :key="location"
          :class="['chip', { active: selectedLocation === location }]"
          @click="$emit('update:selectedLocation', location)"
        >
          {{ location }} ({{ getLocationCount(location) }})
        </button>
      </div>
    </div>

    <!-- Alarm Filter -->
    <div class="filter-group">
      <label>Alarm & Status</label>
      <div class="filter-chips">
        <button
          :class="['chip', { active: selectedAlarmFilter === null || selectedAlarmFilter === 'all' }]"
          @click="$emit('update:selectedAlarmFilter', null)"
        >
          All Equipment
        </button>
        <button
          :class="['chip alarm-chip', { active: selectedAlarmFilter === 'with-alarms' }]"
          @click="$emit('update:selectedAlarmFilter', 'with-alarms')"
        >
          🔔 With Alarms ({{ getAlarmCount('with-alarms') }})
        </button>
        <button
          v-if="getAlarmCount('critical') > 0"
          :class="['chip alarm-chip critical', { active: selectedAlarmFilter === 'critical' }]"
          @click="$emit('update:selectedAlarmFilter', 'critical')"
        >
          ⚠ Critical ({{ getAlarmCount('critical') }})
        </button>
        <button
          v-if="getAlarmCount('high') > 0"
          :class="['chip alarm-chip high', { active: selectedAlarmFilter === 'high' }]"
          @click="$emit('update:selectedAlarmFilter', 'high')"
        >
          ⚡ High ({{ getAlarmCount('high') }})
        </button>
        <button
          v-if="getAlarmCount('medium') > 0"
          :class="['chip alarm-chip medium', { active: selectedAlarmFilter === 'medium' }]"
          @click="$emit('update:selectedAlarmFilter', 'medium')"
        >
          ℹ Medium ({{ getAlarmCount('medium') }})
        </button>
        <button
          v-if="getAlarmCount('warning') > 0"
          :class="['chip alarm-chip warning', { active: selectedAlarmFilter === 'warning' }]"
          @click="$emit('update:selectedAlarmFilter', 'warning')"
        >
          ⚠ Warning ({{ getAlarmCount('warning') }})
        </button>
      </div>
    </div>

    <!-- Advanced Filters -->
    <div class="filter-group advanced-filters">
      <button
        @click="$emit('update:showAdvancedFilters', !showAdvancedFilters)"
        class="advanced-toggle"
      >
        {{ showAdvancedFilters ? '▼' : '▶' }} Advanced Filters
      </button>

      <div v-if="showAdvancedFilters" class="advanced-content">
        <!-- Communication Status -->
        <div class="filter-subgroup">
          <label>Communication Status</label>
          <div class="filter-chips small">
            <button
              :class="['chip', { active: selectedCommunicationStatus === null }]"
              @click="$emit('update:selectedCommunicationStatus', null)"
            >
              Any
            </button>
            <button
              :class="['chip', { active: selectedCommunicationStatus === 'online' }]"
              @click="$emit('update:selectedCommunicationStatus', 'online')"
            >
              🟢 Online
            </button>
            <button
              :class="['chip', { active: selectedCommunicationStatus === 'offline' }]"
              @click="$emit('update:selectedCommunicationStatus', 'offline')"
            >
              🔴 Offline
            </button>
            <button
              :class="['chip', { active: selectedCommunicationStatus === 'stale' }]"
              @click="$emit('update:selectedCommunicationStatus', 'stale')"
            >
              🟡 Stale
            </button>
          </div>
        </div>

        <!-- Future placeholders -->
        <div class="filter-subgroup">
          <label>Override Status</label>
          <div class="filter-chips small">
            <button class="chip disabled">Coming Soon</button>
          </div>
        </div>

        <div class="filter-subgroup">
          <label>Operating Mode</label>
          <div class="filter-chips small">
            <button class="chip disabled">Coming Soon</button>
          </div>
        </div>

        <div class="filter-subgroup">
          <label>Occupancy Status</label>
          <div class="filter-chips small">
            <button class="chip disabled">Coming Soon</button>
          </div>
        </div>

        <div class="filter-subgroup">
          <label>Running Status</label>
          <div class="filter-chips small">
            <button class="chip disabled">Coming Soon</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Clear Filters -->
    <div v-if="hasActiveFilters" class="filter-actions">
      <button @click="$emit('clear-filters')" class="clear-filters-btn">
        🗑️ Clear All Filters
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  showFilter: {
    type: Boolean,
    required: true
  },
  selectedType: {
    type: [String, null],
    default: null
  },
  selectedLocation: {
    type: [String, null],
    default: null
  },
  selectedAlarmFilter: {
    type: [String, null],
    default: null
  },
  showAdvancedFilters: {
    type: Boolean,
    default: false
  },
  selectedCommunicationStatus: {
    type: [String, null],
    default: null
  },
  equipmentTypes: {
    type: Array,
    required: true
  },
  equipmentLocations: {
    type: Array,
    required: true
  },
  totalCount: {
    type: Number,
    required: true
  },
  hasActiveFilters: {
    type: Boolean,
    required: true
  },
  getTypeCount: {
    type: Function,
    required: true
  },
  getLocationCount: {
    type: Function,
    required: true
  },
  getAlarmCount: {
    type: Function,
    required: true
  }
})

defineEmits([
  'update:selectedType',
  'update:selectedLocation',
  'update:selectedAlarmFilter',
  'update:showAdvancedFilters',
  'update:selectedCommunicationStatus',
  'clear-filters'
])
</script>

<style scoped>
.filter-section {
  margin-bottom: var(--spacing-xl);
  padding: var(--spacing-lg);
}

.filter-group {
  margin-bottom: var(--spacing-lg);
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.filter-chips.small .chip {
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.chip {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 20px;
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.chip:hover {
  background: var(--color-background-tertiary);
  border-color: var(--color-accent);
}

.chip.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.chip.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alarm-chip {
  position: relative;
}

.alarm-chip.critical {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}

.alarm-chip.high {
  background: var(--color-warning);
  color: var(--color-bg-primary);
  border-color: var(--color-warning);
}

.alarm-chip.medium {
  background: #f59e0b;
  color: white;
  border-color: #f59e0b;
}

.alarm-chip.warning {
  background: #eab308;
  color: var(--color-bg-primary);
  border-color: #eab308;
}

.advanced-filters {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
}

.advanced-toggle {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  width: 100%;
  text-align: left;
  transition: all var(--transition-fast);
}

.advanced-toggle:hover {
  background: var(--color-background-tertiary);
  border-color: var(--color-accent);
}

.advanced-content {
  margin-top: var(--spacing-md);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-lg);
}

.filter-subgroup {
  margin-bottom: var(--spacing-md);
}

.filter-actions {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-lg);
  text-align: center;
}

.clear-filters-btn {
  background: var(--color-error);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.clear-filters-btn:hover {
  background: #dc2626;
}
</style>
