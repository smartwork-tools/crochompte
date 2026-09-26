/* ═══════════════════════════════════════════════════════════════════════════
   Lance tous les tests de Crochompte dans un vrai navigateur.
     node tests/lancer.js            → tous les tests
     node tests/lancer.js v33 auth   → seulement ceux dont le nom contient ces mots
   Le site est servi localement sur deux ports (8934 et 8936 : deux origines,
   donc deux stockages séparés), et Supabase est remplacé par une imitation
   (faux-supabase.js) : aucun test ne touche au vrai serveur.
   ═══════════════════════════════════════════════════════════════════════════ */
var http = require("http"), fs = require("fs"), path = require("path"), cp = require("child_process");
var racine = path.join(__dirname, "..");
var types = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8", ".wasm":"application/wasm", ".pdf":"application/pdf", ".json":"application/json",
  ".webmanifest":"application/manifest+json", ".png":"image/png", ".woff2":"font/woff2", ".css":"text/css", ".txt":"text/plain"};
function serveur(port){
  return http.createServer(function(req, res){
    var u = decodeURIComponent(req.url.split("?")[0]);
    if (u === "/") u = "/index.html";
    var f = path.join(racine, path.normalize(u));
    if (f.indexOf(racine) !== 0) { res.writeHead(403); return res.end(); }
    fs.readFile(f, function(err, data){
      if (err){ res.writeHead(404); return res.end("introuvable"); }
      res.writeHead(200, {"Content-Type": types[path.extname(f)] || "application/octet-stream"});
      res.end(data);
    });
  }).listen(port, "127.0.0.1");
}
var s1 = serveur(8934), s2 = serveur(8936);
fs.mkdirSync(path.join(__dirname, "captures"), {recursive:true});

var filtres = process.argv.slice(2);
var tests = fs.readdirSync(__dirname).filter(function(f){
  return /^(test-.*|vue-reglages)\.js$/.test(f) && (!filtres.length || filtres.some(function(x){ return f.indexOf(x) !== -1; }));
}).sort();

var echecs = 0;
(function suivant(i){
  if (i >= tests.length){
    s1.close(); s2.close();
    console.log("\n" + (echecs ? echecs + " test(s) en échec." : "Tous les tests sont au vert (" + tests.length + ")."));
    process.exit(echecs ? 1 : 0);
  }
  var t = tests[i];
  cp.execFile(process.execPath, [path.join(__dirname, t)], {timeout: 180000, maxBuffer: 1e7}, function(err, out, errOut){
    var texte = String(out || "") + String(errOut || "");
    var fautes = texte.split("\n").filter(function(l){
      return /": false|_echec|PAGEERROR|Error:|TimeoutError/.test(l);
    });
    var jsErr = /"erreurs": \[\s*"[^]/.test(texte) || /ERREURS JS: (?!aucune)/.test(texte);
    if (err || fautes.length || jsErr){ echecs++; console.log("✗ " + t + "\n   " + (fautes.slice(0,5).join("\n   ") || String(err))); }
    else console.log("✓ " + t);
    suivant(i + 1);
  });
})(0);
