import { navigate } from './nav.js';
/* Palette de commandes ⌘K : items, catégories, marques, pages. */
import { CATEGORIES } from '../../registry/categories.js';
import { icon, rawIcon } from './icons.js';
import { esc, trapFocus } from './dom.js';
import { loadIndex, currentTheme, setTheme } from './store.js';

let el = null;
let scrim = null;
let opener = null;
let results = [];
let sel = 0;

const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function score(q, hay) {
  if (!q) return 1;
  const h = norm(hay);
  const words = norm(q).split(/\s+/).filter(Boolean);
  let s = 0;
  for (const w of words) {
    const i = h.indexOf(w);
    if (i === -1) return 0;
    s += i === 0 ? 3 : (h[i - 1] === ' ' ? 2 : 1);
  }
  return s;
}

function mark(text, q) {
  const t = esc(text);
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return t;
  const n = norm(text);
  const w = words[0];
  const i = n.indexOf(w);
  if (i === -1) return t;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + w.length)) + '</mark>' + esc(text.slice(i + w.length));
}

async function sources() {
  const { items } = await loadIndex();
  const out = [];
  items.forEach((it) => {
    const cat = CATEGORIES.find((c) => c.id === it.categorie);
    out.push({ group: 'Designs', title: it.nom, sub: `${cat ? cat.nom : ''} · ${it.description || ''}`, hay: `${it.nom} ${(it.tags || []).join(' ')} ${cat ? cat.nom : ''} ${it.description || ''}`, href: `/i/${it.id}`, ic: cat ? rawIcon(cat.icon, { size: 18 }) : icon('package', { size: 18 }) });
  });
  CATEGORIES.forEach((c) => out.push({ group: 'Catégories', title: c.nom, sub: `${c.sectionNom} · ${c.description}`, hay: `${c.nom} ${c.sectionNom} ${c.description}`, href: `/c/${c.id}`, ic: rawIcon(c.icon, { size: 18 }) }));
  (window.BRANDS || []).forEach((b) => out.push({ group: 'Marques', title: b.nom, sub: b.baseline, hay: `${b.nom} ${b.baseline} logo marque`, href: `/marques/${b.id}`, ic: icon('book', { size: 18 }) }));
  out.push({ group: 'Actions', title: 'Changer de thème', sub: 'Clair ou sombre', hay: 'theme clair sombre mode nuit', action: () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'), ic: icon('moon', { size: 18 }) });
  out.push({ group: 'Actions', title: 'Toutes les marques', sub: 'Logos, palettes et icônes', hay: 'marques logos', href: '/marques', ic: icon('book', { size: 18 }) });
  return out;
}

async function render(q) {
  const all = await sources();
  results = all.map((r) => ({ ...r, s: score(q, r.hay) })).filter((r) => r.s > 0);
  if (q) results.sort((a, b) => b.s - a.s);
  if (!q) results = results.filter((r) => r.group !== 'Catégories' || ['boutons', 'pricing', 'texte-anime', 'backgrounds', 'bento', 'couleurs'].includes(r.href.split('/').pop()));
  const order = ['Designs', 'Catégories', 'Marques', 'Actions'];
  results.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  results = results.slice(0, 40);
  sel = 0;
  const list = el.querySelector('.cmdk__list');
  if (!results.length) {
    list.innerHTML = `<div class="cmdk__empty">Aucun résultat pour «\u202F${esc(q)}\u202F».</div>`;
    el.querySelector('input').setAttribute('aria-activedescendant', '');
    return;
  }
  let html = '';
  let g = '';
  results.forEach((r, i) => {
    if (r.group !== g) { g = r.group; html += `<div class="cmdk__group eyebrow" role="presentation">${esc(g)}</div>`; }
    html += `<div class="cmdk__opt" role="option" id="ck-${i}" data-i="${i}" aria-selected="${i === 0}"><span class="ic-tile">${r.ic}</span><span class="tx"><b>${mark(r.title, q)}</b><span>${esc(r.sub)}</span></span></div>`;
  });
  list.innerHTML = html;
  el.querySelector('input').setAttribute('aria-activedescendant', 'ck-0');
}

function move(d) {
  if (!results.length) return;
  sel = (sel + d + results.length) % results.length;
  el.querySelectorAll('.cmdk__opt').forEach((o) => o.setAttribute('aria-selected', String(+o.dataset.i === sel)));
  const cur = el.querySelector(`#ck-${sel}`);
  cur && cur.scrollIntoView({ block: 'nearest' });
  el.querySelector('input').setAttribute('aria-activedescendant', `ck-${sel}`);
}

function choose(i) {
  const r = results[i];
  if (!r) return;
  close();
  if (r.action) r.action();
  else navigate(r.href);
}

export function open() {
  if (el) return;
  opener = document.activeElement;
  scrim = document.createElement('div');
  scrim.className = 'scrim';
  el = document.createElement('div');
  el.className = 'cmdk';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Rechercher dans Socle');
  el.innerHTML = `
    <div class="cmdk__field">${icon('search')}
      <input type="text" placeholder="Rechercher un design, une catégorie, une marque…" aria-label="Rechercher" role="combobox" aria-expanded="true" aria-controls="ck-list" autocomplete="off" spellcheck="false">
      <button class="icon-btn icon-btn--touch" type="button" data-close aria-label="Fermer">${icon('x')}</button>
    </div>
    <div class="cmdk__list" id="ck-list" role="listbox" aria-label="Résultats"></div>
    <div class="cmdk__foot"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span></div>`;
  document.body.append(scrim, el);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('is-open'); el.classList.add('is-open'); });
  const input = el.querySelector('input');
  input.addEventListener('input', () => render(input.value.trim()));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else trapFocus(el, e);
  });
  el.querySelector('.cmdk__list').addEventListener('click', (e) => { const o = e.target.closest('.cmdk__opt'); if (o) choose(+o.dataset.i); });
  el.querySelector('.cmdk__list').addEventListener('mousemove', (e) => {
    const o = e.target.closest('.cmdk__opt');
    if (o && +o.dataset.i !== sel) { sel = +o.dataset.i; move(0); }
  });
  el.querySelector('[data-close]').addEventListener('click', close);
  scrim.addEventListener('click', close);
  render('');
  setTimeout(() => input.focus(), 10);
}

export function close() {
  if (!el) return;
  const a = el; const b = scrim;
  el = null; scrim = null;
  document.body.style.overflow = '';
  a.classList.remove('is-open'); b.classList.remove('is-open');
  setTimeout(() => { a.remove(); b.remove(); }, 200);
  if (opener && opener.focus) opener.focus({ preventScroll: true });
}

export function bindCmdk() {
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); el ? close() : open(); }
    else if (k === '/' && !el && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); open(); }
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-cmdk]')) open(); });
}
