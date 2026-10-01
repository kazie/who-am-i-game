import type { RouteRecordRaw } from 'vue-router'
import HomeView from './views/HomeView.vue'
import RoomView from './views/RoomView.vue'

// The example and the TV screen load on demand: players' phones never need them.
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/example', name: 'example', component: () => import('./views/ExampleView.vue') },
  { path: '/room/:code', name: 'room', component: RoomView, props: true },
  {
    path: '/room/:code/screen',
    name: 'screen',
    component: () => import('./views/ScreenView.vue'),
    props: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]
