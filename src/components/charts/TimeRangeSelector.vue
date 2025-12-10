<template>
  <div class="time-range-selector">
    <div class="selector-header">
      <h4>📅 Time Range</h4>
      <span class="selected-range">{{ selectedRangeLabel }}</span>
    </div>

    <!-- Quick Range Buttons -->
    <div class="quick-ranges">
      <button
        v-for="range in quickRanges"
        :key="range.value"
        :class="['range-btn', { active: selectedRange === range.value }]"
        @click="selectQuickRange(range.value)"
        :title="range.description"
      >
        {{ range.label }}
      </button>
    </div>

    <!-- Custom Range -->
    <div class="custom-range">
      <button 
        @click="showCustomPicker = !showCustomPicker"
        class="custom-btn"
      >
        🗓 Custom Range
      </button>
    </div>

    <!-- Custom Date/Time Picker -->
    <div v-if="showCustomPicker" class="custom-picker card">
      <div class="picker-row">
        <label>Start Date/Time</label>
        <input 
          v-model="customStart" 
          type="datetime-local" 
          class="datetime-input"
        />
      </div>
      <div class="picker-row">
        <label>End Date/Time</label>
        <input 
          v-model="customEnd" 
          type="datetime-local" 
          class="datetime-input"
        />
      </div>
      <div class="picker-actions">
        <button @click="applyCustomRange" class="primary">
          Apply
        </button>
        <button @click="showCustomPicker = false">
          Cancel
        </button>
      </div>
    </div>

    <!-- Alarm Context Range (if alarm is provided) -->
    <div v-if="alarmTimestamp" class="alarm-context">
      <button 
        v-for="context in alarmContextRanges"
        :key="context.value"
        :class="['context-btn', { active: selectedRange === context.value }]"
        @click="selectAlarmContext(context.value)"
      >
        {{ context.label }}
      </button>
    </div>

    <!-- Time Slider (for scrubbing) -->
    <div v-if="enableSlider && timeRange" class="time-slider">
      <label>Time Window Position</label>
      <input 
        v-model="sliderPosition" 
        type="range" 
        min="0" 
        :max="maxSliderPosition"
        class="slider"
        @input="handleSliderChange"
      />
      <div class="slider-labels">
        <span>{{ formatDateTime(currentWindowStart) }}</span>
        <span>{{ formatDateTime(currentWindowEnd) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * TimeRangeSelector Component
 * Comprehensive time range selection for trending
 * Supports quick ranges, custom ranges, alarm context, and time scrubbing
 */

import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ start: null, end: null })
  },
  alarmTimestamp: {
    type: Date,
    default: null
  },
  enableSlider: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'range-changed'])

const selectedRange = ref('24h')
const showCustomPicker = ref(false)
const customStart = ref('')
const customEnd = ref('')
const sliderPosition = ref(0)

// Quick range presets
const quickRanges = [
  { value: '15sec', label: '15 sec', description: 'Last 15 seconds', seconds: 15 },
  { value: '1min', label: '1 min', description: 'Last minute', seconds: 60 },
  { value: '5min', label: '5 min', description: 'Last 5 minutes', seconds: 300 },
  { value: '15min', label: '15 min', description: 'Last 15 minutes', seconds: 900 },
  { value: '1h', label: '1 hour', description: 'Last hour', seconds: 3600 },
  { value: '4h', label: '4 hours', description: 'Last 4 hours', seconds: 14400 },
  { value: '12h', label: '12 hours', description: 'Last 12 hours', seconds: 43200 },
  { value: '24h', label: '24 hours', description: 'Last 24 hours', seconds: 86400 },
  { value: 'today', label: 'Today', description: 'Today (midnight to now)' },
  { value: 'yesterday', label: 'Yesterday', description: 'Yesterday (full day)' },
  { value: 'week', label: 'This Week', description: 'Current week' },
  { value: 'lastweek', label: 'Last Week', description: 'Previous week' },
  { value: 'month', label: 'This Month', description: 'Current month' },
  { value: 'ytd', label: 'YTD', description: 'Year to date' }
]

// Alarm context ranges (before/after alarm)
const alarmContextRanges = [
  { value: 'alarm_15sec', label: '±15 sec', seconds: 15 },
  { value: 'alarm_1min', label: '±1 min', seconds: 60 },
  { value: 'alarm_5min', label: '±5 min', seconds: 300 },
  { value: 'alarm_15min', label: '±15 min', seconds: 900 },
  { value: 'alarm_1h', label: '±1 hour', seconds: 3600 },
  { value: 'alarm_4h', label: '±4 hours', seconds: 14400 }
]

