import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { unified } from 'unified'
import type { Root } from 'mdast'

/** Parse markdown content into an mdast tree using the project's standard remark+gfm setup. */
export function parseToMdast(content: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(content)
}

/** Recursively extract plain text from an mdast node. */
export function extractText(node: { children?: Array<{ type: string; value?: string; children?: unknown[] }> }): string {
  if (!node.children) return ''
  return node.children
    .map((child) => {
      if (child.type === 'text' || child.type === 'inlineCode') return String(child.value ?? '')
      if (child.children) return extractText(child as typeof node)
      return ''
    })
    .join('')
}
