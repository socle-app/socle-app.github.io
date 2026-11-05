/* Barre du haut, navigation latérale, tiroirs. */
import { SECTIONS } from '../../registry/categories.js';
import { icon, rawIcon } from './icons.js';
import { esc, trapFocus, $ } from './dom.js';
import { countsByCategory, currentTheme, setTheme } from './store.js';

export function renderBar() {
  const bar = document.getElementById('bar');
  bar.innerHTML = `
    <div class="bar__in">
      <button class="icon-btn icon-btn--touch menu-btn only-mobile" type="button" aria-label="Ouvrir la navigation" data-open-nav>${icon('menu')}</button>
      <a class="brand" href="/" aria-label="Socle, accueil">
        <img class="logo-light" src="assets/logo.svg" width="83" height="22" alt="Socle">
        <img class="logo-dark" src="assets/logo-dark.svg" width="83" height="22" alt="Socle">
      </a>
      <nav class="bar__nav" aria-label="Principale">
        <a href="/" data-nav="home">Bibliothèque</a>
        <a href="/c/couleurs" data-nav="fondations">Fondations</a>
        <a href="/marques" data-nav="marques">Marques</a>
      </nav>
      <span class="bar__spacer"></span>
      <button class="search-trigger" type="button" data-open-cmdk aria-label="Rechercher (Commande K)">
        ${icon('search', { size: 16 })}<span>Rechercher…</span><kbd data-kbd>⌘K</kbd>
      </button>
      <button class="icon-btn icon-btn--touch only-mobile" type="button" data-open-cmdk aria-label="Rechercher">${icon('search')}</button>
      <button class="icon-btn icon-btn--touch theme-btn" type="button" data-theme-toggle aria-label="Passer en thème sombre">
        ${icon('moon', { cls: 'i-moon' })}${icon('sun', { cls: 'i-sun' })}
      </button>
    </div>`;
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    const k = bar.querySelector('[data-kbd]');
    if (k) k.textContent = 'Ctrl K';
  }
  const tbtn = bar.querySelector('[data-theme-toggle]');
  const syncLabel = () => tbtn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre');
  syncLabel();
  tbtn.addEventListener('click', () => { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); syncLabel(); });
  window.addEventListener('socle:theme', syncLabel);
  bar.querySelector('[data-open-nav]').addEventListener('click', openNavDrawer);
}

export function setBarActive(key) {
  document.querySelectorAll('.bar__nav a').forEach((a) => {
    if (a.dataset.nav === key) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

/* ——— Arbre ——— */
const COLLAPSE_KEY = 'socle-tree';
function collapsedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '[]')); } catch (e) { return new Set(); }
}
function saveCollapsed(set) {
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set])); } catch (e) {}
}

export async function treeHTML(activeCat = '', { idPrefix = 't' } = {}) {
  const counts = await countsByCategory();
  const closed = collapsedSet();
  return `<nav class="tree" aria-label="Catégories">
    <a class="tree__home" href="/" ${activeCat === '__home' ? 'aria-current="page"' : ''}>${icon('layers', { size: 18 })}Vue d’ensemble</a>
    ${SECTIONS.map((s) => {
      const open = !closed.has(s.id) || s.categories.some((c) => c.id === activeCat);
      const lid = `${idPrefix}-${s.id}`;
      return `<div class="tree__sec">
        <button class="tree__head" type="button" aria-expanded="${open}" aria-controls="${lid}" data-sec="${s.id}"><span class="n">${s.num}</span>${esc(s.nom)}${icon('chevronDown', { size: 16 })}</button>
        <ul class="tree__list" id="${lid}" ${open ? '' : 'hidden'}>
          ${s.categories.map((c) => {
            const n = counts[c.id] || 0;
            const special = !!c.page;
            const empty = !special && n === 0;
            return `<li><a class="tree__link ${empty ? 'is-empty' : ''}" href="/c/${c.id}" ${c.id === activeCat ? 'aria-current="page"' : ''}>${rawIcon(c.icon, { size: 18 })}<span>${esc(c.nom)}</span>${special || !n ? '' : `<span class="c" aria-label="${n} design${n > 1 ? 's' : ''}">${n}</span>`}</a></li>`;
          }).join('')}
        </ul>
      </div>`;
    }).join('')}
  </nav>`;
}

export function bindTree(root) {
  root.querySelectorAll('.tree__head').forEach((b) => {
    b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      const list = document.getElementById(b.getAttribute('aria-controls'));
      if (list) list.hidden = open;
      const set = collapsedSet();
      if (open) set.add(b.dataset.sec); else set.delete(b.dataset.sec);
      saveCollapsed(set);
    });
  });
}

/* ——— Tiroir générique ——— */
let openDrawerEl = null;
export function openDrawer({ side = 'left', title = '', body = '', foot = '', onMount = null, label = '' }) {
  closeDrawer(true);
  const opener = document.activeElement;
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const d = document.createElement('div');
  d.className = `drawer drawer--${side}`;
  d.setAttribute('role', 'dialog');
  d.setAttribute('aria-modal', 'true');
  d.setAttribute('aria-label', label || title);
  d.innerHTML = `<div class="drawer__head">${title}<button class="icon-btn icon-btn--touch" type="button" data-close aria-label="Fermer">${icon('x')}</button></div>
    <div class="drawer__body">${body}</div>${foot ? `<div class="drawer__foot">${foot}</div>` : ''}`;
  document.body.append(scrim, d);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('is-open'); d.classList.add('is-open'); });
  const close = () => closeDrawer();
  scrim.addEventListener('click', close);
  d.querySelector('[data-close]').addEventListener('click', close);
  const onKey = (e) => { if (e.key === 'Escape') close(); trapFocus(d, e); };
  d.addEventListener('keydown', onKey);
  // Balayage pour fermer
  let x0 = null;
  d.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  d.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if ((side === 'left' && dx < -60) || (side === 'right' && dx > 60)) close();
    x0 = null;
  });
  openDrawerEl = { scrim, d, opener };
  if (onMount) onMount(d);
  setTimeout(() => { const f = d.querySelector('[aria-current="page"]') || d.querySelector('[data-close]'); f && f.focus({ preventScroll: true }); }, 30);
  return d;
}

export function closeDrawer(immediate = false) {
  if (!openDrawerEl) return;
  const { scrim, d, opener } = openDrawerEl;
  openDrawerEl = null;
  document.body.style.overflow = '';
  if (immediate) { scrim.remove(); d.remove(); return; }
  scrim.classList.remove('is-open');
  d.classList.remove('is-open');
  setTimeout(() => { scrim.remove(); d.remove(); }, 280);
  if (opener && opener.focus) opener.focus({ preventScroll: true });
}

let currentActiveCat = '';
export function setActiveCat(id) { currentActiveCat = id; }

async function openNavDrawer() {
  const body = await treeHTML(currentActiveCat, { idPrefix: 'd' });
  openDrawer({
    side: 'left',
    label: 'Navigation',
    title: `<img src="assets/${currentTheme() === 'dark' ? 'logo-dark' : 'logo'}.svg" height="22" width="83" alt="Socle">`,
    body,
    onMount: (d) => {
      bindTree(d);
      d.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => closeDrawer()));
    },
  });
}

window.addEventListener('socle:route', () => closeDrawer(true));
