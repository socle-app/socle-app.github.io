/* Fondations : Couleurs, Typographie, Espacements, Icônes — alimentées par le design system. */
import { CATEGORIES } from '../../registry/categories.js';
import { icon, rawIcon, UI_ICONS } from '../lib/icons.js';
import { esc, fr, copyText, toast } from '../lib/dom.js';
import { currentTheme } from '../lib/store.js';
import { crumbs } from './category.js';

/* ——— Contraste WCAG ——— */
function lum(hex) {
  const h = hex.replace('#', '');
  const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const ratio = (r) => `${r.toFixed(2).replace('.', ',')}:1`;
const grade = (r, min = 4.5) => (r >= 7 ? 'AAA' : r >= min ? 'AA' : r >= 3 ? 'AA grand' : 'Échec');

/* ——— Lecture de tokens.css ——— */
let tokensP = null;
function tokens() {
  if (!tokensP) {
    tokensP = fetch('css/tokens.css').then((r) => r.text()).then((css) => {
      const block = (re) => { const m = css.match(re); return m ? m[1] : ''; };
      const parse = (s) => Object.fromEntries([...s.matchAll(/--([\w-]+):([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
      return { light: parse(block(/:root\{([^}]*--bg:[^}]*)\}/)), dark: parse(block(/\n\.dark\{([^}]*--bg:[^}]*)\}/)), all: parse(block(/:root\{([^}]*--font-sans[^}]*)\}/)) };
    });
  }
  return tokensP;
}
let palP = null;
const palettes = () => (palP ||= fetch('data/palettes.json').then((r) => r.json()));

function head(cat, extra = '') {
  return `${crumbs([{ label: 'Bibliothèque', href: '/' }, { label: 'Fondations', href: '/' }, { label: cat.nom }])}
  <header class="phead">
    <div class="phead__title"><span class="tile">${rawIcon(cat.icon, { size: 22 })}</span><h1 class="t-page">${esc(cat.nom)}</h1></div>
    <p>${fr(cat.description)}</p>${extra}
  </header>`;
}

const swatch = (hex) => `<button class="chipcolor" type="button" data-hex="${esc(hex)}" aria-label="Copier ${esc(hex)}"><i style="background:${esc(hex)}"></i>${esc(hex)}</button>`;

function bindHex(view) {
  if (view.dataset.hexBound) return;
  view.dataset.hexBound = '1';
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-hex]');
    if (!b) return;
    const ok = await copyText(b.dataset.hex);
    toast(ok ? `${b.dataset.hex} copié` : 'Copie impossible');
  });
}

