import { dirname, relative, sep } from 'node:path'
import type { ScopeKind } from '../types/parsed.js'

/**
 * Pure: given a CLAUDE.md path, the workspace root, and the count of sibling
 * code files in its directory, return the scope tier.
 *
 *   root  — workspace-root CLAUDE.md
 *   top   — package CLAUDE.md (depth 2 under apps/ or packages/)
 *   mid   — module-level CLAUDE.md (8-15 sibling files)
 *   leaf  — small directory (≤7 sibling files)
 *
 * Mid is preferred over leaf when ambiguous; the line-count check uses the
 * resulting target band, not the count directly.
 */
export function classifyScope(claudeMdPath: string, workspaceRoot: string, siblingCodeFileCount: number): ScopeKind {
  const dir = dirname(claudeMdPath)
  const relDir = relative(workspaceRoot, dir)

  if (relDir === '' || relDir === '.') return 'root'

  const parts = relDir.split(sep)
  if (parts.length <= 2 && (parts[0] === 'apps' || parts[0] === 'packages')) return 'top'

  if (siblingCodeFileCount >= 8) return 'mid'
  return 'leaf'
}
