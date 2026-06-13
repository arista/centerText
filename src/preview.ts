import type { Settings } from './types';
import { buildScene, type SceneGeometry } from './scene';
import { fontShorthand, layoutText } from './text';
import type { TextLayout } from './types';

const FIT_PADDING = 0.94; // leave a little breathing room around the page

export interface PreviewState {
  fontReady: boolean; // false until the chosen font's glyphs are available
}

/**
 * Render a WYSIWYG preview onto `canvas`. The canvas is sized to the page's
 * aspect ratio and fit within its parent; everything is drawn in inches and
 * scaled by a single pixels-per-inch factor, so what you see matches the PDF.
 */
export function renderPreview(canvas: HTMLCanvasElement, s: Settings, state: PreviewState): void {
  const parent = canvas.parentElement;
  if (!parent) return;

  const availW = Math.max(40, parent.clientWidth);
  const availH = Math.max(40, parent.clientHeight);
  const scene = buildScene(s);

  // pixels-per-inch (CSS) so the whole page fits the available area.
  const sCss = Math.min(availW / scene.pageW, availH / scene.pageH) * FIT_PADDING;
  const dpr = window.devicePixelRatio || 1;
  const s_ = sCss * dpr; // device pixels per inch

  const cssW = scene.pageW * sCss;
  const cssH = scene.pageH * sCss;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(scene.pageW * s_);
  canvas.height = Math.round(scene.pageH * s_);

  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const X = (x: number) => cx + x * s_;
  const Y = (y: number) => cy + y * s_;

  // Page
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (s.showRulers) drawRulers(ctx, scene, s, s_, X, Y);
  if (s.showOutline) {
    ctx.strokeStyle = s.outlineColor;
    ctx.lineWidth = Math.max(1, 0.012 * s_);
    ctx.strokeRect(
      X(-s.outlineW / 2),
      Y(-s.outlineH / 2),
      s.outlineW * s_,
      s.outlineH * s_,
    );
  }

  if (state.fontReady) drawText(ctx, s, s_, X, Y);
  else drawPendingNote(ctx, canvas);

  // Page border on top so it frames the content.
  ctx.strokeStyle = '#d0d0d8';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
}

function drawRulers(
  ctx: CanvasRenderingContext2D,
  scene: SceneGeometry,
  s: Settings,
  s_: number,
  X: (x: number) => number,
  Y: (y: number) => number,
): void {
  ctx.strokeStyle = s.rulerColor;
  ctx.fillStyle = s.rulerColor;
  const axisW = Math.max(1, 0.006 * s_);
  const tickW = Math.max(0.75, 0.005 * s_);

  // Axis lines
  ctx.lineWidth = axisW;
  ctx.beginPath();
  ctx.moveTo(X(-scene.xExtent), Y(0));
  ctx.lineTo(X(scene.xExtent), Y(0));
  ctx.moveTo(X(0), Y(-scene.yExtent));
  ctx.lineTo(X(0), Y(scene.yExtent));
  ctx.stroke();

  // Ticks + labels
  ctx.lineWidth = tickW;
  const labelPx = Math.max(8, 0.11 * s_);
  ctx.font = `${labelPx}px system-ui, sans-serif`;

  // Horizontal ruler (along x-axis): vertical ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of scene.xTicks) {
    ctx.beginPath();
    ctx.moveTo(X(t.pos), Y(-t.half));
    ctx.lineTo(X(t.pos), Y(t.half));
    ctx.stroke();
    if (t.label && t.label !== '0') {
      ctx.fillText(t.label, X(t.pos), Y(t.half) + 2);
    }
  }

  // Vertical ruler (along y-axis): horizontal ticks
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const t of scene.yTicks) {
    ctx.beginPath();
    ctx.moveTo(X(-t.half), Y(t.pos));
    ctx.lineTo(X(t.half), Y(t.pos));
    ctx.stroke();
    if (t.label && t.label !== '0') {
      ctx.fillText(t.label, X(t.half) + 4, Y(t.pos));
    }
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  s: Settings,
  s_: number,
  X: (x: number) => number,
  Y: (y: number) => number,
): void {
  const layout: TextLayout = layoutText(s);
  ctx.fillStyle = s.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = fontShorthand(s, layout.fontSizeIn * s_);
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, X(0), Y(layout.baselines[i]));
  });
}

function drawPendingNote(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.fillStyle = '#999';
  ctx.font = '14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading font…', canvas.width / 2, canvas.height / 2);
}