/* ——— Couleurs ——— */
async function couleurs(view, cat) {
  const [t, pals] = await Promise.all([tokens(), palettes()]);
  const L = t.light; const D = t.dark;
  const NEUTRES = [
    ['bg', 'Fond de page'], ['surface', 'Carte'], ['raised', 'Surface élevée'], ['border', 'Séparateur décoratif'], ['border-control', 'Contour de champ et contrôle'],
    ['text-strong', 'Titres'], ['text', 'Texte courant'], ['text-muted', 'Texte secondaire'], ['text-disabled', 'Désactivé'],
  ];
  const SEM = [['up', 'Hausse, succès'], ['down', 'Baisse, erreur'], ['warn', 'Avertissement'], ['info', 'Information']];
  const isText = (k) => k.startsWith('text') || k === 'border-control' || SEM.some((s) => s[0] === k);
  const row = ([k, role]) => {
    const rl = isText(k) ? contrast(L[k], L.surface) : null;
    const rd = isText(k) ? contrast(D[k], D.surface) : null;
    const min = k.startsWith('border') ? 3 : 4.5;
    const exempt = k === 'text-disabled';
    const fmt = (r) => (r == null ? '<span class="muted">—</span>' : `<span class="ratio">${ratio(r)}</span> ${exempt ? '<span class="badge">Exempté</span>' : `<span class="badge ${r >= min ? 'badge--green' : 'badge--red'}">${grade(r, min)}</span>`}`);
    return `<tr><td><code>--${k}</code></td><td class="muted">${esc(role)}</td><td>${swatch(L[k])}</td><td>${fmt(rl)}</td><td>${swatch(D[k])}</td><td>${fmt(rd)}</td></tr>`;
  };
  const th = '<tr><th>Variable</th><th>Rôle</th><th>Clair</th><th>Contraste sur carte</th><th>Sombre</th><th>Contraste sur carte</th></tr>';

  const theme = currentTheme();
  const cats = [...new Set(pals.map((p) => p.categorie || 'Classiques'))];
  const state = couleurs.state || (couleurs.state = { cat: '' });
  const palCard = (p) => {
    const c = theme === 'dark' ? p.sombre : p.clair;
    const surf = theme === 'dark' ? D.surface : L.surface;
    const bgc = theme === 'dark' ? D.bg : L.bg;
    const rAcc = Math.min(contrast(c.accent, surf), contrast(c.accent, bgc));
    const rFg = contrast(c.texte_sur_accent, c.accent);
    const rDoux = contrast(c.accent, c.doux);
    const isBrand = p.id === 'terracotta';
    return `<article class="pal" data-accent="${esc(p.id)}">
      <div class="pal__strip">
        <button type="button" data-hex="${esc(c.accent)}" style="background:${esc(c.accent)}" aria-label="Copier l’accent ${esc(c.accent)}"></button>
        <button type="button" data-hex="${esc(c.vif)}" style="background:${esc(c.vif)}" aria-label="Copier le vif ${esc(c.vif)}"></button>
        <button type="button" data-hex="${esc(c.doux)}" style="background:${esc(c.doux)}" aria-label="Copier le doux ${esc(c.doux)}"></button>
      </div>
      <div class="pal__body">
        <div class="pal__name"><b>${esc(p.nom)}</b>${isBrand ? '<span class="badge badge--accent">Socle</span>' : `<span class="t-xs muted">${esc(p.categorie || '')}</span>`}</div>
        <div class="pal__rows">
          <div class="pal__row"><span>Accent sur fond et carte</span><span class="ratio">${ratio(rAcc)}</span></div>
          <div class="pal__row"><span>Texte sur accent</span><span class="ratio">${ratio(rFg)}</span></div>
          <div class="pal__row"><span>Accent sur doux</span><span class="ratio">${ratio(rDoux)}</span></div>
        </div>
        <div class="pal__demo"><span class="btn btn--primary" aria-hidden="true">Action</span><span class="badge badge--accent">Actif</span><span class="pal__hex mono t-xs muted">${esc(c.accent)}</span></div>
        <div class="pal__copy" role="group" aria-label="Copier la palette ${esc(p.nom)}">
          <button class="btn btn--ghost btn--sm" type="button" data-pcopy="hex" data-pid="${esc(p.id)}">${icon('copy', { size: 14 })}HEX</button>
          <button class="btn btn--ghost btn--sm" type="button" data-pcopy="css" data-pid="${esc(p.id)}">${icon('copy', { size: 14 })}CSS</button>
          <button class="btn btn--ghost btn--sm" type="button" data-pcopy="tw" data-pid="${esc(p.id)}">${icon('copy', { size: 14 })}Tailwind</button>
        </div>
      </div>
    </article>`;
  };
  const counts = Object.fromEntries(cats.map((c) => [c, pals.filter((p) => (p.categorie || 'Classiques') === c).length]));

  view.innerHTML = `${head(cat)}
    <section class="sec" aria-labelledby="h-neutres">
      <h2 id="h-neutres" class="t-section">Neutres</h2>
      <p class="sub">${fr('90 % de l’écran. Le sombre (v2.1) reprend le rendu React Bits : quasi noir légèrement teinté, trois surfaces, bordures fines, hiérarchie de gris. Contrastes mesurés sur --surface.')}</p>
      <div class="tokens"><div class="tokens__scroll"><table><thead>${th}</thead><tbody>${NEUTRES.map(row).join('')}</tbody></table></div></div>
    </section>
    <section class="sec" aria-labelledby="h-sem">
      <h2 id="h-sem" class="t-section">Sémantiques</h2>
      <p class="sub">${fr('Toujours doublées d’un libellé ou d’une icône : la couleur ne porte jamais seule l’information.')}</p>
      <div class="tokens"><div class="tokens__scroll"><table><thead>${th}</thead><tbody>${SEM.map(row).join('')}</tbody></table></div></div>
    </section>
    <section class="sec" aria-labelledby="h-pal">
      <h2 id="h-pal" class="t-section">Palettes d’accent</h2>
      <p class="sub">${fr(`${pals.length} palettes en ${cats.length} catégories, calculées en OKLCH avec palettes.py : accent ≥ 4,5:1 sur fond, carte et surface élevée, vif ≥ 3:1, accent sombre ≥ 6:1. Thème ${theme === 'dark' ? 'sombre' : 'clair'} affiché ; cliquez une teinte pour copier son code.`)}</p>
      <div class="pal-tools"><div class="seg" role="radiogroup" aria-label="Catégorie de palettes" data-pcats>
        <button type="button" role="radio" aria-checked="${!state.cat}" data-pcat="">Toutes <span class="num muted">${pals.length}</span></button>
        ${cats.map((c) => `<button type="button" role="radio" aria-checked="${state.cat === c}" data-pcat="${esc(c)}">${esc(c)} <span class="num muted">${counts[c]}</span></button>`).join('')}
      </div></div>
      <div class="pal-grid" data-pgrid>${pals.filter((p) => !state.cat || (p.categorie || 'Classiques') === state.cat).map(palCard).join('')}</div>
    </section>`;
  bindHex(view);
  const exportPal = (p, kind) => {
    const blk = (c) => `--accent: ${c.accent}; --accent-hover: ${c.hover}; --accent-fg: ${c.texte_sur_accent}; --accent-vivid: ${c.vif}; --accent-subtle: ${c.doux}; --accent-subtle-border: ${c.doux_bord}; --focus-ring: ${c.vif};`;
    if (kind === 'hex') return `${p.nom}\nClair  accent ${p.clair.accent} · survol ${p.clair.hover} · vif ${p.clair.vif} · texte ${p.clair.texte_sur_accent} · doux ${p.clair.doux} · bord ${p.clair.doux_bord}\nSombre accent ${p.sombre.accent} · vif ${p.sombre.vif} · texte ${p.sombre.texte_sur_accent} · doux ${p.sombre.doux} · bord ${p.sombre.doux_bord}`;
    if (kind === 'css') return `/* Palette ${p.nom} — tokens.css */\n[data-accent="${p.id}"] { ${blk(p.clair)} }\n.dark [data-accent="${p.id}"], .dark[data-accent="${p.id}"] { ${blk(p.sombre)} }`;
    const o = (c) => `{ DEFAULT: '${c.accent}', hover: '${c.hover}', vivid: '${c.vif}', fg: '${c.texte_sur_accent}', subtle: '${c.doux}', 'subtle-border': '${c.doux_bord}' }`;
    return `// tailwind.config.js — palette ${p.nom}\ntheme: { extend: { colors: {\n  '${p.id}': ${o(p.clair)},\n  '${p.id}-dark': ${o(p.sombre)},\n} } }`;
  };
  view.querySelector('[data-pcats]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pcat]');
    if (!b) return;
    state.cat = b.dataset.pcat;
    view.querySelectorAll('[data-pcat]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    view.querySelector('[data-pgrid]').innerHTML = pals.filter((p) => !state.cat || (p.categorie || 'Classiques') === state.cat).map(palCard).join('');
  });
  view.querySelector('[data-pgrid]').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-pcopy]');
    if (!b) return;
    const p = pals.find((x) => x.id === b.dataset.pid);
    const ok = await copyText(exportPal(p, b.dataset.pcopy));
    toast(ok ? `Palette ${p.nom} copiée (${b.textContent.trim()})` : 'Copie impossible');
  });
  if (!view.dataset.themeBound) {
    view.dataset.themeBound = '1';
    const onTheme = () => { if (view.isConnected) couleurs(view, cat); };
    window.addEventListener('socle:theme', onTheme);
    return () => window.removeEventListener('socle:theme', onTheme);
  }
}

