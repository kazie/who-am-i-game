import { defineSetupVue3 } from '@histoire/plugin-vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from './routes'
import './style.css'

// Stories are a static site with no game server. histoire.config.ts already swaps out the
// bridge module; this also stops any other code from opening a connection.
globalThis.WebSocket = class {
  constructor() {
    throw new Error('Stories must not use the real bridge: use MemoryHub instead.')
  }
} as unknown as typeof WebSocket

// Views use RouterLink and useRouter; give stories a router that never touches the URL.
export const setupVue3 = defineSetupVue3(({ app }) => {
  app.use(createRouter({ history: createMemoryHistory(), routes }))
})
