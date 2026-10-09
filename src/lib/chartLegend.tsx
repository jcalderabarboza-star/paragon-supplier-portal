import React from 'react';

/**
 * UI-1a · a chart legend's LABEL is text, so it takes a text colour. Recharts
 * paints the label in its series colour by default, and a series colour is a
 * graphic: the palette teal is 3.51:1 on white and its tint 2.07:1. The swatch
 * beside the label still carries the series colour.
 */
export const legendLabel = (value: React.ReactNode): React.ReactNode => (
  <span className="text-text-secondary">{value}</span>
);
