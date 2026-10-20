/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — langues (V63)
   L'application est écrite en français. Pour une autre langue, ce fichier
   traduit ce qui s'affiche au moment où il s'affiche : chaque texte posé
   dans la page (et les attributs placeholder, title, aria-label, alt) est
   remplacé par son équivalent du dictionnaire lang/<code>.json.
   Trois niveaux de correspondance :
     1. le texte exact ;
     2. le texte où les nombres sont remplacés par {n} (« Encore 14 jours ») ;
     3. un gabarit avec {x} pour les parties variables (« Le prix de {x} ne couvre pas… »).
   Les données saisies (noms, notes) ne sont pas traduites, sauf si elles
   coïncident exactement avec un texte de l'application.
   Les documents PDF (devis, factures) restent en français : ce sont des
   documents français, et leurs polices n'ont pas l'arabe ni le chinois.
   Exposé dans window.CrochompteI18n ; rien ne touche aux données.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var LANGUES = {
  fr: {nom:"Français", locale:"fr-FR", dir:"ltr"},
  en: {nom:"English",  locale:"en-GB", dir:"ltr"},
  ar: {nom:"العربية",  locale:"ar-u-nu-latn", dir:"rtl"},
  zh: {nom:"中文",     locale:"zh-CN", dir:"ltr"}
};
/* Une langue « en cours » (traduction pas encore complète) n'est pas proposée ;
   on peut la voir pour la relire avec localStorage « crochompte-langue-relecture » = 1. */
function relecture(){ try{ return localStorage.getItem("crochompte-langue-relecture") === "1"; }catch(e){ return false; } }
function proposees(){ return Object.keys(LANGUES).filter(function(c){ return !LANGUES[c].enCours || relecture(); }); }
var CLE = "crochompte-langue";
var courante = "fr", dict = null, gabarits = [], parPrefixe = {}, sansPrefixe = [];
var ATTRS = ["placeholder", "title", "aria-label", "alt", "data-l"];
var RE_NOMBRE = /\d+(?:[   .,:\/-]\d+)*/g;
var manques = null;   /* en mode relevé : textes sans traduction */

function lire(){
  var v = "";
  try{ v = localStorage.getItem(CLE) || ""; }catch(e){}
  return LANGUES[v] && proposees().indexOf(v) !== -1 ? v : "fr";
}
function normaliser(t){ return t.replace(/\s+/g, " ").trim(); }
function echapperRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/* Compile les gabarits : « Commande {x} livrée » → /^Commande (.+?) livrée$/ */
function preparer(d){
  dict = d; gabarits = []; parPrefixe = {}; sansPrefixe = [];
  Object.keys(d).forEach(function(k){
    if (k.indexOf("{x}") === -1) return;
    var morceaux = k.split(/\{[xn]\}/), re = "^";
    for (var i = 0; i < morceaux.length; i++){
      re += echapperRe(morceaux[i]).replace(/ /g, "\\s+");
      if (i < morceaux.length - 1) re += "([\\s\\S]+?)";
    }
    re += "$";
    var g = {re: new RegExp(re), trad: d[k], n: morceaux.length - 1, fixe: morceaux.join("").replace(/\s/g, "").length};
    var pref = morceaux[0].slice(0, 8);
    if (morceaux[0].length >= 8){ (parPrefixe[pref] = parPrefixe[pref] || []).push(g); }
    else sansPrefixe.push(g);
  });
  var parFixe = function(a, b){ return b.fixe - a.fixe; };
  Object.keys(parPrefixe).forEach(function(k){ parPrefixe[k].sort(parFixe); });
  sansPrefixe.sort(parFixe);
}

function substituer(trad, valeurs){
  var i = 0;
  return trad.replace(/\{[xn]\}/g, function(){ return i < valeurs.length ? valeurs[i++] : ""; });
}

