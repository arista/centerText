import './styles.css';
import { store } from './store';
import { buildApp, type App } from './ui';
import { renderPreview, type PreviewState } from './preview';
import { loadFont } from './fonts';
import { buildPdf } from './pdf';

const root = document.getElementById('app')!;
const state: PreviewState = { fontReady: false };

let app: App;
let canvas: HTMLCanvasElement;
let currentVariant = '';
let renderQueued = false;

function scheduleRender(): void {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview(canvas, store.get(), state);
  });
}

/** Load the active family/weight/style if it changed; redraw when ready. */
async function ensureFont(): Promise<void> {
  const s = store.get();
  const key = `${s.fontFamily}|${s.fontWeight}|${s.italic}`;
  if (key === currentVariant) return;
  currentVariant = key;
  state.fontReady = false;
  scheduleRender();
  await loadFont(s.fontFamily, s.fontWeight, s.italic);
  if (currentVariant === key) {
    state.fontReady = true; // draw with whatever resolved (real font or fallback)
    scheduleRender();
  }
}

async function onPrint(): Promise<void> {
  const s = store.get();
  app.setStatus('Generating PDF…');
  try {
    await loadFont(s.fontFamily, s.fontWeight, s.italic); // glyphs must exist to rasterise
    const bytes = await buildPdf(s);
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'centertext.pdf';
      a.click();
    }
    app.setStatus('PDF ready — print at 100% / “Actual size”.');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    app.setStatus('PDF failed: ' + (e as Error).message);
  }
}

app = buildApp(root, { onPrint });
canvas = app.canvas;

store.subscribe(() => {
  void ensureFont();
  scheduleRender();
});

void ensureFont();
scheduleRender();

if (canvas.parentElement) {
  new ResizeObserver(() => scheduleRender()).observe(canvas.parentElement);
}
window.addEventListener('resize', () => scheduleRender());

// Safety net: repaint whenever any font finishes loading, in case glyphs become
// available just after our explicit load resolved (or timed out).
document.fonts.addEventListener('loadingdone', () => {
  state.fontReady = true;
  scheduleRender();
});
