// Données de test : trois créations réelles (plus aucune n'est fournie par l'application).
exports.graine = async function(p){
  await p.evaluate(()=>{
    const s = window.CrochomptePont.lire();
    const mids = s.matieres.slice(0,3).map(m=>m.id);
    const mk = (id, nom, modele, prix, canal) => ({id, nom, modele, lignes:[{mid:mids[0], qte:40},{mid:mids[1], qte:20}],
      temps:{prep:10, crochet:180, assemb:30, finition:15, emball:5}, canal, prix, expedition:0, seuilFini:0, migre:true, photo:null});
    s.creations = [mk("c1","Lapin Céleste","ami_moyen",32,"etsy"), mk("c2","Bonnet côtelé","bonnet",28,"marche"), mk("c3","Panier","panier",35,"direct")];
    window.CrochomptePont.ecrire(s);
  });
  await p.waitForTimeout(250);
};
