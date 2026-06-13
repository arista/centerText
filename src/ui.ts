import { store, PAGE_PRESETS, DEFAULTS } from './store';
import type { Settings, SizeUnit } from './types';
import { fetchFullCatalog, getCatalog, getEntry, resolveWeight } from './fonts';
import { ptToUnit, unitToPt, sizeStep, round } from './units';

type El = HTMLElement;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

function field(label: string, control: El, hint?: string): El {
  const children: (Node | string)[] = [el('span', { class: 'field-label' }, [label]), control];
  if (hint) children.push(el('span', { class: 'field-hint' }, [hint]));
  return el('label', { class: 'field' }, children);
}

export interface AppHandlers {
  onPrint: () => void;
}

export interface App {
  canvas: HTMLCanvasElement;
  setStatus: (msg: string) => void;
}

export function buildApp(root: El, handlers: AppHandlers): App {
  root.innerHTML = '';

  // --- header ---
  const status = el('span', { class: 'status' });
  const printBtn = el('button', { class: 'btn primary', id: 'printBtn' }, ['Generate PDF']);
  printBtn.addEventListener('click', () => handlers.onPrint());
  const header = el('header', { class: 'topbar' }, [
    el('div', { class: 'brand' }, [el('strong', {}, ['CenterText']), el('span', { class: 'tagline' }, ['center large text → printable template'])]),
    el('div', { class: 'topbar-right' }, [status, printBtn]),
  ]);

  // --- preview ---
  const canvas = el('canvas', { id: 'preview' });
  const stage = el('div', { class: 'stage' }, [canvas]);

  // --- controls ---
  const controls = el('aside', { class: 'controls' });
  const main = el('div', { class: 'layout' }, [controls, stage]);
  root.append(header, main);

  const sync = buildControls(controls);

  // keep inputs in sync when settings change elsewhere (presets, reset, fonts)
  store.subscribe(sync);
  sync(store.get());

  return { canvas, setStatus: (m) => (status.textContent = m) };
}

