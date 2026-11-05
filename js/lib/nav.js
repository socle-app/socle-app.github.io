/* Navigation par chemins propres (socle-app.github.io/c/modales).
   GitHub Pages sert 404.html (copie d'index.html) pour toute URL inconnue ;
   <base href="/"> garde les ressources relatives valides. Les anciens liens #/… sont convertis. */
export const BASE = new URL('../../', import.meta.url).pathname; // racine du site

/* Route courante au format « #/chemin?requête », pour le code existant. */
export function routeHash() {
  let p = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : location.pathname.replace(/^\//, '');
  p = p.replace(/(^|\/)index\.html$/, '').replace(/^404\.html$/, '');
  return `#/${p}${location.search}`;
}

/* « #/c/x?y » ou « /c/x?y » → URL réelle. */
export function toURL(route) {
  const r = String(route).replace(/^#?\/?/, '');
  return BASE + r;
}

export function navigate(route, replace = false) {
  const url = toURL(route);
  if (url === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  window.dispatchEvent(new Event('socle:route'));
}

export function setURL(route) { try { history.replaceState(history.state, '', toURL(route)); } catch (e) { /* ignoré */ } }

/* Anciens liens hashés → chemins propres. */
if (location.hash.startsWith('#/')) history.replaceState(null, '', toURL(location.hash));

/* Liens internes : sans rechargement. */
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  const href = a.getAttribute('href');
  if (href.startsWith('#') && !href.startsWith('#/')) { // ancre locale (lien d'évitement…)
    const t = document.getElementById(href.slice(1));
    if (t) { e.preventDefault(); t.scrollIntoView(); if (t.tabIndex < 0 && !t.hasAttribute('tabindex')) t.tabIndex = -1; t.focus({ preventScroll: true }); }
    return;
  }
  if (!href.startsWith('#/') && !href.startsWith('/')) return;
  if (href.startsWith('//')) return;
  const path = href.replace(/^#/, '');
  if (/\.[a-z0-9]{2,5}($|\?)/i.test(path.split('?')[0])) return; // fichier réel
  e.preventDefault();
  navigate(path);
});
window.addEventListener('popstate', () => window.dispatchEvent(new Event('socle:route')));
