import { defineConfig } from 'histoire'
import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
  plugins: [HstVue()],
  setupFile: './src/histoire.setup.ts',
  storyMatch: ['src/**/*.story.vue'],
  theme: {
    title: 'Who Am I? stories',
  },
})
