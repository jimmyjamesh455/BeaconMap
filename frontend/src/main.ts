import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { applyTheme, resolveInitialTheme } from './theme'

// Apply the theme before mount to avoid a flash of the wrong colours.
applyTheme(resolveInitialTheme())

createApp(App).use(createPinia()).mount('#app')