// Returns a function that pushes the current settings back into the controls.
function buildControls(root: El): (s: Settings) => void {
  const s0 = store.get();

  // Text -------------------------------------------------------------------
  const textArea = el('textarea', { rows: '2', class: 'text-input', placeholder: 'Your text…' }) as HTMLTextAreaElement;
  textArea.value = s0.text;
  textArea.addEventListener('input', () => store.set({ text: textArea.value }));

  // Font -------------------------------------------------------------------
  const fontBtn = el('button', { class: 'font-button' }) as HTMLButtonElement;
  fontBtn.addEventListener('click', () => openFontPicker());

  const weightSel = el('select', { class: 'inline' }) as HTMLSelectElement;
  weightSel.addEventListener('change', () => store.set({ fontWeight: parseInt(weightSel.value, 10) }));

  const italicChk = el('input', { type: 'checkbox', id: 'italic' }) as HTMLInputElement;
  italicChk.addEventListener('change', () => store.set({ italic: italicChk.checked }));
  const italicLabel = el('label', { class: 'check inline' }, [italicChk, el('span', {}, ['Italic'])]);

  // Size -------------------------------------------------------------------
  const sizeInput = el('input', { type: 'number', class: 'inline num', min: '1', step: '1' }) as HTMLInputElement;
  const unitSel = el('select', { class: 'inline' }) as HTMLSelectElement;
  for (const u of ['pt', 'in', 'mm'] as SizeUnit[]) unitSel.append(el('option', { value: u }, [u]));
  const applySize = () => {
    const unit = unitSel.value as SizeUnit;
    const pt = unitToPt(parseFloat(sizeInput.value) || 0, unit);
    store.set({ fontSizePt: Math.max(1, pt) });
  };
  sizeInput.addEventListener('input', applySize);
  unitSel.addEventListener('change', () => store.set({ sizeUnit: unitSel.value as SizeUnit }));

  const lineHeight = el('input', { type: 'number', class: 'inline num', min: '0.5', step: '0.05' }) as HTMLInputElement;
  lineHeight.addEventListener('input', () => store.set({ lineHeight: Math.max(0.5, parseFloat(lineHeight.value) || 1) }));

  const textColor = el('input', { type: 'color', class: 'color' }) as HTMLInputElement;
  textColor.addEventListener('input', () => store.set({ textColor: textColor.value }));

  // Page -------------------------------------------------------------------
  const presetSel = el('select', {}) as HTMLSelectElement;
  for (const [key, val] of Object.entries(PAGE_PRESETS)) {
    presetSel.append(el('option', { value: key }, [val ? val.label : 'Custom…']));
  }
  const pageW = numInput((v) => updatePage('pageW', v), '0.5');
  const pageH = numInput((v) => updatePage('pageH', v), '0.5');
  const swapBtn = el('button', { class: 'btn small', title: 'Swap width/height' }, ['⇄']);
  swapBtn.addEventListener('click', () => {
    const s = store.get();
    store.set({ pageW: s.pageH, pageH: s.pageW, pagePreset: 'custom' });
  });
  presetSel.addEventListener('change', () => {
    const preset = PAGE_PRESETS[presetSel.value];
    if (preset) store.set({ pagePreset: presetSel.value, pageW: preset.w, pageH: preset.h });
    else store.set({ pagePreset: 'custom' });
  });
  function updatePage(which: 'pageW' | 'pageH', v: number) {
    store.set({ [which]: Math.max(0.5, v), pagePreset: 'custom' } as Partial<Settings>);
  }
  const pageDims = el('div', { class: 'row' }, [
    field('Width (in)', pageW),
    field('Height (in)', pageH),
    swapBtn,
  ]);

  // Outline ----------------------------------------------------------------
  const outlineChk = checkbox((c) => store.set({ showOutline: c }));
  const outlineW = numInput((v) => store.set({ outlineW: Math.max(0.1, v) }), '0.25');
  const outlineH = numInput((v) => store.set({ outlineH: Math.max(0.1, v) }), '0.25');
  const outlineColor = el('input', { type: 'color', class: 'color' }) as HTMLInputElement;
  outlineColor.addEventListener('input', () => store.set({ outlineColor: outlineColor.value }));
  const outlineDims = el('div', { class: 'row' }, [
    field('Width (in)', outlineW),
    field('Height (in)', outlineH),
    field('Color', outlineColor),
  ]);

  // Rulers -----------------------------------------------------------------
  const rulerChk = checkbox((c) => store.set({ showRulers: c }));
  const rulerColor = el('input', { type: 'color', class: 'color' }) as HTMLInputElement;
  rulerColor.addEventListener('input', () => store.set({ rulerColor: rulerColor.value }));

  // Reset ------------------------------------------------------------------
  const resetBtn = el('button', { class: 'btn small' }, ['Reset all settings']);
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) store.set({ ...DEFAULTS });
  });

  root.append(
    section('Text', [
      field('Text (one line per row)', textArea),
      field('Font', fontBtn),
      el('div', { class: 'row' }, [field('Weight', weightSel), italicLabel]),
      el('div', { class: 'row' }, [field('Size', sizeInput), field('Unit', unitSel), field('Color', textColor)]),
      field('Line spacing (×)', lineHeight, 'Spacing between lines, as a multiple of size'),
    ]),
    section('Page', [field('Preset', presetSel), pageDims]),
    section('Outline', [labeledToggle('Show outline rectangle', outlineChk), outlineDims]),
    section('Rulers', [labeledToggle('Show centering rulers', rulerChk), field('Color', rulerColor)]),
    section('', [resetBtn]),
  );

  // --- font picker modal --------------------------------------------------
  let fullLoaded = false;
  function openFontPicker() {
    const overlay = el('div', { class: 'overlay' });
    const search = el('input', { type: 'text', class: 'search', placeholder: 'Search fonts…' }) as HTMLInputElement;
    const loadAll = el('button', { class: 'btn small' }, [fullLoaded ? 'All fonts loaded' : 'Load all Google Fonts']);
    const list = el('div', { class: 'font-list' });
    const close = el('button', { class: 'btn small ghost' }, ['Close']);

    const renderList = () => {
      const q = search.value.trim().toLowerCase();
      const favs = new Set(store.get().favorites);
      const all = getCatalog();
      const matches = (q ? all.filter((f) => f.family.toLowerCase().includes(q)) : all);
      // favorites first
      const ordered = [
        ...matches.filter((f) => favs.has(f.family)),
        ...matches.filter((f) => !favs.has(f.family)),
      ];
      const shown = ordered.slice(0, 300);
      list.innerHTML = '';
      for (const f of shown) {
        const star = el('button', { class: 'star' + (favs.has(f.family) ? ' on' : ''), title: 'Save font' }, [favs.has(f.family) ? '★' : '☆']);
        star.addEventListener('click', (e) => {
          e.stopPropagation();
          const cur = store.get().favorites;
          store.set({ favorites: favs.has(f.family) ? cur.filter((x) => x !== f.family) : [...cur, f.family] });
          renderList();
        });
        const row = el('div', { class: 'font-row' + (store.get().fontFamily === f.family ? ' active' : '') }, [
          el('span', { class: 'font-name' }, [f.family]),
          el('span', { class: 'font-cat' }, [f.category]),
          star,
        ]);
        row.addEventListener('click', () => {
          selectFamily(f.family);
          document.body.removeChild(overlay);
        });
        list.append(row);
      }
      if (ordered.length > shown.length) {
        list.append(el('div', { class: 'font-more' }, [`${ordered.length - shown.length} more — refine your search`]));
      }
    };

    search.addEventListener('input', renderList);
    loadAll.addEventListener('click', async () => {
      loadAll.textContent = 'Loading…';
      const ok = await fetchFullCatalog();
      fullLoaded = ok;
      loadAll.textContent = ok ? 'All fonts loaded' : 'Offline — using curated list';
      renderList();
    });
    close.addEventListener('click', () => document.body.removeChild(overlay));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    const panel = el('div', { class: 'modal' }, [
      el('div', { class: 'modal-head' }, [el('strong', {}, ['Choose a Google Font']), close]),
      el('div', { class: 'modal-tools' }, [search, loadAll]),
      list,
    ]);
    overlay.append(panel);
    document.body.append(overlay);
    search.focus();
    renderList();
  }

  function selectFamily(family: string) {
    const entry = getEntry(family);
    const weight = resolveWeight(entry, store.get().fontWeight);
    const italic = entry && !entry.italics ? false : store.get().italic;
    store.set({ fontFamily: family, fontWeight: weight, italic });
  }

  // --- settings -> controls ----------------------------------------------
  return (s: Settings) => {
    if (textArea.value !== s.text) textArea.value = s.text;

    fontBtn.textContent = s.fontFamily;
    fontBtn.style.fontFamily = `"${s.fontFamily}", system-ui, sans-serif`;
    fontBtn.style.fontWeight = String(s.fontWeight);
    fontBtn.style.fontStyle = s.italic ? 'italic' : 'normal';

    const entry = getEntry(s.fontFamily);
    const weights = entry?.weights ?? [300, 400, 500, 600, 700, 800];
    weightSel.innerHTML = '';
    for (const w of weights) weightSel.append(el('option', { value: String(w) }, [weightLabel(w)]));
    weightSel.value = String(s.fontWeight);
    italicChk.checked = s.italic;
    italicChk.disabled = !!entry && !entry.italics;

    sizeInput.value = String(round(ptToUnit(s.fontSizePt, s.sizeUnit), 2));
    sizeInput.step = String(sizeStep(s.sizeUnit));
    unitSel.value = s.sizeUnit;
    lineHeight.value = String(s.lineHeight);
    textColor.value = s.textColor;

    presetSel.value = s.pagePreset;
    pageW.value = String(round(s.pageW, 2));
    pageH.value = String(round(s.pageH, 2));

    outlineChk.checked = s.showOutline;
    outlineW.value = String(round(s.outlineW, 2));
    outlineH.value = String(round(s.outlineH, 2));
    outlineColor.value = s.outlineColor;
    outlineDims.style.display = s.showOutline ? '' : 'none';

    rulerChk.checked = s.showRulers;
    rulerColor.value = s.rulerColor;
  };
}

// --- small DOM helpers ------------------------------------------------------

function section(title: string, children: El[]): El {
  const kids: (Node | string)[] = title ? [el('h2', {}, [title])] : [];
  kids.push(...children);
  return el('section', { class: 'group' }, kids);
}

function numInput(onChange: (v: number) => void, step: string): HTMLInputElement {
  const input = el('input', { type: 'number', class: 'inline num', step, min: '0' }) as HTMLInputElement;
  input.addEventListener('input', () => onChange(parseFloat(input.value) || 0));
  return input;
}

function checkbox(onChange: (checked: boolean) => void): HTMLInputElement {
  const c = el('input', { type: 'checkbox' }) as HTMLInputElement;
  c.addEventListener('change', () => onChange(c.checked));
  return c;
}

function labeledToggle(label: string, chk: HTMLInputElement): El {
  return el('label', { class: 'check' }, [chk, el('span', {}, [label])]);
}

function weightLabel(w: number): string {
  const names: Record<number, string> = {
    100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular',
    500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black',
  };
  return `${w} · ${names[w] ?? ''}`.trim().replace(/·\s*$/, '').trim();
}
