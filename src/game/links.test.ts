import { describe, expect, it } from 'vitest'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from '../routes'
import { roomLink, siteUrl } from './links'

describe('links', () => {
  const page = { origin: 'https://kazie.github.io', pathname: '/who-am-i-game/' }

  it('leaves out the query string and the route', () => {
    // As if opened from https://kazie.github.io/who-am-i-game/?fbclid=abc#/room/K7QXP/screen
    expect(siteUrl(page)).toBe('https://kazie.github.io/who-am-i-game/')
  })

  it("links straight to a room, the way the app's router addresses it", () => {
    const router = createRouter({ history: createWebHashHistory(), routes })
    expect(roomLink(router, 'K7QXP', siteUrl(page))).toBe(
      'https://kazie.github.io/who-am-i-game/#/room/K7QXP',
    )
  })
})
