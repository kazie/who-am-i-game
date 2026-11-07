import { fileURLToPath } from 'node:url'
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'
import type { CSSOptions } from 'vite'

type PostcssPlugin = Extract<
  NonNullable<Exclude<CSSOptions['postcss'], string | undefined>['plugins']>[number],
  { Once?: unknown }
>

/** Where Histoire renders a story (it marks a story's own controls panel as custom-controls). */
const IN_STORY = ':where(.__histoire-render-story:not(.__histoire-render-custom-controls))'

/**
 * Histoire's own page loads style.css too (grid stories and the live game render there), so
 * the game's bare element rules would restyle Histoire's labels, inputs and buttons. Scope
 * every style.css rule to inside a story, as Histoire does with its own CSS. :where() adds
 * no specificity and the order stays the same, so stories render exactly as in the game.
 * The tokens on :root and the page itself (html, body) stay global.
 */
const scopeGameCss: PostcssPlugin = {
  postcssPlugin: 'scope-game-css',
  Once(root) {
    if (!root.source?.input.file?.replaceAll('\\', '/').endsWith('/src/style.css')) return
    root.walkRules((rule) => {
      if (rule.parent?.type === 'atrule' && /keyframes$/.test(String(rule.parent.name))) return
      rule.selectors = rule.selectors.map((s) =>
        /^(:root|html|body)\b/.test(s) ? s : `${IN_STORY} ${s}`,
      )
    })
  },
}

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire.setup.ts',
  storyMatch: ['src/**/*.story.vue'],
  // Published on GitHub Pages under /<repo>/: hash URLs survive reloads and deep links.
  routerMode: 'hash',
  theme: {
    title: 'Who Am I? stories',
    // The game takes light or dark from the OS (prefers-color-scheme in style.css), so
    // Histoire does too: its own switch would put light cards on a dark canvas. Change the
    // OS or devtools setting to see the dark theme.
    defaultColorScheme: 'auto',
    hideColorSchemeSwitch: true,
    storeColorScheme: false,
  },
  // A new viewer's previews start on `transparent`, which src/histoire.css turns into the
  // table. After that Histoire remembers each viewer's pick in their browser, so someone who
  // chose another background before keeps it until they pick Table. style.css is loaded in
  // Histoire's own page too, so the tokens follow the theme.
  backgroundPresets: [
    { label: 'Table', color: 'transparent' },
    { label: 'Card', color: 'var(--card)' },
    { label: 'White', color: '#fff' },
  ],
  // What the game is played on: phones at the table, a TV for the presentation screen.
  responsivePresets: [
    { label: 'Small phone', width: 360, height: 640 },
    { label: 'Phone', width: 390, height: 844 },
    { label: 'Tablet', width: 820, height: 1180 },
    { label: 'Laptop', width: 1280 },
    { label: 'TV', width: 1920, height: 1080 },
  ],
  // Props like `room` and `state` are live objects Histoire can't turn into controls (it
  // shows "Cannot convert a Symbol value to a string"). Stories declare their own instead.
  defaultStoryProps: { autoPropsDisabled: true },
  vite: {
    css: { postcss: { plugins: [scopeGameCss] } },
    resolve: {
      // Stories never get the real bridge, however they reach it (the router pulls in the
      // room views): every import of BridgeClient gets a stand-in that refuses to connect.
      alias: [
        {
          find: /^.*\/bridge\/BridgeClient$/,
          replacement: fileURLToPath(new URL('./src/bridge/noBridge.ts', import.meta.url)),
        },
      ],
    },
  },
})
