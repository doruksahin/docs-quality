import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { CodeBlock, ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Flags code blocks whose normalized lines are also present (consecutively, ≥80%)
 * in some sibling source file — the "code examples duplicating source" anti-pattern.
 *
 * Normalization: trim, collapse internal whitespace, drop blank lines and comments.
 */

const CODE_EXT = new Set(['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'])
const SKIP_DIR = new Set(['node_modules', '.git', 'dist', 'build', 'out', '__tests__', '.docs-coverage'])
const MIN_BLOCK_LINES = 4
const MATCH_THRESHOLD = 0.8
const MAX_FILES_SCANNED = 200

function normalize(line: string): string {
  return line.replace(/\/\/.*$/, '').replace(/\s+/g, ' ').trim()
}

function normalizeLines(text: string): string[] {
  return text.split('\n').map(normalize).filter((l) => l.length > 0)
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  function go(d: string): void {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(d, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIR.has(entry.name)) continue
        try {
          if (statSync(full).isDirectory()) go(full)
        } catch {
          // ignore
        }
      } else if (CODE_EXT.has(extname(entry.name))) {
        if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue
        out.push(full)
        if (out.length >= MAX_FILES_SCANNED) return
      }
    }
  }
  go(dir)
  return out
}

interface Match {
  file: string
  ratio: number
  startLine: number
}

function findMatch(blockLines: string[], file: string): Match | null {
  const sourceText = readFileSync(file, 'utf-8')
  const sourceLines = sourceText.split('\n')
  const normSource = sourceLines.map(normalize)

  const blockSet = new Set(blockLines)
  if (blockSet.size === 0) return null

  // Slide a window of blockLines.length over normSource and count overlaps.
  let best: Match | null = null
  const windowSize = blockLines.length
  for (let i = 0; i + windowSize <= normSource.length; i++) {
    let hits = 0
    for (let j = 0; j < windowSize; j++) {
      if (normSource[i + j] && blockSet.has(normSource[i + j]!)) hits++
    }
    const ratio = hits / windowSize
    if (ratio >= MATCH_THRESHOLD && (!best || ratio > best.ratio)) {
      best = { file, ratio, startLine: i + 1 }
    }
  }
  return best
}

function scanBlock(block: CodeBlock, sourceFiles: string[], workspaceRoot: string): Match | null {
  const blockLines = normalizeLines(block.value)
  if (blockLines.length < MIN_BLOCK_LINES) return null

  let best: Match | null = null
  for (const file of sourceFiles) {
    const m = findMatch(blockLines, file)
    if (m && (!best || m.ratio > best.ratio)) {
      best = { ...m, file: relative(workspaceRoot, m.file) }
    }
  }
  return best
}

const check: DocCheck = {
  name: 'no-code-duplication',
  description: 'Flags code blocks ≥80% present in a sibling source file.',

  run(parsed: ParsedClaudeMd, ctx): CheckFinding[] {
    if (parsed.codeBlocks.length === 0) return []
    const tsLikeBlocks = parsed.codeBlocks.filter((b) => ['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'typescript', 'javascript'].includes(b.lang))
    if (tsLikeBlocks.length === 0) return []

    const sourceFiles = collectSourceFiles(parsed.sourceDir)
    if (sourceFiles.length === 0) return []

    const findings: CheckFinding[] = []
    for (const block of tsLikeBlocks) {
      const match = scanBlock(block, sourceFiles, ctx.projectRoot)
      if (!match) continue
      findings.push({
        check: this.name,
        severity: 'warning',
        line: block.line,
        message: `Code block duplicates ${match.file} (≥${Math.round(match.ratio * 100)}% match starting at L${match.startLine}).`,
        hint: 'Replace the block with a one-line pointer to the source file.',
      })
    }
    return findings
  },
}

export default check
