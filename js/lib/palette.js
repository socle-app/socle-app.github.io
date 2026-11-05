import { routeHash, setURL } from './nav.js';
/*
  Palettes des designs : les 42 palettes de Fondations (data/palettes.json) et
  les palettes personnalisées, dérivées en OKLCH à partir de 4 couleurs par thème
  (accent, fond, surface, texte). Produit les variables de tokens.css à surcharger
  dans la démo (clair et sombre), le bloc CSS à copier et l'encodage d'URL.
*/
import { hexToRgb, rgbToHex, contrast, luminance, ensureContrast } from './color.js';

export const DEFAULT_PALETTE = 'terracotta'; /* Palette Socle */
export const CUSTOM = 'perso';

let palP = null;
export const loadPalettes = () => (palP ||= fetch('data/palettes.json').then((r) => r.json()));
export const paletteCats = (pals) => [...new Set(pals.map((p) => p.categorie || 'Classiques'))];

/* ——— OKLCH ——— */
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055);
export function oklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}
export function fromOklch(L, C, h) {
  L = Math.min(1, Math.max(0, L));
  const conv = (c) => {
    const a = c * Math.cos(h); const b = c * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  };
  let c = Math.max(0, C); let rgb = conv(c);
  while (c > 0 && rgb.some((x) => x < -1e-4 || x > 1 + 1e-4)) { c = Math.max(0, c - 0.004); rgb = conv(c); }
  return rgbToHex(rgb.map((x) => toSrgb(Math.min(1, Math.max(0, x)))));
}
const shift = (hex, dL, cMul = 1, cMax = 1) => { const [L, C, h] = oklch(hex); return fromOklch(L + dL, Math.min(C * cMul, cMax), h); };
const at = (hex, L, cMax = 1) => { const [, C, h] = oklch(hex); return fromOklch(L, Math.min(C, cMax), h); };
const mix = (a, b, t) => { const A = hexToRgb(a); const B = hexToRgb(b); return rgbToHex(A.map((x, i) => x + (B[i] - x) * t)); };
const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex).map((x) => Math.round(x * 255)); return `rgba(${r},${g},${b},${a})`; };

export const isHex = (s) => /^#?[0-9a-f]{6}$/i.test(String(s || '').trim());
export const normHex = (s) => { const h = String(s || '').trim().replace('#', ''); return isHex(h) ? '#' + h.toUpperCase() : null; };
const isDarkBg = (hex) => luminance(hex) < 0.18;

/* ——— Palettes prédéfinies : variables d'accent (6 valeurs du DS + anneau de focus) ——— */
const accentVars = (c) => ({
  '--accent': c.accent, '--accent-hover': c.hover, '--accent-fg': c.texte_sur_accent, '--accent-vivid': c.vif,
  '--accent-subtle': c.doux, '--accent-subtle-border': c.doux_bord, '--focus-ring': c.vif,
});
export function presetVars(p) {
  return { light: accentVars(p.clair), dark: accentVars(p.sombre) };
}

/* ——— Palettes personnalisées ——— */
/* Sombre proposé à partir du clair : même teinte, clarté inversée. */
export function deriveDarkInputs(l) {
  return {
    bg: at(l.bg, 0.15, 0.02),
    surface: at(l.surface === '#FFFFFF' ? l.bg : l.surface, 0.19, 0.02),
    text: at(l.text, 0.89, 0.01),
    accent: (() => { const [L, C, h] = oklch(l.accent); return fromOklch(Math.max(L, 0.72), C, h); })(),
  };
}

