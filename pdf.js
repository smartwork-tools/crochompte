/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — fabrique de PDF
   Écrit un vrai fichier PDF (A4, texte, filets) directement dans le
   navigateur, sans bibliothèque : une facture se télécharge, s'imprime ou
   s'envoie telle quelle, avec les mêmes proportions partout.
   Polices : Helvetica et Helvetica Gras, présentes dans tous les lecteurs de
   PDF (rien à embarquer). Les largeurs de lettres sont celles de ces
   polices, ce qui permet d'aligner à droite et de couper les lignes juste.
   Tout est exposé dans window.CrochomptePdf ; rien ne touche aux données.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ── Largeurs des caractères (millièmes de la taille), de l'espace (32) au ~ (126) ── */
var LARG_N = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,
  667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  278,278,278,469,556,333,
  556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
  334,260,334,584];
var LARG_G = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
  556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,
  722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
  333,278,333,584,556,333,
  556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
  389,280,389,584];
/* Caractères hors ASCII dont la largeur ne se déduit pas de la lettre de base : [normal, gras] */
var LARG_SPEC = {128:[556,556], 133:[1000,1000], 146:[222,278], 149:[350,350], 150:[556,556], 151:[1000,1000], 153:[1000,1000],
  140:[1000,1000], 156:[944,944], 160:[278,278], 169:[737,737], 171:[556,556], 176:[400,400], 183:[278,278], 187:[556,556], 215:[584,584]};
