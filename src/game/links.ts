import type { Router } from 'vue-router'

/**
 * Where the game is hosted: the page's address without any `?query` or `#route`, so junk
 * picked up on the way (e.g. `?fbclid=…`) never ends up on screen or in a QR code.
 */
export const siteUrl = (location: Pick<Location, 'origin' | 'pathname'> = window.location) =>
  location.origin + location.pathname

/** An in-app link (as the router writes it) made absolute, e.g. for a QR code. */
export const absoluteUrl = (href: string, site = siteUrl()) => new URL(href, site).href

/** The link that opens a room straight away. Built by the router, so it follows its routes. */
export const roomLink = (router: Router, code: string, site?: string) =>
  absoluteUrl(router.resolve({ name: 'room', params: { code } }).href, site)
