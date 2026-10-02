/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — démarrage
   Ce qui doit s'exécuter avant tout le reste, et qui vivait dans index.html.
   Sorti de la page pour que la politique de sécurité (CSP) puisse interdire
   tout script écrit dans la page : une injection ne pourrait plus s'exécuter.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  /* Crochompte ne s'affiche jamais à l'intérieur d'un autre site (on ferait
     cliquer une utilisatrice sur un bouton qu'elle ne voit pas). */
  if (window.top !== window.self){
    document.documentElement.style.display = "none";
    try{ window.top.location = window.self.location.href; }catch(e){}
  }
  /* Le thème choisi, appliqué avant le premier affichage (pas d'éclair blanc). */
  try{
    var t = localStorage.getItem("crochompte-theme");
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    /* L'ambiance de couleurs (V58), appliquée elle aussi avant le premier affichage. */
    var p = localStorage.getItem("crochompte-palette");
    if (p === "terre" || p === "prune") document.documentElement.setAttribute("data-pal", p);
  }catch(e){}
  /* config.js absent : mode local, sans compte. Le script est facultatif. */
  var cfgScript = document.querySelector('script[src^="config.js"]');
  if (cfgScript) cfgScript.addEventListener("error", function(){ try{ console.info("Crochompte : pas de config.js, mode hors ligne"); }catch(e){} });
})();
