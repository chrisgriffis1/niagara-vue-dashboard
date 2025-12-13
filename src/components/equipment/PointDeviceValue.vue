<template>
  <div class="point-device-value">
    <div class="device-value-label">Current Value <span v-if="hasLiveData" class="live-indicator">● LIVE</span></div>
    <div class="device-value-display">
      <span class="value" :class="valueClass">{{ formattedValue }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div class="device-status-note">
      Point-device • Status: {{ displayStatus }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  displayValue: {
    type: [String, Number, Boolean],
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  displayStatus: {
    type: String,
    required: true
  },
  hasLiveData: {
    type: Boolean,
    required: true
  }
})

// Format the display value - make booleans more readable
const formattedValue = computed(() => {
  const val = props.displayValue
  
  // Handle boolean-like values
  if (val === true || val === 'true' || val === 'True') return 'ON'
  if (val === false || val === 'false' || val === 'False') return 'OFF'
  
  // Handle numeric values - round to reasonable precision
  if (typeof val === 'number') {
    return val % 1 === 0 ? val : val.toFixed(1)
  }
  
  return val ?? 'N/A'
})

// Add color class based on value
const valueClass = computed(() => {
  const val = props.displayValue
  if (val === true || val === 'true' || val === 'True' || val === 'ON') return 'value-on'
  if (val === false || val === 'false' || val === 'False' || val === 'OFF') return 'value-off'
  return ''
})
</script>

<style scoped>
.point-device-value {
  background: linear-gradient(135deg, var(--color-background-secondary), rgba(59, 130, 246, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.device-value-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
}

.live-indicator {
  color: var(--color-success);
  font-size: var(--font-size-xs);
  animation: pulse 2s infinite;
}

.device-value-display {
  margin-bottom: var(--spacing-md);
}

.value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.value.value-on {
  color: var(--color-success);
}

.value.value-off {
  color: var(--color-text-tertiary);
}

.unit {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin-left: var(--spacing-xs);
}

.device-status-note {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
