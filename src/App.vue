<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Niagara Dashboard</h1>
      <div class="header-status">
        <span class="status-dot ok"></span>
        <span>System Online</span>
      </div>
    </header>

    <main class="app-main">
      <div class="welcome-card card">
        <h2>Building Automation Dashboard</h2>
        <p>Tesla-inspired interface for field technicians</p>
        <p class="status-ok">✓ Vue 3 + Vite initialized</p>
        <p class="status-ok">✓ Dark theme configured</p>
        <p class="status-ok">✓ Pinia state management ready</p>
        <p class="status-ok">✓ Chart.js installed</p>
      </div>
    </main>
  </div>
</template>

<script setup>
// Main application entry point
// Using Vue 3 Composition API
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: var(--spacing-md);
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-lg);
  border: 1px solid var(--color-border);
}

.app-header h1 {
  margin: 0;
}

.header-status {
  display: flex;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.app-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.welcome-card {
  text-align: center;
  padding: var(--spacing-2xl);
}

.welcome-card h2 {
  margin-bottom: var(--spacing-md);
}

.welcome-card p {
  margin-bottom: var(--spacing-sm);
}

@media (max-width: 768px) {
  .app-container {
    padding: var(--spacing-sm);
  }

  .app-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .welcome-card {
    padding: var(--spacing-lg);
  }
}
</style>
