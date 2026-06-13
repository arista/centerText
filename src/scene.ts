import type { RulerTick, Settings } from './types';

// Tick half-lengths (each side of the axis), in inches, by subdivision.
const TICK_HALF = {
  inch: 0.18,
  half: 0.12,
  quarter: 0.08,
  eighth: 0.05,
};

const RULER_MARGIN_IN = 0.15; // keep rulers just inside the page edge

/** Classify an eighth-inch position into its subdivision + label. */
function tickFor(pos: number): RulerTick {
  const abs = Math.abs(pos);
  const eighths = Math.round(abs * 8);
  let half = TICK_HALF.eighth;
  let label: string | null = null;
  if (eighths % 8 === 0) {
    half = TICK_HALF.inch;
    label = String(Math.round(pos)); // signed inch number, incl. "0"
  } else if (eighths % 4 === 0) {
    half = TICK_HALF.half;
  } else if (eighths % 2 === 0) {
    half = TICK_HALF.quarter;
  }
  return { pos, half, label };
}

/**
 * Generate ticks from -extent..+extent at 1/8" spacing. `extent` is the usable
 * half-length of the axis (so the ruler doubles as a straightedge across the
 * page without overrunning the edge).
 */
export function rulerTicks(extent: number): RulerTick[] {
  const ticks: RulerTick[] = [];
  const maxEighth = Math.floor(extent * 8);
  for (let k = -maxEighth; k <= maxEighth; k++) {
    ticks.push(tickFor(k / 8));
  }
  return ticks;
}

export interface SceneGeometry {
  pageW: number;
  pageH: number;
  xExtent: number; // half-length of the horizontal ruler (in)
  yExtent: number; // half-length of the vertical ruler (in)
  xTicks: RulerTick[];
  yTicks: RulerTick[];
}

export function buildScene(s: Settings): SceneGeometry {
  const xExtent = Math.max(0, s.pageW / 2 - RULER_MARGIN_IN);
  const yExtent = Math.max(0, s.pageH / 2 - RULER_MARGIN_IN);
  return {
    pageW: s.pageW,
    pageH: s.pageH,
    xExtent,
    yExtent,
    xTicks: s.showRulers ? rulerTicks(xExtent) : [],
    yTicks: s.showRulers ? rulerTicks(yExtent) : [],
  };
}
