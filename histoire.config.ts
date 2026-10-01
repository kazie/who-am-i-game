import { fileURLToPath } from 'node:url'
import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire.setup.ts',
  storyMatch: ['src/**/*.story.vue'],
  // Published on GitHub Pages under /<repo>/: hash URLs survive reloads and deep links.
  routerMode: 'hash',
  theme: {
    title: 'Who Am I? stories',
  },
  vite: {
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