const selectedRangeLabel = computed(() => {
  const range = quickRanges.find(r => r.value === selectedRange.value)
  if (range) return range.label
  
  const alarmRange = alarmContextRanges.find(r => r.value === selectedRange.value)
  if (alarmRange) return `Alarm ${alarmRange.label}`
  
  if (selectedRange.value === 'custom') return 'Custom Range'
  return 'Unknown'
})

// Calculate time range based on selection
const timeRange = computed(() => {
  const now = new Date()
  const range = quickRanges.find(r => r.value === selectedRange.value)
  
  if (range?.seconds) {
    return {
      start: new Date(now.getTime() - range.seconds * 1000),
      end: now
    }
  }
  
  // Handle special ranges
  switch (selectedRange.value) {
    case 'today':
      return {
        start: new Date(now.setHours(0, 0, 0, 0)),
        end: new Date()
      }
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: new Date(yesterday.setHours(0, 0, 0, 0)),
        end: new Date(yesterday.setHours(23, 59, 59, 999))
      }
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      return {
        start: new Date(weekStart.setHours(0, 0, 0, 0)),
        end: new Date()
      }
    case 'lastweek':
      const lastWeekEnd = new Date(now)
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      return {
        start: new Date(lastWeekStart.setHours(0, 0, 0, 0)),
        end: new Date(lastWeekEnd.setHours(23, 59, 59, 999))
      }
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now
      }
    case 'ytd':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      }
    default:
      return { start: null, end: null }
  }
})

// Slider for time window
const maxSliderPosition = ref(100)
const currentWindowStart = computed(() => timeRange.value?.start)
const currentWindowEnd = computed(() => timeRange.value?.end)

const selectQuickRange = (rangeValue) => {
  selectedRange.value = rangeValue
  emitChange()
}

const selectAlarmContext = (contextValue) => {
  if (!props.alarmTimestamp) return
  
  selectedRange.value = contextValue
  const context = alarmContextRanges.find(r => r.value === contextValue)
  
  if (context) {
    const alarmTime = new Date(props.alarmTimestamp)
    const offsetMs = context.seconds * 1000
    
    const range = {
      start: new Date(alarmTime.getTime() - offsetMs),
      end: new Date(alarmTime.getTime() + offsetMs)
    }
    
    emit('update:modelValue', range)
    emit('range-changed', range)
  }
}

const applyCustomRange = () => {
  if (customStart.value && customEnd.value) {
    selectedRange.value = 'custom'
    const range = {
      start: new Date(customStart.value),
      end: new Date(customEnd.value)
    }
    emit('update:modelValue', range)
    emit('range-changed', range)
    showCustomPicker.value = false
  }
}

const handleSliderChange = () => {
  // Implement time window sliding (future enhancement)
  console.log('Slider position:', sliderPosition.value)
}

const emitChange = () => {
  if (timeRange.value) {
    emit('update:modelValue', timeRange.value)
    emit('range-changed', timeRange.value)
  }
}

const formatDateTime = (date) => {
  if (!date) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Watch for changes
watch(timeRange, (newRange) => {
  if (newRange && selectedRange.value !== 'custom') {
    emit('update:modelValue', newRange)
    emit('range-changed', newRange)
  }
}, { deep: true })
</script>

<style scoped>
.time-range-selector {
  padding: var(--spacing-md);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.selector-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.selected-range {
  font-size: var(--font-size-sm);
  color: var(--color-accent-primary);
  font-weight: var(--font-weight-semibold);
}

/* Quick Ranges */
.quick-ranges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.range-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.range-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.range-btn.active {
  background-color: var(--color-accent-primary);
  border-color: var(--color-accent-primary);
  color: white;
}

/* Custom Range */
.custom-range {
  margin-bottom: var(--spacing-md);
}

.custom-btn {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  min-height: unset;
}

.custom-picker {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
}

.picker-row {
  margin-bottom: var(--spacing-md);
}

.picker-row label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.datetime-input {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-family: inherit;
}

.datetime-input:focus {
  outline: none;
  border-color: var(--color-accent-primary);
}

.picker-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.picker-actions button {
  flex: 1;
  padding: var(--spacing-sm);
  min-height: unset;
}

/* Alarm Context */
.alarm-context {
  padding: var(--spacing-md);
  background-color: rgba(239, 68, 68, 0.05);
  border: 1px dashed var(--color-error);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.context-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
  margin-right: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.context-btn:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-text-primary);
}

.context-btn.active {
  background-color: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

/* Time Slider */
.time-slider {
  margin-top: var(--spacing-lg);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.time-slider label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.slider {
  width: 100%;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  outline: none;
  margin-bottom: var(--spacing-sm);
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-accent-primary);
  border-radius: 50%;
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--color-accent-primary);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* Mobile */
@media (max-width: 768px) {
  .quick-ranges {
    gap: var(--spacing-xs);
  }

  .range-btn {
    font-size: 10px;
    padding: 6px 8px;
  }
}
</style>

