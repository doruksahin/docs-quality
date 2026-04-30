import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { DocCheck } from '../types/check.js'

/** Auto-discover every rule in checks/rules/. Mirrors ast-checks/runner.mts pattern. */
export async function discoverRules(rulesDir: string): Promise<DocCheck[]> {
  const found: DocCheck[] = []
  for (const entry of readdirSync(rulesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.d.ts')) continue
    const mod = (await import(join(rulesDir, entry.name))) as { default: DocCheck }
    found.push(mod.default)
  }
  return found
}
