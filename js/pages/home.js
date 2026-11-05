/* Accueil : accroche, derniers ajouts, index des sections, marques. */
import { SECTIONS, CATEGORIES } from '../../registry/categories.js';
import { loadIndex, countsByCategory } from '../lib/store.js';
import { icon, rawIcon } from '../lib/icons.js';
import { esc, fr } from '../lib/dom.js';
import { thumbHTML, mountThumbs } from '../lib/frames.js';
import { cardHTML } from './category.js';
import { brandShowcase } from './brands.js';
import { backdropHTML, mountBackdrops } from '../lib/backdrop.js';
import { backdropHTML as legacyBackdropHTML, mountBackdrops as mountLegacyBackdrops } from '../lib/backdrop-legacy.js';
import { mountCarousel } from '../lib/carousel.js';

export async function renderHome(view) {
  const [{ items }, counts] = await Promise.all([loadIndex(), countsByCategory()]);
  const latest = items.slice(0, 12);
  const nCats = CATEGORIES.length;
  const nBrands = (window.BRANDS || []).length;
  const first = items[0];

  view.innerHTML = `
  <div class="page">
    <section class="hero" aria-labelledby="h-hero">
      ${backdropHTML({ cls: 'backdrop--hero' })}
      <p class="eyebrow">Bibliothèque de design</p>
      <h1 id="h-hero" class="t-display">Des fondations solides pour chaque interface.</h1>
      <p class="lead">${fr('Composants, animations et sections : un aperçu live, des props réglables et le code à copier en HTML/CSS ou React.')}</p>
      <div class="hero__actions">
        ${first ? `<a class="btn btn--primary btn--arrow" href="/c/${first.categorie}">Parcourir la bibliothèque${icon('arrowRight', { size: 16 })}</a>` : ''}
        <button class="btn btn--secondary" type="button" data-open-cmdk>${icon('search', { size: 16 })}Rechercher</button>
      </div>
      <div class="hero__stats" role="list">
        <div class="stat" role="listitem"><b>${items.length}</b><span>designs</span></div>
        <div class="stat" role="listitem"><b>${nCats}</b><span>catégories</span></div>
        <div class="stat" role="listitem"><b>${nBrands}</b><span>marques</span></div>
      </div>
    </section>

    <section class="block" aria-labelledby="h-latest">
      <div class="block__head">
        <div><h2 id="h-latest" class="t-section">Derniers ajouts</h2><p class="muted t-sm">Aperçus live, au thème de l’interface. Survolez pour mettre en pause.</p></div>
        ${latest.length ? `<div class="carousel__ctrls">
          <button class="icon-btn icon-btn--round" type="button" data-play aria-pressed="false" aria-label="Mettre le défilement en pause">${icon('pause', { size: 16, cls: 'i-pause' })}${icon('play', { size: 16, cls: 'i-play' })}</button>
          <button class="icon-btn icon-btn--round" type="button" data-prev aria-label="Design précédent">${icon('arrowLeft', { size: 18 })}</button>
          <button class="icon-btn icon-btn--round" type="button" data-next aria-label="Design suivant">${icon('arrowRight', { size: 18 })}</button>
        </div>` : ''}
      </div>
      ${latest.length ? `<div class="carousel" role="region" aria-roledescription="carrousel" aria-label="Derniers ajouts" data-carousel>
        <div class="carousel__viewport"><div class="carousel__track">${latest.map((it, i) => `<div class="carousel__slide" role="group" aria-roledescription="diapositive" aria-label="${i + 1} sur ${latest.length}">${cardHTML(it)}</div>`).join('')}</div></div>
      </div>` : `<p class="muted">Aucun design pour l’instant.</p>`}
    </section>

    <section class="block block--bg" aria-labelledby="h-index">
      ${legacyBackdropHTML({ cls: 'backdrop--index' })}
      <div class="block__head"><div><h2 id="h-index" class="t-section">Toute la bibliothèque</h2><p class="muted t-sm">Six sections, des fondations aux pages complètes.</p></div></div>
      <div class="index">
        ${SECTIONS.map((s) => `
          <div class="index__sec">
            <div class="index__meta"><span class="eyebrow">${s.num}</span><h3>${esc(s.nom)}</h3><p>${fr(s.description)}</p></div>
            <ul class="index__cats">
              ${s.categories.map((c) => {
                const n = counts[c.id] || 0;
                const special = !!c.page;
                const empty = !special && n === 0;
                const right = special ? icon('arrowRight', { size: 16, cls: 'c' }) : `<span class="c">${empty ? 'Bientôt' : n}</span>`;
                return `<li><a class="cat-row ${empty ? 'is-empty' : ''}" href="/c/${c.id}"><span class="tile">${rawIcon(c.icon, { size: 18 })}</span><span class="nm">${esc(c.nom)}</span>${right}</a></li>`;
              }).join('')}
            </ul>
          </div>`).join('')}
      </div>
    </section>

    <section class="block" aria-labelledby="h-brands">
      <div class="block__head">
        <div><h2 id="h-brands" class="t-section">Marques</h2><p class="muted t-sm">Logos, icônes d’app et palettes de chaque projet.</p></div>
        <a class="link-more btn--arrow" href="/marques">Toutes les marques${icon('arrowRight', { size: 16 })}</a>
      </div>
      ${brandShowcase()}
    </section>
  </div>
  <footer class="foot"><span>Socle · bibliothèque de design</span><span>Geist · Terracotta · grille de 8 px</span></footer>`;

  const car = view.querySelector('[data-carousel]');
  const block = car && car.closest('.block');
  const stopCar = car ? mountCarousel(block, { speed: 26, onClone: (c) => mountThumbs(c) }) : () => {};
  mountThumbs(view);
  const stopBg0 = mountBackdrops(view), stopBg1 = mountLegacyBackdrops(view);
  const stopBg = () => { stopBg0(); stopBg1(); };
  return () => { stopCar(); stopBg(); };
}
