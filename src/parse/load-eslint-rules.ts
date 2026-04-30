import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Load the names of custom rules + boundary types from eslint.config.mjs.
 *
 * This is best-effort: we read the config as text (it's an ESM file with
 * project-specific exports we can't safely evaluate) and pluck out string
 * literals matching common patterns. Used by no-tooling-restated to detect
 * when a CLAUDE.md restates a rule the linter already enforces.
 */
export function loadEslintRules(workspaceRoot: string): Set<string> {
  const rules = new Set<string>()
  const candidates = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.ts']

  for (const filename of candidates) {
    const path = join(workspaceRoot, filename)
    if (!existsSync(path)) continue

    const content = readFileSync(path, 'utf-8')

    // Pluck rule names from "rule-name": [...], pairs and "boundaries/element-types" mentions
    for (const match of content.matchAll(/['"]([a-z][a-z0-9-]+\/[a-z0-9-]+)['"]/g)) {
      rules.add(match[1]!)
    }

    // Common eslint boundary keywords
    if (content.includes('boundaries/elements')) rules.add('boundaries/elements')
    if (content.includes('boundaries/element-types')) rules.add('boundaries/element-types')
  }

  return rules
}
