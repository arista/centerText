import type { FontEntry } from './types';

// A curated set of popular Google Fonts that loads instantly and works offline
// after first use. The full library can be pulled in on demand (see
// `fetchFullCatalog`). Greeting-card / hand-lettering scripts are well
// represented since that is the primary use case.
const W_FULL = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export const CURATED: FontEntry[] = [
  // Handwriting / script
  { family: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700], italics: false },
  { family: 'Great Vibes', category: 'handwriting', weights: [400], italics: false },
  { family: 'Pacifico', category: 'handwriting', weights: [400], italics: false },
  { family: 'Sacramento', category: 'handwriting', weights: [400], italics: false },
  { family: 'Satisfy', category: 'handwriting', weights: [400], italics: false },
  { family: 'Allura', category: 'handwriting', weights: [400], italics: false },
  { family: 'Parisienne', category: 'handwriting', weights: [400], italics: false },
  { family: 'Tangerine', category: 'handwriting', weights: [400, 700], italics: false },
  { family: 'Kaushan Script', category: 'handwriting', weights: [400], italics: false },
  { family: 'Caveat', category: 'handwriting', weights: [400, 500, 600, 700], italics: false },
  { family: 'Shadows Into Light', category: 'handwriting', weights: [400], italics: false },
  { family: 'Indie Flower', category: 'handwriting', weights: [400], italics: false },
  { family: 'Homemade Apple', category: 'handwriting', weights: [400], italics: false },
  { family: 'Cookie', category: 'handwriting', weights: [400], italics: false },
  { family: 'Yellowtail', category: 'handwriting', weights: [400], italics: false },
  // Display
  { family: 'Lobster', category: 'display', weights: [400], italics: false },
  { family: 'Bebas Neue', category: 'display', weights: [400], italics: false },
  { family: 'Abril Fatface', category: 'display', weights: [400], italics: false },
  { family: 'Anton', category: 'display', weights: [400], italics: false },
  { family: 'Righteous', category: 'display', weights: [400], italics: false },
  { family: 'Alfa Slab One', category: 'display', weights: [400], italics: false },
  { family: 'Fredoka', category: 'display', weights: [300, 400, 500, 600, 700], italics: false },
  // Serif
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800, 900], italics: true },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900], italics: true },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], italics: true },
  { family: 'PT Serif', category: 'serif', weights: [400, 700], italics: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700], italics: true },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700, 800], italics: true },
  { family: 'Libre Baskerville', category: 'serif', weights: [400, 700], italics: true },
  // Sans-serif
  { family: 'Roboto', category: 'sans-serif', weights: [100, 300, 400, 500, 700, 900], italics: true },
  { family: 'Open Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800], italics: true },
  { family: 'Lato', category: 'sans-serif', weights: [100, 300, 400, 700, 900], italics: true },
  { family: 'Montserrat', category: 'sans-serif', weights: W_FULL, italics: true },
  { family: 'Poppins', category: 'sans-serif', weights: W_FULL, italics: true },
  { family: 'Raleway', category: 'sans-serif', weights: W_FULL, italics: true },
  { family: 'Oswald', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700], italics: false },
  { family: 'Nunito', category: 'sans-serif', weights: [200, 300, 400, 500, 600, 700, 800, 900], italics: true },
  { family: 'Work Sans', category: 'sans-serif', weights: W_FULL, italics: true },
  { family: 'Inter', category: 'sans-serif', weights: W_FULL, italics: false },
  // Monospace
  { family: 'Roboto Mono', category: 'monospace', weights: [100, 300, 400, 500, 700], italics: true },
  { family: 'JetBrains Mono', category: 'monospace', weights: [100, 200, 300, 400, 500, 600, 700, 800], italics: true },
];

const FULL_CACHE_KEY = 'centertext.fontlist.v1';
const FULL_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

let catalog: FontEntry[] = [...CURATED];
const byFamily = new Map<string, FontEntry>();
for (const f of CURATED) byFamily.set(f.family, f);

export function getCatalog(): FontEntry[] {
  return catalog;
}

export function getEntry(family: string): FontEntry | undefined {
  return byFamily.get(family);
}

/** Best available weight in an entry, preferring the requested one. */
export function resolveWeight(entry: FontEntry | undefined, want: number): number {
  if (!entry || entry.weights.includes(want)) return want;
  return entry.weights.reduce((best, w) =>
    Math.abs(w - want) < Math.abs(best - want) ? w : best,
  );
}

