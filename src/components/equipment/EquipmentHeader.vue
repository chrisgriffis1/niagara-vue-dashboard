<template>
  <div class="equipment-header">
    <div class="equipment-info">
      <h3>{{ equipment.name }}</h3>
      <div class="equipment-meta">
        <span class="equipment-type">{{ equipment.type }}</span>
        <span class="equipment-location">{{ equipment.zone || equipment.location }}</span>
      </div>
    </div>
    <span class="status-dot" :class="statusClass"></span>
  </div>
</template>

<script setup>
defineProps({
  equipment: {
    type: Object,
    required: true
  },
  statusClass: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.equipment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-lg);
}

.equipment-info h3 {
  margin: 0 0 var(--spacing-xs) 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.equipment-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}

.status-dot.ok {
  background: var(--color-success);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
}

.status-dot.warning {
  background: var(--color-warning);
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.status-dot.error {
  background: var(--color-error);
  box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
}
</style>
