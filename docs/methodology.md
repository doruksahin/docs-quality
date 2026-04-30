# CLAUDE.md Quality Methodology

A reusable audit framework for keeping CLAUDE.md files high-signal. Based on the finding that instruction-following quality degrades uniformly as instruction count increases — every line competes for the LLM's ~80% compliance budget.

## The Core Principle

**CLAUDE.md is for guidance, not inventory.** It should tell the LLM things it cannot derive from reading the code.

## Grading Criteria

### A — High signal (target: 15-30 lines)

- Every line is non-obvious guidance
- Philosophy over rules ("the compiler is the oracle, not the LLM")
- Extension recipes ("Adding a New X" in 3-4 steps)
- No file tables, no code examples duplicating source

### B — Good, minor fat (30-50 lines)

- Mostly useful, some derivable content
- Acceptable if trimming would lose context

### C — Mediocre, mixed signal (50-100 lines)

- Useful content buried under noise
- File tables that are `ls` output
- Redundancy with parent/sibling CLAUDE.md files

### D — Mostly noise (100+ lines)

- Content derivable from reading the code
- Code examples duplicating source files
- Tooling-enforced rules restated in prose

### F — Actively harmful (200+ lines)

- So long the LLM dilutes attention across hundreds of instructions
- Tries to be README + architecture doc + conventions guide simultaneously
- Should be split or cut by 60-70%

## Anti-Patterns

### 1. File tables that are glorified `ls`

```markdown
<!-- BAD: the filename already says this -->
| `parse-tasks.ts` | Parses tasks |
| `build-header.ts` | Builds the header |

<!-- GOOD: only if genuinely non-obvious -->
| `defaults.ts` | Composition root — only file allowed to cross module boundaries |
```

**Rule:** Delete the file table unless a file's purpose is surprising from its name. Replace with "Files follow SRP split; see directory listing."

### 2. Code examples duplicating source

```markdown
<!-- BAD: this exists verbatim in the actual source -->
```typescript
const log = config.logger ?? createConsoleLogger();
log.info('stage:start', 'Starting', { stage: 'my-stage' });
```

<!-- GOOD: one-line pointer -->
See `src/stages/ingest/jira.ts` for the pattern.
```

### 3. Redundancy between parent and child

The root CLAUDE.md should not restate content from subdirectory files. Use one-line pointers:

```markdown
<!-- BAD: 60-line directory tree duplicating 8 subdirectory CLAUDE.md files -->
src/analysis/bundle/
  parse-tasks.ts  — tasks.md -> ExtractedTask[]
  ...

<!-- GOOD -->
See subdirectory CLAUDE.md files for module details.
```

### 4. Documenting tooling-enforced rules

```markdown
<!-- BAD: this is already enforced by eslint-plugin-boundaries -->
Layer 2 may not import from Layer 3.

<!-- GOOD: only if the rule is non-obvious or has exceptions -->
Layer imports enforced by eslint-plugin-boundaries — see eslint.config.mjs.
```

### 5. Feature descriptions masquerading as instructions

```markdown
<!-- BAD: describes what exists, doesn't guide what to do -->
## Auto-LLM Mode
LLM stages spawn claude -p as a subprocess...
[15 lines of how it works]

<!-- GOOD: link to the module that owns it -->
Auto-LLM internals: see src/core/llm/CLAUDE.md
```

### 6. Testing sections with obvious content

```markdown
<!-- BAD: any competent developer would do this -->
Mock fs for the writer. Test with fixture files.

<!-- GOOD: only if the testing approach is surprising -->
Use `createProject({ useInMemoryFileSystem: true })` for ts-morph tests.
```

## Audit Process

1. **Count lines** across all CLAUDE.md files
2. **Grade each file** using the tier criteria above
3. **Identify the top anti-patterns** — which ones appear most often?
4. **Prioritize F-tier files** — these actively hurt LLM performance
5. **Cut, don't rewrite** — most noise can be deleted, not reworded
6. **Verify after trimming** — run the LLM against the codebase and check if compliance improves

## Ideal File Size by Scope

| Scope | Target lines | Example |
|-------|-------------|---------|
| Leaf module (3-7 files) | 15-30 | `execute/verify/CLAUDE.md` |
| Mid-level module (8-15 files) | 30-50 | `analysis/ac-compile/CLAUDE.md` |
| Top-level package | 50-80 | `apps/desktop/CLAUDE.md` |
| Root (entire repo) | 100-150 | `CLAUDE.md` |

## What Belongs in CLAUDE.md vs. Elsewhere

| Content | Where it belongs |
|---------|-----------------|
| Non-obvious conventions | CLAUDE.md |
| Extension recipes | CLAUDE.md |
| Philosophy / mentality | CLAUDE.md |
| Architecture overview | README.md |
| File inventory | `ls` / the code |
| API reference | TSDoc / type definitions |
| Dependency rules (enforced) | eslint config |
| Feature descriptions | README.md or docs/ |
| CLI reference | README.md or --help |
| Code examples | The source code itself |

## References

- [Anthropic postmortem (April 2026)](https://www.anthropic.com/engineering/april-23-postmortem) — reasoning effort, caching, and verbosity changes degraded Claude Code quality
- [AMD 6,852-session analysis](https://github.com/anthropics/claude-code/issues/42796) — thinking depth and file reads collapsed when harness config changed
- [HumanLayer: Writing a good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) — concise > verbose, instruction-following degrades with count
- [Arize: CLAUDE.md Best Practices](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/) — philosophy over rules
