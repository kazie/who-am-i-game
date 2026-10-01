import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from './routes'

/** Mount options giving a component the app's routes, without touching the URL. */
export const withRouter = () => ({
  global: { plugins: [createRouter({ history: createMemoryHistory(), routes })] },
})