/* Traduit un texte brut (sans ses blancs de bord). */
/* Découpe en phrases (sans lookbehind : Safari ancien). */
function phrasesDe(t){
  var out = [], re = /[.!?]\s+(?=[A-ZÀ-Ý«"(])/g, m, last = 0;
  while ((m = re.exec(t))){ out.push(t.slice(last, m.index + 1)); last = m.index + m[0].length; }
  out.push(t.slice(last));
  return out;
}
function traduireTexte(t, profondeur){
  profondeur = profondeur || 0;
  if (!dict) return null;
  if (dict[t] !== undefined) return dict[t];
  /* 2. nombres */
  var nombres = t.match(RE_NOMBRE);
  if (nombres){
    var k2 = t.replace(RE_NOMBRE, "{n}");
    if (dict[k2] !== undefined) return substituer(dict[k2], nombres);
  }
  if (profondeur > 2) return null;
  /* 2b. ponctuation de bord : « . Ce jour-là… », « 3 personnes. » */
  var mL = /^([.;:!?…»)\]]+\s*)([\s\S]+)$/.exec(t);
  if (mL){ var trL = traduireTexte(mL[2], profondeur + 1); if (trL !== null) return mL[1] + trL; }
  var mT = /^([\s\S]+?)\s*([.:…])$/.exec(t);
  if (mT && !/[.:…]$/.test(mT[1])){ var trT = traduireTexte(mT[1], profondeur + 1); if (trT !== null) return trT + mT[2]; }
  /* 3. nombre en tête : « 9 pièces terminées » = 9 + « pièces terminées » */
  var mN = /^(\d[\d\s\u00a0.,]*?)\s+(\S[\s\S]*)$/.exec(t);
  if (mN){ var tr3 = traduireTexte(mN[2], profondeur + 1); if (tr3 !== null) return mN[1] + " " + tr3; }
  /* 4. gabarits, du plus précis au plus vague ; un gabarit vague (peu de
     texte fixe) ne vaut que pour un texte court. */
  var cands = parPrefixe[t.slice(0, 8)];
  var listes = cands ? [cands, sansPrefixe] : [sansPrefixe];
  for (var li = 0; li < listes.length; li++){
    var l = listes[li];
    for (var i = 0; i < l.length; i++){
      var g = l[i];
      if (g.fixe < 6 && t.length > 40) continue;
      var m = g.re.exec(t);
      if (!m) continue;
      var ok = true;
      for (var c = 1; c < m.length; c++){ if (m[c].length > 80 || /[.!?] [A-ZÀ-Ý]/.test(m[c])){ ok = false; break; } }
      if (ok) return substituer(g.trad, m.slice(1));
    }
  }
  /* 5. plusieurs phrases : chacune à son tour */
  var phrases = phrasesDe(t);
  if (phrases.length >= 2){
    var okP = false, outP = [];
    for (var pi = 0; pi < phrases.length; pi++){ var tp = traduireTexte(phrases[pi], profondeur + 1); if (tp !== null) okP = true; outP.push(tp !== null ? tp : phrases[pi]); }
    if (okP) return outP.join(" ");
  }
  /* 6. texte composé de parties : « Devis envoyé · Zoé », « En cours : « Bonnet » » */
  var sep = /( · | — | – | : |, | \/ )/;
  var parts = t.split(sep);
  if (parts.length >= 3){
    var okS = false, outS = [];
    for (var si = 0; si < parts.length; si++){
      if (si % 2 === 1){ outS.push(parts[si]); continue; }
      var ts = parts[si] ? traduireTexte(parts[si], profondeur + 1) : null;
      if (ts !== null) okS = true;
      outS.push(ts !== null ? ts : parts[si]);
    }
    if (okS) return outS.join("");
  }
  if (manques && profondeur === 0 && t.length > 1 && /[A-Za-zÀ-ÿ]/.test(t) && !manques[t]) manques[t] = 1;
  return null;
}

/* Un texte avec ses blancs de bord conservés. */
function traduire(brut){
  var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(brut);
  var coeur = normaliser(m[2]);
  if (!coeur) return null;
  var tr = traduireTexte(coeur);
  if (tr === null || tr === coeur) return null;
  return m[1] + tr + m[3];
}

