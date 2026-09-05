import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'

import App from './App.vue'
import { guardSaveFile } from './engine/savefile'
import router from './router'
import './styles/main.css'

// 存档对不上这一版的代码就清掉。这一句必须在 createPinia 之前——
// 插件一装上，各 store 就会去读 localStorage，那时再清已经晚了
guardSaveFile()

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).use(router).mount('#app')
