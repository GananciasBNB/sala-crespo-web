// Post-build: genera HTML por ruta con sus propios meta tags (Open Graph) para
// que la previsualización al compartir links (WhatsApp/Facebook/etc.) muestre el
// contenido correcto de cada página. Los crawlers NO ejecutan JS, así que leen
// estos HTML estáticos; el usuario igual carga la misma SPA (mismo bundle).
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const index = readFileSync(join(distDir, 'index.html'), 'utf8');

const SITE = 'https://www.saladejuegoscrespo.ar';

// Cada entrada genera dist/<file> con sus meta. El rewrite de vercel.json apunta
// la ruta a este archivo (en vez de /index.html).
const PAGES = [
  {
    file: 'carta.html',
    url: `${SITE}/carta`,
    title: 'Nuestra Carta — Sala de Juegos Crespo',
    description: 'La carta del bar de Sala Crespo: minutas, cervezas, vinos, tragos, espumantes y más. San Martín 1053, Crespo, Entre Ríos.',
    image: `${SITE}/logo-light.jpg`,
  },
];

const sub = (html, re, value) => html.replace(re, (m, a, b) => `${a}${value}${b}`);

for (const p of PAGES) {
  let html = index;
  html = sub(html, /(<title>)[^<]*(<\/title>)/, p.title);
  html = sub(html, /(<meta name="description" content=")[^"]*(")/, p.description);
  html = sub(html, /(<meta property="og:url" content=")[^"]*(")/, p.url);
  html = sub(html, /(<meta property="og:title" content=")[^"]*(")/, p.title);
  html = sub(html, /(<meta property="og:description" content=")[^"]*(")/, p.description);
  html = sub(html, /(<meta property="og:image" content=")[^"]*(")/, p.image);
  html = sub(html, /(<meta name="twitter:title" content=")[^"]*(")/, p.title);
  html = sub(html, /(<meta name="twitter:description" content=")[^"]*(")/, p.description);
  html = sub(html, /(<meta name="twitter:image" content=")[^"]*(")/, p.image);
  // canonical
  html = sub(html, /(<link rel="canonical" href=")[^"]*(")/, p.url);
  writeFileSync(join(distDir, p.file), html);
  console.log(`✓ OG page: dist/${p.file} → "${p.title}"`);
}
