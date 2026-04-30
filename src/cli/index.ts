import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exitCodeFor, parseArgs } from './parse-args.js'
import { runPipeline } from './pipeline.js'
import { resolveCodebase } from './resolve-codebase.js'

/**
 * Entry point. Resolves codebase, finds rule files relative to this module,
 * runs the pipeline, prints, exits.
 *
 * Rule resolution: from a built layout (`dist/cli/index.js`), rules live at
 * `../checks/rules`. From the dev layout (`src/cli/index.ts`), the same.
 */
export async function main(): Promise<void> {
  const opts = parseArgs(process.argv)
  const codebase = resolveCodebase(opts.codebase)

  const here = dirname(fileURLToPath(import.meta.url))
  const rulesDir = resolve(here, '..', 'checks', 'rules')

  const { rendered, counts } = await runPipeline(codebase, opts, rulesDir)
  console.log(rendered)
  process.exit(exitCodeFor(opts, counts))
}
