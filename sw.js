/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — ouverture sans réseau
   Sur un marché, dans une salle sans réseau, l'application doit s'ouvrir quand
   même : ce petit programme garde une copie des fichiers de l'application sur
   l'appareil.
   Règle unique : le réseau d'abord. Tant qu'il y a une connexion, c'est
   toujours la dernière version publiée qui s'affiche, et la copie est mise à
   jour au passage. Sans connexion, on sert la copie.
   Les données de l'atelier ne passent jamais par ici : elles restent entre
   l'application et le serveur (Supabase), qui n'est jamais mis en cache.
   ═══════════════════════════════════════════════════════════════════════════ */
var CACHE = "crochompte-app-v35";
var ESSENTIELS = [
  "./", "index.html", "sync.js", "config.js", "confidentialite.html", "manifest.webmanifest",
  "polices/public-sans-latin-400-normal.woff2", "polices/public-sans-latin-500-normal.woff2",
  "polices/public-sans-latin-600-normal.woff2", "polices/bricolage-grotesque-latin-600-normal.woff2",
  "polices/bricolage-grotesque-latin-700-normal.woff2", "polices/bricolage-grotesque-latin-800-normal.woff2",
  "polices/ibm-plex-mono-latin-400-normal.woff2", "polices/ibm-plex-mono-latin-500-normal.woff2",
  "icones/icone-192.png", "icones/favicon-48.png"
];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    /* Un fichier manquant ne doit pas empêcher l'installation du reste.
       « reload » : on prend les fichiers au serveur, pas une copie du cache
       du navigateur qui pourrait dater de la version précédente. */
    return Promise.all(ESSENTIELS.map(function(u){
      return c.add(new Request(u, {cache: "reload"})).catch(function(){});
    }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(cles){
    return Promise.all(cles.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* Réseau d'abord, mais pas indéfiniment : sur un marché, le téléphone
   affiche souvent des barres sans que rien ne passe. Au-delà du délai, on
   sert la copie (la réponse du réseau, si elle arrive, met la copie à jour
   pour la fois suivante). */
function avecDelai(promesse, ms){
  return new Promise(function(ok, ko){
    var t = setTimeout(function(){ ko(new Error("délai")); }, ms);
    promesse.then(function(v){ clearTimeout(t); ok(v); }, function(err){ clearTimeout(t); ko(err); });
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;   /* réponses partielles : jamais en cache */
  var url = new URL(req.url);
  var memeSite = url.origin === self.location.origin;
  /* La bibliothèque de connexion, publiée sur jsDelivr à une version figée. */
  var bibliotheque = url.hostname === "cdn.jsdelivr.net" && url.pathname.indexOf("/npm/@supabase/") === 0;
  if (!memeSite && !bibliotheque) return;   /* serveur, photos d'illustration : jamais en cache ici */
  var page = req.mode === "navigate";

  function depuisCopie(){
    return caches.match(req, {ignoreSearch: true}).then(function(r){
      if (r) return r;
      if (page) return caches.match("index.html");
      return undefined;
    });
  }

  /* « no-cache » : le navigateur redemande toujours au serveur si le
     fichier a changé (une petite requête quand rien n'a bougé). Sans ça,
     une nouvelle version pouvait mettre dix minutes à apparaître, avec un
     index.html neuf et un sync.js ancien. */
  var reseau = fetch(memeSite ? new Request(req, {cache: "no-cache"}) : req).then(function(rep){
    if (rep && rep.status === 200 && (rep.type === "basic" || rep.type === "cors")){
      var copie = rep.clone();
      caches.open(CACHE).then(function(c){ return c.put(req, copie); }).catch(function(){});
    }
    return rep;
  });
  e.waitUntil(reseau.catch(function(){}));

  e.respondWith(
    avecDelai(reseau, page ? 4000 : 8000).then(function(rep){
      /* Serveur en panne ou page introuvable : la copie vaut mieux qu'une
         page d'erreur, pour l'application elle-même. */
      if (page && rep.status >= 400){
        return depuisCopie().then(function(r){ return r || rep; });
      }
      return rep;
    }).catch(function(){
      return depuisCopie().then(function(r){
        if (r) return r;
        return reseau;   /* rien en copie : on attend le réseau jusqu'au bout */
      });
    })
  );
});
