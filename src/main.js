import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Import global styles
import './styles/variables.css'
import './styles/theme-dark.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
