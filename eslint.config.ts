import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { ignores: ['dist/**', '.histoire/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.story.vue', 'src/App.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
  {
    // Histoire and the helpers made for stories (*.stories.ts) stay out of the game.
    files: ['src/**/*.{ts,vue}'],
    ignores: ['**/*.story.vue', '**/*.stories.ts', '**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'histoire/client', message: 'Only stories may use Histoire.' }],
          patterns: [{ group: ['**/*.stories'], message: 'Only stories may use *.stories.ts.' }],
        },
      ],
    },
  },
  skipFormatting,
)
