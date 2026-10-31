import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { rolldown } from 'rolldown'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'node_modules/.tmp/trip-planner-tests.mjs')
await mkdir(dirname(output), { recursive: true })
const bundle = await rolldown({
  input: resolve(root, 'tests/trip-planner.test.mjs'), platform: 'node',
  external: ['vue', 'pinia', 'axios'],
  transform: { define: { 'import.meta.env': '{}' } },
})
await bundle.write({ file: output, format: 'esm' })
await bundle.close()
const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' })
process.exit(result.status ?? 1)
