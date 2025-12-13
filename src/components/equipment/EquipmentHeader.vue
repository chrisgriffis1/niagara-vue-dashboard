<template>
  <div class="equipment-header">
    <div class="equipment-info">
      <div class="header-title-row">
        <h3>{{ equipment.name }}</h3>
        <span v-if="!editMode" class="expand-hint" :class="{ 'expanded': isExpanded }">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </span>
      </div>
      <div class="equipment-meta">
        <span class="equipment-type">{{ equipment.type }}</span>
        <span class="equipment-location">{{ equipment.zone || equipment.location }}</span>
      </div>
    </div>
    <div class="header-actions">
      <button 
        @click.stop="$emit('toggle-edit-mode')"
        class="edit-btn"
        :class="{ active: editMode }"
        :title="editMode ? 'Exit Edit Mode' : 'Edit Card'"
      >
        {{ editMode ? '✓' : '✏️' }}
      </button>
      <span class="status-dot" :class="statusClass"></span>
    </div>
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
  },
  editMode: {
    type: Boolean,
    default: false
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-edit-mode'])
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

.header-title-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.expand-hint {
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast), color var(--transition-fast);
  display: flex;
  align-items: center;
  opacity: 0.5;
}

.expand-hint.expanded {
  transform: rotate(180deg);
  opacity: 1;
}

.equipment-header:hover .expand-hint {
  opacity: 1;
  color: var(--color-accent);
}

.equipment-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.edit-btn {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.edit-btn:hover {
  background: var(--color-bg-hover);
  color: var(--color-text-primary);
  border-color: var(--color-accent-primary);
}

.edit-btn.active {
  background: var(--color-accent-primary);
  color: white;
  border-color: var(--color-accent-primary);
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
