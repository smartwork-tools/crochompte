/* ═══════════════════════════════════════════════════════════════════════════
   Un seul endroit pour le numéro de version : la première ligne du tableau
   de CHANGELOG.md (« | V56 | … »). Ce script le recopie partout où le code en
   a besoin, et vérifie que tout concorde.
     node outils/version.js            → recopie (à lancer avant git add)
     node outils/version.js --verifier → ne modifie rien, échoue si ça diverge
   Endroits tenus à jour : app.js (VERSION_APP et le premier bloc NOUVEAUTES),
   index.html (?v=), sw.js (nom du cache et liste des fichiers), tests/test-sw.js.
   ═══════════════════════════════════════════════════════════════════════════ */
var fs = require("fs"), path = require("path");
var racine = path.join(__dirname, "..");
function lire(f){ return fs.readFileSync(path.join(racine, f), "utf8"); }
function ecrire(f, s){ fs.writeFileSync(path.join(racine, f), s); }

var m = lire("CHANGELOG.md").match(/^\| (V\d+(?:\.\d+)?) \|/m);
if (!m){ console.error("CHANGELOG.md : aucune ligne « | V… | » trouvée."); process.exit(2); }
var version = m[1];                        /* « V56 » ou « V56.1 » */
var court = version.replace(/^V/, "").replace(".", "");   /* « 56 » ou « 561 », pour ?v= et le cache */
var verifier = process.argv.indexOf("--verifier") !== -1;

var cibles = [
  {f: "app.js",            re: /var VERSION_APP = "V[\d.]+";/,                        a: 'var VERSION_APP = "' + version + '";'},
  {f: "app.js",            re: /var NOUVEAUTES = \[\n  \{v:"V[\d.]+"/,                a: 'var NOUVEAUTES = [\n  {v:"' + version + '"'},
  {f: "index.html",        re: /\?v=\d+/g,                                            a: "?v=" + court},
  {f: "sw.js",             re: /var CACHE = "crochompte-app-v\d+";/,                  a: 'var CACHE = "crochompte-app-v' + court + '";'},
  {f: "sw.js",             re: /\?v=\d+/g,                                            a: "?v=" + court},
  {f: "tests/test-sw.js",  re: /\?v=\d+/g,                                            a: "?v=" + court}
];
var divergences = 0, modifies = {};
cibles.forEach(function(c){
  var s = modifies[c.f] !== undefined ? modifies[c.f] : lire(c.f);
  if (!c.re.test(s)){ console.error(c.f + " : motif introuvable (" + c.re + ")"); divergences++; return; }
  var apres = s.replace(c.re, c.a);
  if (apres !== s){
    divergences++;
    if (verifier) console.error(c.f + " : n'est pas en " + version);
    else modifies[c.f] = apres;
  }
});
if (verifier){
  if (divergences){ console.error("Version attendue : " + version + " (CHANGELOG.md). Lance : node outils/version.js"); process.exit(1); }
  console.log("Version " + version + " : tout concorde.");
} else {
  Object.keys(modifies).forEach(function(f){ ecrire(f, modifies[f]); console.log(f + " → " + version); });
  if (!Object.keys(modifies).length) console.log("Version " + version + " : déjà partout.");
}
