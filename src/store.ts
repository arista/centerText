import type { Settings } from './types';

const STORAGE_KEY = 'centertext.settings.v1';

export const PAGE_PRESETS: Record<string, { label: string; w: number; h: number } | null> = {
  letter: { label: 'US Letter (8.5 × 11")', w: 8.5, h: 11 },
  legal: { label: 'US Legal (8.5 × 14")', w: 8.5, h: 14 },
  a4: { label: 'A4 (8.27 × 11.69")', w: 8.27, h: 11.69 },
  a5: { label: 'A5 (5.83 × 8.27")', w: 5.83, h: 8.27 },
  card5x7: { label: 'Card 5 × 7"', w: 5, h: 7 },
  card4x6: { label: 'Card 4 × 6"', w: 4, h: 6 },
  custom: null,
};

export const DEFAULTS: Settings = {
  text: '42',
  fontFamily: 'Playfair Display',
  fontWeight: 700,
  italic: false,
  fontSizePt: 200,
  sizeUnit: 'pt',
  lineHeight: 1.15,
  textColor: '#111111',

  pagePreset: 'letter',
  pageW: 8.5,
  pageH: 11,

  showOutline: false,
  outlineW: 5,
  outlineH: 7,
  outlineColor: '#cc3333',

  showRulers: true,
  rulerColor: '#3366cc',

  favorites: ['Playfair Display', 'Dancing Script', 'Roboto', 'Lobster'],
};

type Listener = (s: Settings) => void;

class Store {
  private settings: Settings;
  private listeners = new Set<Listener>();
  private saveTimer: number | undefined;

  constructor() {
    this.settings = this.read();
  }

  private read(): Settings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        return { ...DEFAULTS, ...parsed };
      }
    } catch {
      // ignore corrupt storage and fall back to defaults
    }
    return { ...DEFAULTS };
  }

  get(): Settings {
    return this.settings;
  }

  /** Apply a partial update, persist (debounced) and notify subscribers. */
  set(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.persist();
    for (const fn of this.listeners) fn(this.settings);
  }

  subscribe(fn: Listener): void {
    this.listeners.add(fn);
  }

  private persist(): void {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch {
        // storage may be full or blocked; non-fatal
      }
    }, 150);
  }
}

export const store = new Store();
