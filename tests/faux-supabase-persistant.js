export function createClient(url, key){
  /* Session persistante, comme la vraie bibliothèque : sans ça, impossible de
     tester ce qui se passe au rechargement suivant. */
  var session = null, cb = null;
  try{ var sv = localStorage.getItem("__fauxSession"); if (sv) session = JSON.parse(sv); }catch(e){}
  function garder(){
    try{
      if (session) localStorage.setItem("__fauxSession", JSON.stringify(session));
      else localStorage.removeItem("__fauxSession");
    }catch(e){}
  }
  function chan(){ return {data:{subscription:{unsubscribe:function(){}}}}; }
  function garderServeur(){ try{ localStorage.setItem("__fauxServeur", JSON.stringify(window.__serveur)); }catch(e){} }
  try{ if (!window.__serveur){ var sv2 = localStorage.getItem("__fauxServeur"); if (sv2) window.__serveur = JSON.parse(sv2); } }catch(e){}
  /* Une vraie petite base : la ligne de l'atelier est gardée (avec sa date
     « maj » fixée par le serveur, comme le déclencheur SQL), ce qui permet de
     tester l'envoi, la réception et les conflits. */
  function lireServeur(){ return window.__serveur || (window.__serveur = {atelier:null, versions:[]}); }
  function qb(table){
    var q = {_filtres:{}}; var estBiblio = table === "patrons_publics";
    q.select = function(){ q._select = true; return q; };
    q.eq = function(k, v){ q._filtres[k] = v; return q; };
    q.order = function(){ return q; };
    q.limit = function(){ return q; };
    q.range = function(){ return q; };
    q.insert = function(d){
      if (table === "ateliers_versions"){ lireServeur().versions.push(d); garderServeur(); q._fait = true; return q; }
      window.__publication = d; q._ins = d; return q;
    };
    q.upsert = function(d){
      window.__fauxEnvois = window.__fauxEnvois || [];
      window.__fauxEnvois.push(d);
      if (window.__fauxEchecEnvoi){ q._erreur = {message:"réseau (test)"}; return q; }
      var srv = lireServeur();
      /* L'heure du serveur, toujours croissante (déclencheur ateliers_heure_serveur). */
      var t = Math.max(Date.now(), srv.atelier ? Date.parse(srv.atelier.maj) + 1 : 0);
      srv.atelier = {user_id: d.user_id, donnees: d.donnees, maj: new Date(t).toISOString()};
      garderServeur();
      q._ligne = {maj: srv.atelier.maj};
      return q;
    };
    q.delete = function(){ q._del = true; return q; };
    function resultat(){
      if (q._erreur) return {data:null, error:q._erreur};
      if (q._ligne) return {data:q._ligne, error:null};
      if (table === "ateliers"){
        if (q._del){ lireServeur().atelier = null; garderServeur(); return {data:null, error:null}; }
        var a = lireServeur().atelier;
        return {data: a ? {donnees:a.donnees, maj:a.maj} : null, error:null};
      }
      if (table === "factures") return {data: (lireServeur().registre || []).slice(), error:null};
      if (table === "ateliers_versions"){
        if (q._del){ lireServeur().versions = []; garderServeur(); }
        return {data: q._fait || q._del ? null : lireServeur().versions.slice().reverse(), error:null};
      }
      return null;
    }
    q.single = function(){ return Promise.resolve(resultat() || {data:null, error:null}); };
    q.maybeSingle = q.single;
    q.then = function(res, rej){
      var r = resultat();
      if (r) return Promise.resolve(r).then(res, rej);
      if (q._ins){
        window.__biblio = window.__biblio || [];
        var ligne = Object.assign({id:"pub"+(window.__biblio.length+1), cree:Date.now(), retire:false}, q._ins);
        window.__biblio.push(ligne);
        return Promise.resolve({data:[{id:ligne.id}], error:null}).then(res, rej);
      }
      if (q._del){ window.__retrait = true; return Promise.resolve({error:null}).then(res, rej); }
      if (estBiblio) return Promise.resolve({data: window.__biblio || [], error:null}).then(res, rej);
      return Promise.resolve({data:null, error:null}).then(res, rej);
    };
    return q;
  }
  return {
    auth: {
      getSession: function(){ return Promise.resolve({data:{session:session}}); },
      onAuthStateChange: function(fn){ cb = fn; window.__cbAuth = fn; return chan(); },
      setSession: function(t){
        session = {user:{id:"u1", email:"test@exemple.fr"}, access_token:t.access_token, refresh_token:t.refresh_token};
        garder();
        if (cb) cb("SIGNED_IN", session);
        return Promise.resolve({data:{session:session}, error:null});
      },
      updateUser: function(){ return Promise.resolve({data:{}, error:null}); },
      /* Vérification du mot de passe actuel : « mauvais » est refusé. */
      signInWithPassword: function(o){
        if (!o || o.password === "mauvais") return Promise.resolve({data:{session:null}, error:{message:"Invalid login credentials"}});
        return Promise.resolve({data:{session:session}, error:null});
      },
      signOut: function(o){ if (o && o.scope === "others") return Promise.resolve({error:null}); session = null; garder(); if (cb) cb("SIGNED_OUT", null); return Promise.resolve({error:null}); }
    },
    from: function(t){ return qb(t); },
    storage: { from: function(){ return {
      list: function(){ return Promise.resolve({data:[]}); },
      upload: function(){ return Promise.resolve({error:null}); },
      download: function(){ return Promise.resolve({data:null, error:null}); },
      remove: function(){ return Promise.resolve({error:null}); }
    }; } },
    rpc: function(name, params){
      if (name === "mon_pseudo") return Promise.resolve({data:"LaineTest", error:null});
      /* V55 : envoi atomique (schema-abonnement.sql). window.__fauxSansRpcEnvoi = true
         simule une base où la fonction n'existe pas encore (repli). */
      if (name === "enregistrer_atelier"){
        if (window.__fauxSansRpcEnvoi) return Promise.resolve({data:null, error:{message:"Could not find the function public.enregistrer_atelier in the schema cache", code:"PGRST202"}});
        if (window.__fauxEchecEnvoi) return Promise.resolve({data:null, error:{message:"réseau (test)"}});
        window.__fauxEnvois = window.__fauxEnvois || [];
        window.__fauxEnvois.push({donnees: params.p_donnees});
        var srvA = lireServeur(), archiveA = null;
        /* V56 : le serveur refuse un atelier vide sur un atelier rempli, et
           tout envoi quand l'abonnement est terminé (window.__fauxAccesFerme). */
        if (window.__fauxAccesFerme) return Promise.resolve({data:{erreur:"abonnement_requis"}, error:null});
        var viergeA = function(d){ return !d || (!(d.creations||[]).length && !(d.pieces||[]).length && !(d.commandes||[]).length && !(d.patrons||[]).length && !d.reinitialiseLe && !(d.reglages && d.reglages.confirmeLe)); };
        if (srvA.atelier && viergeA(params.p_donnees) && !viergeA(srvA.atelier.donnees)) return Promise.resolve({data:{erreur:"vierge", maj: srvA.atelier.maj}, error:null});
        if (srvA.atelier && srvA.atelier.maj !== (params.p_maj_connue || null)){
          srvA.versions.push({donnees: srvA.atelier.donnees, maj: srvA.atelier.maj, raison:"remplacee", appareil: params.p_appareil || ""});
          archiveA = srvA.atelier.maj;
        }
        var tA = Math.max(Date.now(), srvA.atelier ? Date.parse(srvA.atelier.maj) + 1 : 0);
        srvA.atelier = {user_id: session ? session.user.id : "u", donnees: params.p_donnees, maj: new Date(tA).toISOString()};
        garderServeur();
        return Promise.resolve({data:{maj: srvA.atelier.maj, archive: archiveA}, error:null});
      }
      /* V55 : abonnement. window.__fauxAbonnement remplace la réponse ;
         window.__fauxSansAbonnement = true simule une base sans la fonction. */
      if (name === "mon_abonnement"){
        if (window.__fauxSansAbonnement) return Promise.resolve({data:null, error:{message:"Could not find the function", code:"PGRST202"}});
        var fin = new Date(Date.now() + 14 * 864e5).toISOString();
        var fa = window.__fauxAbonnement; try{ if (!fa) fa = JSON.parse(localStorage.getItem("__fauxAbonnement") || "null"); }catch(e){}
        return Promise.resolve({data: fa || {statut:"essai", acces:true, admin:false, essai_fin:fin, fin:null, offre:null, jours_restants:14, illimite:false, annulation_prevue:false, stripe:false, code_utilise:null}, error:null});
      }
      if (name === "utiliser_code"){
        var codeN = String(params.p_code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        window.__dernierCode = codeN;
        if (codeN === "CROCHETTESTOK12"){
          window.__fauxAbonnement = {statut:"offert", acces:true, admin:false, essai_fin:null, fin:new Date(Date.now() + 44 * 864e5).toISOString(), offre:"cadeau", jours_restants:44, illimite:false, annulation_prevue:false, stripe:false, code_utilise:"CROCHET-TEST-OK12"};
          return Promise.resolve({data:{ok:true, duree_jours:30, abonnement: window.__fauxAbonnement}, error:null});
        }
        return Promise.resolve({data:{ok:false, erreur: codeN === "CROCHETTESTUSED" ? "code_deja_utilise" : "code_inconnu"}, error:null});
      }
      if (name === "admin_stats") return Promise.resolve((window.__fauxAbonnement || JSON.parse(localStorage.getItem("__fauxAbonnement") || "null") || {}).admin ? {data:{comptes:12, essai:5, actifs:3, offerts:2, expires:2, inscrits_30j:4, codes_actifs:1}, error:null} : {data:null, error:{message:"réservé aux administrateurs"}});
      if (name === "admin_comptes") return Promise.resolve({data:[{user_id:"u1", email:"bea@x.fr", pseudo:"Bea", cree:new Date().toISOString(), derniere_connexion:null, statut:"essai", essai_fin:new Date(Date.now()+5*864e5).toISOString(), fin:null, offre:null, code_utilise:null, admin:false}], error:null});
      if (name === "admin_codes") return Promise.resolve({data: window.__fauxCodes || [], error:null});
      if (name === "admin_creer_code"){ window.__fauxCodes = window.__fauxCodes || []; var cc = {code:"CROCHET-AB12-CD34", duree_jours: params.p_duree_jours, utilisations_max: params.p_max, utilisations:0, actif:true, note: params.p_note, cree:new Date().toISOString()}; window.__fauxCodes.unshift(cc); return Promise.resolve({data: cc.code, error:null}); }
      if (name === "admin_desactiver_code"){ (window.__fauxCodes || []).forEach(function(c){ if (c.code === params.p_code) c.actif = !!params.p_actif; }); return Promise.resolve({data:null, error:null}); }
      if (name === "admin_offrir"){ window.__dernierOffert = params; return Promise.resolve({data:{ok: params.p_email !== "inconnue@x.fr", erreur: params.p_email === "inconnue@x.fr" ? "compte_inconnu" : null}, error:null}); }
      if (name === "admin_retirer") return Promise.resolve({data:{ok:true}, error:null});
      /* Comme schema-factures.sql : un code par compte, un compteur par année. */
      if (name === "emettre_facture"){
        if (window.__fauxEchecFacture) return Promise.resolve({data:null, error:{message:"réseau (test)"}});
        var srvE = lireServeur(); srvE.factures = srvE.factures || {code:"K7R2M", annees:{}}; srvE.registre = srvE.registre || [];
        var anE = String(params.p_annee), nE = Math.max(srvE.factures.annees[anE] || 0, params.p_min || 0) + 1;
        srvE.factures.annees[anE] = nE;
        var numE = srvE.factures.code + "-" + anE + "-" + String(nE).padStart(4, "0");
        srvE.registre.unshift({numero:numE, type:params.p_type, emise_le:new Date().toISOString(), commande:params.p_commande,
                               donnees:Object.assign({}, params.p_donnees, {numero:numE})});
        garderServeur();
        return Promise.resolve({data: numE, error:null});
      }
      if (name === "prochain_numero_facture"){
        if (window.__fauxEchecFacture) return Promise.resolve({data:null, error:{message:"réseau (test)"}});
        var srvF = lireServeur(); srvF.factures = srvF.factures || {code:"K7R2M", annees:{}};
        var an = String(params.p_annee), n = Math.max(srvF.factures.annees[an] || 0, params.p_min || 0) + 1;
        srvF.factures.annees[an] = n; garderServeur();
        return Promise.resolve({data: srvF.factures.code + "-" + an + "-" + String(n).padStart(4, "0"), error:null});
      }
      if (name === "mon_profil"){
        window.__compteurProfil = (window.__compteurProfil || 0) + 1;
      }
      if (name === "mon_profil") return Promise.resolve({data:{
        pseudo:"LaineTest", prenom:"Marie", nom:"Dupont", date_naissance:"1990-05-12",
        ville:"Lyon", pays:"France", type_activite:"artisanat"
      }, error:null});
      if (name === "pseudo_disponible"){
        var p = String((params && params.p) || "").toLowerCase();
        window.__dernierPseudoVerifie = p;
        return Promise.resolve({data: p !== "dejapris", error:null});
      }
      if (name === "modifier_mon_profil"){
        window.__dernierProfilModifie = params;
        return Promise.resolve({data:null, error:null});
      }
      return Promise.resolve({data:null, error:null});
    },
    functions: { invoke: function(){ return Promise.resolve({error:{message:"non déployée (test)"}}); } }
  };
}

// Crochet de test : simule l'arrivée d'un lien « mot de passe oublié »,
// que Supabase signalerait normalement via onAuthStateChange("PASSWORD_RECOVERY", session).
window.__testDeclencherRecuperation = function(){
  // rien à faire ici : la fonction réelle est capturée côté module,
  // voir __cbInterne ci-dessous
};
