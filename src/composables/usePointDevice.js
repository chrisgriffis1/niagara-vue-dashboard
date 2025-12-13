/**
 * Point Device Composable
 * Handles live value display for equipment that are point-devices
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDeviceStore } from '../stores/deviceStore'

export function usePointDevice(equipment) {
  const deviceStore = useDeviceStore()
  const adapter = computed(() => deviceStore.adapter || deviceStore.getAdapter())

  // State
  const liveValue = ref(null)
  const liveStatus = ref(null)

  // Live subscription cleanup
  let pointDeviceUnsubscribe = null

  // Computed
  const isPointDevice = computed(() => equipment.value?.isPointDevice)

  const displayValue = computed(() => {
    return liveValue.value ?? equipment.value?.currentValue ?? 'N/A'
  })

  const displayStatus = computed(() => {
    return liveStatus.value || equipment.value?.status || 'ok'
  })

  const hasLiveData = computed(() => {
    return liveValue.value !== null || liveStatus.value !== null
  })

  // Methods
  const subscribeToLiveUpdates = () => {
    if (!isPointDevice.value || !equipment.value) return

    const currentAdapter = adapter.value
    if (!currentAdapter || !currentAdapter.subscribeToPointDevice) return

    // Subscribe to point-device updates
    pointDeviceUnsubscribe = currentAdapter.subscribeToPointDevice(equipment.value, (update) => {
      if (update.value !== undefined) {
        liveValue.value = update.value
      }
      if (update.status !== undefined) {
        liveStatus.value = update.status
      }
      console.log(`🔄 Point-device update for ${equipment.value.name}:`, update)
    })

    console.log(`📡 Subscribed to live updates for point-device: ${equipment.value.name}`)
  }

  const unsubscribeFromLiveUpdates = () => {
    if (pointDeviceUnsubscribe) {
      pointDeviceUnsubscribe()
      pointDeviceUnsubscribe = null
      console.log(`📡 Unsubscribed from live updates for point-device: ${equipment.value?.name}`)
    }
  }

  // Lifecycle
  onMounted(() => {
    if (isPointDevice.value) {
      subscribeToLiveUpdates()
    }
  })

  onUnmounted(() => {
    unsubscribeFromLiveUpdates()
  })

  // Watch for equipment changes
  const updateSubscription = () => {
    unsubscribeFromLiveUpdates()
    if (isPointDevice.value) {
      subscribeToLiveUpdates()
    }
  }

  return {
    // State
    liveValue,
    liveStatus,

    // Computed
    isPointDevice,
    displayValue,
    displayStatus,
    hasLiveData,

    // Methods
    subscribeToLiveUpdates,
    unsubscribeFromLiveUpdates,
    updateSubscription
  }
}