/*
  4 couleurs → toutes les variables de neutres et d'accent du thème.
  Garantit AA : texte ≥ 4,5:1 sur fond, carte et surface élevée ; accent ≥ 4,5:1 sur ces trois fonds ;
  texte sur accent ≥ 4,5:1 ; contour de contrôle ≥ 3:1. Toute correction est rapportée dans `fixes`.
*/
export function buildCustomTheme(input) {
  const fixes = [];
  const bg = input.bg; const surface = input.surface;
  const dark = isDarkBg(bg);
  const raised = dark ? shift(surface, 0.035) : mix(bg, surface, 0.45);
  const bases = [bg, surface, raised];
  const fix = (name, label, given, min, against = bases) => {
    const out = ensureContrast(given, against, min);
    if (out.toUpperCase() !== given.toUpperCase()) fixes.push({ name, label, from: given, to: out, min });
    return out;
  };
  const text = fix('text', 'Texte', input.text, 4.5);
  const textStrong = ensureContrast(dark ? shift(text, 0.06) : shift(text, -0.06), bases, 7);
  const textMuted = ensureContrast(mix(text, surface, 0.32), bases, 4.5);
  const textDisabled = mix(text, surface, 0.55);
  const border = dark ? shift(surface, 0.09, 1, 0.03) : shift(surface, -0.085, 1, 0.03);
  const borderControl = ensureContrast(mix(text, surface, 0.5), bases, 3);
  const accent = fix('accent', 'Accent', input.accent, 4.5);
  const [aL, aC, aH] = oklch(accent);
  const dkFg = fromOklch(0.17, Math.min(aC, 0.06), aH);
  let accentFg = contrast('#FFFFFF', accent) >= contrast(dkFg, accent) ? '#FFFFFF' : dkFg;
  accentFg = ensureContrast(accentFg, accent, 4.5);
  const accentHover = dark ? accent : fromOklch(aL - 0.06, aC, aH);
  const accentVivid = dark ? accent : ensureContrast(fromOklch(Math.min(aL + 0.08, 0.72), aC * 1.1, aH), bases, 3);
  const subtle = ensureContrast(dark ? fromOklch(Math.max(oklch(surface)[0] + 0.07, 0.24), Math.min(aC, 0.05), aH) : fromOklch(0.955, Math.min(aC, 0.035), aH), accent, 4.5);
  const subtleBorder = shift(subtle, dark ? 0.06 : -0.05);
  const vars = {
    '--bg': bg, '--surface': surface, '--raised': raised, '--border': border,
    '--border-control': borderControl, '--border-strong': borderControl,
    '--text-strong': textStrong, '--text': text, '--text-muted': textMuted, '--text-disabled': textDisabled,
    '--chart-muted': borderControl, '--chart-grid': border, '--scale-track': border,
    '--tint-neutral-bg': raised, '--tint-neutral-fg': text, '--tint-neutral-border': border,
    '--state-hover': rgba(dark ? '#FFFFFF' : textStrong, 0.04), '--state-press': rgba(dark ? '#FFFFFF' : textStrong, 0.08),
    '--glow-accent': rgba(accent, dark ? 0.12 : 0.07),
    '--accent': accent, '--accent-hover': accentHover, '--accent-fg': accentFg, '--accent-vivid': accentVivid,
    '--accent-subtle': subtle, '--accent-subtle-border': subtleBorder, '--focus-ring': accentVivid,
    'color-scheme': dark ? 'dark' : 'light',
  };
  const checks = [
    { label: 'Texte sur fond', r: contrast(text, bg), min: 4.5 },
    { label: 'Texte sur carte', r: contrast(text, surface), min: 4.5 },
    { label: 'Accent sur carte', r: Math.min(contrast(accent, surface), contrast(accent, bg)), min: 4.5 },
    { label: 'Texte sur accent', r: contrast(accentFg, accent), min: 4.5 },
  ];
  return { vars, fixes, checks };
}

export const CUSTOM_DEFAULT = { accent: '#AB4E31', bg: '#EFEFF2', surface: '#FFFFFF', text: '#1C1C21' };

/* ——— État de palette ↔ URL ——— */
/* ?palette=cobalt  ou  ?palette=perso&c=AB4E31.EFEFF2.FFFFFF.1C1C21[&cd=… pour le sombre édité] */
const ORDER = ['accent', 'bg', 'surface', 'text'];
const enc = (o) => ORDER.map((k) => o[k].replace('#', '')).join('.');
const dec = (s) => {
  const parts = String(s || '').split('.');
  if (parts.length !== 4 || !parts.every(isHex)) return null;
  return Object.fromEntries(ORDER.map((k, i) => [k, normHex(parts[i])]));
};
export function readPaletteQuery(hash = routeHash()) {
  const q = new URLSearchParams((hash.split('?')[1]) || '');
  const id = q.get('palette');
  if (!id) return null;
  if (id === CUSTOM) {
    const light = dec(q.get('c'));
    if (!light) return null;
    const dk = dec(q.get('cd'));
    return { id: CUSTOM, light, dark: dk || deriveDarkInputs(light), darkEdited: !!dk };
  }
  return { id };
}
export function writePaletteQuery(sel, def) {
  const [path, qs] = routeHash().split('?');
  const q = new URLSearchParams(qs || '');
  ['palette', 'c', 'cd'].forEach((k) => q.delete(k));
  if (sel.id === CUSTOM) {
    q.set('palette', CUSTOM);
    q.set('c', enc(sel.light));
    if (sel.darkEdited) q.set('cd', enc(sel.dark));
  } else if (sel.id !== def) q.set('palette', sel.id);
  const s = q.toString();
  setURL(`${path}${s ? '?' + s : ''}`);
}

/* Variables par thème pour la sélection courante. */
export function resolveVars(sel, pals) {
  if (sel.id === CUSTOM) {
    const l = buildCustomTheme(sel.light); const d = buildCustomTheme(sel.dark);
    return { id: CUSTOM, nom: 'Personnalisée', light: l.vars, dark: d.vars, report: { light: l, dark: d } };
  }
  const p = pals.find((x) => x.id === sel.id) || pals.find((x) => x.id === DEFAULT_PALETTE);
  return { id: p.id, nom: p.nom, ...presetVars(p) };
}

/* Bloc :root / .dark à coller après tokens.css. */
export function cssBlock(res, indent = '') {
  const decl = (o) => Object.entries(o).map(([k, v]) => `${indent}  ${k}: ${v};`).join('\n');
  return `${indent}/* Palette ${res.nom} : à coller après tokens.css (variables du design system uniquement) */\n${indent}:root {\n${decl(res.light)}\n${indent}}\n${indent}.dark {\n${decl(res.dark)}\n${indent}}`;
}
