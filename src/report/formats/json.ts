import type { Reporter, ReportInput } from '../../types/reporter.js'

const reporter: Reporter = {
  name: 'json',
  render(input: ReportInput): string {
    const out = {
      reports: input.reports.map((r) => ({
        path: r.parsed.relPath,
        scope: r.parsed.scope,
        lineCount: r.parsed.lineCount,
        siblingCodeFileCount: r.parsed.siblingCodeFileCount,
        gitLastModified: r.parsed.gitLastModified?.toISOString() ?? null,
        grade: r.grade,
        findings: r.findings,
      })),
      missing: input.missing,
    }
    return JSON.stringify(out, null, 2)
  },
}

export default reporter
