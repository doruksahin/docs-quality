import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

/**
 * Find directories named `ast-checks/checks` anywhere in the codebase
 * (depth ≤ MAX_DEPTH from root) and harvest each `.ts` file's `name:` literal.
 * The collected names are what `no-tooling-restated` looks for in CLAUDE.md
 * bodies — restating an enforced check is a doc anti-pattern.
 *
 * Codebases without an ast-checks/ directory get an empty set, which simply
 * disables that signal — the rule still flags eslint-boundary phrases.
 */

const MAX_DEPTH = 5
const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.turbo', '.vite', '__tests__', '__mocks__', 'fixtures',
])

function findAstCheckDirs(root: string): string[] {
  const found: string[] = []
  function walk(dir: string, depth: number): void {
    if (depth > MAX_DEPTH) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.') || SKIP_DIR.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.name === 'ast-checks') {
        const checksSub = join(full, 'checks')
        if (existsSync(checksSub) && statSync(checksSub).isDirectory()) {
          found.push(checksSub)
        }
      }
      walk(full, depth + 1)
    }
  }
  walk(root, 0)
  return found
}

export function loadAstCheckIds(codebase: string): Set<string> {
  const ids = new Set<string>()
  for (const checksDir of findAstCheckDirs(codebase)) {
    for (const entry of readdirSync(checksDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
      const content = readFileSync(join(checksDir, entry.name), 'utf-8')
      const m = content.match(/name:\s*['"]([a-z0-9-]+)['"]/)
      ids.add(m ? m[1]! : basename(entry.name, '.ts'))
    }
  }
  return ids
}