function mergeCatalog(entries: FontEntry[]): void {
  for (const e of entries) {
    if (!byFamily.has(e.family)) byFamily.set(e.family, e);
    else byFamily.set(e.family, e); // prefer fuller variant data from the API
  }
  catalog = Array.from(byFamily.values()).sort((a, b) => a.family.localeCompare(b.family));
}

/**
 * Pull the full Google Fonts catalogue (≈1900 families with accurate variants)
 * from a CORS-enabled static mirror on jsDelivr. Cached in localStorage. Falls
 * back silently to the curated list when offline — browsing still works.
 */
export async function fetchFullCatalog(): Promise<boolean> {
  try {
    const cachedRaw = localStorage.getItem(FULL_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw) as { at: number; entries: FontEntry[] };
      if (Date.now() - cached.at < FULL_CACHE_TTL && cached.entries.length) {
        mergeCatalog(cached.entries);
        return true;
      }
    }
  } catch {
    /* ignore */
  }

  try {
    // A static mirror of the Google Fonts Developer API response, served from
    // jsDelivr with permissive CORS (the gwfh.mranftl.com API sends no CORS
    // headers, so the browser blocks it). ~465 KB; we keep only what we need.
    const res = await fetch('https://cdn.jsdelivr.net/npm/google-font-metadata@6/data/api-response.json');
    if (!res.ok) return false;
    const raw = (await res.json()) as Array<{
      family: string;
      category: string;
      variants: string[];
    }>;
    const entries: FontEntry[] = raw.map((f) => {
      const weights = new Set<number>();
      let italics = false;
      for (const v of f.variants) {
        if (v.includes('italic')) italics = true;
        const numeric = v.replace('italic', '');
        if (numeric === 'regular' || numeric === '') weights.add(400);
        else {
          const n = parseInt(numeric, 10);
          if (!Number.isNaN(n)) weights.add(n);
        }
      }
      return {
        family: f.family,
        category: f.category,
        weights: Array.from(weights).sort((a, b) => a - b),
        italics,
      };
    });
    mergeCatalog(entries);
    try {
      localStorage.setItem(FULL_CACHE_KEY, JSON.stringify({ at: Date.now(), entries }));
    } catch {
      /* storage full — non-fatal */
    }
    return true;
  } catch {
    return false;
  }
}

// --- CSS loading -----------------------------------------------------------

const loadedKeys = new Set<string>(); // variants we've injected a stylesheet for
const readyKeys = new Set<string>(); // variants confirmed to have loaded glyphs

function variantKey(family: string, weight: number, italic: boolean): string {
  return `${family}|${weight}|${italic ? 'i' : 'n'}`;
}

/**
 * Whether a real (loaded) @font-face exists for this family. We can't rely on
 * document.fonts.check(): it returns true even when NO face matches the family
 * (it assumes a system fallback), which would make us skip loading entirely.
 */
function faceLoaded(family: string): boolean {
  for (const f of document.fonts) {
    if (f.family.replace(/^['"]|['"]$/g, '') === family && f.status === 'loaded') return true;
  }
  return false;
}

function cssUrl(family: string, weight: number, italic: boolean): string {
  const fam = family.trim().replace(/\s+/g, '+');
  const axis = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  return `https://fonts.googleapis.com/css2?family=${fam}:${axis}&display=swap`;
}

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inject a stylesheet and resolve once it has actually loaded (or failed). We
 * must wait for the stylesheet to parse before calling document.fonts.load —
 * otherwise the @font-face rule isn't registered yet, load() matches nothing,
 * and we'd paint the fallback even though the font arrives moments later.
 */
function injectStylesheet(href: string): Promise<void> {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => resolve());
    document.head.appendChild(link);
    void timeout(5000).then(resolve); // never hang on a slow CDN
  });
}

/**
 * Ensure a specific family/weight/style is loaded and ready to paint.
 * Resolves true once the glyphs are available (or false on failure/timeout).
 */
export async function loadFont(family: string, weight: number, italic: boolean): Promise<boolean> {
  const key = variantKey(family, weight, italic);
  if (readyKeys.has(key)) return true;

  if (!loadedKeys.has(key)) {
    loadedKeys.add(key);
    await injectStylesheet(cssUrl(family, weight, italic));
  }

  const spec = `${italic ? 'italic ' : ''}${weight} 64px "${family}"`;
  try {
    // The @font-face rule is registered now; this loads the actual glyphs.
    await Promise.race([document.fonts.load(spec).then(() => {}), timeout(4000)]);
  } catch {
    /* fall through to the face check below */
  }

  const ok = faceLoaded(family);
  if (ok) readyKeys.add(key);
  return ok;
}
