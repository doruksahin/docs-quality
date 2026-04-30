import type { CheckFinding } from '../../types/finding.js'
import type { Reporter, ReportInput, ReporterOptions } from '../../types/reporter.js'
import type { Tier } from '../../types/grade.js'

const TIER_GLYPH: Record<Tier, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D', F: 'F', MISSING: '·',
}
const TIER_RANK: Record<Tier, number> = { F: 0, MISSING: 1, D: 2, C: 3, B: 4, A: 5 }

const COLUMNS = {
  path: 62,
  lines: 5,
  scope: 5,
  gap: 4,
  tier: 4,
} as const

const COL_GAP = '  '
const ROW_PREFIX = '  '

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}

function padLeft(s: string, n: number): string {
  return s.length >= n ? s.slice(-n) : ' '.repeat(n - s.length) + s
}

function rowWidth(): number {
  // path + lines + scope + gap + tier + 5 column gaps
  return COLUMNS.path + COLUMNS.lines + COLUMNS.scope + COLUMNS.gap + COLUMNS.tier + COL_GAP.length * 5 + ' Findings'.length
}

function summarize(findings: readonly CheckFinding[]): string {
  if (findings.length === 0) return '—'
  const e = findings.filter((f) => f.severity === 'error').length
  const w = findings.filter((f) => f.severity === 'warning').length
  const i = findings.filter((f) => f.severity === 'info').length
  const parts: string[] = []
  if (e) parts.push(`${e} err`)
  if (w) parts.push(`${w} warn`)
  if (i) parts.push(`${i} info`)
  return parts.join(', ')
}

function renderHeader(): string[] {
  const cols = [
    pad('Path', COLUMNS.path),
    padLeft('Lines', COLUMNS.lines),
    pad('Scope', COLUMNS.scope),
    padLeft('Gap', COLUMNS.gap),
    pad('Tier', COLUMNS.tier),
    'Findings',
  ]
  return [
    `${ROW_PREFIX}${cols.join(COL_GAP)}`,
    `${ROW_PREFIX}${'─'.repeat(rowWidth())}`,
  ]
}

function renderRow(report: ReportInput['reports'][number]): string {
  const cols = [
    pad(report.parsed.relPath, COLUMNS.path),
    padLeft(String(report.parsed.lineCount), COLUMNS.lines),
    pad(report.parsed.scope, COLUMNS.scope),
    padLeft(report.grade.genGap.toFixed(2), COLUMNS.gap),
    pad(TIER_GLYPH[report.grade.tier], COLUMNS.tier),
    summarize(report.findings),
  ]
  return `${ROW_PREFIX}${cols.join(COL_GAP)}`
}

const reporter: Reporter = {
  name: 'table',

  render(input: ReportInput, _opts: ReporterOptions): string {
    const out: string[] = []
    out.push('')
    out.push(`${ROW_PREFIX}CLAUDE.md Quality Report`)
    out.push('')
    out.push(...renderHeader())

    const sorted = [...input.reports].sort((a, b) => {
      const r = TIER_RANK[a.grade.tier] - TIER_RANK[b.grade.tier]
      return r !== 0 ? r : a.parsed.relPath.localeCompare(b.parsed.relPath)
    })

    for (const r of sorted) out.push(renderRow(r))

    out.push(`${ROW_PREFIX}${'─'.repeat(rowWidth())}`)

    const dist = sorted.reduce<Record<Tier, number>>(
      (acc, r) => { acc[r.grade.tier] = (acc[r.grade.tier] ?? 0) + 1; return acc },
      { A: 0, B: 0, C: 0, D: 0, F: 0, MISSING: 0 },
    )
    out.push(`${ROW_PREFIX}Tier distribution: A:${dist.A}  B:${dist.B}  C:${dist.C}  D:${dist.D}  F:${dist.F}`)

    const totals = sorted.reduce(
      (acc, r) => {
        acc.e += r.grade.errorCount
        acc.w += r.grade.warningCount
        acc.i += r.grade.infoCount
        return acc
      },
      { e: 0, w: 0, i: 0 },
    )
    out.push(`${ROW_PREFIX}Total findings: ${totals.e} errors, ${totals.w} warnings, ${totals.i} info`)

    if (input.missing.length > 0) {
      out.push('')
      out.push(`${ROW_PREFIX}Missing CLAUDE.md (≥8 sibling code files):`)
      for (const m of input.missing) out.push(`${ROW_PREFIX}  ${m.dir} (${m.codeFileCount} files)`)
    }

    const errorReports = sorted.filter((r) => r.grade.errorCount > 0)
    if (errorReports.length > 0) {
      out.push('')
      out.push(`${ROW_PREFIX}Detail (errors):`)
      for (const r of errorReports) {
        for (const f of r.findings.filter((x) => x.severity === 'error')) {
          out.push(`${ROW_PREFIX}${r.parsed.relPath}:${f.line}  ${f.check}`)
          out.push(`${ROW_PREFIX}  ${f.message}`)
          if (f.hint) out.push(`${ROW_PREFIX}  Hint: ${f.hint}`)
        }
      }
    }

    out.push('')
    return out.join('\n')
  },
}

export default reporter
