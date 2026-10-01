import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'

export const router = createRouter({
  // Hash history: works from any static host without rewrites.
  history: createWebHashHistory(),
  routes,
})
