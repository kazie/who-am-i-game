import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from './routes'
import './style.css'

// Views use RouterLink and useRouter; give stories a router that never touches the URL.
export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(createRouter({ history: createMemoryHistory(), routes }))
})
