import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

/** The src directory, for tests that check rules across the source tree. */
export const SRC = import.meta.dirname

/** Every file under `dir` (default: src), as absolute paths. */
export const sourceFiles = (dir = SRC): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : [join(dir, e.name)],
  )

/** `file` relative to src, with forward slashes on every platform (`components/X.vue`). */
export const srcPath = (file: string) => relative(SRC, file).split(sep).join('/')
