import { visit } from 'unist-util-visit'
import type { Heading, PhrasingContent, Root, Table, TableRow } from 'mdast'
import { extractText } from './parse-claudemd.js'
import type { MdTable } from '../types/parsed.js'

/** Extract every GFM table with its column headers, row cell text, and source line. */
export function extractTables(tree: Root): MdTable[] {
  const tables: MdTable[] = []
  let lastHeading = ''

  visit(tree, (node) => {
    if (node.type === 'heading') {
      lastHeading = extractText(node as Heading)
      return
    }
    if (node.type !== 'table') return

    const table = node as Table
    const [headerRow, ...bodyRows] = table.children
    const columns = headerRow
      ? (headerRow as TableRow).children.map((cell) =>
          extractText(cell as { children?: PhrasingContent[] }),
        )
      : []
    const rows = bodyRows.map((row) =>
      (row as TableRow).children.map((cell) =>
        extractText(cell as { children?: PhrasingContent[] }),
      ),
    )

    tables.push({
      afterHeading: lastHeading,
      columns,
      rows,
      line: table.position?.start.line ?? 0,
    })
  })

  return tables
}
