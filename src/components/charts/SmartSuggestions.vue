<template>
  <div v-if="hasSuggestions" class="smart-suggestions">
    <div class="suggestions-header">
      <span class="bulb-icon">💡</span>
      <h4>Smart Suggestions</h4>
    </div>
    
    <p class="suggestions-description">
      Based on {{ equipment.name }} ({{ equipment.type }}) 
      {{ hasAlarm ? 'alarm' : 'troubleshooting' }}
    </p>

    <div class="suggestion-groups">
      <div 
        v-for="group in suggestionGroups"
        :key="group.label"
        class="suggestion-group"
      >
        <div class="group-label">{{ group.label }}</div>
        <div class="suggestion-buttons">
          <button
            v-for="pointName in group.points"
            :key="pointName"
            @click="addSuggestedPoint(pointName)"
            class="suggest-btn"
            :disabled="!canAddPoint(pointName)"
          >
            + {{ pointName }}
          </button>
        </div>
      </div>
    </div>

    <button @click="addAllSuggestions" class="add-all-btn">
      ✨ Add All Suggested Points
    </button>
  </div>
</template>

<script setup>
/**
 * SmartSuggestions Component
 * Context-aware point recommendations based on equipment type and alarms
 * Helps technicians quickly add relevant points for troubleshooting
 */

import { computed } from 'vue'

const props = defineProps({
  equipment: {
    type: Object,
    required: true
  },
  hasAlarm: {
    type: Boolean,
    default: false
  },
  selectedPoints: {
    type: Array,
    default: () => []
  },
  availablePoints: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['add-point', 'add-all'])

// Smart suggestion rules by equipment type
const suggestionRules = {
  'VAV': {
    groups: [
      {
        label: 'Temperature Points',
        points: ['Supply_Temp', 'Room_Temp', 'Discharge_Temp', 'Setpoint']
      },
      {
        label: 'Airflow Points',
        points: ['Damper_Position', 'Airflow', 'Static_Pressure']
      },
      {
        label: 'Related Systems',
        points: ['OA_Temp', 'Fan_Speed', 'Filter_Status']
      }
    ]
  },
  'AHU': {
    groups: [
      {
        label: 'Supply Air',
        points: ['Supply_Temp', 'Supply_Fan_Speed', 'Supply_Static']
      },
      {
        label: 'Return Air',
        points: ['Return_Temp', 'Return_Fan_Speed', 'Return_Static']
      },
      {
        label: 'Outside Air',
        points: ['OA_Temp', 'OA_Damper', 'Mixed_Air_Temp']
      },
      {
        label: 'Status',
        points: ['Fan_Status', 'Filter_Status', 'Cooling_Valve', 'Heating_Valve']
      }
    ]
  },
  'Chiller': {
    groups: [
      {
        label: 'Temperatures',
        points: ['CHW_Supply_Temp', 'CHW_Return_Temp', 'Condenser_Temp']
      },
      {
        label: 'Pressures & Flow',
        points: ['CHW_Flow', 'CHW_Pressure', 'Refrigerant_Pressure']
      },
      {
        label: 'Performance',
        points: ['Capacity', 'Power', 'Efficiency', 'Runtime']
      }
    ]
  },
  'Boiler': {
    groups: [
      {
        label: 'Temperatures',
        points: ['HW_Supply_Temp', 'HW_Return_Temp', 'Setpoint']
      },
      {
        label: 'Flow & Pressure',
        points: ['HW_Flow', 'HW_Pressure', 'Gas_Pressure']
      },
      {
        label: 'Status',
        points: ['Firing_Rate', 'Flame_Status', 'Safety_Status']
      }
    ]
  },
  'Pump': {
    groups: [
      {
        label: 'Performance',
        points: ['Speed', 'Flow', 'Pressure', 'Power']
      },
      {
        label: 'Status',
        points: ['Run_Status', 'VFD_Status', 'Hand_Off_Auto']
      }
    ]
  },
  'Fan': {
    groups: [
      {
        label: 'Performance',
        points: ['Speed', 'Static_Pressure', 'Power', 'Current']
      },
      {
        label: 'Status',
        points: ['Run_Status', 'VFD_Status', 'Proof_Of_Flow']
      }
    ]
  }
}

const suggestionGroups = computed(() => {
  const rules = suggestionRules[props.equipment.type]
  return rules?.groups || []
})

const hasSuggestions = computed(() => {
  return suggestionGroups.value.length > 0
})

const canAddPoint = (pointName) => {
  // Check if a point with similar name exists and isn't already selected
  const pattern = pointName.toLowerCase().replace(/_/g, '')
  return props.availablePoints.some(p => {
    const pName = p.name.toLowerCase().replace(/_/g, '')
    return pName.includes(pattern) && !isPointSelected(p.id)
  })
}

const isPointSelected = (pointId) => {
  return props.selectedPoints.some(p => p.id === pointId)
}

const addSuggestedPoint = (pointName) => {
  const pattern = pointName.toLowerCase().replace(/_/g, '')
  const point = props.availablePoints.find(p => {
    const pName = p.name.toLowerCase().replace(/_/g, '')
    return pName.includes(pattern) && !isPointSelected(p.id)
  })
  
  if (point) {
    emit('add-point', point)
  }
}

const addAllSuggestions = () => {
  suggestionGroups.value.forEach(group => {
    group.points.forEach(pointName => {
      if (canAddPoint(pointName)) {
        addSuggestedPoint(pointName)
      }
    })
  })
}
</script>

<style scoped>
.smart-suggestions {
  padding: var(--spacing-md);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-md);
}

.suggestions-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.bulb-icon {
  font-size: var(--font-size-xl);
}

.suggestions-header h4 {
  margin: 0;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.suggestions-description {
  margin: 0 0 var(--spacing-md) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.suggestion-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.suggestion-group {
  padding: var(--spacing-sm);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.group-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-xs);
  font-weight: var(--font-weight-semibold);
}

.suggestion-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.suggest-btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-accent-primary);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--color-accent-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: unset;
}

.suggest-btn:hover:not(:disabled) {
  background-color: var(--color-accent-primary);
  color: white;
}

.suggest-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: var(--color-border);
  color: var(--color-text-tertiary);
}

.add-all-btn {
  width: 100%;
  padding: var(--spacing-sm);
  background: linear-gradient(135deg, var(--color-accent-primary), rgba(139, 92, 246, 1));
  border: none;
  color: white;
  font-weight: var(--font-weight-semibold);
  min-height: unset;
}

.add-all-btn:hover {
  transform: scale(1.02);
}
</style>

