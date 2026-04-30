import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Resolve the codebase root.
 *
 *   --codebase /abs/path  → use it (validated as a directory)
 *   no flag               → `git rev-parse --show-toplevel` from cwd
 *   neither works         → throw with a helpful message
 */
export function resolveCodebase(explicit: string | null, cwd: string = process.cwd()): string {
  if (explicit !== null) {
    const abs = resolve(cwd, explicit)
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      throw new Error(`--codebase: not a directory: ${abs}`)
    }
    return abs
  }

  try {
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    if (top.length > 0) return top
  } catch {
    // not a git repo — fall through
  }

  throw new Error(
    `Could not detect a codebase. Run inside a git repository or pass --codebase <path>.`,
  )
}
