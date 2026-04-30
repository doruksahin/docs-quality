import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { parseToMdast } from './parse-claudemd.js'
import { extractSections } from './extract-sections.js'
import { extractTables } from './extract-tables.js'
import { extractCodeBlocks } from './extract-code-blocks.js'
import { classifyScope } from './classify-scope.js'
import { gitLastModified } from './git-info.js'
import type { ParsedClaudeMd } from '../types/parsed.js'

const CODE_EXT = new Set(['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])
const SKIP_DIR = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.turbo', '.vite', '__tests__', '__mocks__',
  '.docs-coverage', '.stitch', '.playwright-mcp', '.serena',
  'fixtures',
])

/** Walk a directory, yielding each CLAUDE.md path it contains. */
export function* walkClaudeMds(rootDir: string): Generator<string> {
  function* go(dir: string): Generator<string> {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.claude') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIR.has(entry.name)) continue
        yield* go(full)
      } else if (entry.name === 'CLAUDE.md') {
        yield full
      }
    }
  }
  yield* go(rootDir)
}

/** Count sibling code files in the directory containing a CLAUDE.md (non-recursive). */
function countSiblingCodeFiles(dir: string): number {
  let count = 0
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      if (!CODE_EXT.has(extname(entry.name))) continue
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
      count += 1
    }
  } catch {
    // ignore
  }
  return count
}

/** Build a single ParsedClaudeMd. */
export function parseClaudeMd(claudeMdPath: string, workspaceRoot: string): ParsedClaudeMd {
  const raw = readFileSync(claudeMdPath, 'utf-8')
  const tree = parseToMdast(raw)
  const sourceDir = dirname(claudeMdPath)
  const siblingCodeFileCount = countSiblingCodeFiles(sourceDir)

  return {
    path: claudeMdPath,
    relPath: relative(workspaceRoot, claudeMdPath),
    scope: classifyScope(claudeMdPath, workspaceRoot, siblingCodeFileCount),
    siblingCodeFileCount,
    lineCount: raw.split('\n').length,
    raw,
    sections: extractSections(tree),
    tables: extractTables(tree),
    codeBlocks: extractCodeBlocks(tree),
    gitLastModified: gitLastModified(claudeMdPath, workspaceRoot),
    sourceDir,
  }
}

/** Walk the tree, parse every CLAUDE.md found. */
export function discoverAndParse(workspaceRoot: string): ParsedClaudeMd[] {
  const results: ParsedClaudeMd[] = []
  for (const path of walkClaudeMds(workspaceRoot)) {
    results.push(parseClaudeMd(path, workspaceRoot))
  }
  return results
}

/** Find directories that have ≥ N code files but no CLAUDE.md. */
export function findMissingDocs(workspaceRoot: string, minFiles: number): { dir: string; codeFileCount: number }[] {
  const missing: { dir: string; codeFileCount: number }[] = []

  function go(dir: string): void {
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    const hasClaude = entries.some((e: { name: string }) => e.name === 'CLAUDE.md')
    if (!hasClaude) {
      const fileCount = countSiblingCodeFiles(dir)
      if (fileCount >= minFiles) {
        missing.push({ dir: relative(workspaceRoot, dir), codeFileCount: fileCount })
      }
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.claude') continue
      if (!entry.isDirectory()) continue
      if (SKIP_DIR.has(entry.name)) continue
      const full = join(dir, entry.name)
      try {
        if (statSync(full).isDirectory()) go(full)
      } catch {
        // ignore
      }
    }
  }

  if (existsSync(workspaceRoot)) go(workspaceRoot)
  return missing
}
