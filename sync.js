/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — comptes et synchronisation
   ───────────────────────────────────────────────────────────────────────────
   Ce module est FACULTATIF. Sans lui, ou sans config.js rempli, l'application
   fonctionne exactement comme avant : tout reste dans le navigateur.

   Ce qu'il ajoute :
     • un compte : pseudo + mot de passe pour se reconnecter (le pseudo OU
       l'adresse de courriel conviennent tous les deux à la connexion) ;
       adresse de courriel vérifiée à l'inscription (elle sert à confirmer
       que le compte t'appartient, à te reconnecter si tu préfères, et à
       réinitialiser le mot de passe) ;
     • une inscription courte (pseudo, adresse, mot de passe, « 15 ans ou
       plus ») ; prénom, nom, ville, pays et activité restent facultatifs ;
     • les données qui suivent l'artisane d'un appareil à l'autre ;
     • les photos et les pages de patrons stockées en ligne.

   Comment ça marche, en bref : Supabase authentifie par adresse de courriel,
   pas par pseudo. Trois fonctions serveur (edge/inscription, edge/connexion,
   edge/mot-de-passe-oublie) font le lien entre le pseudo ou l'adresse que la
   personne tape et le compte réel — sans jamais renvoyer l'adresse de
   courriel au navigateur quand seul le pseudo a été donné. C'est ce qui
   empêche quiconque de deviner des pseudos pour en déduire des adresses.

   Ce qu'il ne fait jamais :
     • écraser un travail plus récent sans prévenir ;
     • envoyer quoi que ce soit tant que personne n'est connecté ;
     • révéler si un pseudo ou une adresse existe déjà (mêmes messages dans
       tous les cas, sauf la disponibilité du pseudo à l'inscription, qui est
       un renseignement volontairement public — comme sur n'importe quel
       site qui laisse choisir un identifiant).
   ═══════════════════════════════════════════════════════════════════════════ */

// Version figée volontairement : « @2 » suivrait la dernière version publiée,
// et ton site en ligne changerait tout seul un matin, sans que tu aies rien
// déployé. Pour monter de version, change ce numéro et redéploie — sciemment.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";

