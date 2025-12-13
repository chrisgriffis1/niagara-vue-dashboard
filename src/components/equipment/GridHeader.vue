<template>
  <div class="grid-header">
    <div class="header-info">
      <h2>Equipment Overview</h2>
      <p class="equipment-count">
        {{ equipmentCount }} {{ equipmentCount === 1 ? 'device' : 'devices' }}
        <span v-if="hasFilters" class="filter-indicator">
          (filtered)
        </span>
      </p>
    </div>
    <div class="header-actions">
      <button
        v-if="showFilterButton"
        @click="$emit('toggle-filter')"
        class="filter-btn"
      >
        {{ showFilter ? 'Hide Filters' : 'Filter' }}
      </button>
      <button @click="$emit('refresh')" :disabled="loading">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
      <button @click="$emit('force-refresh')" :disabled="loading" class="force-refresh-btn" title="Clear cache and reload all data">
        🔄 Force Refresh
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  equipmentCount: {
    type: Number,
    required: true
  },
  hasFilters: {
    type: Boolean,
    required: true
  },
  showFilter: {
    type: Boolean,
    required: true
  },
  loading: {
    type: Boolean,
    required: true
  },
  showFilterButton: {
    type: Boolean,
    default: true
  }
})

defineEmits(['toggle-filter', 'refresh', 'force-refresh'])
</script>

<style scoped>
.grid-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}

.header-info h2 {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
}

.equipment-count {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

.filter-indicator {
  color: var(--color-accent);
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.filter-btn,
.force-refresh-btn {
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.filter-btn:hover,
.force-refresh-btn:hover {
  background: var(--color-background-tertiary);
  border-color: var(--color-accent);
}

.force-refresh-btn {
  background: var(--color-warning);
  color: var(--color-bg-primary);
  border-color: var(--color-warning);
}

.force-refresh-btn:hover {
  background: #d97706;
  border-color: #d97706;
}

.force-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.header-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
