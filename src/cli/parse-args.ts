import { z } from 'zod'

export const cliOptionsSchema = z.object({
  codebase: z.string().nullable(),
  format: z.enum(['table', 'json']),
  filterCheck: z.string().nullable(),
  pathFilter: z.string().nullable(),
  failOn: z.enum(['none', 'F', 'D', 'error', 'warning']),
  color: z.boolean(),
})

export type CliOptions = z.infer<typeof cliOptionsSchema>

const HELP = `docs-quality — CLAUDE.md quality linter

Usage:
  docs-quality [options]

Options:
  --codebase <path>     Repository to scan (default: git root of cwd)
  --json                Machine-readable output
  --check <name>        Run a single rule (e.g. no-file-inventory)
  --path <relpath>      Lint a single CLAUDE.md, relative to --codebase
  --fail-on <policy>    Exit non-zero when violations exist
                        Policies: none | F | D | error | warning
  --no-color            Disable ANSI color
  -h, --help            Show this help

Examples:
  docs-quality
  docs-quality --codebase ~/work/some-monorepo
  docs-quality --check no-file-inventory --path src/core/CLAUDE.md
  docs-quality --fail-on error
`

export function showHelp(): void {
  process.stdout.write(HELP)
}

/** Manual argv parsing — matches the project convention (no commander/yargs). */
export function parseArgs(argv: readonly string[]): CliOptions {
  const args = argv.slice(2)
  const has = (flag: string): boolean => args.includes(flag)
  const get = (flag: string): string | null => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? (args[i + 1] ?? null) : null
  }

  if (has('-h') || has('--help')) {
    showHelp()
    process.exit(0)
  }

  return cliOptionsSchema.parse({
    codebase: get('--codebase'),
    format: has('--json') ? 'json' : 'table',
    filterCheck: get('--check'),
    pathFilter: get('--path'),
    failOn: (get('--fail-on') ?? 'none') as CliOptions['failOn'],
    color: !has('--no-color') && process.stdout.isTTY === true,
  })
}

/** Decide exit code from accumulated counts and the --fail-on policy. */
export function exitCodeFor(
  opts: CliOptions,
  counts: { errors: number; warnings: number; tierF: number; tierD: number },
): number {
  switch (opts.failOn) {
    case 'none':    return 0
    case 'error':   return counts.errors > 0 ? 1 : 0
    case 'warning': return counts.warnings > 0 || counts.errors > 0 ? 1 : 0
    case 'F':       return counts.tierF > 0 ? 1 : 0
    case 'D':       return counts.tierF > 0 || counts.tierD > 0 ? 1 : 0
  }
}
