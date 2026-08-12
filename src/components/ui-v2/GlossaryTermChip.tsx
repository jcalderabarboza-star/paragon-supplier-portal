import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import Data from './Data';
import { glossaryAnchor, type GlossaryRef } from '../../lib/glossary';

// ────────────────────────────────────────────────────────────────────────────
// GL-1 · THE TERM CHIP — the end of a dead end.
//
// ⚠️ **WHY THIS EXISTS.** `HALAL-REFUSAL-DEAD-ENDS-01`: the goods-receipt smoke
// found a refusal that tells a clerk only that they are STUCK. Every refusal
// render in this tree was a terminal — a correct sentence with nowhere to go
// from. This chip gives the sentence a destination.
//
// ── WHAT IT DOES **NOT** DO, AND THE ROW MUST NOT READ AS CLOSED ───────────
//   It routes to a DEFINITION, not to a REMEDY. The clerk learns what
//   `UNDETERMINED_APPLICABILITY` means; they still do not learn who rules on it,
//   where, or what happens to the pallet meanwhile. That is `remedyRoute` —
//   DECLARED AND ABSENT EVERYWHERE, blocked on D-COMP-HALAL-4 — and the
//   glossary page says so in the reader's own language rather than letting the
//   presence of a link imply an answer. The finding's own warning is the fence:
//   build the destination and the message together, or ship a second dead end
//   with better manners.
//
// ── THE PROP IS ONE `GlossaryRef`, AND THAT IS THE WHOLE SAFETY ARGUMENT ────
//   `GlossaryRef` is DERIVED from `GLOSSARY_REGISTRIES` (see `lib/glossary`), so
//   `sourceType` and `term` cannot disagree: a chip naming `QtyRefusalReason`
//   with `FX_STALE` does not compile, and a term deleted from a source union
//   stops compiling at every site that pointed at it. Two loose strings would
//   have made the attachment MECHANICAL BUT UNCHECKED — the shape that lets a
//   link rot into a 404 silently, which on a page about honesty is the one
//   defect that costs the most.
//
// DP-2: teal, because a glossary link is a low-emphasis VIEW link — never an
// action. The refused sentence beside it keeps whatever semantic colour it had;
// nothing here recolours a refusal.
// ────────────────────────────────────────────────────────────────────────────

const GlossaryTermChip: React.FC<{
  /** The term to define. Typed so the vocabulary and the word cannot disagree. */
  refTo: GlossaryRef;
  className?: string;
}> = ({ refTo, className = '' }) => {
  const { t } = useTranslation();
  const anchor = glossaryAnchor(refTo);
  return (
    <Link
      to={`/glossary?term=${encodeURIComponent(anchor)}`}
      data-testid={`glossary-chip-${anchor}`}
      data-glossary-term={anchor}
      aria-label={t('glossary.chip.aria', { term: refTo.term })}
      title={t('glossary.chip.label')}
      className={`inline-flex max-w-full items-center gap-1 rounded border border-teal/30 bg-teal/5 px-1.5 py-0.5 align-middle text-[10px] text-teal transition-colors hover:bg-teal/10 ${className}`}
    >
      <BookOpen size={10} aria-hidden="true" className="shrink-0" />
      {/* The TOKEN verbatim, mono — the ProcessFlows precedent. It is what a
          reader traces back to the source union, and translating it would put a
          second spelling of a type member into the tree. */}
      <Data className="truncate text-[10px] text-teal">{refTo.term}</Data>
    </Link>
  );
};

export default GlossaryTermChip;
