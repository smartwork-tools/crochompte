/* V66.3 — aperçu des liens partagés (WhatsApp, LinkedIn, Facebook, SMS…).
   Vérifie, pour l'accueil et les quatre pages annexes :
   - que les balises de partage sont dans <head> (titre, description, image,
     adresse, nom du site, langue, grand aperçu) ;
   - que l'image déclarée existe vraiment dans le site, en JPEG 1200 × 630,
     et pèse moins de 300 Ko (certains réseaux ignorent les images lourdes) ;
   - que l'adresse de chaque page correspond au domaine du site (CNAME). */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..');
const domaine = fs.readFileSync(path.join(racine, 'CNAME'), 'utf8').trim();
const R = {};

function dimensionsJpeg(buf){
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let i = 2;
  while (i < buf.length){
    if (buf[i] !== 0xFF){ i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC){
      return {h: buf.readUInt16BE(i + 5), l: buf.readUInt16BE(i + 7)};
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
function meta(tete, attr, nom){
  const re = new RegExp('<meta ' + attr + '="' + nom.replace(/[:.]/g, '\\$&') + '" content="([^"]*)">', 'g');
  const t = [...tete.matchAll(re)];
  return t.length === 1 ? t[0][1] : null;   /* absente ou en double : null */
}

const pages = {'index.html': 'https://' + domaine + '/'};
['a-propos.html', 'cgv.html', 'confidentialite.html', 'mentions-legales.html'].forEach(p => pages[p] = 'https://' + domaine + '/' + p);
const images = new Set();
for (const [page, adresse] of Object.entries(pages)){
  const html = fs.readFileSync(path.join(racine, page), 'utf8');
  const tete = html.slice(0, html.indexOf('</head>'));
  const titre = (tete.match(/<title>([^<]*)<\/title>/) || [])[1];
  const n = page.replace('.html', '');
  const m = k => meta(tete, 'property', k);
  R[n + '_titre'] = !!m('og:title') && (page === 'index.html' || m('og:title') === titre);
  R[n + '_description'] = !!m('og:description') && !!meta(tete, 'name', 'description');
  R[n + '_type'] = m('og:type') === 'website';
  R[n + '_adresse'] = m('og:url') === adresse && tete.includes('<link rel="canonical" href="' + adresse + '">');
  R[n + '_site_langue'] = m('og:site_name') === 'Crochompte' && m('og:locale') === 'fr_FR';
  const img = m('og:image');
  R[n + '_image'] = !!img && img.indexOf('https://' + domaine + '/') === 0;
  if (img) images.add(img);
  R[n + '_image_details'] = m('og:image:width') === '1200' && m('og:image:height') === '630' && m('og:image:type') === 'image/jpeg' && (m('og:image:alt') || '').length > 20;
  R[n + '_grand_apercu'] = meta(tete, 'name', 'twitter:card') === 'summary_large_image';
}
R.une_seule_image = images.size === 1;
for (const img of images){
  const f = path.join(racine, decodeURIComponent(new URL(img).pathname));
  const existe = fs.existsSync(f);
  R.image_existe = existe;
  if (existe){
    const buf = fs.readFileSync(f), d = dimensionsJpeg(buf);
    R.image_1200_630 = !!d && d.l === 1200 && d.h === 630;
    R.image_legere = buf.length < 300 * 1024;
  }
}
console.log(JSON.stringify(R, null, 1));
