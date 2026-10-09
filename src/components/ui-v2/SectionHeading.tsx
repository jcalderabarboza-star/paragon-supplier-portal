import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// UI-1c-1 · THE ONE SECTION HEADING.
//
// There are two headings under a page title, and only two (operator ruling,
// 9 October 2026):
//
//   section   the name of a block of the page or a drawer    Inter 16 semibold
//   group     a label over a cluster inside a block          Inter 11 semibold caps, grey
//
// The inventory found `<h2>` in nine styles, `<h3>` in six and `<h4>` in three:
// the same two ideas, spelled by hand at every size from 9px to 20px. A page
// states the LEVEL; the type is here. `as` picks the element for the outline
// and changes nothing about how it reads.
// ─────────────────────────────────────────────────────────────────────────────

export type HeadingLevel = 'section' | 'group';

export const HEADING_CLASS: Record<HeadingLevel, string> = {
  section: 'font-sans text-section text-text-primary',
  group: 'font-sans text-label text-text-tertiary uppercase',
};

interface SectionHeadingProps {
  level?: HeadingLevel;
  /** The element. Defaults to `h2` for a section and `h3` for a group. */
  as?: 'h2' | 'h3' | 'h4';
  children: React.ReactNode;
  /** Layout only — a margin, a flex row. Never a size, a weight or a colour. */
  className?: string;
  id?: string;
  'data-testid'?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({
  level = 'section',
  as,
  children,
  className = '',
  id,
  'data-testid': testId,
}) => {
  const Tag = as ?? (level === 'section' ? 'h2' : 'h3');
  return (
    <Tag id={id} data-testid={testId} data-heading={level} className={`${HEADING_CLASS[level]} ${className}`}>
      {children}
    </Tag>
  );
};

export default SectionHeading;