(function(){
  "use strict";

  var cfg = window.CROCHOMPTE_CONFIG || {};
  var pont = window.CrochomptePont;

  /* Sans configuration ou sans pont : on ne fait rien, silencieusement.
     L'application reste pleinement utilisable hors ligne. */
  if (!pont) return;
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey){
    return;   /* le repli hors ligne d'index.html dit déjà ce qu'il faut */
  }

  /* Un lien de confirmation ou de mot de passe qui échoue ramène ici avec
     l'erreur dans l'adresse (#error=…&error_code=otp_expired). On la lit
     avant que la bibliothèque ne touche à l'adresse. */
  var hashInitial = String(window.location.hash || "");
  var sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  var TABLE  = "ateliers";
  var BUCKET = "photos";
  var RE_PSEUDO = /^[A-Za-z0-9][A-Za-z0-9_-]{2,23}$/;
  var RE_COURRIEL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  var AGE_MINIMUM = 15;

  function urlFonction(nom){
    return cfg.supabaseUrl.replace(/\/+$/, "") + "/functions/v1/" + nom;
  }
  function urlPage(){
    return window.location.href.split("#")[0];
  }

  var brouillonInscriptionVide = function(){
    return {pseudo:"", prenom:"", nom:"", dateNaissance:"", ville:"", pays:"", typeActivite:"", email:"", age15:false};
  };
  var brouillonProfilVide = function(){
    return {prenom:"", nom:"", dateNaissance:"", ville:"", pays:"", typeActivite:""};
  };

  /* ───────── file d'attente durable ─────────
     « Il reste du travail à envoyer » doit survivre à la fermeture de l'onglet.
     Sinon, une modification faite hors ligne puis un redémarrage laissaient le
     module croire qu'il n'avait rien à envoyer : il allait chercher la version
     du serveur et la posait par-dessus. Elle était archivée, donc récupérable,
     mais il fallait le deviner. index.html pose la même marque quand ce module
     n'a pas pu se charger du tout. */
  var CLE_AENVOYER = "crochompte-v1.aEnvoyer";
  function marquerAEnvoyer(oui){
    try{
      if (!oui){ localStorage.removeItem(CLE_AENVOYER); return; }
      localStorage.setItem(CLE_AENVOYER, JSON.stringify({
        depuis: Date.now(),
        uid: etat.session ? etat.session.user.id : null
      }));
    }catch(e){}
  }
  /* La marque porte le compte auquel ce travail appartient — index.html
     inscrit le même. Sur un ordinateur partagé, du travail non envoyé laissé
     par quelqu'un d'autre ne doit surtout pas repartir dans le compte de la
     personne suivante : on n'envoie que si c'est bien le même compte qui
     rouvre l'atelier. */
  function resteAEnvoyer(uid){
    try{
      var v = localStorage.getItem(CLE_AENVOYER);
      if (!v) return false;
      var m = JSON.parse(v);
      return m.uid === uid;
    }catch(e){ return false; }
  }

  var etat = {
    session: null,
    pseudo: null,
    /* Le profil tel que renvoyé par le serveur — sert à préremplir le
       formulaire « Mes informations ». */
    brouillonProfil: brouillonProfilVide(),
    /* Horodatage du dernier état connu du serveur. Sert à détecter qu'un
       autre appareil a écrit entre-temps. */
    vuLe: null,
    /* Vrai dès qu'une modification locale n'est pas encore partie. C'est ce
       qui permet, au retour sur l'onglet, de savoir s'il faut envoyer son
       travail ou aller chercher celui de l'autre appareil. */
    sale: false,
    minuteur: null,
    minuteurPseudo: null,
    zone: null,
    mode: "connexion",      /* "connexion" | "inscription" | "oubli" */
    recuperation: false,    /* true : on revient d'un lien « mot de passe oublié » */
    /* Chaque peindre() reconstruit tout le formulaire : sans ceci, une seule
       erreur de validation forcerait à tout retaper, mots de passe compris.
       On ne restitue jamais les mots de passe eux-mêmes, seulement ce qui
       est pénible à retaper. */
    brouillon: Object.assign(brouillonInscriptionVide(), {identifiantOubli:"", identifiantConnexion:""})
  };

  /* Sans ceci, la personne qui clique sur un lien périmé arrivait sur le
     formulaire d'inscription sans un mot d'explication, avec l'erreur en
     anglais dans la barre d'adresse. */
  (function(){
    if (hashInitial.indexOf("error") === -1) return;
    var p;
    try { p = new URLSearchParams(hashInitial.replace(/^#/, "")); } catch (e) { return; }
    var code = p.get("error_code") || p.get("error") || "";
    if (!code) return;
    etat.alerteLien = code === "otp_expired"
      ? {titre: "Ce lien n'est plus valable : il a déjà servi, ou il a expiré.",
         detail: "Pour confirmer ton adresse, réinscris-toi avec la même adresse : un nouveau lien partira. "+
                 "Si ton compte est déjà confirmé, connecte-toi simplement. "+
                 "Pour changer ton mot de passe, refais « Mot de passe oublié »."}
      : {titre: "Ce lien n'a pas pu être utilisé.",
         detail: "Réessaie depuis le dernier e-mail reçu, ou demande un nouveau lien depuis cette page."};
    try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
  })();

  /* ───────── utilitaires ───────── */

  function echappe(t){
    return String(t == null ? "" : t).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function dateLisible(iso){
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,16);
    return d.toLocaleString("fr-FR", {day:"numeric", month:"long", hour:"2-digit", minute:"2-digit"});
  }

  /* Âge en années pleines à partir d'une date « AAAA-MM-JJ ». Renvoie null si
     la date est absente, mal formée, dans le futur, ou trop ancienne pour
     être vraisemblable. Recalculé aussi côté serveur (edge/inscription) :
     ceci n'est qu'un retour immédiat, pas la vérification qui compte. */
  function ageEnAnnees(iso){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || "").trim());
    if (!m) return null;
    var annee = +m[1], mois = +m[2], jour = +m[3];
    if (annee < 1900) return null;
    var naissance = new Date(Date.UTC(annee, mois - 1, jour));
    if (isNaN(naissance.getTime())) return null;
    var auj = new Date();
    if (naissance > auj) return null;
    var age = auj.getUTCFullYear() - naissance.getUTCFullYear();
    var pasEncore = (auj.getUTCMonth() < naissance.getUTCMonth()) ||
      (auj.getUTCMonth() === naissance.getUTCMonth() && auj.getUTCDate() < naissance.getUTCDate());
    if (pasEncore) age--;
    return age;
  }

  function appelFonction(nom, corps){
    return fetch(urlFonction(nom), {
      method: "POST",
      /* Les deux en-têtes sont nécessaires : Supabase vérifie le jeton dans
         « Authorization » avant même de laisser la requête atteindre la
         fonction — sans lui, il la refuse au niveau de la passerelle, sans
         les en-têtes CORS que la fonction ajouterait elle-même. Le résultat,
         vu du navigateur, est indiscernable d'un réseau coupé : c'est ce qui
         produit le message générique ci-dessous, quelle que soit la vraie
         cause. */
      headers: {
        "Content-Type": "application/json",
        "apikey": cfg.supabaseAnonKey,
        "Authorization": "Bearer " + cfg.supabaseAnonKey
      },
      body: JSON.stringify(corps || {})
    }).then(function(r){
      return r.json().catch(function(){ return {}; }).then(function(d){
        d._statut = r.status; d._ok = r.ok;
        return d;
      });
    }).catch(function(e){
      return {_ok:false, erreur: "Impossible de joindre le serveur. Vérifie ta connexion.", _reseau:true};
    });
  }

  /* Lit le profil de la personne connectée (jamais celui d'une autre — voir
     mon_profil() dans schema-pseudo.sql) et l'installe comme brouillon du
     formulaire « Mes informations », pour qu'il parte prérempli. */
  function recupererProfil(){
    return sb.rpc("mon_profil").then(function(r){
      var d = (r.data) || {};
      etat.pseudo = d.pseudo || null;
      etat.brouillonProfil = {
        prenom: d.prenom || "", nom: d.nom || "",
        dateNaissance: d.date_naissance || "",
        ville: d.ville || "", pays: d.pays || "",
        typeActivite: d.type_activite || ""
      };
    }).catch(function(){});
  }

  /* ───────── synchronisation de l'état ─────────
     Règles, dans l'ordre où elles protègent le travail :
       1. On ne remplace JAMAIS la version en ligne sans l'archiver, dès
          qu'elle n'est pas exactement celle que cet appareil connaît.
          La version « connue » (vuLe) est retenue dans le navigateur, par
          compte : elle survit aux rechargements et aux reconnexions.
       2. Rien ne part tant que la première mise à jour de la session n'a pas
          réussi (etat.pret) : un appareil neuf, vide, ne peut pas écraser
          l'atelier en ligne avant de l'avoir récupéré.
       3. Un atelier vierge ne remplace jamais un atelier rempli (sauf remise
          à zéro volontaire, qui porte une marque).
       4. Un seul envoi à la fois ; ce qui est modifié pendant un envoi repart
          juste après (compteur de générations) ; une réception n'écrase pas
          une modification faite pendant qu'elle arrivait.
       5. Seules les vraies modifications déclenchent un envoi : changer
          d'application ou fermer l'onglet ne suffit pas. */

  var CLE_BASE = "crochompte-v1.versionConnue";
  function lireBase(uid){
    try{ var m = JSON.parse(localStorage.getItem(CLE_BASE) || "null"); return (m && m.uid === uid) ? m.maj : null; }
    catch(e){ return null; }
  }
  function noterBase(maj){
    etat.vuLe = maj || null;
    try{ if (etat.session) localStorage.setItem(CLE_BASE, JSON.stringify({uid: etat.session.user.id, maj: etat.vuLe})); }catch(e){}
  }
  etat.pret = false;
  etat.generation = 0;
  etat.envoiEnCours = null;
  etat.relancer = false;
  etat.derniereErreur = null;

  /* Un atelier « vierge » : rien que la personne ait saisi. La remise à zéro
     volontaire pose reinitialiseLe, pour qu'elle puisse, elle, remplacer la
     version en ligne. */
  function estViergeDonnees(d){
    if (!d || typeof d !== "object") return true;
    if (d.reinitialiseLe) return false;
    var nb = function(x){ return Array.isArray(x) ? x.length : 0; };
    if (nb(d.creations) || nb(d.pieces) || nb(d.commandes) || nb(d.patrons)) return false;
    if (d.reglages && d.reglages.confirmeLe) return false;
    if (d.photosModeles && Object.keys(d.photosModeles).some(function(k){ return d.photosModeles[k] && d.photosModeles[k].photo; })) return false;
    if (Array.isArray(d.matieres) && d.matieres.some(function(m){ return m && (m.perso || (Array.isArray(m.mouv) && m.mouv.length) || Number(m.stock) > 0); })) return false;
    return true;
  }

  /* Un nom d'appareil lisible, pour que l'historique dise « ton téléphone »
     plutôt qu'une suite de chiffres. Rien d'identifiant n'est envoyé. */
  function nomAppareil(){
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "tablette";
    if (/Mobi|Android|iPhone/i.test(ua)) return "téléphone";
    return "ordinateur";
  }

  /* Archive un état AVANT de le remplacer. Si l'archivage échoue, on ne
     remplace rien : c'est la condition pour que rien ne se perde. */
  function archiver(donnees, maj, raison){
    if (!etat.session || !donnees) return Promise.resolve();
    return sb.from("ateliers_versions").insert({
      user_id: etat.session.user.id,
      donnees: donnees, maj: maj || new Date().toISOString(),
      appareil: nomAppareil(), raison: raison || "remplacee"
    }).then(function(r){
      if (r && r.error) throw new Error("archivage : " + r.error.message);
      return sb.rpc("purger_versions").then(function(){}, function(){});
    });
  }

  function programmerEnvoi(delai){
    if (etat.minuteur) clearTimeout(etat.minuteur);
    etat.minuteur = setTimeout(function(){ etat.minuteur = null; envoyer(); }, delai || 2500);
  }

  /* ENVOYER — la version d'ici devient la version en ligne. */
  function envoyer(){
    if (!etat.session || etat.recuperation || etat.suppression) return Promise.resolve(false);
    if (!etat.pret) return synchroniser();
    if (etat.envoiEnCours){ etat.relancer = true; return etat.envoiEnCours; }
    var uid = etat.session.user.id;
    var gen = etat.generation;
    var corps = JSON.parse(JSON.stringify(pont.lire()));   /* instantané : l'état peut changer pendant l'envoi */
    var archive = null;
    etat.envoiEnCours = sb.from(TABLE).select("donnees, maj").eq("user_id", uid).maybeSingle()
      .then(function(r){
        if (r.error) throw new Error(r.error.message);
        if (r.data && estViergeDonnees(corps) && !estViergeDonnees(r.data.donnees)) throw new Error("vierge");
        var ecrase = !!(r.data && r.data.maj !== etat.vuLe);
        if (ecrase) archive = r.data.maj;
        return (ecrase ? archiver(r.data.donnees, r.data.maj, "remplacee") : Promise.resolve()).then(function(){
          return sb.from(TABLE).upsert({user_id: uid, donnees: corps, maj: new Date().toISOString()},
                                       {onConflict: "user_id"}).select("maj").single();
        });
      })
      .then(function(res){
        if (res.error) throw new Error(res.error.message);
        noterBase(res.data && res.data.maj);
        if (etat.generation === gen){ etat.sale = false; marquerAEnvoyer(false); }
        etat.derniereErreur = null;
        planifierPhotos();
        return true;
      })
      .catch(function(e){
        var m = String(e && e.message || e);
        if (m === "vierge"){
          /* Cet appareil n'a rien d'utile et l'atelier en ligne est rempli :
             on le récupère au lieu de l'écraser. */
          etat.sale = false; marquerAEnvoyer(false); etat.pret = false;
          setTimeout(synchroniser, 0);
          return false;
        }
        etat.derniereErreur = traduire(m);
        return false;
      })
      .then(function(ok){
        etat.envoiEnCours = null;
        peindre(archive && ok ? {archive: archive, garderFocus: true} : {garderFocus: true});
        if (etat.relancer){ etat.relancer = false; if (etat.sale) programmerEnvoi(800); }
        else if (!ok && etat.sale) programmerEnvoi(30000);   /* nouvel essai automatique */
        return ok;
      });
    return etat.envoiEnCours;
  }

  /* RECEVOIR — la version en ligne remplace celle d'ici (archivée avant, si
     elle contient quelque chose et qu'elle diffère). Renvoie "recu",
     "identique", "vide" ou "modifie" (quelque chose a changé ici pendant
     la réception : on n'écrase pas, l'appelant enverra). */
  function recevoir(){
    if (!etat.session) return Promise.resolve("vide");
    var gen = etat.generation;
    var uid = etat.session.user.id;
    return sb.from(TABLE).select("donnees, maj").eq("user_id", uid).maybeSingle().then(function(r){
      if (r.error) throw new Error(r.error.message);
      if (!r.data) return "vide";
      if (etat.generation !== gen || etat.sale) return "modifie";
      var local = pont.lire();
      var identique = JSON.stringify(local) === JSON.stringify(r.data.donnees);
      var avant = (!identique && !estViergeDonnees(local))
        ? archiver(local, etat.vuLe || new Date().toISOString(), "avant_recuperation")
        : Promise.resolve();
      return avant.then(function(){
        if (etat.generation !== gen || etat.sale) return "modifie";
        if (!identique) pont.ecrire(r.data.donnees);
        noterBase(r.data.maj);
        return identique ? "identique" : "recu";
      });
    });
  }

  /* SYNCHRONISER — à l'ouverture, à la connexion, au retour sur l'onglet et
     au retour du réseau. L'artisane n'a jamais à se demander si elle est à
     jour, ni à cliquer sur un bouton dont elle ne devine pas l'effet. */
  var syncEnCours = null;
  function synchroniser(){
    if (!etat.session || etat.recuperation || etat.suppression) return Promise.resolve(false);
    if (syncEnCours) return syncEnCours;
    if (etat.envoiEnCours) return etat.envoiEnCours;
    var uid = etat.session.user.id;
    syncEnCours = sb.from(TABLE).select("maj").eq("user_id", uid).maybeSingle()
      .then(function(r){
        if (r.error) throw new Error(r.error.message);
        if (!r.data){
          /* Compte sans atelier en ligne : on y met celui d'ici s'il a du contenu. */
          etat.pret = true;
          return (etat.sale || !estViergeDonnees(pont.lire())) ? "envoyer" : true;
        }
        if (r.data.maj === etat.vuLe){ etat.pret = true; return etat.sale ? "envoyer" : true; }
        /* La version en ligne n'est pas celle qu'on connaît. */
        if (etat.sale){ etat.pret = true; return "envoyer"; }   /* elle sera archivée par envoyer() */
        return recevoir().then(function(res){
          etat.pret = true;
          if (res === "modifie") return "envoyer";
          if (res === "recu") pont.toast("Atelier mis à jour avec les modifications faites sur un autre appareil.");
          return true;
        });
      })
      .then(function(suite){
        syncEnCours = null;
        etat.derniereErreur = null;
        return suite === "envoyer" ? envoyer() : true;
      }, function(e){
        syncEnCours = null;
        etat.derniereErreur = traduire(String(e && e.message || e));
        peindre({garderFocus: true});
        return false;
      });
    return syncEnCours;
  }

  /* L'application appelle ceci à chaque modification réelle. On regroupe :
     personne n'a besoin d'un aller-retour réseau par frappe au clavier. */
  function signaler(){
    if (!etat.session) return;
    etat.generation++;
    etat.sale = true;
    marquerAEnvoyer(true);
    programmerEnvoi(2500);
  }

  /* Un dernier envoi quand on quitte la page ou qu'elle passe en arrière-plan
     — seulement s'il y a quelque chose à envoyer. */
  function envoiDeSortie(){
    if (!etat.session || !etat.sale) return;
    if (etat.minuteur){ clearTimeout(etat.minuteur); etat.minuteur = null; }
    envoyer();
  }
  window.addEventListener("pagehide", envoiDeSortie);
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "hidden") envoiDeSortie();
    else synchroniser();   /* de retour sur l'onglet : on se remet à jour */
  });
  /* Retour du réseau : ce qui attendait part, et on se remet à jour. */
  window.addEventListener("online", function(){ synchroniser(); });
  /* Filet : si une mise à jour ou un envoi a échoué, on réessaie chaque minute. */
  setInterval(function(){
    if (etat.session && !etat.recuperation && (!etat.pret || etat.sale) && !etat.envoiEnCours && !syncEnCours &&
        document.visibilityState !== "hidden") synchroniser();
  }, 60000);

  /* Fin d'une session (déconnexion, expiration, suppression) : plus rien ne
     doit partir au nom de ce compte. */
  function finDeSession(){
    if (etat.minuteur){ clearTimeout(etat.minuteur); etat.minuteur = null; }
    etat.sale = false; etat.pret = false; etat.vuLe = null; etat.derniereErreur = null;
    etat.generation++;
    sessionDemarree = null;
  }

  /* ───────── photos ─────────
     Elles partent toutes seules, en arrière-plan, après chaque enregistrement.
     On retient celles qui sont déjà en ligne (par compte) pour ne pas les
     renvoyer ; une photo changée reçoit un nouvel identifiant, donc repart.
     Les suppressions attendent dans une file tant qu'elles n'ont pas abouti. */
  var CLE_PHOTOS = "crochompte-v1.photosEnvoyees";
  var CLE_PHOTOS_SUPPR = "crochompte-v1.photosASupprimer";
  function lireCle(cle){
    try{
      var m = JSON.parse(localStorage.getItem(cle) || "null");
      if (m && etat.session && m.uid === etat.session.user.id) return m.ids || {};
    }catch(e){}
    return {};
  }
  function ecrireCle(cle, ids){
    try{ if (etat.session) localStorage.setItem(cle, JSON.stringify({uid: etat.session.user.id, ids: ids})); }catch(e){}
  }
  function photosEnvoyees(){ return lireCle(CLE_PHOTOS); }
  function noterPhotos(ids){ ecrireCle(CLE_PHOTOS, ids); }

  var photosEnCours = null;
  function envoyerPhotos(journal){
    if (!etat.session) return Promise.resolve({faites:0, echecs:0});
    if (photosEnCours) return photosEnCours;
    var deja = photosEnvoyees();
    var ids = pont.photo.lister().filter(function(id){ return id && !deja[id]; });
    var uid = etat.session.user.id;
    var faites = 0, echecs = 0;
    photosEnCours = ids.reduce(function(chaine, id){
      return chaine.then(function(){
        /* La photo est lue telle qu'elle est rangée sur l'appareil (un Blob). */
        return pont.photo.lire(id).then(function(v){
          if (!v) return;
          var obtenir = (typeof Blob !== "undefined" && v instanceof Blob)
            ? Promise.resolve(v)
            : fetch(v).then(function(r){ if (!r.ok) throw new Error("photo illisible"); return r.blob(); });
          return obtenir.then(function(blob){
            return sb.storage.from(BUCKET)
              .upload(uid + "/" + id + ".jpg", blob, {upsert:true, contentType:"image/jpeg"})
              .then(function(res){
                if (res && res.error){ echecs++; return; }
                deja[id] = 1; noterPhotos(deja);
                faites++; if (journal) journal(faites, ids.length);
              });
          });
        }).catch(function(){ echecs++; });
      });
    }, Promise.resolve()).then(function(){
      photosEnCours = null;
      return {faites: faites, echecs: echecs};
    });
    return photosEnCours;
  }
  /* Attend l'envoi en cours, puis renvoie tout ce qui manque encore ; compte
     comme échec toute photo présente ici mais toujours absente en ligne. */
  function envoyerToutesPhotos(){
    return (photosEnCours || Promise.resolve()).then(function(){ return envoyerPhotos(); }).then(function(b){
      var deja = photosEnvoyees();
      var reste = pont.photo.lister().filter(function(id){ return id && !deja[id]; });
      return Promise.all(reste.map(function(id){ return pont.photo.lire(id); })).then(function(v){
        return {faites: b.faites, echecs: v.filter(Boolean).length};
      });
    });
  }
  var minuteurPhotos = null;
  function planifierPhotos(){
    if (minuteurPhotos) clearTimeout(minuteurPhotos);
    minuteurPhotos = setTimeout(function(){ traiterSuppressions().then(function(){ envoyerPhotos(); }); }, 1500);
  }
  /* Une photo supprimée dans l'application l'est aussi en ligne ; si le
     réseau manque, la suppression attend et repart plus tard. */
  function photoEffacee(id){
    if (!etat.session || !id) return;
    var deja = photosEnvoyees(); delete deja[id]; noterPhotos(deja);
    var file = lireCle(CLE_PHOTOS_SUPPR); file[id] = 1; ecrireCle(CLE_PHOTOS_SUPPR, file);
    traiterSuppressions();
  }
  function traiterSuppressions(){
    if (!etat.session) return Promise.resolve();
    var file = lireCle(CLE_PHOTOS_SUPPR);
    var ids = Object.keys(file);
    if (!ids.length) return Promise.resolve();
    var uid = etat.session.user.id;
    return sb.storage.from(BUCKET).remove(ids.map(function(id){ return uid + "/" + id + ".jpg"; }))
      .then(function(r){
        if (r && r.error) return;
        var f2 = lireCle(CLE_PHOTOS_SUPPR);
        ids.forEach(function(id){ delete f2[id]; });
        ecrireCle(CLE_PHOTOS_SUPPR, f2);
      }).catch(function(){});
  }

  /* Ramène sur cet appareil les photos de l'atelier qui n'y sont pas encore.
     Seules les photos utilisées par l'atelier sont téléchargées : une photo
     supprimée ailleurs ne réapparaît pas. */
  function recevoirPhotos(journal){
    if (!etat.session) return Promise.resolve(0);
    var uid = etat.session.user.id;
    var utiles = pont.photo.lister().filter(Boolean);
    var faites = 0;
    return utiles.reduce(function(chaine, id){
      return chaine.then(function(){
        return pont.photo.lire(id).then(function(dejaLa){
          if (dejaLa) return;
          return sb.storage.from(BUCKET).download(uid + "/" + id + ".jpg").then(function(d){
            if (d.error || !d.data) return;
            return pont.photo.ecrire(id, d.data).then(function(ok){
              if (ok === false) return;
              var deja = photosEnvoyees(); deja[id] = 1; noterPhotos(deja);
              faites++; if (journal) journal(faites, utiles.length);
            });
          });
        }).catch(function(){});
      });
    }, Promise.resolve()).then(function(){ return faites; });
  }

  /* Tous les fichiers du dossier du compte, page par page (au-delà de 100). */
  function listerTout(uid){
    var tous = [];
    function page(offset){
      return sb.storage.from(BUCKET).list(uid, {limit: 100, offset: offset}).then(function(r){
        if (r.error) throw new Error(r.error.message);
        var l = r.data || [];
        tous = tous.concat(l);
        return l.length === 100 ? page(offset + 100) : tous;
      });
    }
    return page(0);
  }

  /* ───────── effacement du compte (RGPD, droit à l'effacement) ─────────
     Dans cet ordre : on coupe tout envoi, puis les photos (toutes les pages
     du dossier), l'historique des versions, l'atelier, enfin l'identité de
     connexion par la fonction serveur. Chaque étape vérifie son résultat :
     le message final dit exactement ce qui a été fait. */
  function effacerToutLeCompte(journal){
    if (!etat.session) return Promise.resolve({ok:false});
    var uid = etat.session.user.id;
    etat.suppression = true;
    if (etat.minuteur){ clearTimeout(etat.minuteur); etat.minuteur = null; }
    if (minuteurPhotos){ clearTimeout(minuteurPhotos); minuteurPhotos = null; }

    return Promise.all([etat.envoiEnCours, photosEnCours].filter(Boolean)).catch(function(){})
      .then(function(){
        if (journal) journal("Suppression des photos…");
        return listerTout(uid);
      })
      .then(function(fichiers){
        var noms = fichiers.map(function(f){ return uid + "/" + f.name; });
        var lots = [];
        for (var i = 0; i < noms.length; i += 100) lots.push(noms.slice(i, i + 100));
        return lots.reduce(function(ch, lot){
          return ch.then(function(){
            return sb.storage.from(BUCKET).remove(lot).then(function(r){ if (r && r.error) throw new Error(r.error.message); });
          });
        }, Promise.resolve());
      })
      .then(function(){
        if (journal) journal("Suppression de l'historique…");
        return sb.from("ateliers_versions").delete().eq("user_id", uid);
      })
      .then(function(res){
        if (res && res.error) throw new Error(res.error.message);
        if (journal) journal("Suppression de l'atelier…");
        return sb.from(TABLE).delete().eq("user_id", uid);
      })
      .then(function(res){
        if (res && res.error) throw new Error(res.error.message);
        if (journal) journal("Suppression du compte…");
        return sb.functions.invoke("supprimer-compte")
          .then(function(f){ return {ok:true, identite: !f.error}; })
          .catch(function(){ return {ok:true, identite:false}; });
      })
      .then(function(bilan){
        return sb.auth.signOut({scope: "local"}).catch(function(){}).then(function(){
          finDeSession();
          etat.suppression = false;
          etat.session = null; etat.pseudo = null;
          etat.brouillonProfil = brouillonProfilVide();
          return bilan;
        });
      })
      .catch(function(e){
        etat.suppression = false;
        return {ok:false, message: String(e && e.message || e)};
      });
  }

  /* ───────── interface ───────── */

  /* Dit à index.html si un compte est nécessaire pour utiliser l'outil et si
     la personne est actuellement connectée : c'est ce qui décide d'afficher
     l'écran de connexion obligatoire ou l'atelier. On ne le répète que quand
     l'état a vraiment changé — sinon peindre() (appelé par le nouvel écran
     qu'index.html vient de monter) redéclencherait aussitôt un nouveau
     changement d'écran, en boucle. */
  var dernierEtatAnnonce = null;
  function declarerEtat(){
    if (!pont.definirEtatConnexion) return;
    var connecte = !!etat.session && !etat.recuperation;
    if (dernierEtatAnnonce && dernierEtatAnnonce.connecte === connecte) return;
    dernierEtatAnnonce = {
      exige: true,
      connecte: connecte,
      /* index.html le retient pour n'ouvrir sa porte de secours hors ligne
         qu'au compte qui l'a déjà ouverte normalement ici. */
      uid: connecte ? etat.session.user.id : null
    };
    pont.definirEtatConnexion(dernierEtatAnnonce);
  }

  /* Se déconnecter, d'où qu'on le demande : le bouton de Réglages, l'en-tête
     sur ordinateur, le menu sur téléphone. Partir sans envoyer perdrait le
     travail des dernières secondes, et laisserait une marque « à envoyer »
     qui ne concerne plus personne. */
  var deconnexionEnCours = false;
  function deconnecter(){
    if (deconnexionEnCours || !etat.session) return Promise.resolve();
    deconnexionEnCours = true;
    if (etat.minuteur){ clearTimeout(etat.minuteur); etat.minuteur = null; }
    var dernier = etat.sale ? (etat.pret ? envoyer() : synchroniser()) : Promise.resolve(true);
    return dernier.then(function(){
      /* Se déconnecter efface l'atelier de ce navigateur : on ne le fait
         jamais tant que tout n'est pas bien parti en ligne, photos comprises. */
      if (etat.sale) throw new Error("non_envoye");
      return envoyerToutesPhotos();
    }).then(function(bilan){
      if (bilan && bilan.echecs) throw new Error("photos");
      /* « local » : on ne déconnecte que cet appareil, pas le téléphone. */
      return sb.auth.signOut({scope: "local"});
    }).then(function(r){
      if (r && r.error) throw new Error("deconnexion");
      marquerAEnvoyer(false);
      finDeSession();
      etat.session = null; etat.pseudo = null; etat.mode = "connexion";
      etat.brouillon = Object.assign(brouillonInscriptionVide(), {identifiantOubli:"", identifiantConnexion:""});
      etat.brouillonProfil = brouillonProfilVide();
      deconnexionEnCours = false;
      /* Rien de l'atelier ne reste dans ce navigateur après la déconnexion :
         sur un ordinateur partagé, la personne suivante ne doit ni le voir,
         ni le récupérer dans son propre compte. Tout est déjà en ligne. */
      if (pont.oublierAtelier) pont.oublierAtelier();
      pont.toast("Tu es déconnectée.");
      peindre();
    }, function(e){
      deconnexionEnCours = false;
      var m = e && e.message;
      pont.toast(m === "non_envoye"
        ? "Tes dernières modifications ne sont pas encore enregistrées en ligne. Vérifie ta connexion internet, puis réessaie de te déconnecter."
        : m === "photos"
          ? "Certaines photos ne sont pas encore enregistrées en ligne. Vérifie ta connexion internet, puis réessaie de te déconnecter."
          : "La déconnexion n'a pas abouti. Vérifie ta connexion internet, puis réessaie.");
    });
  }

  /* L'en-tête de l'application affiche qui est connectée et le bouton pour
     se déconnecter : on lui dit qui, à chaque changement. */
  var dernierCompteAnnonce = "";
  function annoncerCompte(){
    if (!pont.definirCompte) return;
    var connecte = !!etat.session && !etat.recuperation;
    var info = {
      connecte: connecte,
      pseudo: connecte ? (etat.pseudo || (etat.session.user && etat.session.user.email) || "") : ""
    };
    var cle = JSON.stringify(info);
    if (cle === dernierCompteAnnonce) return;
    dernierCompteAnnonce = cle;
    pont.definirCompte(info);
  }

  /* Les messages d'erreur de Supabase arrivent en anglais et en termes
     techniques : on les traduit en ce que la personne peut faire. */
  function traduire(m){
    var t = String(m || "");
    /* Messages des fonctions serveur, déjà en français : on les aligne sur le
       vocabulaire de l'application sans avoir à les redéployer. */
    if (/déjà un compte/i.test(t)) return "Cette adresse e-mail est déjà associée à un compte. Connecte-toi avec ton adresse e-mail, "+
      "ou utilise « Mot de passe oublié » : l'e-mail que tu recevras te rappellera ton pseudo.";
    if (/^Identifiant ou mot de passe incorrect/i.test(t)) return "Pseudo, adresse e-mail ou mot de passe incorrect.";
    if (/ressemble pas à une adresse/i.test(t)) return "Cette adresse e-mail n'est pas valide.";
    if (/Inscription impossible pour l'instant/i.test(t)) return "La création du compte n'a pas abouti. Réessaie dans quelques minutes.";
    if (/[àéèêç]/i.test(t)) return t.replace(/courriel/g, "e-mail");
    if (/different from the old password/i.test(t)) return "Choisis un mot de passe différent de l'actuel.";
    if (/at least \d+ characters|password should be/i.test(t)) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (/weak|pwned|compromised/i.test(t)) return "Ce mot de passe est trop courant. Choisis-en un plus difficile à deviner.";
    if (/rate limit|too many/i.test(t)) return "Trop de tentatives en peu de temps. Patiente quelques minutes, puis réessaie.";
    if (/network|fetch|failed to/i.test(t)) return "Impossible de joindre le serveur. Vérifie ta connexion internet, puis réessaie.";
    if (/jwt|session|not authenticated|expired/i.test(t)) return "Ta connexion a expiré. Déconnecte-toi, puis reconnecte-toi.";
    return t || "Une erreur est survenue. Réessaie dans un instant.";
  }

  /* Un champ de saisie. Les mots de passe ont un bouton « Afficher » : c'est
     ce qui évite la plupart des fautes de frappe, sur téléphone surtout. */
  function champ(o){
    var type = o.type || "text";
    var attrs = ' id="' + o.id + '" name="' + o.id + '" type="' + type + '"' +
      (o.auto ? ' autocomplete="' + o.auto + '"' : '') +
      (o.max ? ' maxlength="' + o.max + '"' : '') +
      (o.mode ? ' inputmode="' + o.mode + '"' : '') +
      (o.place ? ' placeholder="' + echappe(o.place) + '"' : '') +
      (type !== "password" ? ' value="' + echappe(o.val || "") + '"' : '') +
      (o.aide ? ' aria-describedby="' + o.id + '-aide"' : '') +
      ' autocapitalize="' + (o.cap || "off") + '" spellcheck="false"';
    var entree = type === "password"
      ? '<span class="mdp"><input' + attrs + '><button type="button" class="mdp-voir" data-voir="' + o.id + '" aria-pressed="false">Afficher</button></span>'
      : '<input' + attrs + '>';
    return '<div class="auth-champ">' +
      '<label class="f" for="' + o.id + '"><span>' + echappe(o.label) +
        (o.lien ? '<a href="#" id="' + o.lien.id + '" class="auth-lien-label">' + echappe(o.lien.texte) + '</a>' : '') +
      '</span>' + entree + '</label>' +
      (o.aide ? '<p class="hint" id="' + o.id + '-aide">' + o.aide + '</p>' : '') +
      (o.etat ? '<p class="hint auth-etat" id="' + o.etat + '" aria-live="polite"></p>' : '') +
      '</div>';
  }

  function texteStatut(){
    if (etat.derniereErreur) return "Enregistrement en attente : " + etat.derniereErreur + " Nouvel essai automatique.";
    if (etat.sale) return "Modifications en cours d'enregistrement…";
    return etat.vuLe ? "Dernier enregistrement : " + dateLisible(etat.vuLe) + "."
                     : "Rien n'a encore été enregistré en ligne.";
  }

  function bandeaux(msg){
    var h = "";
    if (msg.archive){
      h += '<div class="banner"><p><b>Ton autre appareil avait enregistré des modifications</b> le '+
        echappe(dateLisible(msg.archive)) + '. C\'est la version de cet appareil qui est maintenant en ligne ; '+
        'celle de l\'autre appareil est conservée dans l\'historique des versions, ci-dessous.</p></div>';
    }
    if (msg.erreur){
      h += '<div class="banner auth-erreur" role="alert"><p><b>' + echappe(msg.erreur) + '</b>'+
        (msg.detail ? '<br>' + echappe(msg.detail) : '') + '</p></div>';
    }
    if (msg.info){
      h += '<div class="banner" role="status"><p>' + echappe(msg.info) + '</p></div>';
    }
    return h;
  }

  function peindre(msg){
    declarerEtat();
    annoncerCompte();
    var zone = etat.zone;
    if (!zone) return;
    msg = msg || {};
    var connecte = !!etat.session && !etat.recuperation;

    /* L'enregistrement automatique repasse ici toutes les quelques secondes.
       Tout redessiner effacerait ce que la personne est en train de taper
       dans « Mes informations » : on ne met alors à jour que la ligne d'état. */
    if (connecte && zone.__vue === "compte" && !msg.erreur && !msg.info && !msg.archive && !msg.complet){
      var st = zone.querySelector("#sy-statut");
      if (st) st.textContent = texteStatut();
      return;
    }

    if (etat.session) etat.alerteLien = null;
    if (etat.alerteLien && !msg.erreur && !msg.info && !msg.archive){
      msg.erreur = etat.alerteLien.titre; msg.detail = etat.alerteLien.detail;
    }

    var html = "";
    if (etat.session && etat.recuperation){
      html = '<div class="card auth"><div class="body">'+
        '<h2 class="auth-titre">Choisis un nouveau mot de passe</h2>'+
        '<p class="auth-sous">Il remplacera l\'ancien sur tous tes appareils.</p>'+
        bandeaux(msg)+
        '<form id="sy-form" novalidate>'+
          champ({id:"sy-np1", label:"Nouveau mot de passe", type:"password", auto:"new-password", aide:"8 caractères minimum."})+
          champ({id:"sy-np2", label:"Confirmer le mot de passe", type:"password", auto:"new-password"})+
          '<button type="submit" class="btn primary auth-btn" id="sy-np-valider">Enregistrer le mot de passe</button>'+
        '</form></div></div>';

    } else if (!connecte){
      html = '<div class="card auth"><div class="body">';
      if (etat.mode === "inscription"){
        html += '<h2 class="auth-titre">Créer un compte</h2>'+
          '<p class="auth-sous">Quelques secondes suffisent. Tu compléteras ton profil plus tard, si tu le souhaites.</p>'+
          bandeaux(msg)+
          '<form id="sy-form" novalidate>'+
            champ({id:"sy-i-pseudo", label:"Pseudo", auto:"username", max:24, val:etat.brouillon.pseudo,
                   aide:"3 à 24 caractères : lettres, chiffres, tiret ou tiret bas, sans espace ni accent.", etat:"sy-i-pseudo-etat"})+
            champ({id:"sy-i-mail", label:"Adresse e-mail", type:"email", auto:"email", mode:"email", val:etat.brouillon.email,
                   aide:"Pour confirmer ton compte et, si besoin, réinitialiser ton mot de passe."})+
            champ({id:"sy-i-mdp1", label:"Mot de passe", type:"password", auto:"new-password", aide:"8 caractères minimum."})+
            champ({id:"sy-i-mdp2", label:"Confirmer le mot de passe", type:"password", auto:"new-password"})+
            '<label class="auth-case"><input type="checkbox" id="sy-i-age"' + (etat.brouillon.age15 ? ' checked' : '') + '>'+
              '<span>J\'ai ' + AGE_MINIMUM + ' ans ou plus.</span></label>'+
            '<button type="submit" class="btn primary auth-btn" id="sy-i-valider">Créer mon compte</button>'+
          '</form>'+
          '<p class="hint auth-legal">Ton pseudo, ton adresse e-mail et ton atelier sont enregistrés pour faire fonctionner '+
          'le service. Ton mot de passe est chiffré. Aucune publicité, aucun suivi, aucune revente. '+
          '<a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>'+
          '<p class="auth-bas">Déjà un compte ? <a href="#" id="sy-vers-connexion">Se connecter</a></p>';

      } else if (etat.mode === "oubli"){
        html += '<h2 class="auth-titre">Mot de passe oublié</h2>'+
          '<p class="auth-sous">Indique ton pseudo ou ton adresse e-mail. Nous t\'enverrons un lien pour choisir un nouveau mot de passe.</p>'+
          bandeaux(msg)+
          '<form id="sy-form" novalidate>'+
            champ({id:"sy-o-identifiant", label:"Pseudo ou adresse e-mail", auto:"username", val:etat.brouillon.identifiantOubli})+
            '<button type="submit" class="btn primary auth-btn" id="sy-o-valider">Envoyer le lien</button>'+
          '</form>'+
          '<p class="auth-bas"><a href="#" id="sy-vers-connexion">← Retour à la connexion</a></p>';

      } else if (etat.mode === "verifier"){
        html += '<h2 class="auth-titre">Confirme ton adresse e-mail</h2>'+
          '<p class="auth-sous">Ton compte <b>' + echappe(etat.brouillon.identifiantConnexion) + '</b> est créé. '+
          'Nous venons d\'envoyer un e-mail à <b>' + echappe(etat.courrielEnvoye || "ton adresse") + '</b>.</p>'+
          '<ol class="auth-etapes"><li>Ouvre cet e-mail, de préférence sur cet appareil.</li>'+
          '<li>Clique sur « Confirmer mon adresse ».</li><li>Connecte-toi avec ton pseudo ou ton adresse e-mail.</li></ol>'+
          '<button type="button" class="btn primary auth-btn" id="sy-vers-connexion-btn">Se connecter</button>'+
          '<p class="hint" style="margin-top:14px">Rien reçu après quelques minutes ? Regarde dans tes courriers indésirables. '+
          'Le lien n\'est valable qu\'un temps limité : s\'il a expiré, recommence l\'inscription avec la même adresse.</p>';

      } else if (etat.mode === "lienEnvoye"){
        html += '<h2 class="auth-titre">Vérifie ta boîte mail</h2>'+
          '<p class="auth-sous">Si un compte correspond à <b>' + echappe(etat.brouillon.identifiantConnexion) + '</b>, '+
          'un e-mail vient d\'être envoyé à l\'adresse enregistrée, avec un lien pour choisir un nouveau mot de passe.</p>'+
          '<button type="button" class="btn primary auth-btn" id="sy-vers-connexion-btn">Retour à la connexion</button>'+
          '<p class="hint" style="margin-top:14px">Rien reçu après quelques minutes ? Regarde dans tes courriers indésirables, '+
          'puis vérifie l\'orthographe de ton pseudo ou de ton adresse.</p>';

      } else {
        html += '<h2 class="auth-titre">Se connecter</h2>'+
          '<p class="auth-sous">Retrouve ton atelier sur cet appareil.</p>'+
          bandeaux(msg)+
          '<form id="sy-form" novalidate>'+
            champ({id:"sy-c-identifiant", label:"Pseudo ou adresse e-mail", auto:"username", val:etat.brouillon.identifiantConnexion})+
            champ({id:"sy-c-mdp", label:"Mot de passe", type:"password", auto:"current-password",
                   lien:{id:"sy-vers-oubli", texte:"Mot de passe oublié ?"}})+
            '<button type="submit" class="btn primary auth-btn" id="sy-c-valider">Se connecter</button>'+
          '</form>'+
          '<p class="auth-bas">Pas encore de compte ? <a href="#" id="sy-vers-inscription">Créer un compte</a></p>';
      }
      html += '</div></div>';

    } else {
      var courriel = (etat.session.user && etat.session.user.email) || "";
      html =
        bandeaux(msg)+
        '<div class="card compte-carte"><header><h2>Profil</h2></header><div class="body">'+
          '<dl class="compte-infos">'+
            '<div><dt>Pseudo</dt><dd>' + echappe(etat.pseudo || "—") + '</dd></div>'+
            '<div><dt>Adresse e-mail</dt><dd>' + echappe(courriel || "—") + '</dd></div>'+
          '</dl>'+
          '<p class="hint" style="margin:10px 0 0">Pour changer de pseudo ou d\'adresse e-mail, écris-nous à '+
          '<a href="mailto:bonjour@crochompte.com">bonjour@crochompte.com</a>.</p>'+
        '</div></div>'+

        '<div class="card compte-carte"><header><h2>Enregistrement en ligne</h2>'+
          '<p id="sy-statut">' + echappe(texteStatut()) + '</p></header><div class="body">'+
          '<p style="margin:0">Chaque modification est enregistrée automatiquement quelques secondes plus tard, '+
          'photos comprises, et ton atelier se met à jour tout seul quand tu l\'ouvres sur un autre appareil.</p>'+
          '<div class="et-act" style="margin-top:14px">'+
            '<button type="button" class="btn" id="sy-push">Enregistrer maintenant</button>'+
            '<button type="button" class="btn" id="sy-hist">Historique des versions</button>'+
          '</div>'+
          '<div id="sy-hist-zone"></div>'+
        '</div></div>'+

        '<div class="card compte-carte"><header><h2>Mes informations</h2>'+
          '<p>Toutes facultatives. Ton prénom sert à te saluer dans nos e-mails.</p></header><div class="body">'+
          '<form id="sy-profil" novalidate>'+
          '<div class="grid2">'+
            champ({id:"sy-p-prenom", label:"Prénom", auto:"given-name", max:80, cap:"words", val:etat.brouillonProfil.prenom})+
            champ({id:"sy-p-nom", label:"Nom", auto:"family-name", max:80, cap:"words", val:etat.brouillonProfil.nom})+
            champ({id:"sy-p-ville", label:"Ville", auto:"address-level2", max:100, cap:"words", val:etat.brouillonProfil.ville})+
            champ({id:"sy-p-pays", label:"Pays", auto:"country-name", max:100, cap:"words", val:etat.brouillonProfil.pays})+
          '</div>'+
          '<label class="f" style="max-width:420px;margin-top:12px" for="sy-p-activite"><span>Mon activité</span>'+
          '<select id="sy-p-activite">'+
            '<option value=""' + (!etat.brouillonProfil.typeActivite ? ' selected' : '') + '>Non précisée</option>'+
            '<option value="amateur"' + (etat.brouillonProfil.typeActivite === "amateur" ? ' selected' : '') + '>Loisir</option>'+
            '<option value="artisanat"' + (etat.brouillonProfil.typeActivite === "artisanat" ? ' selected' : '') + '>Artisane (activité déclarée ou en cours)</option>'+
            '<option value="entreprise"' + (etat.brouillonProfil.typeActivite === "entreprise" ? ' selected' : '') + '>Petite entreprise</option>'+
          '</select></label>'+
          '<div class="et-act" style="margin-top:14px">'+
            '<button type="submit" class="btn" id="sy-p-valider">Enregistrer mes informations</button>'+
          '</div></form>'+
        '</div></div>'+

        '<div class="card compte-carte"><header><h2>Sécurité</h2></header><div class="body">'+
          '<div id="sy-secu"><div class="et-act">'+
            '<button type="button" class="btn" id="sy-mdp-ouvrir">Changer mon mot de passe</button>'+
            '<button type="button" class="btn" id="sy-out">Se déconnecter</button>'+
          '</div></div>'+
        '</div></div>'+

        '<div class="card compte-carte zone-sensible"><header><h2>Supprimer mon compte</h2>'+
          '<p>Supprime définitivement ton compte, ton atelier et tes photos, sur le serveur et sur cet appareil. '+
          'Pense à télécharger une sauvegarde avant (Réglages › Mes données).</p></header><div class="body">'+
          '<button type="button" class="btn danger" id="sy-del">Supprimer mon compte</button>'+
          '<p class="hint" style="margin-top:12px"><a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>'+
        '</div></div>';
    }
    zone.innerHTML = html;
    zone.__vue = connecte ? "compte" : "auth";

    if (etat.alerteLien && !zone.__ecouteLien){
      zone.__ecouteLien = true;
      zone.addEventListener("click", function(e){
        if (e.target && e.target.closest && e.target.closest("button")) etat.alerteLien = null;
      }, true);
    }

    var q = function(id){ return zone.querySelector(id); };
    var lien = function(id, fn){ var e = q(id); if (e) e.addEventListener("click", function(ev){ ev.preventDefault(); fn(); }); };

    /* Afficher / masquer les mots de passe */
    zone.querySelectorAll("[data-voir]").forEach(function(b){
      b.addEventListener("click", function(){
        var inp = q("#" + b.getAttribute("data-voir"));
        var voir = inp.type === "password";
        inp.type = voir ? "text" : "password";
        b.textContent = voir ? "Masquer" : "Afficher";
        b.setAttribute("aria-pressed", voir ? "true" : "false");
        inp.focus();
      });
    });
    /* Le champ en cause est signalé et reçoit le curseur. */
    if (msg.champ && q(msg.champ)){
      var fautif = q(msg.champ);
      fautif.setAttribute("aria-invalid", "true");
      fautif.addEventListener("input", function(){ fautif.removeAttribute("aria-invalid"); }, {once:true});
      fautif.focus();
    } else if (!connecte && !msg.garderFocus){
      var premier = zone.querySelector("form input:not([type=checkbox])");
      var vide = [].slice.call(zone.querySelectorAll("form input:not([type=checkbox])")).filter(function(x){ return !x.value; })[0];
      if (window.matchMedia && window.matchMedia("(min-width:861px)").matches && (vide || premier)) (vide || premier).focus();
    }
    var form = q("#sy-form");
    var soumettre = function(fn){ if (form) form.addEventListener("submit", function(e){ e.preventDefault(); fn.call(form.querySelector("button[type=submit]")); }); };
    function occupe(b, texte){ b.disabled = true; b.setAttribute("data-texte", b.textContent); b.textContent = texte; }

    if (etat.session && etat.recuperation){
      soumettre(function(){
        var p1 = q("#sy-np1").value || "", p2 = q("#sy-np2").value || "";
        if (p1.length < 8){ peindre({erreur:"Le mot de passe doit contenir au moins 8 caractères.", champ:"#sy-np1"}); return; }
        if (p1 !== p2){ peindre({erreur:"Les deux mots de passe ne sont pas identiques.", champ:"#sy-np2"}); return; }
        occupe(this, "Enregistrement…");
        sb.auth.updateUser({password: p1}).then(function(r){
          if (r.error){ peindre({erreur: traduire(r.error.message), champ:"#sy-np1"}); return; }
          etat.recuperation = false;
          pont.toast("Mot de passe modifié. Tu es connectée.");
          demarrerSession(etat.session, false);
        });
      });

    } else if (!connecte){

      function versMode(m){
        etat.mode = m;
        try{ history.pushState({crochompteAuth:m}, ""); }catch(e){}
        peindre();
      }
      lien("#sy-vers-connexion", function(){ versMode("connexion"); });
      lien("#sy-vers-inscription", function(){ versMode("inscription"); });
      lien("#sy-vers-oubli", function(){
        var id = q("#sy-c-identifiant"); if (id) etat.brouillon.identifiantOubli = id.value.trim();
        versMode("oubli");
      });
      var bCx = q("#sy-vers-connexion-btn");
      if (bCx) bCx.addEventListener("click", function(){ versMode("connexion"); });

      if (etat.mode === "inscription"){
        var elPseudo = q("#sy-i-pseudo");
        var elPseudoEtat = q("#sy-i-pseudo-etat");
        elPseudo.addEventListener("input", function(){
          var val = elPseudo.value.trim();
          etat.brouillon.pseudo = val;
          if (etat.minuteurPseudo) clearTimeout(etat.minuteurPseudo);
          elPseudoEtat.className = "hint auth-etat";
          if (!val){ elPseudoEtat.textContent = ""; return; }
          if (!RE_PSEUDO.test(val)){
            elPseudoEtat.textContent = val.length < 3 ? "" : "Caractère non autorisé : lettres, chiffres, - ou _ uniquement.";
            return;
          }
          elPseudoEtat.textContent = "Vérification…";
          etat.minuteurPseudo = setTimeout(function(){
            sb.rpc("pseudo_disponible", {p: val}).then(function(r){
              if (elPseudo.value.trim() !== val) return;
              if (r.error){ elPseudoEtat.textContent = ""; return; }
              elPseudoEtat.textContent = r.data ? "Ce pseudo est disponible." : "Ce pseudo est déjà pris. Essaie une variante.";
              elPseudoEtat.className = "hint auth-etat " + (r.data ? "ok" : "ko");
            }).catch(function(){ elPseudoEtat.textContent = ""; });
          }, 450);
        });
        q("#sy-i-mail").addEventListener("input", function(){ etat.brouillon.email = this.value.trim(); });
        q("#sy-i-age").addEventListener("change", function(){ etat.brouillon.age15 = this.checked; });

        soumettre(function(){
          var pseudo = (q("#sy-i-pseudo").value || "").trim();
          var age15  = !!q("#sy-i-age").checked;
          var mail   = (q("#sy-i-mail").value || "").trim();
          var p1 = q("#sy-i-mdp1").value || "", p2 = q("#sy-i-mdp2").value || "";
          etat.brouillon.pseudo = pseudo; etat.brouillon.age15 = age15; etat.brouillon.email = mail;

          if (!RE_PSEUDO.test(pseudo)){
            peindre({erreur:"Ce pseudo n'est pas valide.", detail:"Utilise 3 à 24 caractères : lettres, chiffres, tiret ou tiret bas, sans espace ni accent.", champ:"#sy-i-pseudo"});
            return;
          }
          if (!RE_COURRIEL.test(mail)){
            peindre({erreur:"Cette adresse e-mail n'est pas valide.", detail:"Vérifie qu'elle est complète, par exemple prenom@domaine.fr.", champ:"#sy-i-mail"});
            return;
          }
          if (p1.length < 8){ peindre({erreur:"Le mot de passe doit contenir au moins 8 caractères.", champ:"#sy-i-mdp1"}); return; }
          if (p1 !== p2){ peindre({erreur:"Les deux mots de passe ne sont pas identiques.", champ:"#sy-i-mdp2"}); return; }
          if (!age15){
            peindre({erreur:"Coche la case « J'ai " + AGE_MINIMUM + " ans ou plus » pour continuer.",
                     detail:"Crochompte est réservé aux personnes de " + AGE_MINIMUM + " ans et plus.", champ:"#sy-i-age"});
            return;
          }
          occupe(this, "Création du compte…");
          appelFonction("inscription", {
            pseudo: pseudo, email: mail, motDePasse: p1, emailRedirectTo: urlPage(),
            age15: true
          }).then(function(r){
            if (!r._ok){
              var champFautif = /pseudo/i.test(r.erreur || "") ? "#sy-i-pseudo" : /adresse|compte/i.test(r.erreur || "") ? "#sy-i-mail" : null;
              peindre({erreur: traduire(r.erreur) || "La création du compte n'a pas abouti. Réessaie dans un instant.", champ: champFautif});
              return;
            }
            etat.courrielEnvoye = mail;
            etat.brouillon = Object.assign(brouillonInscriptionVide(), {identifiantOubli:"", identifiantConnexion: pseudo});
            etat.mode = "verifier";
            peindre();
          });
        });

      } else if (etat.mode === "oubli"){
        soumettre(function(){
          var identifiant = (q("#sy-o-identifiant").value || "").trim();
          etat.brouillon.identifiantOubli = identifiant;
          if (!identifiant){ peindre({erreur:"Indique ton pseudo ou ton adresse e-mail.", champ:"#sy-o-identifiant"}); return; }
          occupe(this, "Envoi…");
          appelFonction("mot-de-passe-oublie", {identifiant: identifiant, redirectTo: urlPage()})
            .then(function(r){
              if (r._reseau){ peindre({erreur: r.erreur}); return; }
              etat.brouillon.identifiantConnexion = identifiant; etat.brouillon.identifiantOubli = "";
              etat.mode = "lienEnvoye";
              peindre();
            });
        });

      } else if (etat.mode === "connexion"){
        q("#sy-c-identifiant").addEventListener("input", function(){ etat.brouillon.identifiantConnexion = this.value.trim(); });
        soumettre(function(){
          var identifiant = (q("#sy-c-identifiant").value || "").trim();
          var mdp = q("#sy-c-mdp").value || "";
          etat.brouillon.identifiantConnexion = identifiant;
          if (!identifiant){ peindre({erreur:"Indique ton pseudo ou ton adresse e-mail.", champ:"#sy-c-identifiant"}); return; }
          if (!mdp){ peindre({erreur:"Indique ton mot de passe.", champ:"#sy-c-mdp"}); return; }
          occupe(this, "Connexion…");
          appelFonction("connexion", {identifiant: identifiant, motDePasse: mdp})
            .then(function(r){
              if (!r._ok || !r.access_token){
                peindre({erreur: r.erreur ? traduire(r.erreur) : "Pseudo, adresse e-mail ou mot de passe incorrect.", champ:"#sy-c-mdp"});
                return;
              }
              etat.brouillon.identifiantConnexion = "";
              /* setSession() déclenche onAuthStateChange (SIGNED_IN), qui
                 s'occupe du reste : profil, mise à jour, message d'accueil. */
              etat.connexionManuelle = true;
              sb.auth.setSession({access_token: r.access_token, refresh_token: r.refresh_token}).then(function(rs){
                if (rs && rs.error){ etat.connexionManuelle = false; peindre({erreur: traduire(rs.error.message)}); }
              }, function(e){ etat.connexionManuelle = false; peindre({erreur: traduire(e && e.message)}); });
            });
        });
      }

    } else {
      q("#sy-push").addEventListener("click", function(){
        var b = this; occupe(b, "Enregistrement…");
        etat.generation++; etat.sale = true; marquerAEnvoyer(true);
        envoyer().then(function(ok){
          return envoyerToutesPhotos().then(function(bilan){
            if (ok && !bilan.echecs) pont.toast("Atelier et photos enregistrés en ligne");
            else pont.toast("L'enregistrement n'a pas abouti. Vérifie ta connexion internet : un nouvel essai aura lieu automatiquement.");
            peindre({complet:true, garderFocus:true});
          });
        });
      });
      q("#sy-hist").addEventListener("click", function(){
        var z = q("#sy-hist-zone");
        if (z.getAttribute("data-ouvert") === "1"){
          z.innerHTML = ""; z.setAttribute("data-ouvert","0"); this.textContent = "Historique des versions"; return;
        }
        this.textContent = "Masquer l'historique";
        z.setAttribute("data-ouvert","1");
        z.innerHTML = '<p class="hint" style="margin-top:12px">Chargement de l\'historique…</p>';
        sb.from("ateliers_versions")
          .select("id, maj, appareil, raison, cree")
          .eq("user_id", etat.session.user.id)
          .order("cree", {ascending:false})
          .limit(20)
          .then(function(r){
            if (r.error){
              z.innerHTML = '<p class="hint" style="margin-top:12px">L\'historique n\'a pas pu être chargé. ' + echappe(traduire(r.error.message)) + '</p>';
              return;
            }
            var l = r.data || [];
            if (!l.length){
              z.innerHTML = '<p class="hint" style="margin-top:12px">Aucune version enregistrée pour l\'instant. '+
                'Une version est conservée chaque fois qu\'un autre appareil remplace ton atelier en ligne.</p>';
              return;
            }
            var h = '<div class="compte-hist">'+
              '<p class="hint" style="margin:0 0 10px">Restaurer une version remplace ton atelier actuel ; '+
              'celui-ci est d\'abord conservé ici, tu pourras donc y revenir.</p>';
            l.forEach(function(v){
              h += '<div class="compte-hist-ligne"><span>'+ echappe(dateLisible(v.cree)) +
                (v.appareil ? ' · depuis ton ' + echappe(v.appareil) : '') +
                (v.raison === "avant_recuperation" ? ' · avant une mise à jour' : '') + '</span>'+
                '<button type="button" class="btn sm" data-restaurer="'+ v.id +'" data-quand="' + echappe(dateLisible(v.cree)) + '">Restaurer</button>'+
                '</div>';
            });
            z.innerHTML = h + '</div>';
            z.querySelectorAll("[data-restaurer]").forEach(function(b){
              b.addEventListener("click", function(){
                pont.confirmer({
                  titre: "Restaurer la version du " + b.getAttribute("data-quand") + " ?",
                  texte: "Ton atelier actuel sera remplacé par cette version, sur tous tes appareils. Il est d'abord conservé dans l'historique : tu pourras y revenir.",
                  bouton: "Restaurer cette version"
                }, function(){
                  occupe(b, "Restauration…");
                  sb.from("ateliers_versions").select("donnees")
                    .eq("id", Number(b.getAttribute("data-restaurer"))).maybeSingle()
                    .then(function(rr){
                      if (rr.error || !rr.data) { pont.toast("Cette version est introuvable."); return; }
                      return archiver(pont.lire(), etat.vuLe || new Date().toISOString(), "avant_recuperation").then(function(){
                        pont.ecrire(rr.data.donnees);
                        etat.generation++; etat.sale = true; marquerAEnvoyer(true);
                        return envoyer();
                      }).then(function(ok){
                        pont.toast(ok ? "Version restaurée" : "Version restaurée sur cet appareil. L'envoi en ligne sera retenté automatiquement.");
                        pont.redessiner();
                      }, function(e){
                        b.disabled = false; b.textContent = "Restaurer";
                        pont.toast("La restauration n'a pas abouti : " + traduire(e && e.message));
                      });
                    });
                });
              });
            });
          });
      });
      q("#sy-profil").addEventListener("submit", function(e){
        e.preventDefault();
        var prenom    = (q("#sy-p-prenom").value || "").trim();
        var nom       = (q("#sy-p-nom").value || "").trim();
        var ville     = (q("#sy-p-ville").value || "").trim();
        var pays      = (q("#sy-p-pays").value || "").trim();
        var activite  = q("#sy-p-activite").value || "";
        etat.brouillonProfil = {prenom: prenom, nom: nom, dateNaissance: "", ville: ville, pays: pays, typeActivite: activite};
        occupe(q("#sy-p-valider"), "Enregistrement…");
        sb.rpc("modifier_mon_profil", {
          p_prenom: prenom, p_nom: nom, p_date_naissance: null,   /* plus conservée : la case « 15 ans » suffit */
          p_ville: ville, p_pays: pays, p_type_activite: activite || null
        }).then(function(r){
          if (r.error){ peindre({erreur: traduire(r.error.message)}); return; }
          pont.toast("Informations enregistrées");
          peindre({complet:true, garderFocus:true});
        });
      });

      /* Changer de mot de passe sans passer par « mot de passe oublié ». */
      q("#sy-mdp-ouvrir").addEventListener("click", function(){
        var z = q("#sy-secu");
        z.innerHTML = '<form id="sy-mdp-form" novalidate>'+
          champ({id:"sy-m1", label:"Nouveau mot de passe", type:"password", auto:"new-password", aide:"8 caractères minimum."})+
          champ({id:"sy-m2", label:"Confirmer le mot de passe", type:"password", auto:"new-password"})+
          '<p class="hint auth-etat ko" id="sy-m-err" role="alert"></p>'+
          '<div class="et-act"><button type="submit" class="btn primary">Enregistrer le mot de passe</button>'+
          '<button type="button" class="btn" id="sy-m-annuler">Annuler</button></div></form>';
        z.querySelectorAll("[data-voir]").forEach(function(b){
          b.addEventListener("click", function(){
            var inp = z.querySelector("#" + b.getAttribute("data-voir"));
            var voir = inp.type === "password";
            inp.type = voir ? "text" : "password"; b.textContent = voir ? "Masquer" : "Afficher";
          });
        });
        z.querySelector("#sy-m1").focus();
        z.querySelector("#sy-m-annuler").addEventListener("click", function(){ peindre({complet:true, garderFocus:true}); });
        z.querySelector("#sy-mdp-form").addEventListener("submit", function(e){
          e.preventDefault();
          var p1 = z.querySelector("#sy-m1").value || "", p2 = z.querySelector("#sy-m2").value || "";
          var err = z.querySelector("#sy-m-err");
          if (p1.length < 8){ err.textContent = "Le mot de passe doit contenir au moins 8 caractères."; z.querySelector("#sy-m1").focus(); return; }
          if (p1 !== p2){ err.textContent = "Les deux mots de passe ne sont pas identiques."; z.querySelector("#sy-m2").focus(); return; }
          var b = z.querySelector("button[type=submit]"); occupe(b, "Enregistrement…");
          sb.auth.updateUser({password: p1}).then(function(r){
            if (r.error){ err.textContent = traduire(r.error.message); b.disabled = false; b.textContent = "Enregistrer le mot de passe"; return; }
            pont.toast("Mot de passe modifié");
            peindre({complet:true, garderFocus:true});
          });
        });
      });

      q("#sy-del").addEventListener("click", function(){
        var b = this;
        var pseudo = etat.pseudo || "";
        pont.confirmer({
          titre: "Supprimer définitivement ton compte ?",
          texte: "Cette action est irréversible. Seront supprimés, sur le serveur et sur cet appareil :",
          details: ["ton compte " + (pseudo ? "« " + pseudo + " » " : "") + "et ton adresse e-mail",
                    "ton atelier : créations, pièces, commandes, patrons, matières et réglages",
                    "tes photos et l'historique des versions"],
          saisie: pseudo || "SUPPRIMER",
          bouton: "Supprimer mon compte", danger: true
        }, function(){
          occupe(b, "Suppression…");
          effacerToutLeCompte(function(etape){ b.textContent = etape; }).then(function(r){
            if (!r.ok){ b.disabled = false; b.textContent = "Supprimer mon compte";
              peindre({erreur: "La suppression n'a pas abouti. " + traduire(r.message)}); return; }
            if (pont.oublierAtelier) pont.oublierAtelier();
            etat.mode = "connexion";
            pont.toast(r.identite
              ? "Ton compte et toutes tes données ont été supprimés."
              : "Ton atelier et tes photos ont été supprimés. Pour finaliser la suppression de ton compte, écris-nous à bonjour@crochompte.com.");
            peindre();
          });
        });
      });

      q("#sy-out").addEventListener("click", deconnecter);
    }
  }

  /* Le bouton « précédent » dans les écrans de connexion : de « Créer un
     compte » ou « Mot de passe oublié », il ramène à la connexion. */
  window.addEventListener("popstate", function(ev){
    if (etat.session && !etat.recuperation) return;
    var m = ev.state && ev.state.crochompteAuth;
    etat.mode = m || "connexion";
    peindre({garderFocus:true});
  });

  /* ───────── démarrage ───────── */

  pont.surZoneCompte(function(zone){
    zone.setAttribute("data-sync", "on");   /* le repli hors ligne s'efface */
    etat.zone = zone; peindre();
  });

  /* On expose le signal d'enregistrement pour que l'application prévienne
     ce module à chaque sauvegarde. */
  /* Photo remise depuis une sauvegarde : elle repart en ligne, même si une
     photo du même nom y a déjà été envoyée autrefois. */
  function photoRestauree(id){
    if (!etat.session || !id) return;
    var deja = photosEnvoyees(); delete deja[id]; noterPhotos(deja);
    planifierPhotos();
  }
  /* Numéro de facture donné par le serveur : unique entre tous les comptes
     (code propre au compte) et sans doublon entre deux appareils du même
     compte (schema-factures.sql). min = dernier numéro déjà émis ici. */
  function numeroFacture(annee, min){
    if (!etat.session) return Promise.resolve({erreur:"connexion"});
    if (typeof navigator !== "undefined" && navigator.onLine === false) return Promise.resolve({erreur:"reseau"});
    return sb.rpc("prochain_numero_facture", {p_annee: annee, p_min: min || 0}).then(function(r){
      if (r.error || typeof r.data !== "string") return {erreur: (r.error && r.error.message) || "serveur"};
      return {numero: r.data};
    }, function(){ return {erreur:"reseau"}; });
  }
  window.CrochompteSync = {signaler: signaler, deconnecter: deconnecter, photoEffacee: photoEffacee,
                           photoRestauree: photoRestauree, numeroFacture: numeroFacture,
                           connecte: function(){ return !!etat.session; },
                           /* Pour l'Accueil : un enregistrement qui échoue doit se voir. */
                           etatEnvoi: function(){ return {connecte: !!etat.session, enAttente: !!etat.sale,
                                                           erreur: etat.derniereErreur || null, dernier: etat.vuLe || null}; },
                           reessayer: function(){ etat.derniereErreur = null; return synchroniser(); }};

  /* À l'ouverture et à la connexion : ramener les photos faites sur un autre
     appareil, puis envoyer celles d'ici qui ne sont pas encore en ligne. */
  function photosAuDemarrage(){
    return recevoirPhotos().then(function(n){ if (n) pont.redessiner(); return envoyerPhotos(); });
  }

  /* Ouverture d'une session, quelle qu'en soit l'origine (session gardée
     d'une visite précédente, formulaire de connexion, nouveau mot de passe) :
     une seule fois par compte, dans cet ordre. */
  var sessionDemarree = null;
  function demarrerSession(session, annoncer){
    if (!session || etat.recuperation) return;
    etat.session = session;
    var uid = session.user.id;
    if (sessionDemarree === uid){ peindre({garderFocus:true}); return; }
    sessionDemarree = uid;
    if (pont.ouvrirCompte) pont.ouvrirCompte(uid);
    etat.pret = false;
    etat.vuLe = lireBase(uid);
    /* Du travail fait hors ligne attend peut-être depuis la dernière fois. */
    etat.sale = resteAEnvoyer(uid);
    if (etat.sale) marquerAEnvoyer(true);   /* on y inscrit le compte */
    recupererProfil().then(function(){
      peindre();
      return synchroniser();
    }).then(function(ok){
      if (annoncer) pont.toast(ok ? "Tu es connectée. Ton atelier est à jour."
        : "Tu es connectée. La mise à jour de ton atelier n'a pas abouti : nouvel essai automatique dans un instant.");
      peindre({garderFocus:true});
      traiterSuppressions();
      photosAuDemarrage();
    });
  }

  sb.auth.getSession().then(function(r){
    var session = (r.data && r.data.session) || null;
    if (!session && r.error && (!navigator.onLine || /fetch|network|retry/i.test(String(r.error.name || "") + String(r.error.message || "")))){
      /* Pas de réseau pour renouveler la connexion : on ouvre l'atelier en mode
         hors ligne plutôt que l'écran de connexion (au marché, par exemple). */
      if (pont.moduleIndisponible) pont.moduleIndisponible();
      return;
    }
    if (session) demarrerSession(session, false);
    else peindre();
  }, function(){
    if (pont.moduleIndisponible) pont.moduleIndisponible();
  });

  /* ─────────────────────────────────────────────────────────────────────
     Bibliothèque de patrons partagés
     Tout passe par la table patrons_publics et ses règles : cette
     application n'a aucun privilège particulier. Elle ne peut publier que
     sous son propre compte, et ne modifier que ses propres lignes — non
     parce que le code s'en abstient, mais parce que le serveur refuse.
     Voir schema-patrons-publics.sql.
     ───────────────────────────────────────────────────────────────────── */
  var BIBLIO = {
    disponible: function(){ return !!etat.session; },
    /* Les patrons visibles par toutes, les plus récents d'abord. */
    lister: function(recherche){
      var q = sb.from("patrons_publics")
        .select("id,titre,auteur_affiche,famille,niveau,materiel,texte,notes,licence,cree,user_id")
        .eq("retire", false)
        .order("cree", {ascending:false})
        .limit(200);
      return q.then(function(r){
        if (r.error) return {erreur: r.error.message, liste: []};
        var l = r.data || [];
        if (recherche){
          var s = String(recherche).toLowerCase();
          l = l.filter(function(p){
            return (p.titre + " " + p.auteur_affiche + " " + (p.materiel||"")).toLowerCase().indexOf(s) !== -1;
          });
        }
        return {liste: l, moi: etat.session ? etat.session.user.id : null};
      });
    },
    /* Publier : la déclaration de droits est exigée ici ET par la base.
       Le texte seul part ; les pages scannées ne quittent jamais l'appareil. */
    publier: function(p){
      if (!etat.session) return Promise.resolve({erreur:"Connecte-toi d'abord."});
      if (!p.droits) return Promise.resolve({erreur:"La déclaration de droits est obligatoire."});
      return sb.from("patrons_publics").insert({
        user_id: etat.session.user.id,
        titre: String(p.titre||"").trim(),
        auteur_affiche: String(p.auteur||etat.pseudo||"").trim(),
        famille: p.famille || null,
        niveau: p.niveau || null,
        materiel: String(p.materiel||"").trim() || null,
        texte: String(p.texte||"").trim(),
        notes: String(p.notes||"").trim() || null,
        licence: p.licence || "CC BY-NC-SA 4.0",
        droits_declares: true
      }).select("id").then(function(r){
        if (r.error) return {erreur: messagePublication(r.error.message)};
        return {ok:true, id: r.data && r.data[0] && r.data[0].id};
      });
    },
    /* Retirer un patron qu'on a publié. La règle de la base fait le reste :
       une tentative sur la ligne d'une autre ne supprime simplement rien. */
    retirer: function(id){
      return sb.from("patrons_publics").delete().eq("id", id).then(function(r){
        return r.error ? {erreur:r.error.message} : {ok:true};
      });
    },
    signaler: function(id){
      return sb.rpc("signaler_patron", {p_id:id}).then(function(r){
        return r.error ? {erreur:r.error.message} : {ok:true};
      });
    }
  };
  /* Les messages du serveur sont techniques ; ceux-ci disent quoi corriger. */
  function messagePublication(brut){
    var m = String(brut||"");
    if (m.indexOf("patrons_publics_contenu") !== -1)
      return "Il manque quelque chose : un titre de 2 à 120 caractères, "+
             "un nom d'autrice, et un patron d'au moins 80 caractères.";
    if (m.indexOf("patrons_publics_droits") !== -1)
      return "La déclaration de droits est obligatoire.";
    if (m.indexOf("patrons_publics_licence") !== -1)
      return "Choisis une des licences proposées.";
    if (m.indexOf("relation") !== -1 && m.indexOf("does not exist") !== -1)
      return "La bibliothèque partagée n'est pas encore installée sur le serveur "+
             "(schema-patrons-publics.sql à exécuter dans Supabase).";
    return m;
  }
  if (pont.definirBibliotheque) pont.definirBibliotheque(BIBLIO);

  sb.auth.onAuthStateChange(function(ev, session){
    if (ev === "PASSWORD_RECOVERY"){
      /* La personne vient de cliquer sur un lien « mot de passe oublié ».
         Supabase a ouvert une session temporaire, juste le temps qu'elle
         choisisse un nouveau mot de passe — pas pour la faire entrer
         directement dans son atelier sans qu'elle l'ait demandé. */
      etat.session = session || null;
      etat.recuperation = true;
      peindre();
      return;
    }
    if (session){
      if (etat.recuperation){ etat.session = session; return; }
      var annoncer = !!etat.connexionManuelle;
      etat.connexionManuelle = false;
      demarrerSession(session, annoncer);
    } else if (etat.session || sessionDemarree){
      /* Session terminée (expirée, révoquée, déconnexion) : plus rien ne part. */
      finDeSession();
      etat.session = null;
      etat.pseudo = null;
      etat.brouillonProfil = brouillonProfilVide();
      peindre();
    }
  });

})();
