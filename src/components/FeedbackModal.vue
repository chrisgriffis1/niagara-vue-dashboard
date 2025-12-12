<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="feedback-overlay" @click.self="close">
        <div class="feedback-modal">
          <div class="feedback-header">
            <h2>📝 Send Feedback</h2>
            <button class="close-btn" @click="close">×</button>
          </div>
          
          <form @submit.prevent="submitFeedback" class="feedback-form">
            <div class="form-group">
              <label>Your Name (optional)</label>
              <input v-model="feedback.name" type="text" placeholder="Anonymous">
            </div>
            
            <div class="form-group">
              <label>Feedback Type</label>
              <div class="type-buttons">
                <button 
                  v-for="type in feedbackTypes" 
                  :key="type.value"
                  type="button"
                  :class="['type-btn', { active: feedback.type === type.value }]"
                  @click="feedback.type = type.value"
                >
                  {{ type.icon }} {{ type.label }}
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label>What's on your mind?</label>
              <textarea 
                v-model="feedback.message" 
                placeholder="Describe the issue, suggestion, or what you like..."
                rows="4"
                required
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>
                <input type="checkbox" v-model="feedback.includeContext">
                Include current page info (helps debugging)
              </label>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="close">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="submitting">
                {{ submitting ? 'Sending...' : '🚀 Send Feedback' }}
              </button>
            </div>
          </form>
          
          <div v-if="submitted" class="success-message">
            <p>✅ Thanks for your feedback!</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean
})

const emit = defineEmits(['close', 'submitted'])

const feedbackTypes = [
  { value: 'bug', label: 'Bug', icon: '🐛' },
  { value: 'feature', label: 'Feature', icon: '💡' },
  { value: 'ux', label: 'UX Issue', icon: '🎨' },
  { value: 'love', label: 'Love it!', icon: '❤️' }
]

const feedback = reactive({
  name: '',
  type: 'bug',
  message: '',
  includeContext: true
})

const submitting = ref(false)
const submitted = ref(false)

const close = () => {
  emit('close')
}

const submitFeedback = async () => {
  submitting.value = true
  
  const feedbackData = {
    ...feedback,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    context: feedback.includeContext ? {
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: Object.keys(localStorage).length + ' items'
    } : null
  }
  
  try {
    // Store feedback locally (can be synced to server later)
    const existingFeedback = JSON.parse(localStorage.getItem('navigator_feedback') || '[]')
    existingFeedback.push(feedbackData)
    localStorage.setItem('navigator_feedback', JSON.stringify(existingFeedback))
    
    console.log('📝 Feedback submitted:', feedbackData)
    
    submitted.value = true
    emit('submitted', feedbackData)
    
    // Reset and close after delay
    setTimeout(() => {
      feedback.name = ''
      feedback.message = ''
      feedback.type = 'bug'
      submitted.value = false
      close()
    }, 1500)
    
  } catch (e) {
    console.error('Failed to submit feedback:', e)
    alert('Failed to save feedback. Please try again.')
  } finally {
    submitting.value = false
  }
}

// Reset submitted state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    submitted.value = false
  }
})
</script>

<style scoped>
.feedback-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.feedback-modal {
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.feedback-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.feedback-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.form-group input[type="text"],
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input[type="text"]:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group input[type="checkbox"] {
  margin-right: 0.5rem;
}

.type-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.type-btn {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.85rem;
}

.type-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.type-btn.active {
  background: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  color: #fff;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.success-message {
  text-align: center;
  padding: 1.5rem;
  color: #22c55e;
  font-size: 1.1rem;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .feedback-modal,
.modal-leave-active .feedback-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .feedback-modal,
.modal-leave-to .feedback-modal {
  transform: scale(0.95) translateY(20px);
}
</style>