/* ——— Typographie ——— */
async function typographie(view, cat) {
  const t = await tokens();
  const A = t.all;
  const SCALE = [
    ['Display', 'clamp(2rem, 1.55rem + 1.9vw, 3rem)', '1,08', '600', 't-display', 'Des fondations solides.'],
    ['Titre de page', A['t-page'], A['t-page-lh'], '600', 't-page', 'Bibliothèque de design'],
    ['KPI', A['t-kpi'], A['t-kpi-lh'], '600', '', '12\u00A0480\u00A0€'],
    ['Section', A['t-section'], A['t-section-lh'], '600', 't-section', 'Derniers ajouts'],
    ['Corps', A['t-base'], A['t-base-lh'], '400', '', 'Le texte courant, 16\u00A0px sur mobile comme sur PC, interligne 24\u00A0px.'],
    ['Secondaire', A['t-sm'], A['t-sm-lh'], '400', 't-sm', 'Texte d’aide, métadonnées et descriptions de carte.'],
    ['Libellé', A['t-label'], A['t-label-lh'], '500', '', 'Libellé de champ'],
    ['Légende', A['t-xs'], A['t-xs-lh'], '400', 't-xs', 'Ajouté le 5 nov. 2026'],
  ];
  const style = (row) => {
    if (row[4]) return '';
    if (row[0] === 'KPI') return 'font-size:var(--t-kpi);line-height:var(--t-kpi-lh);font-weight:600;letter-spacing:var(--track-tight);font-variant-numeric:tabular-nums';
    if (row[0] === 'Libellé') return 'font-size:var(--t-label);line-height:var(--t-label-lh);font-weight:500';
    return '';
  };
  view.innerHTML = `${head(cat)}
    <section class="sec" aria-labelledby="h-fam">
      <h2 id="h-fam" class="t-section">Familles</h2>
      <p class="sub">${fr('Auto-hébergées en woff2 variable (100 à 900), font-display : swap, pile de secours système.')}</p>
      <div class="specimens">
        <div class="specimen"><span class="eyebrow">Geist · interface</span><span class="big">Aa</span>
          <div class="weights"><span style="font-weight:400">Regular</span><span style="font-weight:500">Medium</span><span style="font-weight:600">SemiBold</span><span style="font-weight:700">Bold</span></div>
          <p class="t-sm muted">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz · 0123456789 · éèàçœ «\u202F»</p></div>
        <div class="specimen"><span class="eyebrow">Geist Mono · code et valeurs</span><span class="big mono" style="font-family:var(--font-mono)">{ }</span>
          <div class="weights mono" style="font-family:var(--font-mono)"><span style="font-weight:400">Regular</span><span style="font-weight:500">Medium</span><span style="font-weight:600">SemiBold</span></div>
          <p class="t-sm muted mono" style="font-family:var(--font-mono)">#AB4E31 · 4,5:1 · 120ms · --space-4</p></div>
      </div>
    </section>
    <section class="sec" aria-labelledby="h-scale">
      <h2 id="h-scale" class="t-section">Échelle</h2>
      <p class="sub">${fr('Fluide avec clamp() : pas de saut brutal à 768 px. Approche optique −0,02 em sur les titres, −0,01 em sur les sections.')}</p>
      <div>${SCALE.map((r) => `<div class="type-row"><div class="spec"><b>${esc(r[0])}</b><span>${esc(r[1])}</span><span>interligne ${esc(r[2])} · ${esc(r[3])}</span></div><div class="sample ${r[4]}" style="${style(r)}">${esc(r[5])}</div></div>`).join('')}</div>
    </section>
    <section class="sec" aria-labelledby="h-rules">
      <h2 id="h-rules" class="t-section">Texte et nombres</h2>
      <p class="sub">${fr('Les règles appliquées partout dans Socle.')}</p>
      <div class="rules">
        <div class="rule"><b>Jamais de mot coupé</b>2 lignes maximum pour un nom, puis «\u202F…\u202F» avec infobulle.</div>
        <div class="rule"><b>Nombre et unité liés</b>Espace insécable : 20\u00A0k€, 42\u00A0%, 16\u00A0px.</div>
        <div class="rule"><b>Chiffres tabulaires</b>Partout où l’on compare des valeurs : tableaux, prix, KPI.</div>
        <div class="rule"><b>Typographie française</b>Espace fine insécable avant ;\u202F:\u202F!\u202F? et dans les guillemets «\u202F»</div>
        <div class="rule"><b>Champs à 16\u00A0px minimum</b>Safari zoome la page dès qu’un champ est plus petit.</div>
        <div class="rule"><b>Retours à la ligne propres</b>text-wrap : balance sur les titres, pretty sur les paragraphes.</div>
      </div>
    </section>
    <section class="sec" aria-labelledby="h-display">
      <h2 id="h-display" class="t-section">Polices d’affichage</h2>
      <p class="sub">${fr('Des polices créatives pour les titres, logos et affiches, toutes sous licence SIL Open Font License 1.1 : usage commercial libre, jamais de police « usage personnel ». Chaque police est chargée seulement quand sa carte apparaît (woff2, sous-ensemble latin).')}</p>
      <div class="df-tools">
        <div class="field df-tools__text"><label for="df-text">Votre texte</label><input class="input" id="df-text" type="text" placeholder="Tapez pour tout prévisualiser" autocomplete="off"></div>
        <div class="field df-tools__size"><label for="df-size">Taille <span class="mono muted" data-df-size>56 px</span></label><input id="df-size" type="range" min="24" max="120" step="4" value="56"></div>
        <div class="seg" role="radiogroup" aria-label="Catégorie de police" data-dfcats></div>
      </div>
      <div class="df-grid" data-dfgrid><p class="muted">Chargement des polices…</p></div>
    </section>`;
  displayFonts(view);
}

