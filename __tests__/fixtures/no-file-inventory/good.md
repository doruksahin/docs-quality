# Good doc

This module owns the X. Read the directory listing for files.

## Surprising files

| File | Why it's here |
|------|---------------|
| `defaults.ts` | Composition root — only file allowed to cross module boundaries; everything else imports through here |
| `legacy-shim.ts` | Wraps the v1 API for callers that haven't migrated to v2; remove after Q3 |
| `unsafe.ts` | Marked unsafe because it bypasses the validation layer for the migration-only code path |
