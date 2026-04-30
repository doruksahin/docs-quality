import type { DocCheck } from '../../types/check.js'
import type { CheckFinding } from '../../types/finding.js'
import type { MdTable, ParsedClaudeMd } from '../../types/parsed.js'

/**
 * Flags 2-column tables that are filename-+-description with low surprise —
 * the "glorified ls" anti-pattern from docs/claude-md-quality/README.md.
 *
 * A table is flagged when ALL hold:
 *   - exactly 2 columns
 *   - ≥ 3 body rows
 *   - column 1: ≥ 80% of cells contain a `*.ts|tsx|js|mts` filename
 *   - column 2: average length < 60 chars
 *   - ≥ 60% of rows have at least one stem-token from the filename present in
 *     the description (parse-tasks.ts → "parse" or "task" appears)
 */

const FILE_RE = /([\w./-]+)\.(ts|tsx|js|jsx|mts|mjs)/i

function fileBaseTokens(text: string): string[] {
  const m = text.match(FILE_RE)
  if (!m) return []
  return m[1]!.split(/[/_-]+/).filter((t) => t.length >= 3).map((t) => t.toLowerCase())
}

function hasFileRef(cell: string): boolean {
  return FILE_RE.test(cell)
}

function isLowSurpriseRow(file: string, desc: string): boolean {
  const tokens = fileBaseTokens(file)
  if (tokens.length === 0) return false
  const lowerDesc = desc.toLowerCase()
  return tokens.some((t) => lowerDesc.includes(t))
}

function looksLikeFileInventory(table: MdTable): boolean {
  if (table.columns.length !== 2) return false
  if (table.rows.length < 3) return false

  const fileRefRatio = table.rows.filter((r) => hasFileRef(r[0] ?? '')).length / table.rows.length
  if (fileRefRatio < 0.8) return false

  const avgDescLen = table.rows.reduce((sum, r) => sum + (r[1] ?? '').length, 0) / table.rows.length
  if (avgDescLen >= 60) return false

  const lowSurpriseRatio =
    table.rows.filter((r) => isLowSurpriseRow(r[0] ?? '', r[1] ?? '')).length / table.rows.length
  if (lowSurpriseRatio < 0.6) return false

  return true
}

const check: DocCheck = {
  name: 'no-file-inventory',
  description: 'Flags 2-column tables that are filename-+-description with no surprise (glorified ls).',

  run(parsed: ParsedClaudeMd): CheckFinding[] {
    const findings: CheckFinding[] = []
    for (const table of parsed.tables) {
      if (!looksLikeFileInventory(table)) continue
      findings.push({
        check: this.name,
        severity: 'error',
        line: table.line,
        message: `Table after "${table.afterHeading || '(top of file)'}" looks like a file inventory.`,
        hint: 'Delete the table; replace with "see directory listing" or one-line pointers to the surprising files.',
      })
    }
    return findings
  },
}

export default check
