import { visit } from 'unist-util-visit'
import type { Code, Root } from 'mdast'
import type { CodeBlock } from '../types/parsed.js'

const RECOGNIZED_LANGS = new Set(['ts', 'tsx', 'js', 'jsx', 'mts', 'mjs', 'bash', 'sh', 'shell', 'typescript', 'javascript'])

/** Extract every fenced code block with a recognized language tag. */
export function extractCodeBlocks(tree: Root): CodeBlock[] {
  const blocks: CodeBlock[] = []

  visit(tree, 'code', (node: Code) => {
    const lang = (node.lang ?? '').trim().toLowerCase()
    if (!RECOGNIZED_LANGS.has(lang)) return

    blocks.push({
      lang,
      value: node.value,
      line: node.position?.start.line ?? 0,
    })
  })

  return blocks
}