/* ——— Polices d'affichage : chargement à la demande ——— */
let dfP = null;
const loadedFonts = new Map();
function loadFont(f) {
  if (loadedFonts.has(f.id)) return loadedFonts.get(f.id);
  const ff = new FontFace(`SD ${f.nom}`, `url(${f.fichier}) format("woff2")`, { weight: f.graisses, display: 'swap' });
  const pr = ff.load().then((x) => { document.fonts.add(x); return true; }).catch(() => false);
  loadedFonts.set(f.id, pr);
  return pr;
}
async function displayFonts(view) {
  const fonts = await (dfP ||= fetch('data/display-fonts.json').then((r) => r.json()));
  const grid = view.querySelector('[data-dfgrid]');
  if (!grid) return;
  const cats = [...new Set(fonts.map((f) => f.categorie))];
  const st = { cat: '', text: '', size: 56 };
  const ko = (n) => `${String(n).replace('.', ',')}\u00A0Ko`;
  const w = (f) => { const [a, b] = String(f.graisses).split(' ').map(Number); return b ? Math.min(b, Math.max(a, 700)) : a; };
  const card = (f) => `<article class="df" data-df="${esc(f.id)}">
      <div class="df__head"><b>${esc(f.nom)}</b><span class="badge">${esc(f.categorie)}</span></div>
      <p class="df__sample" contenteditable="plaintext-only" spellcheck="false" role="textbox" aria-label="Aperçu modifiable, ${esc(f.nom)}" style="font-family:'SD ${esc(f.nom)}',var(--font-sans);font-weight:${w(f)};--sz:${st.size}px">${esc(st.text || f.echantillon)}</p>
      <dl class="df__meta">
        <dt>Graisses</dt><dd>${esc(f.graisses_txt)}</dd>
        <dt>Licence</dt><dd><span class="badge badge--green">OFL 1.1 · commercial</span></dd>
        <dt>Poids</dt><dd class="mono num">${ko(f.ko)}</dd>
        <dt>Associer à</dt><dd>${esc(f.association)}</dd>
      </dl>
      <div class="df__foot"><span class="t-xs muted">${esc(f.designer)}</span>
        <span class="df__acts"><button class="btn btn--ghost btn--sm" type="button" data-dfcss="${esc(f.id)}">${icon('copy', { size: 14 })}@font-face</button>
        <a class="btn btn--ghost btn--sm btn--arrow" href="${esc(f.source)}" target="_blank" rel="noopener">Source${icon('arrowUpRight', { size: 14 })}</a></span></div>
    </article>`;
  const segs = view.querySelector('[data-dfcats]');
  segs.innerHTML = `<button type="button" role="radio" aria-checked="true" data-dfc="">Toutes</button>${cats.map((c) => `<button type="button" role="radio" aria-checked="false" data-dfc="${esc(c)}">${esc(c)}</button>`).join('')}`;
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const f = fonts.find((x) => x.id === e.target.dataset.df);
    io.unobserve(e.target);
    loadFont(f).then((ok) => e.target.classList.add(ok ? 'is-loaded' : 'is-failed'));
  }), { rootMargin: '120px' });
  const render = () => {
    grid.innerHTML = fonts.filter((f) => !st.cat || f.categorie === st.cat).map(card).join('');
    grid.querySelectorAll('[data-df]').forEach((el) => {
      const f = fonts.find((x) => x.id === el.dataset.df);
      if (loadedFonts.has(f.id)) loadedFonts.get(f.id).then((ok) => el.classList.add(ok ? 'is-loaded' : 'is-failed'));
      else io.observe(el);
    });
  };
  render();
  segs.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dfc]'); if (!b) return;
    st.cat = b.dataset.dfc;
    segs.querySelectorAll('[data-dfc]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    render();
  });
  view.querySelector('#df-text').addEventListener('input', (e) => {
    st.text = e.target.value;
    grid.querySelectorAll('[data-df]').forEach((el) => { const f = fonts.find((x) => x.id === el.dataset.df); el.querySelector('.df__sample').textContent = st.text || f.echantillon; });
  });
  view.querySelector('#df-size').addEventListener('input', (e) => {
    st.size = +e.target.value;
    view.querySelector('[data-df-size]').textContent = `${st.size}\u00A0px`;
    grid.querySelectorAll('.df__sample').forEach((x) => { x.style.setProperty('--sz', `${st.size}px`); });
  });
  grid.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-dfcss]'); if (!b) return;
    const f = fonts.find((x) => x.id === b.dataset.dfcss);
    const css = `/* ${f.nom} — ${f.licence} — ${f.source} */\n@font-face {\n  font-family: "${f.nom}";\n  src: url("${f.fichier.split('/').pop()}") format("woff2");\n  font-weight: ${f.graisses};\n  font-display: swap;\n}`;
    const ok = await copyText(css);
    toast(ok ? `@font-face ${f.nom} copié` : 'Copie impossible');
  });
}

