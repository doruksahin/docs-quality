export type Severity = 'error' | 'warning' | 'info'

export interface CheckFinding {
  readonly check: string
  readonly severity: Severity
  readonly line: number
  readonly message: string
  readonly hint?: string
}
