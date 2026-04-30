import { execFileSync } from 'node:child_process'

/** Last commit timestamp for a path. Returns null when git knows nothing about the path. */
export function gitLastModified(filePath: string, workspaceRoot: string): Date | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%aI', '--', filePath], {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    }).trim()
    return out ? new Date(out) : null
  } catch {
    return null
  }
}
