/* Détail d'un design : scène d'aperçu, props, code, notes, navigation. */
import { getCategory } from '../../registry/categories.js';
import { loadIndex, loadMeta, loadCode, currentTheme } from '../lib/store.js';
import { icon } from '../lib/icons.js';
import { esc, fr, formatDate, bindCopy, copyText, toast } from '../lib/dom.js';
import { demoURL, post, SANDBOX, isPremium, premiumBadge } from '../lib/frames.js';
import { highlight } from '../lib/highlight.js';
import { crumbs } from './category.js';
import { contrast, ratio } from '../lib/color.js';
import { loadPalettes, paletteCats, DEFAULT_PALETTE, CUSTOM, CUSTOM_DEFAULT, deriveDarkInputs, readPaletteQuery, writePaletteQuery, resolveVars, cssBlock, normHex } from '../lib/palette.js';

const WIDTHS = { mobile: 390, tablet: 768, desktop: 1280 };
/* Hauteur d'écran simulée quand l'aperçu est réduit (largeur réelle > place disponible). */
const DEVICE_H = { mobile: 844, tablet: 1024, desktop: 1000 };
const FIELDS = [['accent', 'Accent'], ['bg', 'Fond'], ['surface', 'Surface'], ['text', 'Texte']];

/* ——— Bloc Palette du panneau ——— */
function palDots(c) {
  return `<span class="palx__dots" aria-hidden="true"><i style="background:${esc(c.accent)}"></i><i style="background:${esc(c.vif)}"></i><i style="background:${esc(c.doux)}"></i></span>`;
}
function paletteListHTML(pals, sel, def, theme) {
  const k = theme === 'dark' ? 'sombre' : 'clair';
  const opt = (p) => `<button type="button" class="palx__opt${p.id === def || p.id === DEFAULT_PALETTE ? ' palx__opt--wide' : ''}" aria-pressed="${sel.id === p.id}" data-pal="${esc(p.id)}">${palDots(p[k])}<span class="palx__nm">${esc(p.nom)}</span>${p.id === def ? '<span class="badge">Défaut</span>' : p.id === DEFAULT_PALETTE ? '<span class="badge badge--accent">Socle</span>' : ''}</button>`;
  return `<button type="button" class="palx__opt palx__opt--custom" aria-pressed="${sel.id === CUSTOM}" data-pal="${CUSTOM}"><span class="palx__dots palx__dots--custom" aria-hidden="true">${icon('palette', { size: 16 })}</span><span class="palx__nm">Personnalisée</span><span class="t-xs muted">Vos codes couleur</span></button>
    ${paletteCats(pals).map((c) => `<div class="palx__grp" role="group" aria-label="${esc(c)}"><p class="palx__cat">${esc(c)}</p><div class="palx__grid">${pals.filter((p) => (p.categorie || 'Classiques') === c).map(opt).join('')}</div></div>`).join('')}`;
}
function customHTML(sel, editing, res) {
  const set = sel[editing];
  const rep = res && res.report ? res.report[editing] : null;
  const badge = (c) => `<span class="badge ${c.r >= c.min ? 'badge--green' : 'badge--red'}">${c.r >= c.min ? 'AA' : 'Échec'}</span>`;
  return `<div class="seg" role="radiogroup" aria-label="Thème édité" data-pal-edit>
      <button type="button" role="radio" aria-checked="${editing === 'light'}" data-edit="light">Clair</button>
      <button type="button" role="radio" aria-checked="${editing === 'dark'}" data-edit="dark">Sombre</button>
    </div>
    <div class="palx__fields">${FIELDS.map(([k, l]) => `<div class="palx__field">
      <label for="pc-${k}">${esc(l)}</label>
      <input type="color" value="${esc(set[k].toLowerCase())}" data-pc="${k}" aria-label="${esc(l)}, sélecteur">
      <input class="input mono" id="pc-${k}" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="7" value="${esc(set[k])}" data-pch="${k}">
    </div>`).join('')}</div>
    ${editing === 'dark' && !sel.darkEdited ? `<p class="prop__hint">${fr('Sombre calculé depuis le clair (même teinte, clarté inversée). Modifiez une couleur pour le régler à la main.')}</p>` : ''}
    ${editing === 'dark' && sel.darkEdited ? `<button class="btn btn--ghost btn--sm" type="button" data-pal-rederive>Recalculer depuis le clair</button>` : ''}
    ${rep ? `<ul class="palx__checks" aria-label="Contrastes">${rep.checks.map((c) => `<li><span>${esc(c.label)}</span><span class="ratio">${ratio(c.r)}</span>${badge(c)}</li>`).join('')}</ul>
    ${rep.fixes.length ? `<div class="palx__warn" role="status">${icon('accessibility', { size: 16 })}<div><b>Ajusté pour tenir AA</b>${rep.fixes.map((f) => `<span>${esc(f.label)} : <code>${esc(f.from)}</code> → <code>${esc(f.to)}</code> (${String(f.min).replace('.', ',')}:1)</span>`).join('')}</div></div>` : `<p class="prop__hint">${fr('Les autres variables (surface élevée, bordures, textes secondaires, survol, doux, focus) sont dérivées en OKLCH ; contraste AA vérifié.')}</p>`}` : ''}`;
}

