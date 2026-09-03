import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { STEP_KIND_KEY } from '../../lib/i18n/stepKind';
import type { FlowView, StepKind } from '../../services/transitions/catalogView';
import { layoutFlow, verbOf, NODE_W, NODE_H, type LaidOutEdge } from './flowLayout';
import { EDGE_INK } from '../../lib/chartPalette';

// ────────────────────────────────────────────────────────────────────────────
// PF-1 · THE FLOW DIAGRAM. Every mark on it is a fact the schema declares.
//
// HTML nodes over an SVG edge layer, rather than an all-SVG drawing. Two
// reasons, both of them about honesty rather than taste: state names are the
// schema's own strings and vary in length, so they must WRAP instead of being
// truncated to fit a rect; and the chrome around them (badges, the census
// reason chip) is bilingual, so it has to reflow with the translation. SVG text
// does neither without a layout pass that would be guessing at glyph widths.
//
// ⚠️ NOTHING HERE IS AUTHORED. No node exists that `flow.states` does not list;
// no edge exists that `edgesOf` did not produce; the verb on an edge is a slice
// of the transition's own id. There is deliberately no prop by which a caller
// could add, hide or rename any of it.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Edge ink. Dash pattern carries the distinction, colour only reinforces it —
 * the same colourblind-safe discipline as the DP2-TARGET-01 bars (position vs
 * tick, never colour alone).
 */
interface EdgeInk {
  readonly stroke: string;
  readonly dash?: string;
  readonly marker: string;
}

// EDGE-INK-AXIS-01 — bound from the palette in the #303 pattern. These four
// travel together as ONE axis (edge provenance: who or what moved the entity),
// which is why they are named there rather than here. Byte-identical to what
// this diagram rendered before the axis existed; the dash pattern below still
// carries the distinction, colour only reinforces it.
const OPERATOR = EDGE_INK.operator;
const SYSTEM = EDGE_INK.system;
const CROSS = EDGE_INK.cross;
const BIRTH = EDGE_INK.birth;

function inkFor(edge: LaidOutEdge['edge']): EdgeInk {
  if (edge.settlement) return { stroke: CROSS, dash: '10 4 2 4', marker: 'cross' };
  if (edge.cascade) return { stroke: CROSS, dash: '2 4', marker: 'cross' };
  if (edge.kind === 'creation') return { stroke: BIRTH, marker: 'birth' };
  if (edge.kind === 'system-driven') return { stroke: SYSTEM, dash: '6 4', marker: 'system' };
  // An `unsurfaced-act` edge keeps the OPERATOR ink deliberately — a person
  // really could perform it — and is drawn finely dotted to say the platform
  // offers no way to. Colour alone never carries it: the dash does the work,
  // so the distinction survives a colourblind reader (DP-2).
  if (edge.kind === 'unsurfaced-act')
    return { stroke: OPERATOR, dash: '1 3', marker: 'operator' };
  return { stroke: OPERATOR, marker: 'operator' };
}

const MARKERS: readonly { key: string; color: string }[] = [
  { key: 'operator', color: OPERATOR },
  { key: 'system', color: SYSTEM },
  { key: 'cross', color: CROSS },
  { key: 'birth', color: BIRTH },
];

