#!/usr/bin/env node
// Génère registry/index.json à partir des dossiers registry/items/<id>/meta.json.
// Usage : node scripts/build-index.mjs
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsDir = path.join(root, 'registry', 'items');
const { CATEGORIES } = await import(pathToFileURL(path.join(root, 'registry', 'categories.js')).href);
const catIds = new Set(CATEGORIES.map((c) => c.id));
const NIVEAUX = new Set(['essentiel', 'premium']);

const errors = [];
const warnings = [];
const items = [];
const dirs = (await readdir(itemsDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();

for (const dir of dirs) {
  const base = path.join(itemsDir, dir);
  let meta;
  try {
    meta = JSON.parse(await readFile(path.join(base, 'meta.json'), 'utf8'));
  } catch (e) {
    errors.push(`${dir} : meta.json illisible (${e.message})`);
    continue;
  }
  if (meta.id !== dir) errors.push(`${dir} : « id » doit valoir « ${dir} » (trouvé « ${meta.id} »)`);
  if (!catIds.has(meta.categorie)) errors.push(`${dir} : catégorie inconnue « ${meta.categorie} »`);
  for (const k of ['nom', 'description', 'date']) if (!meta[k]) errors.push(`${dir} : champ « ${k} » manquant`);
  if (meta.niveau != null && !NIVEAUX.has(meta.niveau)) errors.push(`${dir} : « niveau » vaut « essentiel » ou « premium » (trouvé « ${meta.niveau} »)`);
  try { await access(path.join(base, 'demo.html')); } catch { errors.push(`${dir} : demo.html manquant`); }
  for (const c of meta.code || []) {
    try { await access(path.join(base, c.file)); } catch { errors.push(`${dir} : fichier de code introuvable ${c.file}`); }
  }
  // Logo de la marque fictive du design (rubrique « Idées de logos » des Marques).
  let logo = null;
  if (meta.logo_exemple != null) {
    const L = meta.logo_exemple;
    const fichier = (L && L.fichier) || 'logo.svg';
    if (!L || typeof L !== 'object' || !L.nom) errors.push(`${dir} : « logo_exemple » attend { "nom", "secteur", "fichier" }`);
    else if (/[\\/]|\.\./.test(fichier) || !fichier.endsWith('.svg')) errors.push(`${dir} : « logo_exemple.fichier » doit être un .svg du dossier du design (trouvé « ${fichier} »)`);
    else {
      let svg = '';
      try { svg = await readFile(path.join(base, fichier), 'utf8'); } catch { errors.push(`${dir} : logo introuvable ${fichier}`); }
      if (svg && !/<svg[^>]*\sviewBox="/.test(svg)) errors.push(`${dir} : ${fichier} doit avoir un viewBox`);
      // Avertissements (non bloquants) : Socle a un repli, mais le logo est moins bien servi.
      if (svg && !/<svg[^>]*\sdata-icone="/.test(svg)) warnings.push(`${dir} : ${fichier} sans data-icone="x y l h" : l’icône d’app prend le carré de gauche du logo`);
      if (svg && !/var\(--/.test(svg)) warnings.push(`${dir} : ${fichier} sans variables (var(--p, currentColor)…) : les palettes ne s’y appliqueront pas`);
      if (svg) logo = { nom: L.nom, secteur: L.secteur || '', fichier: `registry/items/${dir}/${fichier}`, ...(L.palette ? { palette: L.palette } : {}), ...(L.typo ? { typo: L.typo } : {}) };
    }
  }
  items.push({
    id: meta.id,
    nom: meta.nom,
    categorie: meta.categorie,
    niveau: meta.niveau || 'essentiel',
    ...(meta.palette ? { palette: meta.palette } : {}),
    description: meta.description,
    tags: meta.tags || [],
    date: meta.date,
    ...(meta.thumb ? { thumb: meta.thumb } : {}),
    ...(meta.ordre != null ? { ordre: meta.ordre } : {}),
    ...(logo ? { logo_exemple: logo } : {}),
  });
}

if (warnings.length) console.warn('Logos d’exemple à revoir :\n- ' + warnings.join('\n- '));
if (errors.length) {
  console.error('Index non généré :\n- ' + errors.join('\n- '));
  process.exit(1);
}

items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (a.ordre ?? 50) - (b.ordre ?? 50) || a.nom.localeCompare(b.nom, 'fr'));
const out = { version: 1, total: items.length, items };
await writeFile(path.join(root, 'registry', 'index.json'), JSON.stringify(out, null, 2) + '\n');
// GitHub Pages sert 404.html pour les chemins propres (/c/modales) : copie conforme d'index.html.
await writeFile(path.join(root, '404.html'), await readFile(path.join(root, 'index.html')));
const nLogos = items.filter((x) => x.logo_exemple).length;
console.log(`registry/index.json : ${items.length} design${items.length > 1 ? 's' : ''}, ${nLogos} logo${nLogos > 1 ? 's' : ''} d’exemple.`);
