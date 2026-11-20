import type { ReactNode } from "react"

/**
 * Minimal, safe Markdown for assistant replies: paragraphs, headings,
 * bullet and numbered lists, **bold**, *italic* and `code`.
 * Builds React elements only; never injects HTML.
 */

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    const k = `${keyBase}-${i++}`
    if (tok.startsWith("**")) out.push(<strong key={k} className="font-semibold">{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-wash px-1 py-0.5 text-[0.9em]">{tok.slice(1, -1)}</code>)
    else out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "h"; text: string }
  | { kind: "ul" | "ol"; items: string[] }

export default function MessageText({ content }: { content: string }) {
  const blocks: Block[] = []
  for (const raw of content.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd()
    const last = blocks[blocks.length - 1]
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/)
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/)
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/)
    if (!line.trim()) {
      blocks.push({ kind: "p", lines: [] })
    } else if (heading) {
      blocks.push({ kind: "h", text: heading[1] })
    } else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1])
      else blocks.push({ kind: "ul", items: [bullet[1]] })
    } else if (numbered) {
      if (last?.kind === "ol") last.items.push(numbered[1])
      else blocks.push({ kind: "ol", items: [numbered[1]] })
    } else if (last?.kind === "p") {
      last.lines.push(line)
    } else {
      blocks.push({ kind: "p", lines: [line] })
    }
  }

  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink">
      {blocks.map((b, bi) => {
        if (b.kind === "h")
          return (
            <p key={bi} className="font-semibold text-ink">
              {inline(b.text, `h${bi}`)}
            </p>
          )
        if (b.kind !== "p") {
          const List = b.kind
          return (
            <List key={bi} className={`${b.kind === "ul" ? "list-disc" : "list-decimal"} space-y-1 pl-5 marker:text-ink-faint`}>
              {b.items.map((it, ii) => (
                <li key={ii}>{inline(it, `l${bi}-${ii}`)}</li>
              ))}
            </List>
          )
        }
        if (b.lines.length === 0) return null
        return (
          <p key={bi}>
            {b.lines.map((l, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(l, `p${bi}-${li}`)}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}