function fmtVal(p, v) {
  if (p.type === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function controlHTML(p, v) {
  const id = `p-${p.name}`;
  const hint = p.hint ? `<p class="prop__hint">${fr(p.hint)}</p>` : '';
  if (p.type === 'number') {
    return `<div class="prop">
      <div class="prop__top"><label for="${id}">${esc(p.label || p.name)}</label>
        <span class="numbox"><input id="${id}-n" type="number" inputmode="decimal" value="${v}" min="${p.min}" max="${p.max}" step="${p.step || 1}" data-prop="${p.name}" data-kind="num" aria-label="${esc(p.label || p.name)}, valeur">${p.unit ? `<span>${esc(p.unit)}</span>` : ''}</span></div>
      <input id="${id}" type="range" value="${v}" min="${p.min}" max="${p.max}" step="${p.step || 1}" data-prop="${p.name}" data-kind="range">
      ${hint}</div>`;
  }
  if (p.type === 'boolean') {
    return `<div class="prop"><div class="switch-row"><span class="label" id="${id}-l" style="font-size:var(--t-label);font-weight:500;color:var(--text-strong)">${esc(p.label || p.name)}</span>
      <button class="switch" type="button" role="switch" aria-checked="${!!v}" aria-labelledby="${id}-l" data-prop="${p.name}" data-kind="bool"></button></div>${hint}</div>`;
  }
  if (p.type === 'select') {
    const opts = p.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    if (opts.length <= 4) {
      return `<div class="prop"><div class="prop__top"><span class="label" id="${id}-l">${esc(p.label || p.name)}</span></div>
        <div class="seg ${opts.length === 4 ? 'seg--grid2' : ''}" role="radiogroup" aria-labelledby="${id}-l">${opts.map((o) => `<button type="button" role="radio" aria-checked="${String(o.value) === String(v)}" data-prop="${p.name}" data-kind="seg" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('')}</div>${hint}</div>`;
    }
    return `<div class="prop"><div class="prop__top"><label for="${id}">${esc(p.label || p.name)}</label></div>
      <select class="select" id="${id}" data-prop="${p.name}" data-kind="select">${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${hint}</div>`;
  }
  return `<div class="prop"><div class="prop__top"><label for="${id}">${esc(p.label || p.name)}</label></div>
    <input class="input" id="${id}" type="text" value="${esc(v)}" data-prop="${p.name}" data-kind="text">${hint}</div>`;
}

export async function renderItem(view, id, onCat) {
  let meta;
  /* Id absent du registre : page « n’existe pas » sans requête 404 (erreur console).
     En local, on tente quand même meta.json pour prévisualiser un design pas encore indexé. */
  const known = (await loadIndex()).items;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  try {
    if (known.length && !local && !known.some((i) => i.id === id)) throw new Error('meta');
    meta = await loadMeta(id);
  } catch (e) {
    view.innerHTML = `<div class="empty" style="margin-top:24px"><h1 class="t-section">Ce design n’existe pas</h1><p>Il a peut-être été renommé. Cherchez-le avec ⌘K.</p><a class="btn btn--secondary" href="/">Vue d’ensemble</a></div>`;
    return;
  }
  const cat = getCategory(meta.categorie);
  if (onCat) onCat(meta.categorie);
  document.title = `${meta.nom} — Socle`;
  const { items } = await loadIndex();
  const siblings = items.filter((i) => i.categorie === meta.categorie).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.ordre ?? 50) - (b.ordre ?? 50));
  const idx = siblings.findIndex((s) => s.id === meta.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const props = meta.props || [];
  const values = Object.fromEntries(props.map((p) => [p.name, p.default]));
  const narrow = matchMedia('(max-width: 767px)').matches;
  const state = { bg: currentTheme(), width: narrow ? 'mobile' : (meta.stage && meta.stage.width) || 'desktop', tab: 0, locked: false };
  const pals = await loadPalettes().catch(() => []);
  const defPal = meta.palette && pals.some((p) => p.id === meta.palette) ? meta.palette : DEFAULT_PALETTE;
  const fromUrl = readPaletteQuery();
  let sel = fromUrl && (fromUrl.id === CUSTOM || pals.some((p) => p.id === fromUrl.id)) ? fromUrl : { id: defPal };
  const custom = sel.id === CUSTOM ? sel : { id: CUSTOM, light: { ...CUSTOM_DEFAULT }, dark: deriveDarkInputs(CUSTOM_DEFAULT), darkEdited: false };
  let res = pals.length ? resolveVars(sel, pals) : null;
  let editing = currentTheme() === 'dark' ? 'dark' : 'light';
  const initPal = res && sel.id !== CUSTOM ? { accent: sel.id } : res ? { palette: { id: res.id, light: res.light, dark: res.dark } } : {};
  const tabs = meta.code || [];
  const sources = await Promise.all(tabs.map((t) => loadCode(meta.id, t.file).catch(() => '/* Fichier introuvable */')));

  view.innerHTML = `
    ${crumbs([{ label: 'Bibliothèque', href: '/' }, { label: cat ? cat.nom : meta.categorie, href: `/c/${meta.categorie}` }, { label: meta.nom }])}
    <header class="dhead">
      <div class="dhead__tx">
        <h1 class="t-page">${esc(meta.nom)}</h1>
        <p>${fr(meta.description)}</p>
        <div class="phead__meta">${isPremium(meta) ? premiumBadge() : ''}${(meta.tags || []).map((t) => `<span class="badge">${esc(t)}</span>`).join('')}<span class="t-xs muted">Ajouté le ${formatDate(meta.date)}</span></div>
      </div>
      <a class="btn btn--secondary" href="${esc(demoURL(meta.id, { theme: currentTheme() }))}" target="_blank" rel="noopener">${icon('external', { size: 16 })}Ouvrir la démo</a>
    </header>

    <div class="workbench">
      <section class="stage" aria-label="Aperçu">
        <div class="stage__bar">
          <div class="grp">
            <div class="seg" role="radiogroup" aria-label="Fond de l’aperçu">
              <button type="button" role="radio" data-bg="light" aria-checked="false">Clair</button>
              <button type="button" role="radio" data-bg="dark" aria-checked="false">Sombre</button>
              <button type="button" role="radio" data-bg="grid" aria-checked="false">Quadrillé</button>
            </div>
          </div>
          <div class="grp">
            <div class="seg seg--icons" role="radiogroup" aria-label="Largeur de l’aperçu" data-widths>
              <button type="button" role="radio" data-w="mobile" aria-checked="false" aria-label="Mobile, 390 pixels">${icon('phone', { size: 16 })}<span class="lbl-wide">Mobile</span></button>
              <button type="button" role="radio" data-w="tablet" aria-checked="false" aria-label="Tablette, 768 pixels">${icon('tablet', { size: 16 })}<span class="lbl-wide">Tablette</span></button>
              <button type="button" role="radio" data-w="desktop" aria-checked="false" aria-label="Bureau">${icon('monitor', { size: 16 })}<span class="lbl-wide">Bureau</span></button>
            </div>
            <button class="icon-btn" type="button" data-replay aria-label="Rejouer l’animation">${icon('replay', { size: 18 })}</button>
            <button class="icon-btn" type="button" data-full aria-label="Plein écran">${icon('maximize', { size: 18 })}</button>
          </div>
        </div>
        <div class="stage__view" data-view>
          <div class="stage__frame" data-frame>
            <iframe data-demo data-theme-lock="1" allow="accelerometer; gyroscope" title="Aperçu live de ${esc(meta.nom)}" sandbox="${SANDBOX}" src="${esc(demoURL(meta.id, { theme: state.bg === 'grid' ? currentTheme() : state.bg, bg: state.bg === 'grid' ? 'grid' : '', props: values, ...initPal }))}"></iframe>
          </div>
        </div>
        <div class="stage__foot"><span class="mono num" data-size></span><span class="stage__scale" data-scale hidden><span data-scale-txt></span><button class="stage__fullbtn" type="button" data-full2>${icon('maximize', { size: 14 })}Plein écran</button></span><span class="lbl-wide" data-iso>Aperçu isolé, au thème choisi</span></div>
      </section>

      <aside class="panel props" aria-labelledby="h-props">
        <div class="panel__head"><h2 id="h-props">Props</h2><button class="btn btn--ghost btn--sm" type="button" data-reset>Réinitialiser</button></div>
        ${res ? `<section class="palx" data-palette aria-labelledby="h-pal">
          <div class="prop__top"><h3 class="palx__title" id="h-pal">Palette</h3><button class="btn btn--ghost btn--sm" type="button" data-pal-copy>${icon('copy', { size: 14 })}Variables</button></div>
          <button class="palx__current" type="button" aria-expanded="false" aria-controls="palx-list" data-pal-toggle></button>
          <div class="palx__list" id="palx-list" data-pal-list hidden></div>
          <div class="palx__custom" data-pal-custom hidden></div>
        </section>` : ''}
        <div class="panel__body" data-props>${props.map((p) => controlHTML(p, values[p.name])).join('')}</div>
      </aside>
    </div>

    ${tabs.length ? `<section class="code" aria-label="Code">
      <div class="code__bar">
        <div class="seg" role="tablist" aria-label="Langage">${tabs.map((t, i) => `<button type="button" role="tab" id="tab-${i}" aria-controls="code-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${i}">${esc(t.label)}</button>`).join('')}</div>
        <div class="code__right"><span class="code__file" data-file></span>
          <button class="btn btn--secondary btn--sm copy-btn" type="button" data-copy>${icon('copy', { size: 16 })}<span data-lbl>Copier</span></button></div>
      </div>
      <div class="code__body" id="code-panel" role="tabpanel" aria-labelledby="tab-0"><pre tabindex="0"><code data-code></code></pre></div>
      <div class="code__more" data-more hidden><button class="btn btn--ghost btn--sm" type="button" data-expand>Afficher tout le code${icon('chevronDown', { size: 16 })}</button></div>
    </section>` : ''}

    <div class="facts">
      <section class="fact"><h3>${icon('package', { size: 18 })}Dépendances</h3>
        ${(meta.dependances || []).length ? `<ul>${meta.dependances.map((d) => `<li class="dep"><code>${esc(d.nom)}</code><span class="muted t-xs">${fr(d.note || '')}</span></li>`).join('')}</ul>` : '<p class="t-sm muted">Aucune : HTML et CSS seuls.</p>'}
      </section>
      <section class="fact"><h3>${icon('note', { size: 18 })}Notes d’usage</h3><ul>${(meta.usage || []).map((u) => `<li>${fr(u)}</li>`).join('')}</ul></section>
      <section class="fact"><h3>${icon('accessibility', { size: 18 })}Accessibilité</h3><ul>${(meta.accessibilite || []).map((u) => `<li>${fr(u)}</li>`).join('')}</ul></section>
    </div>

    ${prev || next ? `<nav class="pager" aria-label="Dans la catégorie">
      ${prev ? `<a class="prev" href="/i/${esc(prev.id)}"><span>${icon('arrowLeft', { size: 14 })}Précédent</span><b>${esc(prev.nom)}</b></a>` : '<span></span>'}
      ${next ? `<a class="next" href="/i/${esc(next.id)}"><span>Suivant${icon('arrowRight', { size: 14 })}</span><b>${esc(next.nom)}</b></a>` : ''}
    </nav>` : ''}
  `;

  /* ——— Scène ——— */
  const stage = view.querySelector('.stage');
  const vw = view.querySelector('[data-view]');
  const frame = view.querySelector('[data-frame]');
  const ifr = frame.querySelector('iframe');
  const sizeEl = view.querySelector('[data-size]');

  const scaleEl = view.querySelector('[data-scale]');
  const scaleTxt = view.querySelector('[data-scale-txt]');
  const isoEl = view.querySelector('[data-iso]');
  /*
    L'iframe est rendue à sa vraie largeur (390, 768, 1280 ou desktopMin) puis réduite
    par transform: scale pour tenir dans la place disponible. Réduite, sa hauteur simulée
    est plafonnée à un écran type (DEVICE_H) et la scène prend la hauteur réduite.
  */
  function layout() {
    const full = stage.classList.contains('is-full');
    if (!full) vw.style.height = '';
    const W = vw.clientWidth;
    const H = vw.clientHeight;
    if (!W || !H) return;
    const minDesk = (meta.stage && meta.stage.desktopMin) || 0;
    const target = state.width === 'desktop' ? Math.max(W, minDesk) : WIDTHS[state.width];
    const s = Math.min(1, W / target);
    let vh = Math.round(H / s);
    if (s < 1) vh = Math.min(vh, Math.max(DEVICE_H[state.width], H));
    const fh = Math.min(H, Math.round(vh * s));
    frame.style.width = `${Math.round(target * s)}px`;
    frame.style.height = `${fh}px`;
    if (!full && fh < H) vw.style.height = `${fh}px`;
    frame.classList.toggle('is-device', state.width !== 'desktop' && target * s < W);
    ifr.style.width = `${target}px`;
    ifr.style.height = `${vh}px`;
    ifr.style.transform = s < 1 ? `scale(${s})` : 'none';
    sizeEl.textContent = `${target} × ${vh}`;
    const reduced = s < 0.995;
    scaleEl.hidden = !reduced;
    isoEl.hidden = reduced;
    if (reduced) scaleTxt.textContent = `Aperçu réduit à ${Math.round(s * 100)}\u00A0%`;
    view.querySelector('[data-full2]').hidden = full;
  }
  function syncSeg() {
    view.querySelectorAll('[data-bg]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.bg === state.bg)));
    view.querySelectorAll('[data-w]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.w === state.width)));
  }
  function sendTheme() {
    const theme = state.bg === 'grid' ? currentTheme() : state.bg;
    post(ifr, { type: 'theme', theme, bg: state.bg === 'grid' ? 'grid' : '' });
  }
  view.querySelectorAll('[data-bg]').forEach((b) => b.addEventListener('click', () => { state.bg = b.dataset.bg; state.locked = true; syncSeg(); sendTheme(); }));
  view.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { state.width = b.dataset.w; syncSeg(); layout(); }));
  view.querySelector('[data-replay]').addEventListener('click', () => post(ifr, { type: 'replay' }));
  const fullBtn = view.querySelector('[data-full]');
  function setFull(on) {
    stage.classList.toggle('is-full', on);
    document.body.style.overflow = on ? 'hidden' : '';
    fullBtn.innerHTML = icon(on ? 'minimize' : 'maximize', { size: 18 });
    fullBtn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
    requestAnimationFrame(layout);
  }
  fullBtn.addEventListener('click', () => setFull(!stage.classList.contains('is-full')));
  view.querySelector('[data-full2]').addEventListener('click', () => { setFull(true); fullBtn.focus(); });
  const onKey = (e) => { if (e.key === 'Escape' && stage.classList.contains('is-full')) setFull(false); };
  document.addEventListener('keydown', onKey);
  const onTheme = (e) => { if (!state.locked && state.bg !== 'grid') { state.bg = e.detail; syncSeg(); } sendTheme(); };
  window.addEventListener('socle:theme', onTheme);
  const ro = new ResizeObserver(layout);
  ro.observe(vw);
  syncSeg();
  layout();

  /* ——— Props ——— */
  const codeEl = view.querySelector('[data-code]');
  function applyCode(text, tabId) {
    let out = text;
    props.forEach((p) => {
      if (!p.code) return;
      const raw = typeof p.code === 'string' || Array.isArray(p.code) ? p.code : p.code[tabId];
      if (!raw) return;
      [].concat(raw).forEach((pat) => {
        const def = pat.split('{v}').join(fmtVal(p, p.default));
        const cur = pat.split('{v}').join(fmtVal(p, values[p.name]));
        if (def !== cur) out = out.split(def).join(cur);
      });
    });
    return out;
  }
  /* Palette choisie (autre que celle du design) : bloc :root / .dark ajouté au code copié. */
  function withPalette(text, lang) {
    if (!res || sel.id === defPal) return text;
    if (lang === 'html') {
      if (/<style[^>]*>/i.test(text)) return text.replace(/<style[^>]*>/i, (m) => `${m}\n${cssBlock(res, '  ')}\n`);
      return `<style>\n${cssBlock(res, '  ')}\n</style>\n${text}`;
    }
    if (lang === 'css') return `${cssBlock(res)}\n\n${text}`;
    return `${cssBlock(res).split('\n').map((l) => `// ${l.replace(/^\/\* | \*\/$/g, '')}`).join('\n')}\n\n${text}`;
  }
  function currentCode() { return tabs.length ? withPalette(applyCode(sources[state.tab], tabs[state.tab].id), tabs[state.tab].lang) : ''; }
  function renderCode() {
    if (!tabs.length) return;
    const text = currentCode();
    codeEl.innerHTML = highlight(text, tabs[state.tab].lang);
    view.querySelector('[data-file]').textContent = tabs[state.tab].file.split('/').pop();
    const lines = text.split('\n').length;
    view.querySelector('[data-more]').hidden = lines <= 28 || view.querySelector('.code').classList.contains('is-open');
    view.querySelector('#code-panel').setAttribute('aria-labelledby', `tab-${state.tab}`);
  }
  function pushProps() { post(ifr, { type: 'props', props: values }); renderCode(); }

  const box = view.querySelector('[data-props]');
  if (box) {
    box.addEventListener('input', (e) => {
      const t = e.target;
      const name = t.dataset.prop;
      if (!name) return;
      const p = props.find((x) => x.name === name);
      if (t.dataset.kind === 'range' || t.dataset.kind === 'num') {
        let v = parseFloat(t.value);
        if (Number.isNaN(v)) return;
        v = Math.min(p.max, Math.max(p.min, v));
        values[name] = v;
        box.querySelectorAll(`[data-prop="${name}"]`).forEach((el) => { if (el !== t) el.value = v; });
      } else if (t.dataset.kind === 'select' || t.dataset.kind === 'text') {
        values[name] = t.value;
      }
      pushProps();
    });
    box.addEventListener('click', (e) => {
      const t = e.target.closest('[data-prop]');
      if (!t) return;
      const name = t.dataset.prop;
      if (t.dataset.kind === 'bool') {
        values[name] = !values[name];
        t.setAttribute('aria-checked', String(values[name]));
        pushProps();
      } else if (t.dataset.kind === 'seg') {
        values[name] = t.dataset.value;
        box.querySelectorAll(`[data-prop="${name}"][data-kind="seg"]`).forEach((b) => b.setAttribute('aria-checked', String(b === t)));
        pushProps();
      }
    });
  }
  view.querySelector('[data-reset]').addEventListener('click', () => {
    props.forEach((p) => { values[p.name] = p.default; });
    if (box) box.innerHTML = props.map((p) => controlHTML(p, values[p.name])).join('');
    if (res && sel.id !== defPal) selectPalette(defPal);
    pushProps();
    post(ifr, { type: 'replay' });
  });

  /* ——— Palette ——— */
  const palBox = view.querySelector('[data-palette]');
  let raf = 0;
  function applyPalette({ url = true, code = true } = {}) {
    res = resolveVars(sel, pals);
    post(ifr, { type: 'palette', palette: { id: res.id, light: res.light, dark: res.dark } });
    if (url) writePaletteQuery(sel, defPal);
    if (code && !raf) raf = requestAnimationFrame(() => { raf = 0; renderCode(); });
  }
  function renderCurrent() {
    const k = currentTheme() === 'dark' ? 'sombre' : 'clair';
    const p = pals.find((x) => x.id === sel.id);
    const t = palBox.querySelector('[data-pal-toggle]');
    const open = t.getAttribute('aria-expanded') === 'true';
    t.innerHTML = `${p ? palDots(p[k]) : `<span class="palx__dots" aria-hidden="true">${['--accent', '--bg', '--text'].map((f) => `<i style="background:${esc(res[currentTheme()][f])}"></i>`).join('')}</span>`}
      <span class="palx__nm">${esc(p ? p.nom : 'Personnalisée')}</span>${sel.id === defPal ? '<span class="badge">Défaut</span>' : ''}
      <span class="palx__chev">${icon('chevronDown', { size: 16 })}</span>`;
    t.setAttribute('aria-label', `Palette : ${p ? p.nom : 'Personnalisée'}. ${open ? 'Fermer' : 'Changer'} la liste`);
  }
  function renderList() { palBox.querySelector('[data-pal-list]').innerHTML = paletteListHTML(pals, sel, defPal, currentTheme()); }
  function renderCustom() {
    const c = palBox.querySelector('[data-pal-custom]');
    c.hidden = sel.id !== CUSTOM;
    if (sel.id === CUSTOM) c.innerHTML = customHTML(sel, editing, res);
  }
  function refreshCustomReport() {
    /* Met à jour contrastes et alertes sans recréer les champs (garde le focus). */
    const c = palBox.querySelector('[data-pal-custom]');
    const tmp = document.createElement('div');
    tmp.innerHTML = customHTML(sel, editing, res);
    c.querySelectorAll('.palx__checks, .palx__warn, .palx__custom > .prop__hint, [data-pal-rederive]').forEach((n) => n.remove());
    [...tmp.children].filter((n) => !n.matches('[data-pal-edit], .palx__fields')).forEach((n) => c.appendChild(n));
    FIELDS.forEach(([k]) => {
      const v = sel[editing][k];
      const col = c.querySelector(`[data-pc="${k}"]`); const hx = c.querySelector(`[data-pch="${k}"]`);
      if (col && document.activeElement !== col) col.value = v.toLowerCase();
      if (hx && document.activeElement !== hx) hx.value = v;
    });
  }
  function selectPalette(id) {
    if (id === CUSTOM) sel = custom;
    else sel = { id };
    applyPalette();
    renderCurrent(); renderList(); renderCustom();
  }
  function setEditing(t) {
    editing = t;
    if (state.bg !== 'grid' && state.bg !== t) { state.bg = t; state.locked = true; syncSeg(); sendTheme(); }
    renderCustom();
  }
  if (palBox) {
    renderCurrent(); renderList(); renderCustom();
    const toggle = palBox.querySelector('[data-pal-toggle]');
    const list = palBox.querySelector('[data-pal-list]');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      list.hidden = !open;
      renderCurrent();
      if (open) { const cur = list.querySelector('[aria-pressed="true"]'); if (cur) cur.scrollIntoView({ block: 'nearest' }); }
    });
    list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pal]');
      if (!b) return;
      selectPalette(b.dataset.pal);
      if (b.dataset.pal === CUSTOM) {
        toggle.setAttribute('aria-expanded', 'false'); list.hidden = true; renderCurrent();
        const first = palBox.querySelector('[data-pch="accent"]');
        if (first) first.focus({ preventScroll: true });
        palBox.scrollIntoView({ block: 'nearest' });
        return;
      }
      const nb = list.querySelector(`[data-pal="${b.dataset.pal}"]`);
      if (nb) nb.focus({ preventScroll: true });
    });
    const cbox = palBox.querySelector('[data-pal-custom]');
    cbox.addEventListener('click', (e) => {
      const ed = e.target.closest('[data-edit]');
      if (ed) { setEditing(ed.dataset.edit); return; }
      if (e.target.closest('[data-pal-rederive]')) {
        custom.dark = deriveDarkInputs(custom.light); custom.darkEdited = false;
        applyPalette(); renderCustom(); renderCurrent();
      }
    });
    cbox.addEventListener('input', (e) => {
      const t = e.target;
      const k = t.dataset.pc || t.dataset.pch;
      if (!k) return;
      const v = normHex(t.value);
      t.toggleAttribute('aria-invalid', !v);
      if (!v) return;
      custom[editing][k] = v;
      if (editing === 'light' && !custom.darkEdited) custom.dark = deriveDarkInputs(custom.light);
      if (editing === 'dark') custom.darkEdited = true;
      const twin = cbox.querySelector(t.dataset.pc ? `[data-pch="${k}"]` : `[data-pc="${k}"]`);
      if (twin) twin.value = t.dataset.pc ? v : v.toLowerCase();
      applyPalette();
      refreshCustomReport();
      renderCurrent();
    });
    bindCopy(palBox.querySelector('[data-pal-copy]'), () => cssBlock(res), { toastMsg: 'Variables de la palette copiées' });
  }
  const onPalTheme = () => { if (palBox) { renderCurrent(); renderList(); } };
  window.addEventListener('socle:theme', onPalTheme);
  /* La démo rechargée (nouvelle origine) reçoit à nouveau la palette. */
  ifr.addEventListener('load', () => { if (res && sel.id !== defPal) applyPalette({ url: false, code: false }); });

  /* ——— Code ——— */
  if (tabs.length) {
    const tabBtns = [...view.querySelectorAll('[data-tab]')];
    const selectTab = (i, focus = false) => {
      state.tab = i;
      tabBtns.forEach((b, j) => { b.setAttribute('aria-selected', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      if (focus) tabBtns[i].focus();
      renderCode();
    };
    tabBtns.forEach((b, i) => {
      b.addEventListener('click', () => selectTab(i));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); selectTab((i + 1) % tabBtns.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab((i - 1 + tabBtns.length) % tabBtns.length, true); }
      });
    });
    bindCopy(view.querySelector('[data-copy]'), currentCode, { toastMsg: 'Code copié' });
    view.querySelector('[data-expand]').addEventListener('click', () => { view.querySelector('.code').classList.add('is-open'); view.querySelector('[data-more]').hidden = true; });
    renderCode();
  }

  return () => {
    ro.disconnect();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('socle:theme', onTheme);
    window.removeEventListener('socle:theme', onPalTheme);
    document.body.style.overflow = '';
  };
}