const Badge: React.FC<{ tone: 'neutral' | 'teal' | 'warning'; children: React.ReactNode }> = ({
  tone,
  children,
}) => {
  const cls =
    tone === 'teal'
      ? 'bg-teal-soft text-teal-hover border-teal/30'
      : tone === 'warning'
        ? 'bg-warning-soft text-warning-hover border-warning/40'
        : 'bg-bg-hover text-text-tertiary border-border-subtle';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-sm border px-1 py-px text-[9px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
};

interface FlowDiagramProps {
  view: FlowView;
  /** The lifecycle walk's local cursor. Highlight only — it moves nothing. */
  cursor: string | null;
  /** Unique per mounted diagram, so two on one page cannot share arrowheads. */
  idPrefix: string;
}

const FlowDiagram: React.FC<FlowDiagramProps> = ({ view, cursor, idPrefix }) => {
  const { t } = useTranslation();
  const layout = useMemo(() => layoutFlow(view), [view]);
  const stateByName = useMemo(
    () => new Map(view.states.map((s) => [s.name, s])),
    [view.states],
  );
  const transitionById = useMemo(
    () => new Map(view.transitions.map((tr) => [tr.def.id, tr])),
    [view.transitions],
  );

  const kindLabel = (kind: StepKind): string => t(STEP_KIND_KEY[kind]);

  return (
    <div className="overflow-x-auto">
      <div
        className="relative"
        style={{ width: layout.width, height: layout.height, minWidth: layout.width }}
        role="group"
        aria-label={t('processFlows.diagram.aria', {
          entity: view.entity,
          states: view.stateCount,
          transitions: view.transitionCount,
        })}
      >
        <svg
          width={layout.width}
          height={layout.height}
          className="absolute left-0 top-0"
          aria-hidden="true"
        >
          <defs>
            {MARKERS.map((m) => (
              <marker
                key={m.key}
                id={`${idPrefix}-arrow-${m.key}`}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 8 4 L 0 8 z" fill={m.color} />
              </marker>
            ))}
          </defs>
          {layout.edges.map((laid) => {
            const ink = inkFor(laid.edge);
            return (
              <g key={laid.edge.id}>
                {laid.route === 'birth' && (
                  <circle
                    cx={laid.labelX - 28}
                    cy={laid.labelY + 13}
                    r="3.5"
                    fill={BIRTH}
                  />
                )}
                <path
                  d={laid.path}
                  fill="none"
                  stroke={ink.stroke}
                  strokeWidth="1.5"
                  strokeDasharray={ink.dash}
                  markerEnd={`url(#${idPrefix}-arrow-${ink.marker})`}
                >
                  <title>
                    {`${laid.edge.transitionId} · ${laid.edge.from ?? t('processFlows.badge.birth')} → ${laid.edge.to}`}
                  </title>
                </path>
              </g>
            );
          })}
        </svg>

        {/* State nodes. */}
        {layout.nodes.map((node) => {
          const state = stateByName.get(node.name);
          if (!state) return null;
          const end = state.looseEnds[0];
          const isCursor = cursor === node.name;
          return (
            <div
              key={node.name}
              data-testid={`pf-node-${node.name}`}
              className={[
                'absolute rounded-md border bg-bg-surface px-2.5 py-2 flex flex-col justify-between shadow-sm',
                state.reachable ? 'border-border-subtle' : 'border-dashed border-warning',
                isCursor ? 'ring-2 ring-action ring-offset-1' : '',
              ].join(' ')}
              style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
            >
              <span className="font-mono text-[11px] leading-tight text-data-navy break-words">
                {node.name}
              </span>
              <span className="flex flex-wrap items-center gap-1">
                {state.isBirth && <Badge tone="teal">{t('processFlows.badge.birth')}</Badge>}
                {state.isInitial && !state.isBirth && (
                  <Badge tone="teal">{t('processFlows.badge.initial')}</Badge>
                )}
                {state.isTerminal && <Badge tone="neutral">{t('processFlows.badge.terminal')}</Badge>}
                {state.isFork && <Badge tone="neutral">{t('processFlows.badge.fork')}</Badge>}
                {state.facts.length > 0 && (
                  <Badge tone="neutral">{t('processFlows.badge.fact')}</Badge>
                )}
                {end ? (
                  <Badge tone="warning">
                    {end.reason ?? t('processFlows.reason.uncensused')}
                  </Badge>
                ) : null}
              </span>
            </div>
          );
        })}
        {/* Edge verb labels — HTML so they reflow, and so the census reason
            token can sit ON the edge it concerns rather than in a key.
            ⚠️ RENDERED AFTER THE NODES, deliberately. A reason chip
            (`authored-unwired`) is wider than the gap between two columns, and
            painted under the nodes its first and last letters disappear —
            `authored-unwired` read as `uthored-unwire`, which is not a
            degraded label, it is a different word. Labels only ever sit in the
            gaps or the lanes, so nothing they cover is a state name. */}
        {layout.edges.map((laid) => {
          const transition = transitionById.get(laid.edge.transitionId);
          const end = transition?.looseEnds[0];
          return (
            <div
              key={`label-${laid.edge.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-px"
              style={{ left: laid.labelX, top: laid.labelY }}
            >
              <span
                className="whitespace-nowrap rounded-sm bg-bg-page/95 px-1 font-mono text-[10px] text-text-secondary"
                title={laid.edge.transitionId}
              >
                {verbOf(laid.edge.transitionId)}
                {laid.edge.settlement ? ` ${t('processFlows.badge.settles')}` : ''}
              </span>
              {end ? (
                <Badge tone="warning">
                  {end.reason ?? t('processFlows.reason.uncensused')}
                </Badge>
              ) : null}
            </div>
          );
        })}

      </div>

      {/* Legend — the reading key for the four edge styles. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border-subtle pt-3">
        {(
          [
            { kind: 'operator-action' as StepKind, stroke: OPERATOR, dash: undefined },
            { kind: 'system-driven' as StepKind, stroke: SYSTEM, dash: '6 4' },
            { kind: 'unsurfaced-act' as StepKind, stroke: OPERATOR, dash: '1 3' },
            { kind: 'creation' as StepKind, stroke: BIRTH, dash: undefined },
          ]
        ).map((item) => (
          <span key={item.kind} className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <svg width="26" height="8" aria-hidden="true">
              <path
                d="M 0 4 L 26 4"
                stroke={item.stroke}
                strokeWidth="1.5"
                strokeDasharray={item.dash}
                fill="none"
              />
            </svg>
            {kindLabel(item.kind)}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <svg width="26" height="8" aria-hidden="true">
            <path d="M 0 4 L 26 4" stroke={CROSS} strokeWidth="1.5" strokeDasharray="2 4" fill="none" />
          </svg>
          {t('processFlows.legend.cascade')}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
          <svg width="26" height="8" aria-hidden="true">
            <path d="M 0 4 L 26 4" stroke={CROSS} strokeWidth="1.5" strokeDasharray="10 4 2 4" fill="none" />
          </svg>
          {t('processFlows.legend.settlement')}
        </span>
      </div>
    </div>
  );
};

export default FlowDiagram;
