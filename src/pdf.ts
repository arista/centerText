import { PDFDocument, StandardFonts, rgb, type PDFPage, type RGB } from 'pdf-lib';
import type { Settings } from './types';
import { buildScene } from './scene';
import { fontShorthand, layoutText } from './text';
import { inToPt } from './units';

const DPI = 600; // raster resolution for the text glyphs
const TEXT_PAD_IN = 0.06; // padding around the rasterised text block

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Rasterise the (already-loaded) text block to a transparent PNG data URL. */
function rasterizeText(s: Settings): { dataUrl: string; wIn: number; hIn: number } | null {
  const layout = layoutText(s);
  if (!layout.lines.some((l) => l.length) || layout.blockW <= 0) return null;

  const wIn = layout.blockW + 2 * TEXT_PAD_IN;
  const hIn = layout.blockH + 2 * TEXT_PAD_IN;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(wIn * DPI));
  canvas.height = Math.max(1, Math.ceil(hIn * DPI));
  const ctx = canvas.getContext('2d')!;

  // scene (in, y-down) -> canvas px, with the block's top-left at the padding.
  const px = (x: number) => (x + layout.blockW / 2 + TEXT_PAD_IN) * DPI;
  const py = (y: number) => (y - layout.top + TEXT_PAD_IN) * DPI;

  ctx.fillStyle = s.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = fontShorthand(s, layout.fontSizeIn * DPI);
  layout.lines.forEach((line, i) => {
    if (line.length) ctx.fillText(line, px(0), py(layout.baselines[i]));
  });

  return { dataUrl: canvas.toDataURL('image/png'), wIn, hIn };
}

/** Build the print-ready PDF and return its bytes. */
export async function buildPdf(s: Settings): Promise<Uint8Array> {
  const scene = buildScene(s);
  const doc = await PDFDocument.create();
  const pageWpt = inToPt(s.pageW);
  const pageHpt = inToPt(s.pageH);
  const page = doc.addPage([pageWpt, pageHpt]);
  const labelFont = await doc.embedFont(StandardFonts.Helvetica);

  // scene inch coords (origin centre, y-down) -> PDF points (origin BL, y-up)
  const Xp = (x: number) => pageWpt / 2 + inToPt(x);
  const Yp = (y: number) => pageHpt / 2 - inToPt(y);

  if (s.showRulers) drawRulers(page, scene, s, labelFont, Xp, Yp);

  if (s.showOutline) {
    page.drawRectangle({
      x: Xp(-s.outlineW / 2),
      y: Yp(s.outlineH / 2),
      width: inToPt(s.outlineW),
      height: inToPt(s.outlineH),
      borderColor: hexToRgb(s.outlineColor),
      borderWidth: inToPt(0.012),
    });
  }

  const raster = rasterizeText(s);
  if (raster) {
    const png = await doc.embedPng(raster.dataUrl);
    const wPt = inToPt(raster.wIn);
    const hPt = inToPt(raster.hIn);
    // The block's ink box is centred on the origin and padding is symmetric, so
    // the image is centred on (0,0) — i.e. the page centre. Centre it directly.
    page.drawImage(png, {
      x: pageWpt / 2 - wPt / 2,
      y: pageHpt / 2 - hPt / 2,
      width: wPt,
      height: hPt,
    });
  }

  return doc.save();
}

function drawRulers(
  page: PDFPage,
  scene: ReturnType<typeof buildScene>,
  s: Settings,
  labelFont: import('pdf-lib').PDFFont,
  Xp: (x: number) => number,
  Yp: (y: number) => number,
): void {
  const color = hexToRgb(s.rulerColor);
  const axisW = inToPt(0.006);
  const tickW = inToPt(0.004);
  const labelSize = inToPt(0.1);

  // Axes
  page.drawLine({ start: { x: Xp(-scene.xExtent), y: Yp(0) }, end: { x: Xp(scene.xExtent), y: Yp(0) }, thickness: axisW, color });
  page.drawLine({ start: { x: Xp(0), y: Yp(-scene.yExtent) }, end: { x: Xp(0), y: Yp(scene.yExtent) }, thickness: axisW, color });

  // Horizontal ruler ticks (vertical strokes) + labels below
  for (const t of scene.xTicks) {
    page.drawLine({ start: { x: Xp(t.pos), y: Yp(-t.half) }, end: { x: Xp(t.pos), y: Yp(t.half) }, thickness: tickW, color });
    if (t.label && t.label !== '0') {
      const w = labelFont.widthOfTextAtSize(t.label, labelSize);
      page.drawText(t.label, { x: Xp(t.pos) - w / 2, y: Yp(t.half) - labelSize - inToPt(0.02), size: labelSize, font: labelFont, color });
    }
  }

  // Vertical ruler ticks (horizontal strokes) + labels to the right
  for (const t of scene.yTicks) {
    page.drawLine({ start: { x: Xp(-t.half), y: Yp(t.pos) }, end: { x: Xp(t.half), y: Yp(t.pos) }, thickness: tickW, color });
    if (t.label && t.label !== '0') {
      page.drawText(t.label, { x: Xp(t.half) + inToPt(0.04), y: Yp(t.pos) - labelSize / 2.6, size: labelSize, font: labelFont, color });
    }
  }
}
