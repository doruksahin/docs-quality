import type { Project } from 'ts-morph'
import type { CheckFinding } from './finding.js'
import type { ParsedClaudeMd } from './parsed.js'

/** Smallest viable surface for a rule — ISP. Rules see no CLI/IO/git data. */
export interface CheckContext {
  readonly projectRoot: string
  readonly parent: ParsedClaudeMd | null
  readonly tsProject: Project
  readonly eslintRules: ReadonlySet<string>
  readonly astCheckIds: ReadonlySet<string>
}

export interface DocCheck {
  readonly name: string
  readonly description: string
  run(parsed: ParsedClaudeMd, ctx: CheckContext): readonly CheckFinding[]
}
