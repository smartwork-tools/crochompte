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
     • un minimum d'identité (prénom, nom, date de naissance, ville, pays,
       type d'activité) demandé à l'inscription et modifiable ensuite ;
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
    return {pseudo:"", prenom:"", nom:"", dateNaissance:"", ville:"", pays:"", typeActivite:"", email:""};
  };
  var brouillonProfilVide = function(){
    return {prenom:"", nom:"", dateNaissance:"", ville:"", pays:"", typeActivite:""};
  };

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
    enCours: false,
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

  /* ───────── synchronisation de l'état ───────── */

  /* Un nom d'appareil lisible, pour que l'historique dise « ton téléphone »
     plutôt qu'une suite de chiffres. Rien d'identifiant n'est envoyé. */
  function nomAppareil(){
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "tablette";
    if (/Mobi|Android|iPhone/i.test(ua)) return "téléphone";
    return "ordinateur";
  }

  /* Archive l'état actuellement EN LIGNE avant de le remplacer.
     C'est la pièce maîtresse : tant que cet appel existe, aucune écriture
     ne peut faire disparaître définitivement le travail d'un autre appareil. */
  function archiver(donnees, maj, raison){
    if (!etat.session || !donnees) return Promise.resolve();
    return sb.from("ateliers_versions").insert({
      user_id: etat.session.user.id,
      donnees: donnees, maj: maj || new Date().toISOString(),
      appareil: nomAppareil(), raison: raison || "remplacee"
    }).then(function(){
      return sb.rpc("purger_versions");
    }).catch(function(){ /* l'archivage ne doit jamais bloquer un envoi */ });
  }

  /* ENVOYER — ne refuse jamais.
     Avant cette version, un conflit bloquait l'enregistrement : l'appareil
     ne pouvait plus rien sauvegarder, et le seul bouton proposé écrasait son
     travail. Désormais : si la version en ligne est plus récente que ce que
     cet appareil avait lu, on l'archive d'abord, puis on écrit. Le dernier
     envoi gagne — ce que tout le monde attend — et l'écrasé reste récupérable
     dans l'historique. */
  function envoyer(){
    if (!etat.session || etat.enCours) return Promise.resolve();
    etat.enCours = true;
    var corps = pont.lire();
    return sb.from(TABLE)
      .select("donnees, maj")
      .eq("user_id", etat.session.user.id)
      .maybeSingle()
      .then(function(r){
        var ecrase = !!(r.data && etat.vuLe && r.data.maj > etat.vuLe);
        var avant = ecrase ? archiver(r.data.donnees, r.data.maj, "remplacee")
                           : Promise.resolve();
        return avant.then(function(){
          var maj = new Date().toISOString();
          return sb.from(TABLE).upsert({
            user_id: etat.session.user.id,
            donnees: corps,
            maj: maj
          }, {onConflict: "user_id"}).then(function(res){
            etat.enCours = false;
            if (res.error) { peindre({erreur: res.error.message}); return; }
            etat.vuLe = maj;
            etat.sale = false;
            etat.versionsSues = null;
            peindre(ecrase ? {archive: r.data.maj} : undefined);
          });
        });
      })
      .catch(function(e){
        etat.enCours = false;
        peindre({erreur: String(e && e.message || e)});
      });
  }

  function recevoir(archiverLocal){
    if (!etat.session) return Promise.resolve(false);
    return sb.from(TABLE)
      .select("donnees, maj")
      .eq("user_id", etat.session.user.id)
      .maybeSingle()
      .then(function(r){
        if (r.error || !r.data) return false;
        /* Récupérer remplace ce qui est dans ce navigateur : on en garde
           une copie avant, pour que ce geste soit lui aussi réversible. */
        var avant = archiverLocal
          ? archiver(pont.lire(), etat.vuLe || new Date().toISOString(), "avant_recuperation")
          : Promise.resolve();
        return avant.then(function(){
          etat.vuLe = r.data.maj;
          etat.sale = false;
          return pont.ecrire(r.data.donnees);
        });
      })
      .catch(function(){ return false; });
  }

  /* SYNCHRONISER — ce qui se passe à l'ouverture et au retour sur l'onglet.
     L'artisane ne doit pas avoir à se demander si elle est à jour, ni à
     cliquer sur un bouton dont elle ne peut pas deviner l'effet.
       • du travail local pas encore envoyé  → on l'envoie ;
       • sinon, une version plus récente en ligne → on la récupère.
     Dans les deux cas, ce qui est remplacé est archivé avant. */
  function synchroniser(){
    if (!etat.session || etat.enCours) return Promise.resolve();
    if (etat.sale) return envoyer();
    return sb.from(TABLE)
      .select("maj")
      .eq("user_id", etat.session.user.id)
      .maybeSingle()
      .then(function(r){
        if (r.error || !r.data) return false;
        if (etat.vuLe && r.data.maj <= etat.vuLe) return false;
        return recevoir(true).then(function(ok){
          if (ok) pont.toast("Atelier mis à jour depuis ton autre appareil.");
          return ok;
        });
      })
      .catch(function(){ return false; });
  }

  /* L'application appelle ceci à chaque enregistrement. On regroupe :
     personne n'a besoin d'un aller-retour réseau par frappe au clavier. */
  function signaler(){
    if (!etat.session) return;
    etat.sale = true;
    if (etat.minuteur) clearTimeout(etat.minuteur);
    etat.minuteur = setTimeout(envoyer, 2500);
  }

  /* Un dernier envoi quand on quitte la page. Sur mobile, « pagehide » n'est
     pas toujours déclenché — l'onglet peut être gelé puis tué en silence —,
     alors on écoute aussi le passage en arrière-plan, qui l'est, lui. */
  function envoiDeSortie(){
    if (!etat.session || !etat.sale) return;
    if (etat.minuteur) clearTimeout(etat.minuteur);
    envoyer();
  }
  window.addEventListener("pagehide", envoiDeSortie);
  document.addEventListener("visibilitychange", function(){
    if (document.visibilityState === "hidden") envoiDeSortie();
    else synchroniser();   /* de retour sur l'onglet : on se remet à jour */
  });

  /* ───────── photos ───────── */

  function envoyerPhotos(journal){
    if (!etat.session) return Promise.resolve();
    var ids = pont.photo.lister();
    var uid = etat.session.user.id;
    var faites = 0;
    return ids.reduce(function(chaine, id){
      return chaine.then(function(){
        return pont.photo.lire(id).then(function(url){
          if (!url) return;
          return fetch(url).then(function(r){ return r.blob(); }).then(function(blob){
            return sb.storage.from(BUCKET)
              .upload(uid + "/" + id + ".jpg", blob, {upsert:true, contentType:"image/jpeg"})
              .then(function(){ faites++; if (journal) journal(faites, ids.length); });
          });
        }).catch(function(){});
      });
    }, Promise.resolve()).then(function(){ return faites; });
  }

  function recevoirPhotos(journal){
    if (!etat.session) return Promise.resolve(0);
    var uid = etat.session.user.id;
    return sb.storage.from(BUCKET).list(uid, {limit: 1000}).then(function(r){
      if (r.error || !r.data) return 0;
      var faites = 0;
      return r.data.reduce(function(chaine, f){
        return chaine.then(function(){
          var id = f.name.replace(/\.jpg$/, "");
          return pont.photo.lire(id).then(function(dejaLa){
            if (dejaLa) return;   /* déjà dans ce navigateur */
            return sb.storage.from(BUCKET).download(uid + "/" + f.name).then(function(d){
              if (d.error || !d.data) return;
              return pont.photo.ecrire(id, d.data).then(function(){
                faites++; if (journal) journal(faites, r.data.length);
              });
            });
          }).catch(function(){});
        });
      }, Promise.resolve()).then(function(){ return faites; });
    }).catch(function(){ return 0; });
  }

  /* ───────── effacement du compte (RGPD, droit à l'effacement) ─────────
     Trois temps, dans cet ordre : les photos, puis l'atelier, puis l'identité
     de connexion. Les deux premiers, le navigateur peut les faire lui-même —
     les règles de la base l'y autorisent pour ses propres lignes. Le
     troisième demande un droit d'administration, donc une fonction serveur
     (voir edge/supprimer-compte). Si elle n'est pas déployée, on le dit au
     lieu de faire croire que tout est parti. */

  function effacerToutLeCompte(journal){
    if (!etat.session) return Promise.resolve({ok:false});
    var uid = etat.session.user.id;

    return sb.storage.from(BUCKET).list(uid, {limit: 1000})
      .then(function(r){
        var noms = (r.data || []).map(function(f){ return uid + "/" + f.name; });
        if (journal) journal("Effacement des photos…");
        return noms.length ? sb.storage.from(BUCKET).remove(noms) : null;
      })
      .then(function(){
        if (journal) journal("Effacement de l'atelier…");
        return sb.from(TABLE).delete().eq("user_id", uid);
      })
      .then(function(res){
        if (res && res.error) throw new Error(res.error.message);
        if (journal) journal("Effacement du compte…");
        /* La fonction serveur, si elle est déployée. Elle efface aussi la
           ligne « pseudos » (contrainte on delete cascade). */
        return sb.functions.invoke("supprimer-compte")
          .then(function(f){ return {ok:true, identite: !f.error}; })
          .catch(function(){ return {ok:true, identite:false}; });
      })
      .then(function(bilan){
        return sb.auth.signOut().then(function(){
          etat.session = null; etat.vuLe = null; etat.pseudo = null;
          etat.brouillonProfil = brouillonProfilVide();
          return bilan;
        });
      })
      .catch(function(e){
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
    dernierEtatAnnonce = {exige: true, connecte: connecte};
    pont.definirEtatConnexion(dernierEtatAnnonce);
  }

  function peindre(msg){
    declarerEtat();
    var zone = etat.zone;
    if (!zone) return;
    msg = msg || {};
    var connecte = !!etat.session && !etat.recuperation;

    var html = '<div class="card"><header><h2>Compte et synchronisation</h2>'+
      '<p>' + (connecte
        ? 'Tes données sont enregistrées en ligne et te suivent d\'un appareil à l\'autre.'
        : 'Sans compte, tout reste dans ce navigateur. Avec un compte, tu retrouves ton '+
          'atelier sur ton téléphone comme sur ton ordinateur.') +
      '</p></header><div class="body">';

    /* Plus de message de conflit : il bloquait l'enregistrement et proposait
       un choix que personne ne pouvait faire en connaissance de cause. On
       informe après coup, et on dit où retrouver ce qui a été remplacé. */
    if (msg.archive){
      html += '<div class="banner">'+
        '<p><b>Ton autre appareil avait enregistré du travail de son côté</b>, le '+
        echappe(dateLisible(msg.archive)) + '. C\'est ta version d\'ici qui est '+
        'maintenant en ligne, et celle de l\'autre appareil a été rangée dans '+
        'l\'historique juste en dessous — rien n\'est perdu.</p></div>';
    }
    if (msg.erreur){
      html += '<div class="banner" style="background:var(--bad-soft);border-color:var(--bad)">'+
        '<p><b>' + echappe(msg.erreur) + '</b>'+
        (msg.pasPerdu === false ? '' : '<br>Tes données restent intactes dans ce navigateur.') +
        '</p></div>';
    }
    if (msg.info){
      html += '<div class="banner"><p>' + echappe(msg.info) + '</p></div>';
    }

    if (etat.session && etat.recuperation){
      /* On revient d'un lien « mot de passe oublié » : Supabase a déjà ouvert
         une session temporaire, le temps de choisir un nouveau mot de passe. */
      html += '<p style="margin:0 0 10px">Choisis un nouveau mot de passe pour ton compte.</p>'+
        '<label class="f" style="max-width:420px"><span>Nouveau mot de passe</span>'+
        '<input type="password" id="sy-np1" autocomplete="new-password"></label>'+
        '<label class="f" style="max-width:420px;margin-top:10px"><span>Confirme-le</span>'+
        '<input type="password" id="sy-np2" autocomplete="new-password"></label>'+
        '<div class="et-act" style="margin-top:12px">'+
          '<button type="button" class="btn primary" id="sy-np-valider">Enregistrer ce mot de passe</button>'+
        '</div>'+
        '<p class="hint">Au moins 8 caractères.</p>';

    } else if (!connecte){

      if (etat.mode === "inscription"){
        html += '<label class="f" style="max-width:420px"><span>Ton pseudo</span>'+
          '<input type="text" id="sy-i-pseudo" autocomplete="username" maxlength="24" placeholder="ex. LaineEtCie" '+
          'value="' + echappe(etat.brouillon.pseudo) + '"></label>'+
          '<p class="hint" style="margin:4px 0 0">3 à 24 caractères : lettres, chiffres, tiret ou tiret bas, '+
          'sans accent ni espace. C\'est ce que tu pourras retaper pour te reconnecter (ou ton adresse '+
          'de courriel, au choix).</p>'+
          '<p class="hint" id="sy-i-pseudo-etat" style="margin:4px 0 0;min-height:16px"></p>'+

          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+
            '<label class="f" style="flex:1;min-width:160px"><span>Prénom</span>'+
            '<input type="text" id="sy-i-prenom" autocomplete="given-name" maxlength="80" '+
            'value="' + echappe(etat.brouillon.prenom) + '"></label>'+
            '<label class="f" style="flex:1;min-width:160px"><span>Nom</span>'+
            '<input type="text" id="sy-i-nom" autocomplete="family-name" maxlength="80" '+
            'value="' + echappe(etat.brouillon.nom) + '"></label>'+
          '</div>'+

          '<label class="f" style="max-width:220px;margin-top:12px"><span>Date de naissance</span>'+
          '<input type="date" id="sy-i-naissance" autocomplete="bday" '+
          'value="' + echappe(etat.brouillon.dateNaissance) + '"></label>'+
          '<p class="hint" style="margin:4px 0 0">Crochompte ne s\'adresse pas aux personnes de moins '+
          'de ' + AGE_MINIMUM + ' ans.</p>'+

          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'+
            '<label class="f" style="flex:1;min-width:160px"><span>Ville</span>'+
            '<input type="text" id="sy-i-ville" autocomplete="address-level2" maxlength="100" '+
            'value="' + echappe(etat.brouillon.ville) + '"></label>'+
            '<label class="f" style="flex:1;min-width:160px"><span>Pays</span>'+
            '<input type="text" id="sy-i-pays" autocomplete="country-name" maxlength="100" '+
            'value="' + echappe(etat.brouillon.pays) + '"></label>'+
          '</div>'+
          '<p class="hint" style="margin:4px 0 0">Pas besoin de ton adresse complète : la ville et le '+
          'pays suffisent.</p>'+

          '<label class="f" style="max-width:420px;margin-top:12px"><span>Ton activité</span>'+
          '<select id="sy-i-activite">'+
            '<option value="amateur"' + (etat.brouillon.typeActivite === "amateur" ? ' selected' : '') + '>Amateur / loisir</option>'+
            '<option value="artisanat"' + (etat.brouillon.typeActivite === "artisanat" ? ' selected' : '') + '>Artisanat (activité déclarée ou en cours de déclaration)</option>'+
            '<option value="entreprise"' + (etat.brouillon.typeActivite === "entreprise" ? ' selected' : '') + '>Petite entreprise</option>'+
          '</select></label>'+

          '<label class="f" style="max-width:420px;margin-top:12px"><span>Ton adresse de courriel</span>'+
          '<input type="email" id="sy-i-mail" autocomplete="email" placeholder="toi@exemple.fr" '+
          'value="' + echappe(etat.brouillon.email) + '"></label>'+
          '<p class="hint" style="margin:4px 0 0">Sert à confirmer que le compte est le tien, à te '+
          'reconnecter si tu préfères plutôt que ton pseudo, et à réinitialiser ton mot de passe si '+
          'tu l\'oublies.</p>'+

          '<label class="f" style="max-width:420px;margin-top:12px"><span>Mot de passe</span>'+
          '<input type="password" id="sy-i-mdp1" autocomplete="new-password"></label>'+
          '<label class="f" style="max-width:420px;margin-top:10px"><span>Confirme-le</span>'+
          '<input type="password" id="sy-i-mdp2" autocomplete="new-password"></label>'+

          '<div class="et-act" style="margin-top:12px">'+
            '<button type="button" class="btn primary" id="sy-i-valider">Créer mon compte</button>'+
          '</div>'+
          '<p class="hint" style="margin-top:10px">Un lien de confirmation arrive dans ta boîte : '+
          'clique dessus pour activer ton compte, puis reconnecte-toi avec ton pseudo ou ton adresse.</p>'+
          '<div class="banner" style="margin-top:14px"><p><b>Ce qui sera enregistré en ligne</b> : '+
          'ton pseudo, ton prénom, ton nom, ta date de naissance, ta ville et ton pays, le type '+
          'd\'activité choisi, ton adresse de courriel, ton mot de passe (jamais en clair — Supabase '+
          'le chiffre, personne chez Crochompte ne peut le lire), et l\'atelier que tu construis ici — '+
          'tes réglages, tes matières, tes créations, tes patrons et tes photos. Rien d\'autre : ni '+
          'suivi, ni publicité, ni revente. Ces informations ne sont jamais montrées à d\'autres '+
          'utilisatrices.<br>'+
          'Tu peux les corriger dans Réglages ou tout effacer, à tout moment, une fois connectée.'+
          '<br><a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a>'+
          '</p></div>'+
          '<p class="hint" style="margin-top:12px">Déjà un compte ? '+
          '<a href="#" id="sy-vers-connexion">Se connecter</a></p>';

      } else if (etat.mode === "oubli"){
        html += '<label class="f" style="max-width:420px"><span>Pseudo ou adresse de courriel</span>'+
          '<input type="text" id="sy-o-identifiant" autocomplete="username" '+
          'value="' + echappe(etat.brouillon.identifiantOubli) + '"></label>'+
          '<div class="et-act" style="margin-top:12px">'+
            '<button type="button" class="btn primary" id="sy-o-valider">Envoyer un lien de réinitialisation</button>'+
          '</div>'+
          '<p class="hint">Si cet identifiant correspond à un compte, un courriel arrive à l\'adresse '+
          'enregistrée, avec un lien pour choisir un nouveau mot de passe.</p>'+
          '<p class="hint" style="margin-top:10px"><a href="#" id="sy-vers-connexion">Retour à la connexion</a></p>';

      } else {
        html += '<label class="f" style="max-width:420px"><span>Pseudo ou adresse de courriel</span>'+
          '<input type="text" id="sy-c-identifiant" autocomplete="username" '+
          'value="' + echappe(etat.brouillon.identifiantConnexion) + '"></label>'+
          '<label class="f" style="max-width:420px;margin-top:10px"><span>Mot de passe</span>'+
          '<input type="password" id="sy-c-mdp" autocomplete="current-password"></label>'+
          '<div class="et-act" style="margin-top:12px">'+
            '<button type="button" class="btn primary" id="sy-c-valider">Se connecter</button>'+
          '</div>'+
          '<p class="hint"><a href="#" id="sy-vers-oubli">Mot de passe oublié ?</a></p>'+
          '<p class="hint" style="margin-top:14px;padding-top:14px;border-top:1px solid var(--rule)">'+
          'Pas encore de compte ? <a href="#" id="sy-vers-inscription">Créer un compte</a></p>';
      }

    } else {
      html += '<p style="margin:0 0 4px"><b>' + echappe(etat.pseudo || etat.session.user.email) + '</b></p>'+
        '<p class="hint" style="margin:0">' +
        (etat.vuLe ? 'Dernier enregistrement en ligne : ' + echappe(dateLisible(etat.vuLe))
                   : 'Aucun enregistrement en ligne pour l\'instant.') + '</p>'+
        '<p class="hint" style="margin:6px 0 0">Ton atelier part tout seul quelques secondes '+
        'après chaque modification, et se remet à jour tout seul quand tu reviens sur '+
        'l\'application. Tu n\'as rien à cliquer.</p>'+
        '<div class="et-act" style="margin-top:14px">'+
          '<button type="button" class="btn" id="sy-push">Enregistrer en ligne maintenant</button>'+
          '<button type="button" class="btn" id="sy-photos">Synchroniser les photos</button>'+
          '<button type="button" class="btn" id="sy-hist">Historique</button>'+
          '<button type="button" class="btn" id="sy-out">Se déconnecter</button>'+
        '</div>'+
        '<div id="sy-hist-zone"></div>'+

        '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">'+
          '<p style="margin:0 0 10px"><b>Mes informations</b></p>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap">'+
            '<label class="f" style="flex:1;min-width:160px"><span>Prénom</span>'+
            '<input type="text" id="sy-p-prenom" maxlength="80" '+
            'value="' + echappe(etat.brouillonProfil.prenom) + '"></label>'+
            '<label class="f" style="flex:1;min-width:160px"><span>Nom</span>'+
            '<input type="text" id="sy-p-nom" maxlength="80" '+
            'value="' + echappe(etat.brouillonProfil.nom) + '"></label>'+
          '</div>'+
          '<label class="f" style="max-width:220px;margin-top:10px"><span>Date de naissance</span>'+
          '<input type="date" id="sy-p-naissance" '+
          'value="' + echappe(etat.brouillonProfil.dateNaissance) + '"></label>'+
          '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">'+
            '<label class="f" style="flex:1;min-width:160px"><span>Ville</span>'+
            '<input type="text" id="sy-p-ville" maxlength="100" '+
            'value="' + echappe(etat.brouillonProfil.ville) + '"></label>'+
            '<label class="f" style="flex:1;min-width:160px"><span>Pays</span>'+
            '<input type="text" id="sy-p-pays" maxlength="100" '+
            'value="' + echappe(etat.brouillonProfil.pays) + '"></label>'+
          '</div>'+
          '<label class="f" style="max-width:420px;margin-top:10px"><span>Mon activité</span>'+
          '<select id="sy-p-activite">'+
            '<option value="amateur"' + (etat.brouillonProfil.typeActivite === "amateur" ? ' selected' : '') + '>Amateur / loisir</option>'+
            '<option value="artisanat"' + (etat.brouillonProfil.typeActivite === "artisanat" ? ' selected' : '') + '>Artisanat (activité déclarée ou en cours de déclaration)</option>'+
            '<option value="entreprise"' + (etat.brouillonProfil.typeActivite === "entreprise" ? ' selected' : '') + '>Petite entreprise</option>'+
          '</select></label>'+
          '<div class="et-act" style="margin-top:12px">'+
            '<button type="button" class="btn" id="sy-p-valider">Enregistrer mes informations</button>'+
          '</div>'+
          '<p class="hint" style="margin-top:8px">Ton pseudo et ton adresse de courriel ne changent '+
          'pas ici. Écris-nous si tu as vraiment besoin d\'en changer.</p>'+
        '</div>'+

        '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">'+
          '<p style="margin:0 0 4px"><b>Effacer mon compte et toutes mes données</b></p>'+
          '<p class="hint" style="margin:0 0 12px">Efface définitivement, sur le serveur : '+
          'ton atelier, tes photos et ton compte. C\'est irréversible. '+
          'Ce qui est dans ce navigateur n\'est pas touché — exporte une sauvegarde avant '+
          'si tu veux garder ton travail.</p>'+
          '<div class="et-act"><button type="button" class="btn" id="sy-del">Effacer mon compte</button></div>'+
          '<p class="hint" style="margin-top:10px">'+
          '<a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>'+
        '</div>';
    }
    html += '</div></div>';
    zone.innerHTML = html;

    var q = function(id){ return zone.querySelector(id); };
    var lien = function(id, fn){ var e = q(id); if (e) e.addEventListener("click", function(ev){ ev.preventDefault(); fn(); }); };

    if (etat.session && etat.recuperation){
      q("#sy-np-valider").addEventListener("click", function(){
        var p1 = q("#sy-np1").value || "", p2 = q("#sy-np2").value || "";
        if (p1.length < 8){ peindre({erreur:"Le mot de passe doit faire au moins 8 caractères."}); return; }
        if (p1 !== p2){ peindre({erreur:"Les deux mots de passe ne correspondent pas."}); return; }
        var b = this; b.disabled = true; b.textContent = "Enregistrement…";
        sb.auth.updateUser({password: p1}).then(function(r){
          if (r.error){ peindre({erreur: r.error.message}); return; }
          etat.recuperation = false;
          recupererProfil().then(function(){
            pont.toast("Mot de passe changé. Tu es connectée.");
            peindre();
          });
        });
      });

    } else if (!connecte){

      lien("#sy-vers-connexion", function(){ etat.mode = "connexion"; peindre(); });
      lien("#sy-vers-inscription", function(){ etat.mode = "inscription"; peindre(); });
      lien("#sy-vers-oubli", function(){ etat.mode = "oubli"; peindre(); });

      if (etat.mode === "inscription"){
        /* Vérification en direct de la disponibilité du pseudo, sans
           reconstruire tout le formulaire à chaque frappe (ce qui ferait
           perdre le focus et la position du curseur) : on modifie juste le
           petit texte d'état sous le champ. */
        var elPseudo = q("#sy-i-pseudo");
        var elPseudoEtat = q("#sy-i-pseudo-etat");
        elPseudo.addEventListener("input", function(){
          var val = elPseudo.value.trim();
          etat.brouillon.pseudo = val;
          if (etat.minuteurPseudo) clearTimeout(etat.minuteurPseudo);
          if (!RE_PSEUDO.test(val)){ elPseudoEtat.textContent = ""; return; }
          elPseudoEtat.textContent = "Vérification…";
          elPseudoEtat.style.color = "var(--muted)";
          etat.minuteurPseudo = setTimeout(function(){
            sb.rpc("pseudo_disponible", {p: val}).then(function(r){
              if (elPseudo.value.trim() !== val) return;  /* retapé entre-temps */
              if (r.error){ elPseudoEtat.textContent = ""; return; }
              elPseudoEtat.textContent = r.data ? "✓ Ce pseudo est disponible." : "✗ Ce pseudo est déjà pris.";
              elPseudoEtat.style.color = r.data ? "var(--primary)" : "var(--bad, #b3261e)";
            }).catch(function(){ elPseudoEtat.textContent = ""; });
          }, 450);
        });

        q("#sy-i-valider").addEventListener("click", function(){
          var pseudo    = (q("#sy-i-pseudo").value || "").trim();
          var prenom    = (q("#sy-i-prenom").value || "").trim();
          var nom       = (q("#sy-i-nom").value || "").trim();
          var naissance = (q("#sy-i-naissance").value || "").trim();
          var ville     = (q("#sy-i-ville").value || "").trim();
          var pays      = (q("#sy-i-pays").value || "").trim();
          var activite  = q("#sy-i-activite").value || "";
          var mail      = (q("#sy-i-mail").value || "").trim();
          var p1 = q("#sy-i-mdp1").value || "", p2 = q("#sy-i-mdp2").value || "";

          /* On retient ce qui a été tapé AVANT toute validation : une erreur,
             qu'elle vienne d'ici ou du serveur, ne doit jamais faire tout
             retaper — sauf les mots de passe, qu'on ne restitue jamais. */
          etat.brouillon.pseudo = pseudo; etat.brouillon.prenom = prenom; etat.brouillon.nom = nom;
          etat.brouillon.dateNaissance = naissance; etat.brouillon.ville = ville;
          etat.brouillon.pays = pays; etat.brouillon.typeActivite = activite;
          etat.brouillon.email = mail;

          if (!RE_PSEUDO.test(pseudo)){
            peindre({erreur:"Pseudo invalide : 3 à 24 caractères, lettres/chiffres/tiret/tiret bas, sans accent ni espace."});
            return;
          }
          if (!prenom){ peindre({erreur:"Indique ton prénom."}); return; }
          if (!nom){ peindre({erreur:"Indique ton nom."}); return; }
          if (!naissance){ peindre({erreur:"Indique ta date de naissance."}); return; }
          var age = ageEnAnnees(naissance);
          if (age === null){ peindre({erreur:"Cette date de naissance ne semble pas correcte."}); return; }
          if (age < AGE_MINIMUM){
            peindre({erreur:"Crochompte ne s'adresse pas aux personnes de moins de " + AGE_MINIMUM + " ans."});
            return;
          }
          if (!ville){ peindre({erreur:"Indique ta ville."}); return; }
          if (!pays){ peindre({erreur:"Indique ton pays."}); return; }
          if (["amateur","artisanat","entreprise"].indexOf(activite) === -1){
            peindre({erreur:"Choisis un type d'activité."}); return;
          }
          if (!RE_COURRIEL.test(mail)){
            peindre({erreur:"Cette adresse ne ressemble pas à une adresse de courriel."});
            return;
          }
          if (p1.length < 8){ peindre({erreur:"Le mot de passe doit faire au moins 8 caractères."}); return; }
          if (p1 !== p2){ peindre({erreur:"Les deux mots de passe ne correspondent pas."}); return; }

          var b = this; b.disabled = true; b.textContent = "Création…";
          appelFonction("inscription", {
            pseudo: pseudo, email: mail, motDePasse: p1, emailRedirectTo: urlPage(),
            prenom: prenom, nom: nom, dateNaissance: naissance,
            ville: ville, pays: pays, typeActivite: activite
          }).then(function(r){
            if (!r._ok){ peindre({erreur: r.erreur || "L'inscription a échoué."}); return; }
            etat.mode = "connexion";
            etat.brouillon = Object.assign(brouillonInscriptionVide(), {
              identifiantOubli: "", identifiantConnexion: pseudo
            });
            peindre({info:"Compte créé pour « " + pseudo + " ». Ouvre ta boîte de courriel, "+
                          "clique sur le lien de confirmation, puis reconnecte-toi ici avec ton "+
                          "pseudo ou ton adresse."});
          });
        });

      } else if (etat.mode === "oubli"){
        q("#sy-o-valider").addEventListener("click", function(){
          var identifiant = (q("#sy-o-identifiant").value || "").trim();
          etat.brouillon.identifiantOubli = identifiant;
          if (!identifiant){ peindre({erreur:"Indique ton pseudo ou ton adresse de courriel."}); return; }
          var b = this; b.disabled = true; b.textContent = "Envoi…";
          appelFonction("mot-de-passe-oublie", {identifiant: identifiant, redirectTo: urlPage()})
            .then(function(){
              etat.mode = "connexion";
              etat.brouillon.identifiantConnexion = identifiant; etat.brouillon.identifiantOubli = "";
              peindre({info:"Si cet identifiant correspond à un compte, un courriel de réinitialisation "+
                            "vient d'être envoyé à l'adresse enregistrée."});
            });
        });

      } else {
        q("#sy-c-valider").addEventListener("click", function(){
          var identifiant = (q("#sy-c-identifiant").value || "").trim();
          var mdp = q("#sy-c-mdp").value || "";
          etat.brouillon.identifiantConnexion = identifiant;
          if (!identifiant || !mdp){ peindre({erreur:"Identifiant ou mot de passe incorrect.", pasPerdu:false}); return; }
          var b = this; b.disabled = true; b.textContent = "Connexion…";
          appelFonction("connexion", {identifiant: identifiant, motDePasse: mdp})
            .then(function(r){
              if (!r._ok || !r.access_token){
                peindre({erreur: r.erreur || "Identifiant ou mot de passe incorrect.", pasPerdu:false});
                return;
              }
              etat.brouillon.identifiantConnexion = "";
              /* On ne fait rien de plus ici : setSession() déclenche lui-même
                 onAuthStateChange (événement SIGNED_IN), qui s'occupe déjà de
                 etat.session, du profil et du message de bienvenue. Dupliquer
                 ce travail ici affichait le message « Connectée » deux fois
                 et interrogeait le profil deux fois pour rien. */
              sb.auth.setSession({access_token: r.access_token, refresh_token: r.refresh_token});
            });
        });
      }

    } else {
      q("#sy-push").addEventListener("click", function(){
        var b = this; b.disabled = true; b.textContent = "Envoi…";
        etat.sale = true;
        envoyer().then(function(){ pont.toast("Atelier enregistré en ligne"); });
      });
      /* L'historique : la seule façon de revenir en arrière, et le filet qui
         rend toute la synchronisation non destructrice. */
      q("#sy-hist").addEventListener("click", function(){
        var z = q("#sy-hist-zone");
        if (z.getAttribute("data-ouvert") === "1"){
          z.innerHTML = ""; z.setAttribute("data-ouvert","0"); return;
        }
        z.setAttribute("data-ouvert","1");
        z.innerHTML = '<p class="hint" style="margin-top:12px">Chargement de l\'historique…</p>';
        sb.from("ateliers_versions")
          .select("id, maj, appareil, raison, cree")
          .eq("user_id", etat.session.user.id)
          .order("cree", {ascending:false})
          .limit(20)
          .then(function(r){
            if (r.error){
              z.innerHTML = '<p class="hint" style="margin-top:12px">Historique indisponible : '+
                echappe(r.error.message) + '</p>';
              return;
            }
            var l = r.data || [];
            if (!l.length){
              z.innerHTML = '<p class="hint" style="margin-top:12px">Aucune version archivée. '+
                'Il n\'y en a que lorsqu\'un autre appareil a enregistré de son côté.</p>';
              return;
            }
            var h = '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--rule)">'+
              '<p style="margin:0 0 4px"><b>Versions précédentes de ton atelier</b></p>'+
              '<p class="hint" style="margin:0 0 10px">Chaque fois qu\'une version en remplace une '+
              'autre, l\'ancienne est rangée ici. Restaurer remplace ce que tu as dans ce navigateur '+
              '— et la version d\'aujourd\'hui y sera rangée à son tour.</p>';
            l.forEach(function(v){
              h += '<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;'+
                'padding:8px 0;border-bottom:1px solid var(--rule)">'+
                '<span>'+ echappe(dateLisible(v.cree)) +
                (v.appareil ? ' · depuis ton ' + echappe(v.appareil) : '') +
                (v.raison === "avant_recuperation" ? ' · avant une récupération' : '') + '</span>'+
                '<button type="button" class="btn sm" data-restaurer="'+ v.id +'">Restaurer</button>'+
                '</div>';
            });
            z.innerHTML = h + '</div>';
            z.querySelectorAll("[data-restaurer]").forEach(function(b){
              b.addEventListener("click", function(){
                if (!confirm("Remettre ton atelier dans l'état de cette version ?\n\n"+
                             "Ce que tu as maintenant sera rangé dans l'historique, "+
                             "tu pourras y revenir.")) return;
                b.disabled = true; b.textContent = "…";
                sb.from("ateliers_versions").select("donnees")
                  .eq("id", Number(b.getAttribute("data-restaurer"))).maybeSingle()
                  .then(function(rr){
                    if (rr.error || !rr.data) { pont.toast("Version introuvable"); return; }
                    return archiver(pont.lire(), etat.vuLe, "avant_recuperation").then(function(){
                      pont.ecrire(rr.data.donnees);
                      etat.sale = true;
                      return envoyer();
                    }).then(function(){
                      pont.toast("Atelier restauré");
                      pont.redessiner();
                    });
                  });
              });
            });
          });
      });
      q("#sy-photos").addEventListener("click", function(){
        var b = this; b.disabled = true;
        b.textContent = "Photos…";
        envoyerPhotos(function(n, t){ b.textContent = "Envoi " + n + "/" + t; })
          .then(function(){ return recevoirPhotos(function(n, t){ b.textContent = "Réception " + n + "/" + t; }); })
          .then(function(recues){
            peindre({info:"Photos synchronisées" + (recues ? " — " + recues + " récupérée" + (recues>1?"s":"") : "") + "."});
            pont.redessiner();
          });
      });
      q("#sy-p-valider").addEventListener("click", function(){
        var prenom    = (q("#sy-p-prenom").value || "").trim();
        var nom       = (q("#sy-p-nom").value || "").trim();
        var naissance = (q("#sy-p-naissance").value || "").trim();
        var ville     = (q("#sy-p-ville").value || "").trim();
        var pays      = (q("#sy-p-pays").value || "").trim();
        var activite  = q("#sy-p-activite").value || "";
        etat.brouillonProfil = {
          prenom: prenom, nom: nom, dateNaissance: naissance,
          ville: ville, pays: pays, typeActivite: activite
        };

        if (!prenom || !nom){ peindre({erreur:"Indique ton prénom et ton nom."}); return; }
        if (naissance){
          var age = ageEnAnnees(naissance);
          if (age === null || age < AGE_MINIMUM){
            peindre({erreur:"Cette date de naissance ne semble pas correcte."});
            return;
          }
        }
        if (!ville || !pays){ peindre({erreur:"Indique ta ville et ton pays."}); return; }

        var b = this; b.disabled = true; b.textContent = "Enregistrement…";
        sb.rpc("modifier_mon_profil", {
          p_prenom: prenom, p_nom: nom, p_date_naissance: naissance || null,
          p_ville: ville, p_pays: pays, p_type_activite: activite || null
        }).then(function(r){
          if (r.error){ peindre({erreur: r.error.message}); return; }
          peindre({info:"Informations enregistrées."});
        });
      });
      q("#sy-del").addEventListener("click", function(){
        var b = this;
        if (!confirm("Effacer définitivement ton compte et toutes tes données en ligne ?\n\n"+
                     "Cette action est irréversible. Ce qui est dans ce navigateur reste, "+
                     "mais plus rien ne sera enregistré en ligne.")) return;
        if (!confirm("Dernière vérification : tu es sûre ?")) return;
        b.disabled = true;
        effacerToutLeCompte(function(etape){ b.textContent = etape; }).then(function(r){
          if (!r.ok){ peindre({erreur: r.message || "L'effacement a échoué."}); return; }
          pont.toast(r.identite
            ? "Compte et données effacés. Il ne reste rien sur le serveur."
            : "Atelier et photos effacés, et tu es déconnectée. L'identité de connexion "+
              "(ton adresse et ton pseudo) subsiste tant que la fonction d'effacement du serveur "+
              "n'est pas installée — voir le README.");
          peindre();
        });
      });

      q("#sy-out").addEventListener("click", function(){
        sb.auth.signOut().then(function(){
          etat.session = null; etat.vuLe = null; etat.pseudo = null; etat.mode = "connexion";
          etat.brouillon = Object.assign(brouillonInscriptionVide(), {identifiantOubli:"", identifiantConnexion:""});
          etat.brouillonProfil = brouillonProfilVide();
          pont.toast("Déconnectée.");
          peindre();
        });
      });
    }
  }

  /* ───────── démarrage ───────── */

  pont.surZoneCompte(function(zone){
    zone.setAttribute("data-sync", "on");   /* le repli hors ligne s'efface */
    etat.zone = zone; peindre();
  });

  /* On expose le signal d'enregistrement pour que l'application prévienne
     ce module à chaque sauvegarde. */
  window.CrochompteSync = {signaler: signaler};

  sb.auth.getSession().then(function(r){
    etat.session = (r.data && r.data.session) || null;
    if (etat.session){
      recupererProfil().then(peindre);
    } else {
      peindre();
    }
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
    var etaitConnectee = !!etat.session;
    etat.session = session || null;
    if (!etaitConnectee && session && !etat.recuperation){
      recupererProfil().then(function(){
        peindre();
        /* Se mettre à jour fait partie de la connexion : arriver depuis un
           autre appareil et devoir cliquer quelque part pour voir son travail
           est un piège, pas une fonctionnalité. */
        return synchroniser();
      }).then(function(){
        pont.toast("Connectée. Ton atelier est à jour.");
        peindre();
      });
    } else if (!session){
      etat.pseudo = null;
      etat.brouillonProfil = brouillonProfilVide();
      peindre();
    } else {
      peindre();
    }
  });

})();
