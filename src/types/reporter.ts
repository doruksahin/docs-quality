import type { CheckFinding } from './finding.js'
import type { TierGrade } from './grade.js'
import type { ParsedClaudeMd } from './parsed.js'

/** One row of a report — a parsed CLAUDE.md with its findings + grade */
export interface DocReport {
  readonly parsed: ParsedClaudeMd
  readonly findings: readonly CheckFinding[]
  readonly grade: TierGrade
}

/** Reports for an entire repo + missing-doc directories */
export interface ReportInput {
  readonly reports: readonly DocReport[]
  readonly missing: readonly { dir: string; codeFileCount: number }[]
}

export interface ReporterOptions {
  readonly color: boolean
}

export interface Reporter {
  readonly name: string
  render(input: ReportInput, opts: ReporterOptions): string
}
