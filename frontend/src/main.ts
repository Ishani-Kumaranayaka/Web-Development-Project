import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import './styles/dialog-overrides.css'
import App from './App.vue'

const app = createApp(App)

app.use(createPinia())

// Refresh other tabs when login or logout changes the token.
window.addEventListener('storage', event => {
  if (event.key === 'tm-token' || event.key === null) {
    window.location.reload()
  }
})

app.use(router)

void router.isReady().then(() => {
  app.mount('#app')
})