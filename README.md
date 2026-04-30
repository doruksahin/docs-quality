# docs-quality

A CLAUDE.md linter for monorepos. Detects the anti-patterns that make LLMs worse and grades each `CLAUDE.md` A-F.

## Install

```bash
# Global (run anywhere)
npm install -g github:doruksahin98/docs-quality
# or
pnpm add -g github:doruksahin98/docs-quality

# Per-repo dev dep
pnpm add -D github:doruksahin98/docs-quality
```

After install, the `docs-quality` binary is on your `PATH`. It runs against the git root of `cwd` by default; pass `--codebase /path` to scan elsewhere.

## Local development link

Working on the linter and want to try it inside another repo without publishing?

```bash
git clone https://github.com/doruksahin98/docs-quality.git
cd docs-quality
pnpm install
pnpm build
pnpm link --global

# now run anywhere
cd ~/work/some-other-repo
docs-quality
```

`pnpm link --global` symlinks the package globally; the `docs-quality` binary becomes available from any directory. Re-run `pnpm build` after editing source.

## Why this exists

CLAUDE.md files drift toward bloat. Every refactor adds a section, every new file gets a row in the inventory table, every architecture diagram lingers. After a year you have 400-line CLAUDE.md files that hurt the LLM more than they help — instruction-following degrades roughly linearly with instruction count, so every line of derivable noise dilutes the lines that actually matter.

Existing tools don't solve this:

- **Coverage checkers** ("what % of files are referenced from a CLAUDE.md?") *reward* file-inventory tables — the exact anti-pattern you want to delete.
- **LLM doc-drift tools** (driftcheck, DocDrift) burn tokens on every push to detect what `git diff` already tells you, with no calibration data showing they actually catch real bugs.

`docs-quality` takes the opposite angle: ground every check in a written quality methodology, do all detection deterministically (no LLM), and grade docs by **how much human signal they contain** — not by how recently they were touched or how many files they list.

## What it measures

Two headline metrics, both deterministic, both fast:

**1. Anti-pattern findings** — six rules from the methodology:

| Rule | What it catches |
|------|-----------------|
| `no-file-inventory` | 2-column tables that are filename + low-surprise description (glorified `ls`) |
| `no-code-duplication` | Code blocks ≥80% present in a sibling source file |
| `no-parent-redundancy` | Sections whose body duplicates an ancestor `CLAUDE.md` section with the same title |
| `no-tooling-restated` | Rules already enforced by eslint or AST checks, restated in prose |
| `no-feature-descriptions` | "How X works" prose that belongs in `README.md`, not guidance |
| `line-count-vs-scope` | Files exceeding the line-count band for their scope tier |

**2. Generation gap** — the headline quality signal. For each `CLAUDE.md`, we auto-generate a "stub" containing only what's derivable from the directory's code (file list, exports, subdirs, imports, eslint boundary rule). Then:

```
gap = | actual_shingles \ stub_shingles | / | actual_shingles |
```

A gap of `1.0` means everything in the doc is human signal that you can't derive from reading the code. A gap of `0.4` means most of the doc is paraphrasing what the code already says — delete or rewrite. The A-tier exemplars in this repo score 0.93-1.00.

## Tier system

Per scope, with line-count bands:

| Scope | Target | Warn at | Error at |
|-------|--------|---------|----------|
| `leaf` (≤7 sibling code files) | 15-30 | 50 | 80 |
| `mid` (8-15) | 30-50 | 80 | 130 |
| `top` (`apps/`, `packages/` 1-deep) | 50-80 | 130 | 200 |
| `root` (workspace root) | 100-150 | 200 | 300 |

A file's tier is determined by the worst signal: error count, line count, or generation gap.

- **A** — within target band (with 20% flex), 0 errors, ≤2 warnings, gap ≥ 0.75.
- **B** — within warn band, 0 errors, gap ≥ 0.6.
- **C** — at warn threshold, or 1 error, or gap < 0.5.
- **D** — at error threshold, or ≥2 errors, or gap < 0.4.
- **F** — exceeds error threshold by 50%, or ≥4 errors. Actively harmful — split or cut by 60-70%.

## Usage

```bash
docs-quality                                # full report (cwd = git root)
docs-quality --codebase ~/work/some-repo    # scan a different repo
docs-quality --json                         # machine-readable
docs-quality --check no-file-inventory      # one rule
docs-quality --path src/core/CLAUDE.md      # one file
docs-quality --fail-on F                    # exit 1 if any F-tier
docs-quality --fail-on error                # exit 1 if any error finding
docs-quality --help                         # full flag list
```

Pre-commit hook (recommended for soft-launch — warn-only):

```bash
# .husky/pre-commit
if git diff --cached --name-only | grep -q 'CLAUDE\.md$'; then
  docs-quality --fail-on error || true
fi
```

## What "good" looks like

After running `docs:quality` on this repo:

```
Tier distribution: A:29  B:2  C:0  D:0  F:0
Total findings: 0 errors, 0 warnings, 9 info
```

The 9 info findings are scope-band notes ("38 lines is above leaf target but within band") — soft hints, not blockers. The two B-tier files are 42-44 lines in `leaf` scope (target 15-30); both are honest dependency hubs that need the extra room.

## Architecture

Six-layer dependency rule (Layer N imports from N-1 or 0 only):

```
Layer 0  types/        type definitions, no runtime deps
Layer 1  parse/        text → ParsedClaudeMd
Layer 2  checks/       structured data → findings        (auto-discovered rules)
Layer 2  score/        structured data + findings → grades
Layer 3  report/       grades + findings → output        (table, json, ...)
Layer 4  cli/          orchestration + argv
```

`checks/` and `score/` are siblings — neither imports the other. Shared scope-band data lives in `parse/scope-bands.ts`.

## Extending

**Add a rule** → drop a file in `checks/rules/<name>.ts` exporting `default: DocCheck`. Auto-discovered. No central registry to update. See `checks/rules/no-file-inventory.ts` as the smallest reference implementation.

**Add an output format** → drop a file in `report/formats/<name>.ts` exporting `default: Reporter`. Register one line in `report/select-format.ts`.

**Tune the bands** → edit `parse/scope-bands.ts`.

**Tune the grading** → edit the decision tree in `score/classify-tier.ts`. The function is pure; unit-test it before shipping changes.

## Tests

```bash
pnpm test                # from the package root
```

Pure-function tests cover `classifyTier` and the n-gram diff. Fixture tests cover the rule detectors (one good fixture, one bad fixture per rule).

## Methodology

The grading rules don't come from nowhere. See [`docs/methodology.md`](./docs/methodology.md) for the methodology — six anti-patterns with concrete bad/good examples, scope-tier targets, and references to Anthropic + AMD postmortems on how instruction-following collapses with verbose CLAUDE.md files.

## What this is not

- **Not an LLM linter.** Zero tokens spent. Everything is `git`, `mdast`, and `ts-morph`.
- **Not a coverage tool.** Coverage % rewards the wrong thing. We don't measure it.
- **Not an auto-fixer.** Findings include hints. Humans apply them.
- **Not a doc-drift tool.** "Stale" is the wrong question. "Wrong" is the right question, and only an LLM (Layer 3, deferred) can answer it. The deterministic layers handle "bad shape" — the bigger problem in practice.
