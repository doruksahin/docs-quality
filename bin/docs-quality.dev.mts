#!/usr/bin/env tsx
import { main } from '../src/cli/index.js'

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
