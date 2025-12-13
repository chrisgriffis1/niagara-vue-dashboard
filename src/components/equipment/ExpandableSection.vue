<template>
  <div class="expandable-section" :class="{ 'expanded': expanded }">
    <div class="section-header" @click="$emit('toggle')">
      <div class="header-left">
        <span class="section-title">{{ title }}</span>
        <span v-if="count !== null" class="section-count">({{ count }})</span>
      </div>
      <div class="expand-icon" :class="{ 'rotated': expanded }">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </div>
    </div>
    <div v-if="expanded" class="section-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: null
  },
  expanded: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])
</script>

<style scoped>
.expandable-section {
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-primary);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.expandable-section:hover {
  border-color: var(--color-accent);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-background-secondary);
  cursor: pointer;
  user-select: none;
  transition: all var(--transition-fast);
}

.section-header:hover {
  background: var(--color-background-tertiary);
}

.section-header:active {
  transform: scale(0.98);
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.section-title {
  font-weight: 600;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.section-count {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: normal;
}

.expand-icon {
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
  display: flex;
  align-items: center;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.section-content {
  padding: var(--spacing-md);
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

