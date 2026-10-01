// ────────────────────────────────────────────────────────────────────────────
// G1 · THE GUIDES' MARKDOWN, AS A SMALL TREE — no dependency, no HTML.
//
// The guides use a narrow subset (README §Sections): paragraphs, `-` and `1.`
// lists (nested by indentation), pipe tables, `##`–`####` headings, and inline
// `**strong**` and `` `code` ``. This parses exactly that into blocks a React
// renderer walks. It never produces HTML, so nothing in a guide can inject
// markup into the page — a guide is prose, and it renders as prose.
//
// Anything outside the subset renders as the text it is; it is never dropped.
// ────────────────────────────────────────────────────────────────────────────

export type Inline =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'strong'; readonly children: readonly Inline[] };

export interface ListItem {
  readonly inline: readonly Inline[];
  readonly children: readonly Block[];
}

export type Block =
  | { readonly kind: 'heading'; readonly level: number; readonly inline: readonly Inline[] }
  | { readonly kind: 'paragraph'; readonly inline: readonly Inline[] }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly ListItem[] }
  | { readonly kind: 'table'; readonly header: readonly (readonly Inline[])[]; readonly rows: readonly (readonly (readonly Inline[])[])[] };

/** `**strong**` and `` `code` ``; everything else is text, verbatim. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ kind: 'text', text });
    text = '';
  };
  let i = 0;
  while (i < src.length) {
    if (src[i] === '`') {
      const close = src.indexOf('`', i + 1);
      if (close > i) {
        flush();
        out.push({ kind: 'code', text: src.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }
    if (src.startsWith('**', i)) {
      const close = src.indexOf('**', i + 2);
      if (close > i + 2) {
        flush();
        out.push({ kind: 'strong', children: parseInline(src.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }
    text += src[i];
    i += 1;
  }
  flush();
  return out;
}

const LIST_ITEM = /^(\s*)(?:[-*]|\d+\.)\s+(.*)$/;
const indentOf = (line: string) => /^\s*/.exec(line)![0].length;
const cellsOf = (row: string) =>
  row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => parseInline(c.trim()));

function parseList(lines: readonly string[], start: number): { block: Block; next: number } {
  const base = indentOf(lines[start]);
  const ordered = /^\s*\d+\./.test(lines[start]);
  const items: { inline: Inline[]; children: Block[]; text: string }[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') break;
    const m = LIST_ITEM.exec(line);
    const indent = indentOf(line);
    if (m && indent === base) {
      items.push({ inline: [], children: [], text: m[2] });
      i += 1;
      continue;
    }
    if (m && indent > base && items.length > 0) {
      const sub = parseList(lines, i);
      items[items.length - 1].children.push(sub.block);
      i = sub.next;
      continue;
    }
    if (!m && indent > base && items.length > 0) {
      // A continuation line of the item above.
      items[items.length - 1].text += ` ${line.trim()}`;
      i += 1;
      continue;
    }
    break;
  }
  return {
    block: { kind: 'list', ordered, items: items.map((it) => ({ inline: parseInline(it.text), children: it.children })) },
    next: i,
  };
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || /^<!--.*-->$/.test(trimmed)) {
      i += 1;
      continue;
    }
    const h = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length, inline: parseInline(h[2]) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(lines[i++]);
      const body = rows.filter((r, n) => !(n === 1 && /^\|?[\s:|-]+\|?$/.test(r.trim())));
      blocks.push({ kind: 'table', header: cellsOf(body[0]), rows: body.slice(1).map(cellsOf) });
      continue;
    }
    if (LIST_ITEM.test(line)) {
      const { block, next } = parseList(lines, i);
      blocks.push(block);
      i = next;
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('|') &&
      !LIST_ITEM.test(lines[i]) &&
      !/^#{2,4}\s/.test(lines[i].trim())
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'paragraph', inline: parseInline(para.join(' ')) });
  }
  return blocks;
}

/** The first paragraph as plain text — the catalogue card's one-line summary. */
export function firstParagraphText(src: string): string {
  const first = parseMarkdown(src).find((b) => b.kind === 'paragraph');
  if (!first || first.kind !== 'paragraph') return '';
  const flat = (xs: readonly Inline[]): string =>
    xs.map((x) => (x.kind === 'strong' ? flat(x.children) : x.text)).join('');
  return flat(first.inline);
}