/* ── Application au DOM ───────────────────────────────────────────────── */
var ignorer = {SCRIPT:1, STYLE:1, TEXTAREA:1, CODE:1, PRE:1};
function texteNoeud(n){
  if (n.__i18nTrad === n.data) return;          /* déjà traduit, inchangé */
  var fr = n.data;
  if (n.__i18nFr !== undefined && n.__i18nTrad !== undefined && n.data !== n.__i18nTrad){
    /* le programme a réécrit le texte : nouvelle source française */
    fr = n.data;
  }
  var tr = traduire(fr);
  n.__i18nFr = fr;
  if (tr !== null){ n.__i18nTrad = tr; n.data = tr; }
  else n.__i18nTrad = fr;
}
function attributs(e){
  for (var i = 0; i < ATTRS.length; i++){
    var a = ATTRS[i];
    if (!e.hasAttribute(a)) continue;
    var v = e.getAttribute(a), cle = "__i18n_" + a;
    if (e[cle] === v) continue;
    var tr = traduire(v);
    e[cle + "_fr"] = v;
    if (tr !== null){ e.setAttribute(a, tr); e[cle] = tr; } else e[cle] = v;
  }
  if ((e.tagName === "INPUT") && (e.type === "button" || e.type === "submit") && e.value){
    if (e.__i18n_value !== e.value){ var tv = traduire(e.value); if (tv !== null){ e.value = tv; } e.__i18n_value = e.value; }
  }
}
function parcourir(racine){
  if (!racine) return;
  if (racine.nodeType === 3){ if (!(racine.parentNode && ignorer[racine.parentNode.tagName])) texteNoeud(racine); return; }
  if (racine.nodeType !== 1 && racine.nodeType !== 9 && racine.nodeType !== 11) return;
  if (racine.nodeType === 1){ if (ignorer[racine.tagName]) return; attributs(racine); }
  var w = document.createTreeWalker(racine, 5 /* éléments + textes */, {acceptNode: function(n){
    if (n.nodeType === 1) return ignorer[n.tagName] ? 2 /* REJECT : tout le sous-arbre */ : 1;
    return 1;
  }}, false), n;
  while ((n = w.nextNode())){
    if (n.nodeType === 1) attributs(n);
    else texteNoeud(n);
  }
}
var observateur = null;
function observer(){
  if (observateur || !window.MutationObserver) return;
  observateur = new MutationObserver(function(muts){
    for (var i = 0; i < muts.length; i++){
      var m = muts[i];
      if (m.type === "characterData") texteNoeud(m.target);
      else if (m.type === "attributes") attributs(m.target);
      else for (var j = 0; j < m.addedNodes.length; j++) parcourir(m.addedNodes[j]);
    }
  });
  observateur.observe(document.documentElement, {childList:true, characterData:true, subtree:true, attributes:true, attributeFilter: ATTRS});
}

/* ── Chargement et bascule ────────────────────────────────────────────── */
function appliquerLangue(code){
  var L = LANGUES[code] || LANGUES.fr;
  document.documentElement.lang = code;
  document.documentElement.dir = L.dir;
  document.documentElement.setAttribute("data-langue", code);
}
function charger(code, cb){
  courante = code; appliquerLangue(code);
  if (code === "fr"){ dict = null; if (cb) cb(true); return; }
  var version = (document.querySelector('script[src*="app.js"]') || {src:""}).src.replace(/^.*\?v=/, "") || "0";
  var req = new XMLHttpRequest();
  req.open("GET", "lang/" + code + ".json?v=" + encodeURIComponent(version), true);
  req.onload = function(){
    if (req.status === 200){
      try{ preparer(JSON.parse(req.responseText)); }catch(e){ dict = null; }
      parcourir(document.documentElement); observer();
      if (cb) cb(!!dict);
    } else { if (cb) cb(false); }
  };
  req.onerror = function(){ if (cb) cb(false); };
  req.send();
}
function choisir(code, recharger){
  if (!LANGUES[code]) return;
  try{ localStorage.setItem(CLE, code); }catch(e){}
  /* Repartir d'une page neuve : les textes déjà traduits dans une autre
     langue reprennent leur source française au rechargement. */
  if (recharger !== false) location.reload();
}

/* Formats de nombres et de dates : le code fr-FR est remplacé par la
   locale de la langue choisie (chiffres latins pour l'arabe). */
function locale(){ return (LANGUES[courante] || LANGUES.fr).locale; }
function t(texte){ var tr = dict ? traduireTexte(normaliser(texte)) : null; return tr === null ? texte : tr; }

courante = lire(); appliquerLangue(courante);
if (courante !== "fr"){
  /* Traduire le plus tôt possible : avant que l'application ne dessine. */
  charger(courante);
}
window.CrochompteI18n = {
  LANGUES: LANGUES, proposees: proposees, langue: function(){ return courante; }, locale: locale, t: t, choisir: choisir,
  traduire: function(n){ parcourir(n || document.documentElement); },
  releverManques: function(){
    manques = {};
    var w = document.createTreeWalker(document.documentElement, 5, {acceptNode: function(n){ return n.nodeType === 1 && ignorer[n.tagName] ? 2 : 1; }}, false), n;
    while ((n = w.nextNode())){
      if (n.nodeType === 3){ var c = normaliser(n.__i18nFr !== undefined ? n.__i18nFr : n.data); if (c) traduireTexte(c); }
      else for (var i = 0; i < ATTRS.length; i++){ var v = n["__i18n_" + ATTRS[i] + "_fr"] || n.getAttribute(ATTRS[i]); if (v) traduireTexte(normaliser(v)); }
    }
    return manques;
  },
  manques: function(){ return manques ? Object.keys(manques) : []; },
  estPrete: function(){ return courante === "fr" || !!dict; }
};
})();
