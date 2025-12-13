<template>
  <div class="point-device-value">
    <div class="device-value-label">Current Value <span v-if="hasLiveData" class="live-indicator">● LIVE</span></div>
    <div class="device-value-display">
      <span class="value">{{ displayValue }}</span>
      <span v-if="unit" class="unit">{{ unit }}</span>
    </div>
    <div class="device-status-note">
      Point-device • Status: {{ displayStatus }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  displayValue: {
    type: String,
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
