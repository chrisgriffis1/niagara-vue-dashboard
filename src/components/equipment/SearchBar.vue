<template>
  <div class="search-section">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        @keydown.esc="clearSearch"
        ref="searchInput"
      />
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-search"
        title="Clear search"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search equipment by name, type, or location... (Press / to focus)'
  }
})

const emit = defineEmits(['update:modelValue', 'clear'])

const searchInput = ref(null)

// Reactive search query
const searchQuery = ref(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  searchQuery.value = newValue
})

// Watch for internal changes and emit
watch(searchQuery, (newValue) => {
  emit('update:modelValue', newValue)
})

const clearSearch = () => {
  searchQuery.value = ''
  emit('clear')
  searchInput.value?.focus()
}

// Global keyboard shortcut for search
const handleKeydown = (event) => {
  if (event.key === '/' && event.target.tagName !== 'INPUT') {
    event.preventDefault()
    searchInput.value?.focus()
  }
}

// Add global listener
document.addEventListener('keydown', handleKeydown)

// Cleanup
const cleanup = () => {
  document.removeEventListener('keydown', handleKeydown)
}

defineExpose({ clearSearch, cleanup })
</script>

<style scoped>
.search-section {
  margin-bottom: var(--spacing-lg);
}

.search-box {
  position: relative;
  max-width: 600px;
}

.search-icon {
  position: absolute;
  left: var(--spacing-md);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: var(--spacing-md) var(--spacing-xl) var(--spacing-md) calc(var(--spacing-xl) + var(--spacing-lg));
  border: 2px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.clear-search {
  position: absolute;
  right: var(--spacing-sm);
  top: 50%;
  transform: translateY(-50%);
  background: var(--color-background-secondary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  transition: all var(--transition-fast);
}

.clear-search:hover {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}
</style>