/* Octets 128-159 de l'encodage WinAnsi (Windows-1252) */
var WIN = {"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,
  "‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};

/* Un caractère → son octet WinAnsi (les espaces insécables deviennent des espaces) */
function octet(ch){
  var c = ch.charCodeAt(0);
  if (c === 0x202F || c === 0x00A0 || c === 0x2009) return 32;
  if (c === 0x2212) return 45;                       /* − */
  if (c === 0x2192) return 62;                       /* → */
  if (c < 256 && (c < 128 || c > 159)) return c;
  if (WIN[ch] !== undefined) return WIN[ch];
  var b = ch.normalize ? ch.normalize("NFD").charAt(0) : "?";
  var cb = b.charCodeAt(0);
  return cb < 128 ? cb : 63;
}
function largeurOctet(o, gras){
  if (o >= 32 && o <= 126) return (gras ? LARG_G : LARG_N)[o - 32];
  var s = LARG_SPEC[o]; if (s) return s[gras ? 1 : 0];
  /* lettre accentuée : largeur de la lettre sans accent */
  var base = String.fromCharCode(o).normalize ? String.fromCharCode(o).normalize("NFD").charAt(0).charCodeAt(0) : 0;
  if (base >= 32 && base <= 126) return (gras ? LARG_G : LARG_N)[base - 32];
  return 556;
}
function largeur(txt, taille, gras, espacement){
  var t = 0, s = String(txt);
  for (var i = 0; i < s.length; i++) t += largeurOctet(octet(s.charAt(i)), gras);
  return t * taille / 1000 + (espacement ? espacement * s.length : 0);
}
/* Texte → chaîne PDF « (…) » en octets WinAnsi, parenthèses et barres échappées */
function chaine(txt){
  var s = String(txt), r = "";
  for (var i = 0; i < s.length; i++){
    var o = octet(s.charAt(i));
    if (o === 40 || o === 41 || o === 92) r += "\\" + String.fromCharCode(o);
    else if (o < 32 || o > 126) r += "\\" + ("00" + o.toString(8)).slice(-3);
    else r += String.fromCharCode(o);
  }
  return "(" + r + ")";
}
function nb(x){ return (Math.round(x * 100) / 100).toString(); }
function coul(c){ return nb(c[0]) + " " + nb(c[1]) + " " + nb(c[2]); }

var A4L = 595.28, A4H = 841.89;

/* Coupe un texte en lignes qui tiennent dans « w » points */
function couper(txt, w, taille, gras){
  var lignes = [];
  String(txt).split("\n").forEach(function(par){
    var mots = par.split(" "), cur = "";
    mots.forEach(function(m){
      var essai = cur ? cur + " " + m : m;
      if (cur && largeur(essai, taille, gras) > w){ lignes.push(cur); cur = m; }
      else cur = essai;
    });
    lignes.push(cur);
  });
  return lignes;
}

/* ── Le document ── */
function creer(opts){
  opts = opts || {};
  var pages = [], P = null;
  function nouvellePage(){ P = []; pages.push(P); return pages.length; }
  nouvellePage();
  /* y se compte depuis le HAUT de la page (comme à l'écran) */
  function Y(y){ return nb(A4H - y); }
  var doc = {
    L: A4L, H: A4H,
    nouvellePage: nouvellePage,
    nbPages: function(){ return pages.length; },
    largeur: largeur,
    couper: couper,
    /* texte posé sur la ligne de base y ; align : "l" (x = bord gauche), "r" (x = bord droit), "c" (x = milieu) */
    texte: function(x, y, txt, o){
      o = o || {};
      var taille = o.taille || 10, gras = !!o.gras, esp = o.espacement || 0;
      var w = largeur(txt, taille, gras, esp);
      var x0 = o.align === "r" ? x - w : o.align === "c" ? x - w / 2 : x;
      P.push("BT /" + (gras ? "F2" : "F1") + " " + nb(taille) + " Tf " + coul(o.couleur || [0.08, 0.09, 0.1]) + " rg " +
             nb(esp) + " Tc " + nb(x0) + " " + Y(y) + " Td " + chaine(txt) + " Tj ET");
      return w;
    },
    filet: function(x1, y1, x2, y2, o){
      o = o || {};
      P.push(coul(o.couleur || [0.08, 0.09, 0.1]) + " RG " + nb(o.ep || 0.5) + " w " + nb(x1) + " " + Y(y1) + " m " + nb(x2) + " " + Y(y2) + " l S");
    },
    rect: function(x, y, w, h, o){
      o = o || {};
      P.push((o.remplir ? coul(o.remplir) + " rg " : "") + (o.bord ? coul(o.bord) + " RG " + nb(o.ep || 0.5) + " w " : "") +
             nb(x) + " " + Y(y + h) + " " + nb(w) + " " + nb(h) + " re " + (o.remplir && o.bord ? "B" : o.remplir ? "f" : "S"));
    },
    /* Paragraphe en morceaux {t, b (gras)} coupé à la largeur w ; renvoie le y après la dernière ligne.
       Si « mesure » est vrai, ne dessine rien (sert à savoir la hauteur). */
    paragraphe: function(morceaux, x, y, w, o){
      o = o || {};
      var taille = o.taille || 10, lead = o.interligne || taille * 1.4;
      /* Les morceaux se recollent sans espace s'il n'y en avait pas
         (« TVA non applicable » puis « , article » → « TVA non applicable, article »). */
      var mots = [], sepPend = false;
      morceaux.forEach(function(m){
        String(m.t).split(" ").forEach(function(tok, i){
          if (i > 0) sepPend = true;
          if (tok === "") return;
          mots.push({t: tok, b: !!m.b, sep: sepPend && mots.length > 0});
          sepPend = false;
        });
      });
      var lignes = [], cur = [], cw = 0;
      var espN = largeur(" ", taille, false);
      mots.forEach(function(m){
        var mw = largeur(m.t, taille, m.b);
        var add = cur.length && m.sep ? espN : 0;
        if (cur.length && cw + add + mw > w){ lignes.push(cur); cur = []; cw = 0; add = 0; }
        cur.push({t: m.t, b: m.b, w: mw, add: add}); cw += add + mw;
      });
      if (cur.length) lignes.push(cur);
      if (!o.mesure){
        lignes.forEach(function(l, i){
          var cx = x;
          l.forEach(function(m){ cx += m.add; if (m.t) doc.texte(cx, y + i * lead, m.t, {taille: taille, gras: m.b, couleur: o.couleur}); cx += m.w; });
        });
      }
      return y + lignes.length * lead;
    },
    /* Assemble le fichier : pied(doc, numéro, total) dessine le pied de chaque page. */
    fin: function(pied){
      var n = pages.length;
      if (pied) for (var i = 0; i < n; i++){ P = pages[i]; pied(doc, i + 1, n); }
      var objets = [];                       /* objets[k] = texte de l'objet k+1 */
      function ajouter(s){ objets.push(s); return objets.length; }
      var iCat = ajouter(""), iPages = ajouter("");
      var iF1 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
      var iF2 = ajouter("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
      var d = new Date();
      function z(v){ return ("0" + v).slice(-2); }
      var iInfo = ajouter("<< /Title " + chaine(opts.titre || "Document") + " /Author " + chaine(opts.auteur || "") +
        " /Producer (Crochompte) /CreationDate (D:" + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds()) + ") >>");
      var kids = [];
      pages.forEach(function(ops){
        var flux = ops.join("\n");
        var iC = ajouter("<< /Length " + flux.length + " >>\nstream\n" + flux + "\nendstream");
        var iP = ajouter("<< /Type /Page /Parent " + iPages + " 0 R /MediaBox [0 0 " + A4L + " " + A4H + "] /Resources << /Font << /F1 " + iF1 + " 0 R /F2 " + iF2 + " 0 R >> >> /Contents " + iC + " 0 R >>");
        kids.push(iP + " 0 R");
      });
      objets[iCat - 1] = "<< /Type /Catalog /Pages " + iPages + " 0 R >>";
      objets[iPages - 1] = "<< /Type /Pages /Kids [" + kids.join(" ") + "] /Count " + n + " >>";
      var sortie = "%PDF-1.4\n%âãÏÓ\n", pos = [];
      objets.forEach(function(o, k){ pos.push(sortie.length); sortie += (k + 1) + " 0 obj\n" + o + "\nendobj\n"; });
      var xref = sortie.length;
      sortie += "xref\n0 " + (objets.length + 1) + "\n0000000000 65535 f \n";
      pos.forEach(function(p){ sortie += ("0000000000" + p).slice(-10) + " 00000 n \n"; });
      sortie += "trailer\n<< /Size " + (objets.length + 1) + " /Root " + iCat + " 0 R /Info " + iInfo + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
      var oct = new Uint8Array(sortie.length);
      for (var j = 0; j < sortie.length; j++) oct[j] = sortie.charCodeAt(j) & 255;
      return oct;
    }
  };
  return doc;
}

/* ═════ LA FACTURE (ou l'avoir) ═════
   F : le document tel que gardé dans le registre (vendeur, client, lignes,
   total, versements, solde, mentions…). fmt : {eur(n), date(iso)} fournis par
   l'application, pour écrire les montants et les dates comme partout ailleurs. */
var ENCRE = [0.08, 0.09, 0.1], GRIS = [0.36, 0.4, 0.38], CLAIR = [0.85, 0.88, 0.85], VERT = [0.06, 0.32, 0.2], ROUGE = [0.7, 0.13, 0.2];
/* Les cinq documents d'une commande partagent la même mise en page : une
   facture, un avoir, un devis, un bon de commande, un bon de livraison. Ce
   qui change : le titre, les dates utiles, le bloc de droite, les colonnes
   de prix (absentes d'un bon de livraison) et les mentions (V58). */
var TYPES_DOC = {
  facture:   {titre:"FACTURE",          nom:"Facture",          parties:"FACTURÉ À",   prix:true},
  avoir:     {titre:"AVOIR",            nom:"Avoir",            parties:"ÉTABLI POUR", prix:true},
  devis:     {titre:"DEVIS",            nom:"Devis",            parties:"DEVIS POUR",  prix:true},
  commande:  {titre:"BON DE COMMANDE",  nom:"Bon de commande",  parties:"COMMANDÉ PAR", prix:true},
  livraison: {titre:"BON DE LIVRAISON", nom:"Bon de livraison", parties:"LIVRÉ À",     prix:false}
};
function documentPdf(F, fmt, meta){
  meta = meta || {};
  var type = TYPES_DOC[F.type] ? F.type : "facture", T = TYPES_DOC[type];
  var avoir = type === "avoir", facture = type === "facture", devis = type === "devis", bon = type === "commande", livraison = type === "livraison";
  var doc = creer({titre: T.nom + " " + (F.numero || ""), auteur: (F.vendeur && F.vendeur.nom) || ""});
  var M = 46, W = doc.L, D = W - M, bas = doc.H - 62;
  var eur = fmt.eur, date = fmt.date;
  var y = 52;

  /* — En-tête : le document à gauche, le vendeur à droite — */
  doc.texte(M, y + 6, T.titre, {taille: 8.5, gras: true, couleur: GRIS, espacement: 1.4});
  doc.texte(M, y + 34, F.numero || "", {taille: 23, gras: true});
  var yl = y + 54, dates = [];
  if (facture) dates.push("Émise le " + date(F.emiseLe));
  else if (avoir) dates.push("Émis le " + date(F.emiseLe));
  else dates.push("Établi le " + date(F.emiseLe));
  if (avoir && F.ref) dates.push("Annule la facture n° " + F.ref + (F.refLe ? " du " + date(F.refLe) : ""));
  if (facture && F.dateVente) dates.push("Date de la vente : " + date(F.dateVente));
  if (devis && F.validite) dates.push("Valable jusqu'au " + date(F.validite));
  if (bon && F.accordLe) dates.push("Accord reçu le " + date(F.accordLe));
  if ((devis || bon) && F.livraisonLe) dates.push((devis ? "Livraison souhaitée le " : "Livraison prévue le ") + date(F.livraisonLe));
  if (livraison && F.livreLe) dates.push("Livré le " + date(F.livreLe));
  if (F.commandeNum && !bon) dates.push("Commande n° " + F.commandeNum);
  if (F.refClient) dates.push("Votre bon de commande : " + F.refClient);
  dates.forEach(function(t){ doc.texte(M, yl, t, {taille: 9, couleur: GRIS}); yl += 13; });

  var V = F.vendeur || {}, yr = y + 6, wv = 235;
  couper(V.nom || "[ Ton nom ou ta raison sociale ]", wv, 12.5, true).forEach(function(t){
    doc.texte(D, yr + 8, t, {taille: 12.5, gras: true, align: "r", couleur: V.nom ? ENCRE : ROUGE}); yr += 15;
  });
  yr += 3;
  couper(V.adresse || "[ Ton adresse ]", wv, 9.5, false).forEach(function(t){
    doc.texte(D, yr + 8, t, {taille: 9.5, align: "r", couleur: V.adresse ? [0.2, 0.22, 0.21] : ROUGE}); yr += 13;
  });
  if (V.siret){ doc.texte(D, yr + 8, "SIRET " + V.siret, {taille: 9.5, align: "r", couleur: [0.2, 0.22, 0.21]}); yr += 13; }
  if (V.contact) couper(V.contact, wv, 9.5, false).forEach(function(t){ doc.texte(D, yr + 8, t, {taille: 9.5, align: "r", couleur: [0.2, 0.22, 0.21]}); yr += 13; });
  y = Math.max(yl, yr) + 8;
  doc.filet(M, y, D, y, {ep: 1.4});
  y += 26;

  /* — Les deux parties — */
  var C = F.client || {}, colB = M + 292, yA = y + 8, yB = y + 8;
  doc.texte(M, yA, T.parties, {taille: 7.5, gras: true, couleur: GRIS, espacement: 1.1}); yA += 16;
  doc.texte(M, yA, C.nom || "—", {taille: 11.5, gras: true}); yA += 15;
  [C.adresse, C.siren ? "SIREN " + C.siren : "", F.livraison ? "Livraison : " + F.livraison : "", C.contact].forEach(function(t){
    if (!t) return;
    couper(t, 250, 9.5, false).forEach(function(l){ doc.texte(M, yA, l, {taille: 9.5, couleur: GRIS}); yA += 13; });
  });
  if (facture || bon){
    doc.texte(colB, yB, "RÈGLEMENT", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1.1}); yB += 16;
    doc.texte(colB, yB, F.solde > 0 ? eur(F.solde) + (bon ? " restent à régler" : " à régler") : "Réglée", {taille: 11.5, gras: true}); yB += 15;
    doc.texte(colB, yB, F.solde > 0 ? (bon ? "à la livraison" : "à réception de la facture") : "Merci, tout est réglé.", {taille: 9.5, couleur: GRIS}); yB += 13;
  } else if (devis){
    doc.texte(colB, yB, "POUR ACCEPTER", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1.1}); yB += 16;
    doc.texte(colB, yB, F.acompteDemande > 0 ? "Acompte de " + eur(F.acompteDemande) : "Un accord écrit suffit", {taille: 11.5, gras: true}); yB += 15;
    couper(F.acompteDemande > 0 ? "à la commande, le reste à la livraison." : "par message ou par mail : la fabrication commence ensuite.", 230, 9.5, false)
      .forEach(function(l){ doc.texte(colB, yB, l, {taille: 9.5, couleur: GRIS}); yB += 13; });
  } else if (livraison){
    var nArt = (F.lignes || []).reduce(function(s, l){ return s + (Number(l.q) || 0); }, 0);
    doc.texte(colB, yB, "CONTENU", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1.1}); yB += 16;
    doc.texte(colB, yB, nArt + (nArt > 1 ? " articles" : " article"), {taille: 11.5, gras: true}); yB += 15;
    doc.texte(colB, yB, "à vérifier à la réception", {taille: 9.5, couleur: GRIS}); yB += 13;
  }
  y = Math.max(yA, yB) + 20;

  /* — Le tableau — */
  var xMont = D, xPU = D - 96, xQte = T.prix ? xPU - 92 : D, largDes = xQte - 40 - M;
  function enteteTableau(){
    var o = {taille: 7.5, gras: true, couleur: GRIS, espacement: 1};
    doc.texte(M, y, "DÉSIGNATION", o);
    doc.texte(xQte, y, "QTÉ", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1, align: "r"});
    if (T.prix){
      doc.texte(xPU, y, "PRIX UNITAIRE", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1, align: "r"});
      doc.texte(xMont, y, "MONTANT", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1, align: "r"});
    }
    doc.filet(M, y + 7, D, y + 7, {ep: 0.8});
    y += 7;
  }
  enteteTableau();
  (F.lignes || []).forEach(function(l){
    var des = couper(l.d || "", largDes, 10, false), det = l.s ? couper(l.s, largDes, 8.5, false) : [];
    var h = 10 + des.length * 13 + det.length * 11.5 + 8;
    if (y + h > bas){ doc.nouvellePage(); y = 56; enteteTableau(); }
    var yy = y + 10 + 9;
    des.forEach(function(t, i){ doc.texte(M, yy + i * 13, t, {taille: 10}); });
    doc.texte(xQte, yy, String(l.q || 1), {taille: 10, align: "r"});
    if (T.prix){
      doc.texte(xPU, yy, eur(l.pu !== undefined ? l.pu : l.m), {taille: 10, align: "r"});
      doc.texte(xMont, yy, eur(l.m), {taille: 10, align: "r"});
    }
    det.forEach(function(t, i){ doc.texte(M, yy + des.length * 13 + i * 11.5, t, {taille: 8.5, couleur: GRIS}); });
    y += h;
    doc.filet(M, y, D, y, {ep: 0.5, couleur: CLAIR});
  });

  /* — Les totaux (gardés ensemble) — */
  if (T.prix){
    var vers = (F.versements || []).slice();
    if (devis && F.acompteDemande > 0) vers = [{lib: "Acompte à la commande", m: F.acompteDemande, prevu: true}];
    var avecReste = (facture || bon || devis) && vers.length;
    var hTot = 40 + vers.length * 17 + (avecReste ? 30 : 0);
    if (y + hTot > bas){ doc.nouvellePage(); y = 56; }
    y += 6;
    doc.filet(M, y, D, y, {ep: 1.4});
    y += 22;
    doc.texte(M, y, "Total" + (F.franchise ? "" : " TTC"), {taille: 12.5, gras: true});
    doc.texte(xMont, y, eur(F.total), {taille: 12.5, gras: true, align: "r"});
    vers.forEach(function(v){
      y += 18;
      doc.texte(M, y, v.lib + (v.date ? " le " + date(v.date) : ""), {taille: 9.5, couleur: GRIS});
      doc.texte(xMont, y, (v.m < 0 ? "+ " : "– ") + eur(Math.abs(v.m)), {taille: 9.5, couleur: GRIS, align: "r"});
    });
    if (avecReste){
      y += 8; doc.filet(xQte - 90, y, D, y, {ep: 0.5, couleur: CLAIR}); y += 20;
      var resteV = devis ? Math.max(0, F.total - F.acompteDemande) : F.solde;
      doc.texte(M, y, devis ? "Reste à la livraison" : bon ? "Reste à régler à la livraison" : "Reste à régler", {taille: 13.5, gras: true, couleur: VERT});
      doc.texte(xMont, y, eur(resteV), {taille: 13.5, gras: true, couleur: VERT, align: "r"});
    }
    y += 30;
  } else {
    y += 26;
  }

  /* — Mentions — */
  var m = [];
  if (F.nature && (facture || avoir)) m.push([{t: "Nature de l'opération : ", b: true}, {t: F.nature + "."}]);
  if (devis) m.push([{t: "Devis gratuit", b: true}, {t: (F.validite ? ", valable jusqu'au " + date(F.validite) : "") + ". Les prix sont fermes pendant sa durée de validité. Pour accepter, réponds par écrit (message ou mail)" + (F.acompteDemande > 0 ? " et verse l'acompte indiqué : la fabrication commence ensuite." : " : la fabrication commence ensuite.")}]);
  if (bon) m.push([{t: "Bon de commande. ", b: true}, {t: "Il récapitule ce qui est convenu" + (F.accordLe ? " depuis l'accord du " + date(F.accordLe) : "") + ". La facture sera établie à la livraison."}]);
  if (livraison) m.push([{t: "À la réception, ", b: true}, {t: "merci de vérifier le contenu et de signaler toute réserve sous 48 heures. La facture est établie séparément."}]);
  if (F.franchise && T.prix) m.push([{t: "TVA non applicable", b: true}, {t: ", article 293 B du code général des impôts."}]);
  if (avoir) m.push([{t: "Avoir", b: true}, {t: " annulant la facture n° " + (F.ref || "") + " pour la totalité de son montant."}]);
  if (F.personnalisee && !F.clientePro && !livraison) m.push([{t: "Pas de droit de rétractation. ", b: true}, {t: "Article confectionné selon les spécifications demandées : conformément à l'article L221-28 du code de la consommation, il n'ouvre pas droit à rétractation."}]);
  if ((facture || bon) && F.arrhes) m.push([{t: "Arrhes. ", b: true}, {t: "Les sommes versées à la commande ont la nature d'arrhes au sens de l'article L214-1 du code de la consommation : la partie qui achète peut se dédire en les perdant, la partie qui vend en les restituant au double."}]);
  else if ((facture || bon) && F.acompte) m.push([{t: "Acompte. ", b: true}, {t: "Les sommes versées à la commande ont la nature d'acompte : la vente est ferme et définitive pour les deux parties."}]);
  if (facture && F.clientePro) m.push([{t: "Retard de paiement. ", b: true}, {t: "Pénalités au taux de trois fois l'intérêt légal en vigueur. Indemnité forfaitaire pour frais de recouvrement : 40 €. Pas d'escompte pour paiement anticipé."}]);
  var premiere = true;
  m.forEach(function(par){
    var yFin = doc.paragraphe(par, M, y, D - M, {taille: 8, interligne: 11.2, mesure: true});
    if (yFin + 6 > bas){ doc.nouvellePage(); y = 56; premiere = false; }
    if (premiere){ doc.filet(M, y - 12, D, y - 12, {ep: 0.5, couleur: CLAIR}); premiere = false; }
    y = doc.paragraphe(par, M, y, D - M, {taille: 8, interligne: 11.2, couleur: [0.25, 0.28, 0.26]}) + 6;
  });
  /* Le bon de livraison se signe à la remise. */
  if (livraison){
    if (y + 70 > bas){ doc.nouvellePage(); y = 56; }
    y += 18;
    doc.texte(M, y, "Reçu le ______ / ______ / __________", {taille: 9.5, couleur: GRIS});
    doc.texte(colB, y, "Signature", {taille: 9.5, couleur: GRIS});
    doc.rect(colB, y + 8, D - colB, 46, {bord: CLAIR, ep: 0.8});
  }

  var nomDoc = T.nom + " " + (F.numero || "");
  return doc.fin(function(d, i, n){
    d.texte(W / 2, d.H - 30, (V.nom ? V.nom + " · " : "") + nomDoc + (n > 1 ? " · page " + i + "/" + n : ""), {taille: 7.5, couleur: [0.5, 0.54, 0.52], align: "c"});
  });
}
/* Compatibilité : « facture » reste le nom historique. */
function facture(F, fmt, meta){ return documentPdf(F, fmt, meta); }

