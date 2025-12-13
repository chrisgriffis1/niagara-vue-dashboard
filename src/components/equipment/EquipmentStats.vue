<template>
  <div class="equipment-stats">
    <div class="stat-item">
      <span class="stat-label">Points</span>
      <span class="stat-value">{{ pointCountLabel }}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Status</span>
      <span class="stat-value" :class="`status-${statusClass}`">
        {{ displayStatus }}
      </span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pointCountLabel: {
    type: [String, Number],
    required: true
  },
  statusClass: {
    type: String,
    required: true
  },
  displayStatus: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.equipment-stats {
  display: flex;
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-lg);
}

.stat-item {
  text-align: center;
  min-width: 80px;
}

.stat-label {
  display: block;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.stat-value {
  display: block;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value.status-ok {
  color: var(--color-success);
}

.stat-value.status-warning {
  color: var(--color-warning);
}

.stat-value.status-error {
  color: var(--color-error);
}
</style>
