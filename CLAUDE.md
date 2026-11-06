# Who Am I?

A browser party game (Vue 3, Vite, TypeScript, no UI library). `README.md` explains the
rules and the relay design.

- Before changing anything visual, read `DESIGN.md`: index cards as the one recurring
  shape, two typefaces, no emoji icons. `src/design.test.ts` enforces part of it.
- Every component and view needs a `*.story.vue` (`src/stories.test.ts`).
- Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm story:build`.
