import React from 'react';
import Data from '../../components/ui-v2/Data';
import { parseInline, parseMarkdown, type Block, type Inline } from '../../guides/markdown';

// ────────────────────────────────────────────────────────────────────────────
// G1 · A GUIDE'S PROSE, RENDERED. Walks the tree `guides/markdown.ts` parses —
// never HTML — so a guide can only ever render as text. Code spans are the
// tree's identifiers (transition ids, states, routes, fixture ids) and take the
// mono data grammar (DP-3); everything else is sans prose.
// ────────────────────────────────────────────────────────────────────────────

export const InlineText: React.FC<{ inline: readonly Inline[] }> = ({ inline }) => (
  <>
    {inline.map((x, i) => {
      if (x.kind === 'code') return <Data key={i} className="text-[11px]">{x.text}</Data>;
      if (x.kind === 'strong') {
        return (
          <strong key={i} className="font-semibold text-text-primary">
            <InlineText inline={x.children} />
          </strong>
        );
      }
      return <React.Fragment key={i}>{x.text}</React.Fragment>;
    })}
  </>
);

/** One line of guide text (a step field), inline markup only. */
export const GuideInline: React.FC<{ text: string }> = ({ text }) => <InlineText inline={parseInline(text)} />;

const BlockView: React.FC<{ block: Block }> = ({ block }) => {
  switch (block.kind) {
    case 'heading':
      return (
        <h4 className="mt-3 text-[12px] font-semibold text-text-primary">
          <InlineText inline={block.inline} />
        </h4>
      );
    case 'paragraph':
      return (
        <p className="max-w-prose text-[12px] leading-relaxed text-text-secondary">
          <InlineText inline={block.inline} />
        </p>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag className={`ml-4 space-y-1 text-[12px] leading-relaxed text-text-secondary ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
          {block.items.map((it, i) => (
            <li key={i}>
              <InlineText inline={it.inline} />
              {it.children.map((c, j) => (
                <BlockView key={j} block={c} />
              ))}
            </li>
          ))}
        </Tag>
      );
    }
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-bg-hover">
                {block.header.map((h, i) => (
                  <th key={i} className="border-b border-border-subtle px-2 py-1.5 text-left font-semibold text-text-secondary">
                    <InlineText inline={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i} className="border-b border-border-subtle align-top">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1.5 text-text-secondary">
                      <InlineText inline={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
};

/** A guide section, rendered from its markdown. */
const GuideMarkdown: React.FC<{ source: string; className?: string }> = ({ source, className = '' }) => (
  <div className={`space-y-2.5 ${className}`}>
    {parseMarkdown(source).map((b, i) => (
      <BlockView key={i} block={b} />
    ))}
  </div>
);

export default GuideMarkdown;