/* ——— Espacements ——— */
async function espacements(view, cat) {
  const t = await tokens();
  const A = t.all;
  const SP = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16];
  const R = [['Contrôle', 'radius-ctl', 'Boutons, champs'], ['Carte', 'radius-card', 'Cartes, aperçus'], ['Feuille', 'radius-sheet', 'Tiroirs, dialogues'], ['Pastille', 'radius-pill', 'Badges, pastilles']];
  view.innerHTML = `${head(cat)}
    <section class="sec" aria-labelledby="h-grid">
      <h2 id="h-grid" class="t-section">Grille de 8\u00A0px</h2>
      <p class="sub">${fr('Toutes les tailles, marges et hauteurs tombent sur la grille ; 4 px pour les ajustements fins.')}</p>
      <div class="grid8" aria-hidden="true">
        <div class="blk" style="left:16px;top:16px;width:160px;height:64px">160 × 64</div>
        <div class="blk" style="left:192px;top:16px;width:96px;height:64px">96 × 64</div>
        <div class="blk" style="left:16px;top:96px;width:272px;height:88px">272 × 88</div>
        <div class="blk" style="left:304px;top:16px;width:120px;height:168px">120 × 168</div>
      </div>
    </section>
    <section class="sec" aria-labelledby="h-space">
      <h2 id="h-space" class="t-section">Espacements nommés</h2>
      <p class="sub">${fr('De --space-1 à --space-16, au lieu de multiplications improvisées.')}</p>
      <div class="tokens" style="padding:0 16px"><div class="space-list">${SP.map((n) => `<div class="space-row"><code>--space-${n}</code><span class="v">${esc(A['space-' + n] || '')}</span><span><span class="bar-v" style="display:block;width:var(--space-${n})"></span></span></div>`).join('')}</div></div>
    </section>
    <section class="sec" aria-labelledby="h-radius">
      <h2 id="h-radius" class="t-section">Rayons</h2>
      <p class="sub">${fr('Quatre rayons seulement : 8, 12, 16 et 999 px.')}</p>
      <div class="radii">${R.map(([n, k, u]) => `<div class="radius"><div class="shape" style="border-radius:var(--${k})"></div><div><b>${esc(n)}</b><span>--${k} · ${esc(A[k] || '')}</span><p class="t-xs muted">${esc(u)}</p></div></div>`).join('')}</div>
    </section>
    <section class="sec" aria-labelledby="h-ctl">
      <h2 id="h-ctl" class="t-section">Hauteurs et repères</h2>
      <p class="sub">${fr('Cibles tactiles de 44 px sur mobile, contrôles de 36 px sur PC, 32 px pour une action secondaire.')}</p>
      <div class="tokens"><div class="tokens__scroll"><table><thead><tr><th>Variable</th><th>Usage</th><th class="r">Valeur</th></tr></thead><tbody>
        ${[['ctl-h', 'Contrôle sur mobile'], ['ctl-h-desktop', 'Contrôle sur PC'], ['ctl-h-min', 'Action secondaire sur PC'], ['row-h', 'Ligne de liste'], ['icon-sm', 'Icône petite'], ['icon-md', 'Icône standard'], ['icon-lg', 'Icône grande'], ['focus-width', 'Anneau de focus'], ['motion-fast', 'Survol, appui'], ['motion-base', 'Ouverture'], ['motion-slow', 'Panneaux']]
          .map(([k, u]) => `<tr><td><code>--${k}</code></td><td class="muted">${esc(u)}</td><td class="r"><span class="ratio">${esc(A[k] || '')}</span></td></tr>`).join('')}
      </tbody></table></div></div>
    </section>
    <section class="sec" aria-labelledby="h-bp">
      <h2 id="h-bp" class="t-section">Points de rupture</h2>
      <div class="tokens"><div class="tokens__scroll"><table><thead><tr><th>Largeur</th><th>Comportement</th></tr></thead><tbody>
        <tr><td><span class="ratio">&lt; 768\u00A0px</span></td><td class="muted">Mobile : marges 16 px, cibles 44 px, filtres en feuille plein écran</td></tr>
        <tr><td><span class="ratio">≥ 768\u00A0px</span></td><td class="muted">Tablette et PC : marges 24 px, contrôles 36 px</td></tr>
        <tr><td><span class="ratio">≥ 1\u00A0024\u00A0px</span></td><td class="muted">Navigation latérale visible</td></tr>
        <tr><td><span class="ratio">≥ 1\u00A0280\u00A0px</span></td><td class="muted">Contenu centré à 1 280 px, marges 32 px, panneau de props à droite</td></tr>
      </tbody></table></div></div>
    </section>`;
}

