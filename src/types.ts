// All physical dimensions are stored in inches; font size is stored in points
// (1pt = 1/72"). The PDF is built in points, so this keeps the print path exact.

export interface Settings {
  // Text
  text: string; // may contain newlines for multi-line
  fontFamily: string; // a Google Fonts family name
  fontWeight: number; // 100..900
  italic: boolean;
  fontSizePt: number; // typographic size, in points
  sizeUnit: SizeUnit; // unit shown in the UI (size is always stored as pt)
  lineHeight: number; // multiple of font size (em), e.g. 1.15
  textColor: string; // hex

  // Page (inches)
  pagePreset: string; // key into PAGE_PRESETS, or 'custom'
  pageW: number;
  pageH: number;

  // Outline (inches), optional
  showOutline: boolean;
  outlineW: number;
  outlineH: number;
  outlineColor: string;

  // Rulers
  showRulers: boolean;
  rulerColor: string;

  // User's saved Google Fonts (family names), restored on next visit
  favorites: string[];
}

export type SizeUnit = 'pt' | 'in' | 'mm';

// A Google Fonts family and the variants we can request from the CSS API.
export interface FontEntry {
  family: string;
  category: string; // serif | sans-serif | display | handwriting | monospace
  weights: number[]; // available numeric weights
  italics: boolean; // whether italic variants exist
}

// Layout of the (possibly multi-line) text block, all values in INCHES,
// in a y-down coordinate system centered horizontally at x=0 and vertically
// centered (ink box) at y=0.
export interface TextLayout {
  lines: string[];
  baselines: number[]; // y of each line's baseline (in)
  widths: number[]; // width of each line (in)
  blockW: number; // widest line (in)
  blockH: number; // ink height of the whole block (in)
  top: number; // y of the block's ink top (in, negative)
  bottom: number; // y of the block's ink bottom (in, positive)
  fontSizeIn: number; // em size in inches
}

// A horizontal or vertical ruler tick.
export interface RulerTick {
  pos: number; // signed position along the axis (in)
  half: number; // half-length of the tick, perpendicular to the axis (in)
  label: string | null; // inch label, if any
}