/* ── Le relevé mensuel (V58) : un mois d'activité sur une page, pour sa
   comptabilité ou sa déclaration. R = {mois, annee, vendeur, recettes:[{d, lib, m}],
   achats:[{d, lib, m}], totalRecettes, totalAchats, resultat, statut, mentions:[]} ── */
function releve(R, fmt){
  var doc = creer({titre: "Relevé " + R.titreMois, auteur: (R.vendeur && R.vendeur.nom) || ""});
  var M = 46, W = doc.L, D = W - M, bas = doc.H - 62, eur = fmt.eur, date = fmt.date;
  var y = 52;
  doc.texte(M, y + 6, "RELEVÉ MENSUEL", {taille: 8.5, gras: true, couleur: GRIS, espacement: 1.4});
  doc.texte(M, y + 34, R.titreMois, {taille: 23, gras: true});
  doc.texte(M, y + 54, "Établi le " + date(R.etabliLe), {taille: 9, couleur: GRIS});
  var V = R.vendeur || {}, yr = y + 6;
  couper(V.nom || "", 235, 12.5, true).forEach(function(t){ doc.texte(D, yr + 8, t, {taille: 12.5, gras: true, align: "r"}); yr += 15; });
  yr += 3;
  if (V.adresse) couper(V.adresse, 235, 9.5, false).forEach(function(t){ doc.texte(D, yr + 8, t, {taille: 9.5, align: "r", couleur: [0.2, 0.22, 0.21]}); yr += 13; });
  if (V.siret){ doc.texte(D, yr + 8, "SIRET " + V.siret, {taille: 9.5, align: "r", couleur: [0.2, 0.22, 0.21]}); yr += 13; }
  y = Math.max(y + 68, yr) + 8;
  doc.filet(M, y, D, y, {ep: 1.4});
  y += 24;
  /* Les trois chiffres */
  var tiers = (D - M) / 3;
  [["RECETTES ENCAISSÉES", eur(R.totalRecettes), VERT], ["ACHATS DE MATIÈRES", eur(R.totalAchats), ENCRE], ["RÉSULTAT DU MOIS", eur(R.resultat), R.resultat < 0 ? ROUGE : VERT]].forEach(function(t, i){
    var x = M + i * tiers;
    doc.texte(x, y, t[0], {taille: 7.5, gras: true, couleur: GRIS, espacement: 1});
    doc.texte(x, y + 22, t[1], {taille: 17, gras: true, couleur: t[2]});
  });
  y += 46;
  doc.filet(M, y, D, y, {ep: 0.5, couleur: CLAIR});
  y += 22;
  function section(titre, lignes, total, vide){
    doc.texte(M, y, titre, {taille: 10.5, gras: true}); y += 10;
    doc.texte(M, y + 6, "DATE", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1});
    doc.texte(M + 70, y + 6, "LIBELLÉ", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1});
    doc.texte(D, y + 6, "MONTANT", {taille: 7.5, gras: true, couleur: GRIS, espacement: 1, align: "r"});
    doc.filet(M, y + 13, D, y + 13, {ep: 0.8}); y += 13;
    if (!lignes.length){ y += 18; doc.texte(M, y, vide, {taille: 9.5, couleur: GRIS}); y += 6; }
    lignes.forEach(function(l){
      var des = couper(l.lib || "", D - M - 70 - 100, 9.5, false);
      var h = 8 + des.length * 12.5 + 6;
      if (y + h > bas){ doc.nouvellePage(); y = 56; }
      var yy = y + 8 + 9;
      doc.texte(M, yy, date(l.d), {taille: 9.5, couleur: GRIS});
      des.forEach(function(t, i){ doc.texte(M + 70, yy + i * 12.5, t, {taille: 9.5}); });
      doc.texte(D, yy, eur(l.m), {taille: 9.5, align: "r"});
      y += h;
      doc.filet(M, y, D, y, {ep: 0.5, couleur: CLAIR});
    });
    if (y + 30 > bas){ doc.nouvellePage(); y = 56; }
    y += 18;
    doc.texte(M, y, "Total", {taille: 10.5, gras: true});
    doc.texte(D, y, eur(total), {taille: 10.5, gras: true, align: "r"});
    y += 30;
  }
  section("Recettes encaissées", R.recettes || [], R.totalRecettes, "Aucune recette encaissée ce mois-ci.");
  section("Achats de matières", R.achats || [], R.totalAchats, "Aucun achat noté ce mois-ci.");
  var premiere = true;
  (R.mentions || []).forEach(function(txt){
    var par = [{t: txt}];
    var yFin = doc.paragraphe(par, M, y, D - M, {taille: 8, interligne: 11.2, mesure: true});
    if (yFin + 6 > bas){ doc.nouvellePage(); y = 56; premiere = false; }
    if (premiere){ doc.filet(M, y - 12, D, y - 12, {ep: 0.5, couleur: CLAIR}); premiere = false; }
    y = doc.paragraphe(par, M, y, D - M, {taille: 8, interligne: 11.2, couleur: [0.25, 0.28, 0.26]}) + 6;
  });
  return doc.fin(function(d, i, n){
    d.texte(W / 2, d.H - 30, (V.nom ? V.nom + " · " : "") + "Relevé " + R.titreMois + (n > 1 ? " · page " + i + "/" + n : ""), {taille: 7.5, couleur: [0.5, 0.54, 0.52], align: "c"});
  });
}

window.CrochomptePdf = {creer: creer, facture: facture, document: documentPdf, releve: releve, largeur: largeur, couper: couper, octet: octet};
})();