/* ——— Icônes ——— */
function iconSVG(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
let icP = null;
const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const attrsOf = (o) => Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(' ');
const nodeSVG = (d) => d.map(([t, o]) => `<${t} ${attrsOf(o)}/>`).join('');
const camel = (k) => k.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
const pascal = (n) => n.split('-').map((x) => x[0].toUpperCase() + x.slice(1)).join('');
async function icones(view, cat) {
  const ui = Object.entries(UI_ICONS).filter(([k]) => k !== 'squareFill');
  const lib = (await (icP ||= fetch('data/icons.json').then((r) => r.json()))).icons;
  const cats = [...new Set(lib.map((i) => i.c))];
  const st = { q: '', cat: '', size: 24, stroke: 1.5, fmt: 'svg' };
  view.innerHTML = `${head(cat)}
    <section class="sec" aria-labelledby="h-lib-ic">
      <h2 id="h-lib-ic" class="t-section">Bibliothèque</h2>
      <p class="sub">${fr(`${lib.length} icônes du jeu Lucide (licence ISC, lucide.dev), grille de 24, trait réglable, extrémités arrondies : la même famille que nos icônes maison. Recherche en français et en anglais.`)}</p>
      <div class="ic-tools">
        <div class="ic-search">${icon('search', { size: 18 })}<input class="input" type="search" id="ic-q" placeholder="Rechercher : maison, panier, calendar…" aria-label="Rechercher une icône" autocomplete="off"><span class="count" data-ic-count></span></div>
        <div class="ic-ctl">
          <div class="field"><label for="ic-size">Taille <span class="mono muted" data-ic-size>24 px</span></label><input id="ic-size" type="range" min="16" max="48" step="4" value="24"></div>
          <div class="field"><label for="ic-stroke">Épaisseur <span class="mono muted" data-ic-stroke>1,5</span></label><input id="ic-stroke" type="range" min="1" max="2.5" step="0.25" value="1.5"></div>
          <div class="field"><span class="label" id="ic-fmt-l">Copier en</span><div class="seg" role="radiogroup" aria-labelledby="ic-fmt-l" data-ic-fmt><button type="button" role="radio" aria-checked="true" data-fmt="svg">SVG</button><button type="button" role="radio" aria-checked="false" data-fmt="jsx">JSX</button></div></div>
        </div>
        <div class="seg ic-cats" role="radiogroup" aria-label="Catégorie d’icônes" data-ic-cats>
          <button type="button" role="radio" aria-checked="true" data-icc="">Toutes</button>
          ${cats.map((c) => `<button type="button" role="radio" aria-checked="false" data-icc="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
      </div>
      <div class="icon-grid icon-grid--lib" data-ic-grid></div>
      <p class="muted t-sm" data-ic-empty hidden>${fr('Aucune icône pour cette recherche. Essayez un synonyme ou le mot anglais.')}</p>
    </section>
    <section class="sec" aria-labelledby="h-cat-ic">
      <h2 id="h-cat-ic" class="t-section">Catégories de Socle</h2>
      <p class="sub">${fr('24 × 24, trait de 1,5 px, extrémités arrondies. Cliquez pour copier le SVG.')}</p>
      <div class="icon-grid">${CATEGORIES.map((c) => `<button class="icon-cell" type="button" data-svg="${esc(c.icon)}" aria-label="Copier l’icône ${esc(c.nom)}">${rawIcon(c.icon, { size: 24 })}<span>${esc(c.nom)}</span></button>`).join('')}</div>
    </section>
    <section class="sec" aria-labelledby="h-ui-ic">
      <h2 id="h-ui-ic" class="t-section">Interface de Socle</h2>
      <p class="sub">${fr('Tailles 16, 20 et 24 px, alignées sur la ligne de texte ; libellé accessible si l’icône est seule.')}</p>
      <div class="icon-grid">${ui.map(([k, b]) => `<button class="icon-cell" type="button" data-svg="${esc(b)}" aria-label="Copier l’icône ${esc(k)}">${rawIcon(b, { size: 24 })}<span class="mono">${esc(k)}</span></button>`).join('')}</div>
    </section>`;
  const grid = view.querySelector('[data-ic-grid]');
  const index = lib.map((i) => ({ i, s: norm(`${i.n.replace(/-/g, ' ')} ${i.k} ${i.t} ${i.c}`), m: norm(`${i.n.replace(/-/g, ' ')} ${i.k} ${i.t}`) }));
  const render = () => {
    const words = norm(st.q).split(/\s+/).filter(Boolean);
    const list = index.filter(({ i, s }) => (!st.cat || i.c === st.cat) && words.every((w) => s.includes(w)))
      .map((x) => ({ ...x, r: words.length ? (words.every((w) => x.m.includes(w)) ? 0 : 1) : 0 })).sort((a, b) => a.r - b.r).map((x) => x.i);
    grid.style.setProperty('--ic', `${st.size}px`);
    grid.innerHTML = list.map((i) => `<button class="icon-cell" type="button" data-lib="${esc(i.n)}" title="${esc(i.n)} · ${esc(i.k)}" aria-label="Copier l’icône ${esc(i.n)} (${esc(i.k)})"><svg width="${st.size}" height="${st.size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${st.stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodeSVG(i.d)}</svg><span>${esc(i.n)}</span></button>`).join('');
    view.querySelector('[data-ic-count]').textContent = `${list.length}\u00A0/\u00A0${lib.length}`;
    view.querySelector('[data-ic-empty]').hidden = list.length > 0;
  };
  render();
  let t;
  view.querySelector('#ic-q').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; render(); }, 60); });
  view.querySelector('#ic-size').addEventListener('input', (e) => { st.size = +e.target.value; view.querySelector('[data-ic-size]').textContent = `${st.size}\u00A0px`; render(); });
  view.querySelector('#ic-stroke').addEventListener('input', (e) => { st.stroke = +e.target.value; view.querySelector('[data-ic-stroke]').textContent = String(st.stroke).replace('.', ','); render(); });
  view.querySelector('[data-ic-fmt]').addEventListener('click', (e) => { const b = e.target.closest('[data-fmt]'); if (!b) return; st.fmt = b.dataset.fmt; view.querySelectorAll('[data-fmt]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); });
  view.querySelector('[data-ic-cats]').addEventListener('click', (e) => { const b = e.target.closest('[data-icc]'); if (!b) return; st.cat = b.dataset.icc; view.querySelectorAll('[data-icc]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); render(); });
  view.addEventListener('click', async (e) => {
    const l = e.target.closest('[data-lib]');
    if (l) {
      const i = lib.find((x) => x.n === l.dataset.lib);
      const txt = st.fmt === 'svg'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="${st.size}" height="${st.size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${st.stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${nodeSVG(i.d)}</svg>`
        : `// ou : import { ${pascal(i.n)} } from 'lucide-react'; <${pascal(i.n)} size={${st.size}} strokeWidth={${st.stroke}} />\nexport const ${pascal(i.n)}Icon = (props) => (\n  <svg width={${st.size}} height={${st.size}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={${st.stroke}} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>\n${i.d.map(([tg, o]) => `    <${tg} ${Object.entries(o).map(([k, v]) => `${camel(k)}="${v}"`).join(' ')} />`).join('\n')}\n  </svg>\n);`;
      const ok = await copyText(txt);
      toast(ok ? `${i.n} copiée en ${st.fmt.toUpperCase()}` : 'Copie impossible');
      return;
    }
    const b = e.target.closest('[data-svg]');
    if (!b) return;
    const ok = await copyText(iconSVG(b.dataset.svg));
    toast(ok ? 'SVG copié' : 'Copie impossible');
  });
}

export function renderFoundation(view, cat) {
  const map = { couleurs, typographie, espacements, icones };
  const fn = map[cat.page];
  if (!fn) { view.innerHTML = head(cat); return; }
  return fn(view, cat);
}
