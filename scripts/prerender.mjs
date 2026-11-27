// scripts/prerender.mjs
// Étape finale du build (voir "build" dans package.json) :
//  1. garde une copie vide de dist/index.html -> dist/app-shell.html,
//     servie pour toutes les routes de l'application (/doctor, /assureur...)
//     afin qu'elles n'affichent jamais le contenu de l'accueil ;
//  2. pour chaque page publique, écrit un HTML complet (contenu + title,
//     description, canonical, Open Graph propres à la page).
// Netlify sert un fichier existant avant d'appliquer la règle SPA (/* 200),
// donc /, /mentions-legales et /politique-confidentialite reçoivent leur
// version pré-rendue.
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const ssrEntry = path.join(root, "dist-ssr", "prerender.js");

const { render, PUBLIC_PAGES } = await import(pathToFileURL(ssrEntry).href);
const SITE_URL = "https://mediconnect-plus.com";

const shell = await readFile(path.join(dist, "index.html"), "utf8");
await writeFile(path.join(dist, "app-shell.html"), shell);

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setHead(html, page) {
  const url = SITE_URL + (page.path === "/" ? "/" : page.path);
  const t = esc(page.title);
  const d = esc(page.description);
  const rules = [
    [/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`],
    [/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${d}" />`],
    [/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`],
    [/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${t}" />`],
    [/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${d}" />`],
    [/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${t}" />`],
    [/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${d}" />`],
  ];
  for (const [re, val] of rules) {
    if (!re.test(html)) throw new Error(`Balise introuvable dans index.html : ${re}`);
    html = html.replace(re, val);
  }
  return html;
}

for (const page of PUBLIC_PAGES) {
  const body = render(page.path);
  if (!body.includes("<h1")) throw new Error(`Pas de <h1> rendu pour ${page.path}`);
  let html = setHead(shell, page);
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  await writeFile(path.join(dist, page.file), html);
  console.log(`prerender: ${page.path} -> dist/${page.file} (${body.length} car.)`);
}

await rm(path.join(root, "dist-ssr"), { recursive: true, force: true });
