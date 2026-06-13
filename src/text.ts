import type { Settings, TextLayout } from './types';
import { ptToIn } from './units';

// We measure at a high virtual resolution so glyph metrics are precise and
// independent of any on-screen scale, then divide back down to inches.
const MEASURE_PX_PER_IN = 1000;

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d')!;
  }
  return measureCtx;
}

export function fontShorthand(s: Settings, sizePx: number): string {
  const style = s.italic ? 'italic ' : '';
  return `${style}${s.fontWeight} ${sizePx}px "${s.fontFamily}"`;
}

/** Split text into lines, treating an empty string as a single blank line. */
export function splitLines(text: string): string[] {
  const lines = text.split('\n');
  return lines.length ? lines : [''];
}

/**
 * Lay out the text block in inches, y-down, horizontally centered at x=0 and
 * vertically centered on its *ink* box at y=0. Centering uses real glyph
 * bounding boxes (not the font's line box) so the visible strokes sit on the
 * origin — which is what matters when aligning over a card.
 */
export function layoutText(s: Settings): TextLayout {
  const ctx = getMeasureCtx();
  const fontSizeIn = ptToIn(s.fontSizePt);
  const measurePx = fontSizeIn * MEASURE_PX_PER_IN;
  ctx.font = fontShorthand(s, measurePx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const lines = splitLines(s.text);
  const metrics = lines.map((l) => ctx.measureText(l.length ? l : ' '));
  const widths = metrics.map((m) => m.width / MEASURE_PX_PER_IN);
  const aba = metrics.map((m) => m.actualBoundingBoxAscent / MEASURE_PX_PER_IN);
  const abd = metrics.map((m) => m.actualBoundingBoxDescent / MEASURE_PX_PER_IN);

  const pitch = fontSizeIn * s.lineHeight; // baseline-to-baseline (in)
  const n = lines.length;

  // Provisional baselines with line 0's baseline at 0 (y-down).
  const rawBaselines = lines.map((_, i) => i * pitch);
  const inkTop = rawBaselines[0] - aba[0];
  const inkBottom = rawBaselines[n - 1] + abd[n - 1];
  const shift = -(inkTop + inkBottom) / 2; // recentre ink box on y=0

  const baselines = rawBaselines.map((b) => b + shift);
  const blockW = Math.max(0, ...widths);
  const top = inkTop + shift;
  const bottom = inkBottom + shift;

  return {
    lines,
    baselines,
    widths,
    blockW,
    blockH: bottom - top,
    top,
    bottom,
    fontSizeIn,
  };
}
