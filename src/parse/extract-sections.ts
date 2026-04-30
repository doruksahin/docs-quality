import { visit } from 'unist-util-visit'
import type { Heading, Root, RootContent } from 'mdast'
import { extractText } from './parse-claudemd.js'
import type { MdSection } from '../types/parsed.js'

/**
 * Extract every heading with its body text — the prose between this heading
 * and the next heading at any depth. Capped at 600 chars per section
 * (enough for redundancy comparison without inflating shingle counts).
 */
export function extractSections(tree: Root): MdSection[] {
  const sections: MdSection[] = []

  // Index headings with their position in the children array
  const children = tree.children
  const headingIndices: number[] = []
  children.forEach((node, i) => {
    if (node.type === 'heading') headingIndices.push(i)
  })

  for (let h = 0; h < headingIndices.length; h++) {
    const idx = headingIndices[h]!
    const heading = children[idx] as Heading
    const start = idx + 1
    const end = h + 1 < headingIndices.length ? headingIndices[h + 1]! : children.length

    const bodyNodes: RootContent[] = children.slice(start, end)
    const bodyText = bodyNodes.map((n) => nodeToText(n)).join('\n').trim().slice(0, 600)

    sections.push({
      depth: heading.depth,
      title: extractText(heading),
      bodyText,
      line: heading.position?.start.line ?? 0,
    })
  }

  // Fall back: still walk to ensure no heading is missed if the tree is unusual
  const seen = new Set(sections.map((s) => `${s.depth}:${s.title}:${s.line}`))
  visit(tree, 'heading', (node: Heading) => {
    const key = `${node.depth}:${extractText(node)}:${node.position?.start.line ?? 0}`
    if (seen.has(key)) return
    sections.push({
      depth: node.depth,
      title: extractText(node),
      bodyText: '',
      line: node.position?.start.line ?? 0,
    })
  })

  return sections
}

function nodeToText(node: RootContent): string {
  if (node.type === 'code') return node.value
  if (node.type === 'html') return node.value
  if ('children' in node) return extractText(node as { children?: Array<{ type: string; value?: string; children?: unknown[] }> })
  if ('value' in node && typeof node.value === 'string') return node.value
  return ''
}
