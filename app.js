/* ═══════════════════════════════════════════════════════════════════════════
   Crochompte — l'application (tout ce qui s'affiche et calcule).
   Chargée par index.html. Elle vivait auparavant dans la page elle-même ;
   dans un fichier à part, le navigateur ne la confond plus avec du HTML
   (requêtes parasites « /'+x.url+' » quand la politique de sécurité est
   déclarée dans la page), et elle peut être mise en cache séparément.
   Règles métier documentées dans REGLES-METIER.md.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";

/* ═════ 1. CATALOGUE MÉTIER ═════
   Tous les prix sont des ORDRES DE GRANDEUR modifiables, pas des relevés de marché. */

var CATS = [
  {id:"fil",  nom:"Fils et laines"},
  {id:"garn", nom:"Rembourrage et garnissage"},
  {id:"acc",  nom:"Accessoires et quincaillerie"},
  {id:"fin",  nom:"Finition, étiquette et emballage"}
];

var MATIERES_DEFAUT = [
  ["coton_fin",  "Coton fin amigurumi (25 g)",      "fil",  2.00,   25, "g", "Très fin"],
  ["coton_dk",   "Coton DK (pelote 50 g)",          "fil",  2.70,   50, "g", "Moyen-fin"],
  ["coton_3",    "Coton n°3 (pelote 50 g)",         "fil",  3.60,   50, "g", "Fin"],
  ["acryl_bebe", "Acrylique bébé (pelote 50 g)",    "fil",  3.20,   50, "g", "Fin"],
  ["melange",    "Laine mélangée (pelote 50 g)",    "fil",  4.20,   50, "g", "Moyen-fin"],
  ["velours",    "Fil velours / peluche (100 g)",   "fil",  6.50,  100, "g", "Épais"],
  ["merinos",    "Laine mérinos (pelote 50 g)",     "fil",  8.50,   50, "g", "Moyen-fin"],
  ["trapilho",   "Trapilho / fil recyclé (500 g)",  "fil",  7.50,  500, "g", "Très épais"],
  ["corde",      "Corde coton 5 mm (500 g)",        "fil", 12.00,  500, "g", "Très épais"],
  ["broder",     "Fil à broder noir (détails)",     "fil",  1.20,   20, "utilisation", "Dentelle"],
  ["ouate",      "Ouate de rembourrage (1 kg)",     "garn",13.00, 1000, "g"],
  ["billes",     "Billes de lestage (500 g)",       "garn", 6.00,  500, "g"],
  ["yeux",       "Yeux de sécurité (lot de 20)",    "acc",  4.00,   20, "pièce"],
  ["nez",        "Nez de sécurité (lot de 20)",     "acc",  3.50,   20, "pièce"],
  ["grelot",     "Grelot (lot de 10)",              "acc",  4.00,   10, "pièce"],
  ["anneau",     "Anneau bois attache-tétine (10)", "acc",  5.00,   10, "pièce"],
  ["perle",      "Perle bois 12 mm (lot de 100)",   "acc",  6.00,  100, "pièce"],
  ["bouton",     "Bouton (lot de 20)",              "acc",  3.00,   20, "pièce"],
  ["zip",        "Fermeture éclair 20 cm",          "acc",  0.80,    1, "pièce"],
  ["anses",      "Anses de sac (la paire)",         "acc",  7.00,    1, "paire"],
  ["mousqueton", "Mousqueton porte-clés (lot 20)",  "acc",  4.00,   20, "pièce"],
  ["chenille",   "Fil de fer gainé, armature (30)", "acc",  3.00,   30, "pièce"],
  ["cercle",     "Cercle en bois 20 cm",            "acc",  3.50,    1, "pièce"],
  ["pot",        "Petit pot en terre cuite",        "acc",  2.50,    1, "pièce"],
  ["amidon",     "Amidon / raidisseur textile",    "acc",  5.00,   20, "utilisation"],
  ["etiquette",  "Étiquette tissée perso (lot 50)", "fin", 18.00,   50, "pièce"],
  ["carte",      "Carte de remerciement (lot 50)",  "fin",  6.00,   50, "pièce"],
  ["pochon",     "Pochon organza (lot de 25)",      "fin",  5.00,   25, "pièce"],
  ["boite",      "Boîte kraft (lot de 25)",         "fin", 22.00,   25, "pièce"],
  ["soie",       "Papier de soie (50 feuilles)",    "fin",  4.00,   50, "feuille"],
  ["ruban",      "Ruban satin (rouleau 25 m)",      "fin",  3.00,   25, "m"],
  ["pochette",   "Pochette d'expédition (lot 50)",  "fin",  9.00,   50, "pièce"]
];

var FAMILLES = [
  {id:"ami",     nom:"Amigurumis et peluches"},
  {id:"bebe",    nom:"Bébé et enfant"},
  {id:"mode",    nom:"Accessoires et mode"},
  {id:"maison",  nom:"Maison et déco"},
  {id:"vegetal", nom:"Fleurs et végétal"},
  {id:"fete",    nom:"Fêtes et saisons"},
  {id:"perso",   nom:"Sur mesure"}
];

/* [id, famille, nom, type, difficulté 1-3, lignes, temps(prep,crochet,assemb,finition,emball), fourchette indicative] */
var MODELES = [
["vide","","— Fiche vide —","",1,[],[0,0,0,0,0],[0,0]],

["ami_petit","ami","Petit amigurumi (10–12 cm)","Animal",1,
 [["coton_fin",45],["ouate",40],["yeux",2],["broder",1],["etiquette",1],["pochon",1]],[10,120,20,15,8],[18,28]],
["ami_moyen","ami","Amigurumi moyen (18–22 cm)","Animal",2,
 [["coton_dk",100],["ouate",110],["yeux",2],["nez",1],["broder",1],["etiquette",1],["pochon",1]],[15,240,35,20,10],[30,48]],
["ami_grand","ami","Grande peluche (35 cm et +)","Peluche",3,
 [["velours",300],["ouate",320],["billes",100],["yeux",2],["etiquette",1],["boite",1]],[20,600,60,30,15],[70,120]],
["ami_perso","ami","Amigurumi personnage (25 cm)","Personnage",3,
 [["coton_dk",130],["ouate",120],["yeux",2],["broder",1],["bouton",3],["etiquette",1],["boite",1]],[25,330,50,35,12],[45,75]],
["doudou","ami","Doudou plat","Bébé",1,
 [["coton_dk",60],["ouate",30],["yeux",2],["etiquette",1],["pochon",1]],[10,140,20,15,8],[20,32]],
["pcle","ami","Porte-clés amigurumi","Petit objet",1,
 [["coton_fin",15],["ouate",10],["yeux",2],["mousqueton",1],["etiquette",1]],[5,45,10,8,5],[8,14]],
["duo","ami","Coffret duo assorti","Coffret",2,
 [["coton_fin",80],["ouate",70],["yeux",4],["broder",1],["etiquette",2],["boite",1],["soie",2]],[20,230,35,25,15],[40,60]],

["chaussons","bebe","Chaussons bébé (la paire)","Layette",1,
 [["acryl_bebe",40],["ruban",0.6],["etiquette",1],["pochon",1]],[10,85,15,12,8],[16,26]],
["bonnet_bebe","bebe","Bonnet naissance","Layette",1,
 [["acryl_bebe",35],["etiquette",1],["pochon",1]],[8,70,0,12,8],[15,24]],
["couverture","bebe","Couverture bébé","Layette",2,
 [["acryl_bebe",500],["etiquette",1],["boite",1]],[15,1080,0,60,12],[90,160]],
["tetine","bebe","Attache-tétine","Puériculture",1,
 [["coton_fin",10],["perle",6],["anneau",1],["etiquette",1],["pochon",1]],[8,30,12,10,6],[10,16]],
["hochet","bebe","Hochet anneau","Puériculture",1,
 [["coton_fin",20],["ouate",10],["grelot",1],["anneau",1],["etiquette",1],["pochon",1]],[8,50,15,10,6],[14,22]],
["cube","bebe","Cube d'éveil","Puériculture",2,
 [["coton_dk",70],["ouate",60],["grelot",1],["etiquette",1],["boite",1]],[12,150,30,15,10],[26,40]],

["bonnet","mode","Bonnet adulte","Tête",1,
 [["melange",120],["etiquette",1],["pochon",1]],[10,150,0,20,8],[25,40]],
["snood","mode","Écharpe / snood","Cou",1,
 [["melange",250],["etiquette",1]],[10,330,0,30,8],[40,65]],
["mitaines","mode","Mitaines (la paire)","Mains",2,
 [["melange",90],["etiquette",1],["pochon",1]],[10,160,15,20,8],[24,38]],
["bandeau","mode","Bandeau / headband","Tête",1,
 [["melange",45],["etiquette",1],["pochon",1]],[5,55,0,10,6],[12,20]],
["chouchou","mode","Chouchou","Cheveux",1,
 [["coton_fin",12],["etiquette",1],["pochon",1]],[4,25,5,6,5],[6,10]],
["sac","mode","Sac en trapilho","Sac",2,
 [["trapilho",600],["anses",1],["etiquette",1]],[15,420,25,25,10],[55,90]],
["pochette_zip","mode","Pochette zippée","Sac",2,
 [["coton_3",90],["zip",1],["etiquette",1],["pochon",1]],[12,130,25,15,8],[24,38]],
["filet","mode","Filet à provisions","Sac",1,
 [["coton_3",130],["etiquette",1]],[10,180,10,15,8],[28,45]],

["panier","maison","Panier de rangement (corde)","Rangement",1,
 [["corde",450],["etiquette",1]],[10,270,0,20,8],[35,55]],
["corbeille","maison","Petite corbeille à bijoux","Rangement",1,
 [["corde",120],["etiquette",1],["pochon",1]],[8,75,0,12,6],[14,22]],
["coussin","maison","Housse de coussin 40×40","Textile",2,
 [["coton_3",250],["bouton",3],["etiquette",1]],[15,360,30,25,10],[45,70]],
["suspension","maison","Suspension murale","Mural",2,
 [["corde",200],["cercle",1],["etiquette",1]],[15,210,25,20,10],[35,55]],
["tawashi","maison","Éponges lavables (lot de 3)","Utile",1,
 [["coton_3",45],["etiquette",1],["pochon",1]],[5,65,0,10,6],[9,15]],
["dessous","maison","Dessous de verre (lot de 4)","Table",1,
 [["coton_3",60],["etiquette",1],["pochon",1]],[6,80,0,12,6],[14,22]],
["mp","maison","Marque-page","Petit objet",1,
 [["coton_fin",8],["ruban",0.3],["etiquette",1],["pochon",1]],[4,35,0,10,5],[6,11]],

["fleur","vegetal","Fleur seule","Fleur",1,
 [["coton_fin",12],["chenille",1]],[5,35,5,5,3],[4,8]],
["bouquet","vegetal","Bouquet de 5 fleurs","Bouquet",2,
 [["coton_fin",60],["chenille",5],["ruban",0.5],["soie",2],["etiquette",1]],[10,175,20,15,10],[28,45]],
["cactus","vegetal","Cactus en pot","Plante",1,
 [["coton_fin",35],["ouate",25],["pot",1],["etiquette",1]],[8,95,15,12,8],[18,28]],

["noel","fete","Sujet de Noël","Noël",1,
 [["coton_dk",25],["ouate",15],["ruban",0.3],["etiquette",1]],[8,70,10,10,6],[10,18]],
["couronne","fete","Couronne de l'Avent","Noël",2,
 [["coton_dk",120],["ouate",40],["cercle",1],["ruban",1],["etiquette",1]],[15,230,30,20,10],[38,60]],
["paques","fete","Décoration de Pâques","Pâques",1,
 [["coton_fin",30],["ouate",20],["ruban",0.3],["etiquette",1],["pochon",1]],[8,75,12,10,6],[12,20]],
["coeur","fete","Cœur Saint-Valentin","Saint-Valentin",1,
 [["coton_fin",20],["ouate",15],["ruban",0.4],["etiquette",1],["pochon",1]],[5,50,10,8,6],[9,15]],

["perso_photo","perso","Amigurumi d'après photo","Sur mesure",3,
 [["coton_dk",120],["ouate",110],["yeux",2],["broder",1],["bouton",2],["etiquette",1],["boite",1]],[60,300,45,35,15],[65,110]],
["prenom","perso","Prénom au crochet","Sur mesure",2,
 [["coton_fin",40],["chenille",4],["etiquette",1],["boite",1]],[20,140,25,15,10],[28,45]],
["naissance","perso","Coffret naissance personnalisé","Sur mesure",3,
 [["acryl_bebe",90],["coton_fin",25],["ouate",30],["ruban",1],["etiquette",3],["boite",1],["soie",2]],[35,300,45,30,18],[70,110]]
,
["ami_mini","ami","Mini amigurumi de poche (5–7 cm)","Animal",1,
 [["coton_fin",12],["ouate",8],["yeux",2],["broder",1],["etiquette",1],["pochon",1]],[5,40,10,8,5],[7,12]],
["ami_poulpe","ami","Pieuvre réversible (deux humeurs)","Animal",2,
 [["coton_dk",90],["ouate",70],["yeux",4],["broder",1],["etiquette",1],["pochon",1]],[12,200,40,20,10],[24,38]],
["ami_dino","ami","Dinosaure amigurumi","Animal",2,
 [["coton_dk",110],["ouate",100],["yeux",2],["broder",1],["etiquette",1],["boite",1]],[15,250,40,22,12],[32,50]],
["ami_licorne","ami","Licorne amigurumi","Animal",3,
 [["coton_dk",120],["coton_fin",25],["ouate",110],["yeux",2],["broder",1],["etiquette",1],["boite",1]],[20,290,50,30,12],[38,60]],
["ami_poupee","ami","Poupée au crochet (30 cm)","Personnage",3,
 [["coton_dk",150],["coton_fin",30],["ouate",130],["broder",1],["bouton",4],["etiquette",1],["boite",1]],[30,400,60,40,15],[55,90]],

["bebe_gilet","bebe","Gilet bébé (3–6 mois)","Layette",2,
 [["acryl_bebe",120],["bouton",4],["etiquette",1],["pochon",1]],[15,260,25,25,10],[35,55]],
["bebe_bavoir","bebe","Bavoir","Layette",1,
 [["coton_3",45],["bouton",1],["etiquette",1],["pochon",1]],[8,70,10,12,7],[12,20]],
["bebe_moufles","bebe","Moufles anti-griffures (la paire)","Layette",1,
 [["acryl_bebe",25],["ruban",0.5],["etiquette",1],["pochon",1]],[8,60,12,10,7],[12,18]],
["bebe_mobile","bebe","Mobile de berceau","Puériculture",3,
 [["coton_fin",70],["ouate",60],["cercle",1],["chenille",4],["ruban",1.5],["etiquette",1],["boite",1]],[25,320,60,30,15],[55,85]],
["bebe_granny","bebe","Plaid granny squares","Layette",2,
 [["acryl_bebe",450],["etiquette",1],["boite",1]],[20,900,120,50,12],[85,140]],

["mode_chale","mode","Châle / étole","Cou",2,
 [["merinos",200],["etiquette",1],["pochon",1]],[12,400,0,35,10],[55,85]],
["mode_top","mode","Top d\'été","Vêtement",3,
 [["coton_3",250],["etiquette",1],["pochon",1]],[20,480,45,35,10],[60,95]],
["mode_gilet","mode","Gilet adulte","Vêtement",3,
 [["melange",450],["bouton",5],["etiquette",1],["boite",1]],[25,780,70,45,12],[95,150]],
["mode_bucket","mode","Bob / chapeau souple","Tête",2,
 [["coton_3",130],["etiquette",1],["pochon",1]],[12,190,15,20,8],[28,45]],
["mode_bandana","mode","Bandana","Tête",1,
 [["coton_fin",35],["etiquette",1],["pochon",1]],[6,60,0,10,7],[12,20]],
["mode_sacgranny","mode","Sac granny squares","Sac",3,
 [["coton_3",200],["anses",1],["zip",1],["etiquette",1]],[20,340,50,25,10],[55,85]],

["maison_tapis","maison","Tapis rond","Sol",2,
 [["corde",900],["etiquette",1]],[15,520,0,30,12],[70,110]],
["maison_bouillotte","maison","Housse de bouillotte","Textile",2,
 [["melange",130],["bouton",3],["etiquette",1],["pochon",1]],[12,200,25,18,8],[28,45]],
["maison_videpoche","maison","Vide-poche","Rangement",1,
 [["corde",90],["etiquette",1],["pochon",1]],[6,60,0,10,6],[12,20]],
["maison_guirlande","maison","Guirlande de fanions","Mural",1,
 [["coton_fin",70],["ruban",2],["etiquette",1],["pochon",1]],[10,150,25,15,8],[24,38]],
["maison_setdetable","maison","Set de table (l\'unité)","Table",1,
 [["coton_3",70],["etiquette",1]],[8,110,0,14,6],[16,26]],
["maison_cachepot","maison","Cache-pot","Déco",1,
 [["corde",150],["etiquette",1]],[8,95,0,14,7],[18,28]],

["veg_rose","vegetal","Rose","Fleur",2,
 [["coton_fin",18],["chenille",1]],[6,55,8,8,4],[6,11]],
["veg_tournesol","vegetal","Tournesol","Fleur",2,
 [["coton_fin",22],["chenille",1]],[6,60,8,8,4],[7,12]],
["veg_succulente","vegetal","Succulente en pot","Plante",2,
 [["coton_fin",30],["ouate",15],["pot",1],["etiquette",1]],[10,110,20,12,8],[20,32]],
["veg_couronnefleurs","vegetal","Couronne de fleurs murale","Mural",3,
 [["coton_fin",90],["chenille",8],["cercle",1],["ruban",0.8],["etiquette",1]],[20,290,45,25,12],[48,75]],

["fete_chaussette","fete","Chaussette de Noël","Noël",2,
 [["melange",90],["etiquette",1],["pochon",1]],[10,160,20,18,8],[24,38]],
["fete_guirlandenoel","fete","Guirlande de Noël (5 sujets)","Noël",2,
 [["coton_dk",100],["ouate",60],["ruban",2],["etiquette",1],["boite",1]],[15,280,45,22,12],[40,62]],
["fete_citrouille","fete","Citrouille d\'Halloween","Halloween",1,
 [["coton_dk",45],["ouate",40],["chenille",1],["etiquette",1],["pochon",1]],[8,90,15,12,7],[14,24]],
["fete_flocon","fete","Flocons en dentelle (lot de 6)","Noël",2,
 [["coton_fin",30],["amidon",1],["ruban",1],["etiquette",1],["pochon",1]],[10,150,0,30,8],[18,30]],
["fete_lapinpaques","fete","Lapin de Pâques","Pâques",1,
 [["coton_fin",40],["ouate",35],["yeux",2],["ruban",0.4],["etiquette",1],["pochon",1]],[8,105,18,12,7],[16,26]],

["perso_mariage","perso","Couple de mariés","Sur mesure",3,
 [["coton_dk",130],["coton_fin",40],["ouate",110],["broder",1],["bouton",3],["etiquette",1],["boite",1]],[45,380,60,40,18],[75,120]],
["perso_pcleprenom","perso","Porte-clés prénom","Sur mesure",2,
 [["coton_fin",20],["chenille",2],["mousqueton",1],["etiquette",1],["pochon",1]],[15,70,15,10,7],[12,20]],
["perso_doudouprenom","perso","Doudou brodé au prénom","Sur mesure",2,
 [["coton_dk",70],["ouate",35],["yeux",2],["broder",1],["etiquette",1],["boite",1]],[25,160,25,25,12],[32,50]],
["dp_echarpe_beret","mode","Écharpe et béret assortis","Cou et tête",1,
 [["melange",230],["etiquette",2],["pochon",1]],[15,420,20,30,10],[0,0]],
["dp_etole_coquille","mode","Étole au point de coquille","Cou",1,
 [["melange",285],["etiquette",1],["pochon",1]],[15,480,0,45,10],[0,0]],
["dp_ceinture_pompons","mode","Ceinture à pompons","Taille",1,
 [["melange",113],["etiquette",1],["pochon",1]],[10,90,0,50,8],[0,0]],
["dp_bas_resille","mode","Bas au point résille (la paire)","Jambes",3,
 [["melange",340],["etiquette",1],["pochon",1]],[20,600,30,40,10],[0,0]],
["dp_damier","mode","Écharpe et bonnet en damier tissé","Cou et tête",2,
 [["melange",452],["etiquette",2],["pochon",1]],[20,450,0,120,10],[0,0]],
["dp_plaid_fleurs","maison","Plaid Jardin fleuri (266 motifs)","Textile",2,
 [["melange",1580],["etiquette",1],["boite",1]],[30,3600,480,90,15],[0,0]],
["dp_etole_etoile","mode","Étole au point d'étoile","Cou",2,
 [["melange",200],["etiquette",1],["pochon",1]],[15,540,0,60,10],[0,0]],
["dp_etole_popcorn","mode","Étole aux coquilles et popcorns","Cou",3,
 [["acryl_bebe",370],["etiquette",1],["pochon",1]],[20,780,0,70,10],[0,0]],
["dp_etole_festons","mode","Étole en bandes festonnées","Cou",3,
 [["acryl_bebe",340],["etiquette",1],["pochon",1]],[20,900,120,70,10],[0,0]]
];

var POSTES = [
  {k:"prep",    nom:"Préparation", aide:"patron, choix des couleurs, mise en place"},
  {k:"crochet", nom:"Crochet",     aide:"le travail lui-même"},
  {k:"assemb",  nom:"Assemblage",  aide:"couture des pièces, rembourrage"},
  {k:"finition",nom:"Finition",    aide:"broderie, rentrer les fils, contrôle"},
  {k:"emball",  nom:"Emballage",   aide:"étiquette, photo, préparation du colis"}
];

/* Plateformes. Chiffres = ORDRES DE GRANDEUR, entièrement modifiables dans Réglages.
   annonce = frais fixes de mise en vente · comm = commission sur le prix
   paiePct/paieFixe = frais de traitement du paiement
   offPct/offPart = publicité externe : taux, et part des ventes concernées
   tva = TVA appliquée par la plateforme sur SES frais (20 % en France) */
var CANAUX_DEFAUT = [
  {id:"direct", nom:"Vente en main propre",   annonce:0,    comm:0,    paiePct:0,    paieFixe:0,    offPct:0,  offPart:0, tva:0,
   note:"Aucun intermédiaire."},
  {id:"marche", nom:"Marché / salon",         annonce:2.50, comm:0,    paiePct:0.0175,paieFixe:0,   offPct:0,  offPart:0, tva:0,
   note:"Stand amorti par pièce vendue + terminal de paiement."},
  {id:"insta",  nom:"Instagram + virement",   annonce:0,    comm:0,    paiePct:0,    paieFixe:0,    offPct:0,  offPart:0, tva:0,
   note:"Le temps passé en messages n'est pas un frais : mets-le dans le poste Préparation."},
  {id:"paypal", nom:"Instagram + PayPal",     annonce:0,    comm:0,    paiePct:0.029,paieFixe:0.35, offPct:0,  offPart:0, tva:0,
   note:"Frais de réception de paiement."},
  {id:"etsy",   nom:"Etsy",                   annonce:0.18, comm:0.065,paiePct:0.04, paieFixe:0.30, offPct:0.15,offPart:0.2,tva:20,
   note:"Mise en vente + commission + traitement du paiement + publicité externe, le tout majoré de la TVA sur les frais."},
  {id:"amazon", nom:"Amazon Handmade",        annonce:0,    comm:0.15, paiePct:0,    paieFixe:0,    offPct:0,  offPart:0, tva:20,
   note:"Commission de recommandation."},
  {id:"site",   nom:"Ma boutique en ligne",   annonce:0,    comm:0,    paiePct:0.029,paieFixe:0.30, offPct:0,  offPart:0, tva:0,
   note:"L'abonnement de la boutique va dans les frais fixes mensuels."},
  {id:"depot",  nom:"Dépôt-vente / boutique", annonce:0,    comm:0.35, paiePct:0,    paieFixe:0,    offPct:0,  offPart:0, tva:0,
   note:"La boutique prend sa marge sur le prix affiché."}
];

/* ═════ 2. ÉTAT ═════ */

var KEY = "crochompte-v1";
var state = null;
function vueInitiale(){
  return {tab:"accueil", sub:"matieres", ficheId:null, draft:null, modeleVu:null, catMode:"modeles", patronVu:null,
          filtre:"tous", recherche:"", tri:"famille", fProd:"tous", fCom:"tous", periode:"mois",
          cmQ:"", cmFam:"tous"};
}
var view = vueInitiale();

function uid(){ return Math.random().toString(36).slice(2,9); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }

function modele(id){
  for (var i=0;i<MODELES.length;i++) if (MODELES[i][0]===id) return MODELES[i];
  return MODELES[0];
}
function mNom(m){ return m[2]; }
function mLignes(m){ return m[5].map(function(l){ return {mid:l[0], qte:l[1]}; }); }
function mTemps(m){ return {prep:m[6][0], crochet:m[6][1], assemb:m[6][2], finition:m[6][3], emball:m[6][4]}; }

/* L'historique d'achats d'une matière supprimée est gardé à part : sans
   lui, les dépenses passées disparaissaient des indicateurs. */
function archiverAchats(m){
  var ach = (m.mouv||[]).filter(function(mv){ return mv.t === "entree" && !mv.annule; });
  if (!ach.length) return;
  if (!Array.isArray(state.achatsArchives)) state.achatsArchives = [];
  state.achatsArchives.push({id: m.id, nom: m.nom, unite: m.unite, mouv: ach, le: Date.now()});
}
function retirerMatiere(mid){
  var mm = matiere(mid); if (mm) archiverAchats(mm);
  state.matieres = state.matieres.filter(function(x){ return x.id !== mid; });
  if (MATIERES_DEFAUT.some(function(m){ return m[0] === mid; })){
    if (!state.matieresRetirees) state.matieresRetirees = {};
    state.matieresRetirees[mid] = true;
  }
}
function matieresDefaut(){
  return MATIERES_DEFAUT.map(function(m){
    return {id:m[0], nom:m[1], cat:m[2], prix:m[3], contenance:m[4], unite:m[5],
            stock:0, seuil:0, pmp:m[3]/m[4], mouv:[],
            refCat:null, fibre:"", composition:"", grosseur:m[6]||"", metrage:null,
            crochetMin:null, crochetMax:null, bain:"",
            prixIndicatif:true, perso:false, maj:null};
  });
}

function creationDepuisModele(modeleId, nom, prix, canal){
  var m = modele(modeleId);
  return {id:uid(), nom:nom || (m[0]==="vide" ? "" : mNom(m)), modele:m[0],
          lignes:mLignes(m), temps:mTemps(m), canal:canal||"direct",
          prix:prix||0, expedition:0, seuilFini:0, migre:true, photo:null};
}

function etatInitial(){
  var s = {
    reglages:{tauxHoraire:15, tauxPerte:8, cotisations:12.4, fraisFixes:0, piecesParMois:10,
              baseCout:"dernier", profil:"vend", mode:"simple",
              /* Heures de crochet réellement disponibles par jour : c'est ce
                 qui transforme « 14 commandes » en « tu ne tiendras pas ». */
              heuresParJour:3,
              /* Ce qui figure en haut des factures. Vide au départ : mieux
                 vaut un crochet visible qu'un nom inventé. */
              raisonSociale:"", adresse:"", siret:"", contact:""},
    canaux: clone(CANAUX_DEFAUT),
    matieres: matieresDefaut(),
    creations: [],
    pieces: [],
    commandes: [],
    photosModeles: {},
    chrono: {pid:null, poste:"crochet", debut:null}
  };
  return s;
}

/* Les versions précédentes chargeaient trois créations, onze pièces et des
   achats « d'exemple » à la première ouverture. On les retire des ateliers
   qui les ont encore — sans toucher à rien de ce que l'utilisatrice a saisi :
   seul ce qui porte la marque « exemple » part. */
function purgerExemples(s){
  var exIds = {};
  (s.creations||[]).forEach(function(c){ if (c.exemple) exIds[c.id] = true; });
  s.creations = (s.creations||[]).filter(function(c){ return !c.exemple; });
  s.creations.forEach(function(c){ delete c.exemple; });
  s.pieces = (s.pieces||[]).filter(function(p){ return !p.exemple && !exIds[p.cid]; });
  (s.commandes||[]).forEach(function(c){ if (c.cid && exIds[c.cid]) c.cid = null; });
  (s.matieres||[]).forEach(function(m){
    if (!Array.isArray(m.mouv)) return;
    var avant = m.mouv.length;
    m.mouv = m.mouv.filter(function(mv){ return mv.n !== "Achat d'exemple"; });
    /* Le stock de départ (600 g de coton, 800 g de ouate) n'existait que pour
       ces achats fictifs. S'il n'y a eu aucun autre mouvement, on le remet à 0. */
    if (m.mouv.length < avant && !m.mouv.length) m.stock = 0;
  });
  return s;
}

/* Reprend une sauvegarde d'une version antérieure sans rien perdre. */
/* Remet chaque donnée dans sa forme attendue : une sauvegarde ancienne,
   abîmée ou trafiquée (restaurée depuis un fichier) ne doit ni faire planter
   un écran, ni glisser du texte là où l'application attend un nombre (ce
   texte finirait dans une page). */
function nombre(v, defaut){ var n = Number(v); return isFinite(n) ? n : (defaut === undefined ? 0 : defaut); }
function texte(v){ return v === null || v === undefined ? "" : String(v); }
function objets(l){ return Array.isArray(l) ? l.filter(function(x){ return x && typeof x === "object" && !Array.isArray(x); }) : []; }
/* Une valeur hors limites (importée, synchronisée ou d'une vieille version)
   ne doit jamais produire un prix négatif ou « 1e+21 € ». */
var LIMITES_REGLAGES = {tauxHoraire:[0,1000], tauxPerte:[0,60], cotisations:[0,50], fraisFixes:[0,100000],
                        piecesParMois:[0,100000], heuresParJour:[0,24], heuresIndirectesMois:[0,400]};
/* « 0 création », « 1 création », « 2 créations » : en français, zéro et un
   s'écrivent au singulier. */
function pluriel(n, sing, plur){ return n + " " + (Math.abs(n) > 1 ? (plur || sing + "s") : sing); }
function borne(v, min, max){ v = nombre(v); if (v < min) v = min; if (max !== undefined && v > max) v = max; return v; }
function idsUniques(liste, prefixe){
  var vus = {};
  liste.forEach(function(x){ if (!x.id || vus[x.id]) x.id = prefixe + uid(); vus[x.id] = true; });
}
function assainir(s){
  if (!s.reglages || typeof s.reglages !== "object" || Array.isArray(s.reglages)) s.reglages = {};
  var r = s.reglages;
  var LIM = LIMITES_REGLAGES;
  Object.keys(LIM).forEach(function(k){
    if (r[k] !== undefined) r[k] = borne(r[k], LIM[k][0], LIM[k][1]);
  });
  ["raisonSociale","adresse","siret","contact"].forEach(function(k){ if (r[k] !== undefined) r[k] = texte(r[k]); });
  s.canaux = objets(s.canaux);
  s.marches = objets(s.marches).map(function(m){ return {id:texte(m.id) || ("mk_" + uid()), date:texte(m.date), lieu:texte(m.lieu), frais:borne(m.frais, 0, 100000), note:texte(m.note)}; });
  s.canaux.forEach(function(c){
    c.id = texte(c.id) || ("canal_" + uid()); c.nom = texte(c.nom);
    ["annonce","paieFixe"].forEach(function(f){ c[f] = borne(c[f], 0, 10000); });
    ["comm","paiePct","offPct","offPart"].forEach(function(f){ c[f] = borne(c[f], 0, 1); });
    c.tva = borne(c.tva, 0, 30);
  });
  s.matieres = objets(s.matieres);
  s.matieres.forEach(function(m){
    m.id = texte(m.id) || ("m_" + uid()); m.nom = texte(m.nom); m.unite = texte(m.unite) || "g";
    m.prix = borne(m.prix, 0, 1e6); m.seuil = borne(m.seuil, 0, 1e7); m.stock = nombre(m.stock);
    m.contenance = nombre(m.contenance, 1) > 0 ? nombre(m.contenance, 1) : 1;
    if (m.pmp !== undefined) m.pmp = nombre(m.pmp);
    m.mouv = objets(m.mouv);
    m.offres = objets(m.offres);
    m.offres.forEach(function(o){ o.fid = texte(o.fid); o.prix = borne(o.prix, 0, 1e6); o.contenance = borne(o.contenance, 0, 1e7);
                                  o.lien = texte(o.lien); o.hist = objets(o.hist); });
  });
  s.fournisseurs = objets(s.fournisseurs);
  s.fournisseurs.forEach(function(f){ f.id = texte(f.id) || ("f_" + uid()); f.nom = texte(f.nom); f.site = texte(f.site); f.note = texte(f.note); });
  idsUniques(s.fournisseurs, "f_");
  s.creations = objets(s.creations);
  s.creations.forEach(function(c){
    c.id = texte(c.id) || uid(); c.nom = texte(c.nom);
    c.prix = borne(c.prix, 0, 1e7); c.expedition = borne(c.expedition, 0, 1e6); c.seuilFini = borne(c.seuilFini, 0, 1e6);
    c.lignes = objets(c.lignes);
    c.lignes.forEach(function(l){ l.mid = texte(l.mid); l.qte = borne(l.qte, 0, 1e7); });
    if (!c.temps || typeof c.temps !== "object" || Array.isArray(c.temps)) c.temps = {};
    for (var k in c.temps) c.temps[k] = borne(c.temps[k], 0, 1e6);
  });
  s.pieces = objets(s.pieces);
  s.pieces.forEach(function(p){
    if (p.prix !== null && p.prix !== undefined) p.prix = borne(p.prix, 0, 1e7);
    p.coutFige = nombre(p.coutFige);
    p.client = texte(p.client);
    if (p.paiement !== undefined) p.paiement = texte(p.paiement);
    if (p.marche !== undefined && p.marche !== null) p.marche = texte(p.marche);
  });
  s.commandes = objets(s.commandes);
  s.commandes.forEach(function(c){
    if (!c.client || typeof c.client !== "object") c.client = {nom:"", contact:"", note:""};
    c.prixConvenu = borne(c.prixConvenu, 0, 1e7); c.fraisLivraison = borne(c.fraisLivraison, 0, 1e6);
    c.heuresEstimees = borne(c.heuresEstimees, 0, 1e5);
    if (!c.versement || typeof c.versement !== "object") c.versement = {montant:0, date:null, type:"acompte"};
    c.versement.montant = borne(c.versement.montant, 0, 1e7);
    c.paiements = objets(c.paiements);
    c.paiements.forEach(function(p){ p.montant = nombre(p.montant); });   /* négatif permis : annulation, remboursement */
    c.journal = objets(c.journal);
    if (["devis","acceptee","encours","terminee","livree","annulee"].indexOf(c.statut) === -1) c.statut = "devis";
    c.qte = c.qte === undefined ? 1 : Math.max(1, Math.round(borne(c.qte, 1, 10000)));
    c.articles = objets(c.articles);
    c.articles.forEach(function(a){ a.id = texte(a.id) || ("art_" + uid()); a.cid = texte(a.cid) || null; a.d = texte(a.d); a.s = texte(a.s);
                                    a.q = Math.max(0, Math.round(borne(a.q, 0, 10000))); a.pu = borne(a.pu, 0, 1e7); });
    c.refClient = texte(c.refClient);
  });
  /* Deux éléments avec le même identifiant : supprimer l'un supprimait
     l'autre. Chacun reçoit un identifiant propre. */
  idsUniques(s.matieres, "m_"); idsUniques(s.creations, "c_"); idsUniques(s.pieces, "p_"); idsUniques(s.commandes, "cmd_");
  s.registreFactures = objets(s.registreFactures);
  s.patrons = objets(s.patrons);
  s.patrons.forEach(function(p){ p.pages = objets(p.pages); p.rang = nombre(p.rang); p.texte = texte(p.texte); p.titre = texte(p.titre); });
  if (!s.photosModeles || typeof s.photosModeles !== "object" || Array.isArray(s.photosModeles)) s.photosModeles = {};
  /* Une ancienne erreur enregistrait « [object Object] » comme licence. */
  for (var k2 in s.photosModeles){
    var f = s.photosModeles[k2];
    if (!f || typeof f !== "object"){ delete s.photosModeles[k2]; continue; }
    ["licencePhoto","licencePatron"].forEach(function(c){ if (f[c] === "[object Object]") f[c] = ""; });
  }
  return s;
}

function migrer(s){
  assainir(s);
  if (!s.reglages) s.reglages = {};
  var rd = {tauxHoraire:15, tauxPerte:8, cotisations:12.4, fraisFixes:0, piecesParMois:10, heuresIndirectesMois:0,
            baseCout:"dernier", profil:"vend", mode:"simple"};
  for (var k in rd) if (s.reglages[k] === undefined) s.reglages[k] = rd[k];
  if (s.reglages.profilType !== undefined && !PROFILS.some(function(p){ return p.id === s.reglages.profilType; })) delete s.reglages.profilType;
  if (!Array.isArray(s.canaux) || !s.canaux.length) s.canaux = clone(CANAUX_DEFAUT);
  else {
    // complète les canaux anciens et ajoute les nouveaux
    var vus = {};
    s.canaux.forEach(function(c){
      vus[c.id] = true;
      ["annonce","comm","paiePct","paieFixe","offPct","offPart","tva"].forEach(function(f){
        if (typeof c[f] !== "number") c[f] = 0;
      });
    });
    CANAUX_DEFAUT.forEach(function(c){ if (!vus[c.id]) s.canaux.push(clone(c)); });
  }
  if (!Array.isArray(s.matieres)) s.matieres = matieresDefaut();
  if (!Array.isArray(s.fournisseurs)) s.fournisseurs = [];
  var connues = {};
  s.matieres.forEach(function(m){
    connues[m.id] = true;
    if (typeof m.stock !== "number") m.stock = 0;
    if (typeof m.seuil !== "number") m.seuil = 0;
    if (typeof m.pmp !== "number" || !isFinite(m.pmp) || m.pmp <= 0) m.pmp = m.contenance ? m.prix/m.contenance : 0;
    if (!Array.isArray(m.mouv)) m.mouv = [];
    if (m.prixIndicatif === undefined) m.prixIndicatif = !m.perso;
    if (m.perso === undefined) m.perso = false;
    if (m.refCat === undefined) m.refCat = null;
  });
  /* Les matières de départ ajoutées depuis sont proposées — sauf celles que
     la personne a supprimées : elles ne doivent pas revenir au rechargement. */
  if (!s.matieresRetirees || typeof s.matieresRetirees !== "object") s.matieresRetirees = {};
  matieresDefaut().forEach(function(m){ if (!connues[m.id] && !s.matieresRetirees[m.id]) s.matieres.push(m); });
  if (!Array.isArray(s.creations)) s.creations = [];
  if (!Array.isArray(s.pieces)) s.pieces = [];
  s.creations.forEach(function(c){
    if (typeof c.expedition !== "number") c.expedition = 0;
    if (typeof c.seuilFini !== "number") c.seuilFini = 0;
    if (c.photo === undefined) c.photo = null;
    // v3 comptait des quantités ; v4 suit des pièces individuelles.
    if (typeof c.stockFini === "number" && c.stockFini > 0 && !c.migre){
      for (var i=0;i<c.stockFini;i++){
        s.pieces.push({id:uid(), cid:c.id, prod:"termine", com:"atelier", cree:Date.now(), maj:Date.now(),
                       termineLe:Date.now(), venduLe:null, prix:null, canal:c.canal, client:"", note:"",
                       sortie:true, coutFige:0});
      }
    }
    if (Array.isArray(c.mouvFini) && !c.migre){
      c.mouvFini.forEach(function(mv){
        if (mv.t === "vente"){
          for (var j=0;j<mv.q;j++){
            s.pieces.push({id:uid(), cid:c.id, prod:"termine", com:"vendu", cree:mv.d, maj:mv.d,
                           termineLe:mv.d, venduLe:mv.d, prix:mv.pu||0, canal:c.canal, client:"", note:"",
                           sortie:true, coutFige:0});
          }
        }
      });
    }
    c.migre = true; c.stockFini = 0; c.mouvFini = [];
  });
  /* Les commandes d'avant la V38 reçoivent leur numéro, dans l'ordre où
     elles ont été passées (une série par année). */
  if (Array.isArray(s.commandes) && s.commandes.some(function(c){ return !c.num; })){
    var compteur = (s.reglages.compteurCommandes && typeof s.reglages.compteurCommandes === "object") ? s.reglages.compteurCommandes : {};
    s.commandes.forEach(function(c){ var m = String(c.num || "").match(/^C-(\d{4})-(\d+)$/);
      if (m) compteur[m[1]] = Math.max(Number(compteur[m[1]]) || 0, Number(m[2])); });
    s.commandes.filter(function(c){ return !c.num; })
      .sort(function(a, b){ return String(a.dateCommande || "").localeCompare(String(b.dateCommande || "")); })
      .forEach(function(c){
        var an = Number(String(c.dateCommande || "").slice(0, 4)) || new Date().getFullYear();
        compteur[an] = (Number(compteur[an]) || 0) + 1;
        c.num = "C-" + an + "-" + String(compteur[an]).padStart(4, "0");
      });
    s.reglages.compteurCommandes = compteur;
  }
  purgerExemples(s);
  delete s.vuAccueil;   /* l'accueil est désormais toujours le premier écran */
  if (!s.photosModeles || typeof s.photosModeles !== "object") s.photosModeles = {};
  if (!s.chrono || typeof s.chrono !== "object") s.chrono = {pid:null, poste:"crochet", debut:null};
  s.pieces.forEach(function(p){
    if (!p.mesure) p.mesure = {prep:0, crochet:0, assemb:0, finition:0, emball:0};
    if (!Array.isArray(p.sessions)) p.sessions = [];
  });
  return s;
}
/* Les ventes et livraisons d'avant cette version n'étaient pas figées : on
   les fige une fois, avec les chiffres connus aujourd'hui (marqué « estimé »),
   pour qu'elles ne bougent plus ensuite. */
function figerHistorique(){
  var fait = 0;
  (state.pieces || []).forEach(function(p){
    if (p.com !== "vendu" || p.fige) return;
    var cr = creation(p.cid); if (!cr) return;
    p.fige = figerVente(cr, Number(p.prix)||0, p.canal || cr.canal, minutesMesurees(p) > 0 ? minutesReellesPiece(p, cr) : 0); p.fige.estime = true; fait++;
  });
  commandes().forEach(function(c){
    if (c.statut !== "livree" || c.bilanFige) return;
    var b = bilanCommande(c, true); if (!b) return;
    b.estime = true; c.bilanFige = b; fait++;
  });
  return fait;
}

function charger(){
  try{
    var raw = localStorage.getItem(KEY);
    if (!raw){
      // Reprise depuis l'ancien nom de l'application (« Atelier Juste Prix »),
      // pour qu'un renommage ne fasse perdre les données de personne.
      raw = localStorage.getItem("atelier-juste-prix-v1");
    }
    if (raw){
      var p = JSON.parse(raw);
      if (p && p.matieres && p.creations) return migrer(p);
    }
  }catch(e){}
  return etatInitial();
}
/* Écrire l'atelier dans ce navigateur. Si la mémoire de l'appareil est
   pleine, on le dit une fois, clairement : se taire, c'était perdre en
   silence tout ce qui serait saisi ensuite. */
var tSauve = null, avertiMemoire = false;
/* memoireOk : la dernière écriture de l'atelier dans ce navigateur a-t-elle
   réussi ? Si non, la copie locale est en retard sur ce qu'on voit : le
   module de comptes ne doit pas la croire « à jour » au prochain démarrage. */
var memoireOk = true;
function ecrireLocal(){
  if (tSauve){ clearTimeout(tSauve); tSauve = null; }
  try{ localStorage.setItem(KEY, JSON.stringify(state)); avertiMemoire = false; memoireOk = true; return true; }
  catch(e){
    memoireOk = false;
    if (!avertiMemoire){
      avertiMemoire = true;
      setTimeout(function(){
        toast("La mémoire de cet appareil est pleine : tes dernières modifications n'y sont pas enregistrées. "+
              "Elles partent quand même en ligne tant que ta session est ouverte. Supprime des patrons ou des photos inutiles.");
      }, 0);
    }
    return false;
  }
}
/* Modification courante (frappe dans un champ) : écriture groupée, et
   signal au module de comptes pour qu'elle parte aussi en ligne. */
function sauver(){
  if (tSauve) clearTimeout(tSauve);
  tSauve = setTimeout(ecrireLocal, 250);
  signalerModification();
}
function signalerModification(){
  if (modeHorsLigne) marquer(CLE_AENVOYER, {depuis: Date.now(), uid: uidSession()});
  if (window.CrochompteSync && window.CrochompteSync.signaler) window.CrochompteSync.signaler();
}
/* À la sortie de la page : écrire ce qui attendait encore — sans rien
   déclarer comme modifié (ce n'en est pas une). */
function ecrireEnAttente(){ if (tSauve) ecrireLocal(); }
/* ═════ MÉMOIRE DE SESSION ET FILE D'ATTENTE ═════
   Deux petites marques posées dans ce navigateur, lues au démarrage suivant.

   « session » : cet appareil a déjà ouvert un compte ici. Elle autorise
   l'atelier à s'ouvrir quand le module de connexion ne se charge pas — sur un
   marché sans réseau, l'artisane doit pouvoir noter sa vente. Les données sont
   déjà dans ce navigateur : ne pas les montrer ne protège personne, ça bloque
   seulement leur propriétaire.

   « aEnvoyer » : du travail fait ici n'est pas encore parti sur le serveur.
   Sans elle, une modification faite hors ligne puis un rechargement faisaient
   descendre la version du serveur par-dessus (elle était archivée, donc
   récupérable — mais il fallait le savoir). Avec elle, le module sait qu'il
   doit envoyer avant de regarder ailleurs. */
var CLE_SESSION  = KEY + ".session";
var CLE_AENVOYER = KEY + ".aEnvoyer";
var CLE_COMPTE   = KEY + ".compte";
function marquer(cle, valeur){
  try{
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(valeur));
  }catch(e){}
}
function marque(cle){
  try{ var v = localStorage.getItem(cle); return v ? JSON.parse(v) : null; }catch(e){ return null; }
}
/* Le compte qui a ouvert l'atelier dans ce navigateur la dernière fois. */
function uidSession(){ var m = marque(CLE_SESSION); return m && m.uid || null; }
function sauverTout(){
  oublierIndex();
  ecrireLocal();
  signalerModification();
}

/* ═════ PONT DE SYNCHRONISATION ═════
   L'application fonctionne seule, sans compte et sans réseau : tout vit dans
   ce navigateur. Un module externe (sync.js) peut se brancher ici pour ajouter
   des comptes et la synchronisation entre appareils. S'il est absent, rien ne
   change — c'est ce qui permet de servir la même application en ligne publique
   et en version hébergée avec comptes. */
function normaliser(){ if (typeof migrer === "function") migrer(state); }
window.CrochomptePont = {
  cle: KEY,
  version: 1,
  lire: function(){ return state; },
  ecrire: function(nouvel){
    if (!nouvel || typeof nouvel !== "object") return false;
    state = nouvel;
    normaliser();
    ecrireLocal();   /* prévient si la mémoire est pleine (memoireOk = false) */
    render();
    return true;
  },
  memoireOk: function(){ return memoireOk; },
  photo: {
    lire: function(id){ return lirePhoto(id); },
    ecrire: function(id, blob){ return ecrirePhoto(id, blob); },
    lister: function(){
      var ids = [];
      (state.creations||[]).forEach(function(c){ if (c.photo) ids.push(c.photo); });
      (state.pieces||[]).forEach(function(x){ if (x.photo) ids.push(x.photo); });
      for (var k in (state.photosModeles||{}))
        if (state.photosModeles[k] && state.photosModeles[k].photo) ids.push(state.photosModeles[k].photo);
      (state.patrons||[]).forEach(function(p){
        (p.pages||[]).forEach(function(pg){ if (pg.photo) ids.push(pg.photo); }); });
      return ids;
    }
  },
  surZoneCompte: function(fn){ pontCompte = fn; },
  /* Le compte à qui appartient l'atelier gardé dans ce navigateur. Si une
     autre personne se connecte ici, elle part d'un atelier vierge : jamais
     de celui de la précédente (qui est déjà enregistré dans son compte). */
  ouvrirCompte: function(uid){
    var avant = marque(CLE_COMPTE);
    if (avant && uid && avant !== uid){
      /* Du travail de la personne précédente pas encore parti ? On le met de
         côté (jamais dans ce compte-ci), et il repartira quand elle se
         reconnectera ici. */
      var att = marque(CLE_AENVOYER);
      if (att && att.uid === avant){
        try{ localStorage.setItem(KEY + ".enAttente." + avant, JSON.stringify({le: Date.now(), s: state})); }catch(e){}
      }
      /* Ses photos pas encore en ligne restent aussi sur l'appareil (elles
         ne sont montrées à personne d'autre) ; les autres sont effacées. */
      var garderPhotos = {};
      try{
        var pe = JSON.parse(localStorage.getItem("crochompte-v1.photosEnvoyees") || "null");
        var envoyees = (pe && pe.uid === avant && pe.ids) || {};
        window.CrochomptePont.photo.lister().forEach(function(id){ if (id && !envoyees[id]) garderPhotos[id] = 1; });
      }catch(e){}
      state = etatInitial();
      marquer(CLE_AENVOYER, null);
      viderPhotosLocales(garderPhotos);
      view = vueInitiale();
    }
    if (uid){
      var cle = KEY + ".enAttente." + uid;
      var misDeCote = null;
      try{ misDeCote = localStorage.getItem(cle); }catch(e){}
      if (misDeCote){
        try{
          var mc = JSON.parse(misDeCote);
          var donneesMC = mc && mc.s ? mc.s : mc;   /* ancien format : l'atelier directement */
          state = migrer(donneesMC); marquer(CLE_AENVOYER, {depuis: Date.now(), uid: uid});
        }catch(e){}
        try{ localStorage.removeItem(cle); }catch(e){}
      }
      marquer(CLE_COMPTE, uid);
      /* Ce qui a été mis de côté pour une autre personne (données de ses
         clientes comprises) ne reste pas indéfiniment dans ce navigateur :
         au-delà de 60 jours sans reconnexion, on l'efface. */
      try{
        for (var ki = localStorage.length - 1; ki >= 0; ki--){
          var k = localStorage.key(ki);
          if (!k || k.indexOf(KEY + ".enAttente.") !== 0) continue;
          var v = JSON.parse(localStorage.getItem(k) || "null");
          if (v && !v.le){ localStorage.setItem(k, JSON.stringify({le: Date.now(), s: v})); continue; }   /* ancien format : le délai part d'aujourd'hui */
          if (!v || Date.now() - v.le > 60 * 864e5) localStorage.removeItem(k);
        }
      }catch(e){}
    }
    ecrireLocal();
  },
  /* Déconnexion ou suppression du compte : l'atelier quitte ce navigateur,
     photos comprises (tout le magasin, pas seulement celles de l'atelier). */
  oublierAtelier: function(){
    viderPhotosLocales();
    oublierBrouillon();
    state = etatInitial();
    try{ localStorage.removeItem(KEY); }catch(e){}
    marquer(CLE_COMPTE, null);
    marquer(CLE_AENVOYER, null);
    view = vueInitiale();
  },
  estVierge: function(){
    return !state.creations.length && !state.pieces.length && !commandes().length && !patrons().length;
  },
  confirmer: function(o, siOui){ confirmer(o, siOui); },
  moduleIndisponible: function(){
    if (etatAcces.recu) return;
    if (minuteurChargement){ clearTimeout(minuteurChargement); minuteurChargement = null; }
    renderErreurChargement();
  },
  redessiner: function(){ render(); },
  toast: function(m){ toast(m); },
  /* sync.js appelle ceci chaque fois que l'état de connexion est connu ou
     change : {exige:true} veut dire « ce déploiement demande un compte pour
     utiliser l'outil », {connecte:true/false} l'état actuel. Tant que rien
     n'a jamais été annoncé, l'application attend (renderChargement) au lieu
     de montrer quoi que ce soit. */
  definirEtatConnexion: function(info){ definirEtatConnexion(info); },
  /* sync.js dit qui est connectée, pour l'en-tête ({connecte, pseudo}). */
  definirCompte: function(info){ definirCompte(info); },
  /* sync.js dépose ici de quoi lire et publier la bibliothèque partagée.
     Tant qu'il ne l'a pas fait — installation sans compte, module non chargé —
     la bibliothèque n'existe simplement pas dans l'interface, plutôt que
     d'afficher des boutons qui ne feraient rien. */
  definirBibliotheque: function(api){
    bibliothequePartagee = api;
    /* Jamais d'affichage de l'atelier avant de savoir si la personne est
       connectée : on ne redessine que l'écran déjà autorisé. */
    if (etatAcces.recu) renderRacine();
  }
};
var pontCompte = null;
var bibliothequePartagee = null;

/* ═════ 3. MOTEUR DE CALCUL ═════ */

function matiere(mid){
  for (var i=0;i<state.matieres.length;i++) if (state.matieres[i].id===mid) return state.matieres[i];
  return null;
}
/* Coût d'une unité : dernier prix payé, ou coût moyen pondéré selon le réglage. */
function pu(m){
  if (!m) return 0;
  if (state.reglages.baseCout === "pmp" && isFinite(m.pmp) && m.pmp > 0) return m.pmp;
  if (state.reglages.baseCout === "moinsCher"){ var b = meilleureOffre(m); if (b) return puOffre(b, m); }
  return m.contenance ? m.prix / m.contenance : 0;
}
function canal(id){
  for (var i=0;i<state.canaux.length;i++) if (state.canaux[i].id===id) return state.canaux[i];
  return state.canaux[0];
}
/* Taux et fixes réellement prélevés, TVA de la plateforme comprise. */
function fraisCanal(cn){
  var tva = 1 + (Number(cn.tva)||0)/100;
  return {
    pct:  ((Number(cn.comm)||0) + (Number(cn.paiePct)||0) + (Number(cn.offPct)||0)*(Number(cn.offPart)||0)) * tva,
    fixe: ((Number(cn.annonce)||0) + (Number(cn.paieFixe)||0)) * tva
  };
}

function calculer(cr){
  var r = state.reglages;
  var consommable = 0, emballage = 0, sansPerte = 0, detail = [];
  for (var i=0;i<cr.lignes.length;i++){
    var l = cr.lignes[i], m = matiere(l.mid);
    if (!m) continue;
    var c = pu(m) * (Number(l.qte)||0);
    detail.push({mid:m.id, nom:m.nom, cout:c});
    if (m.cat === "fin") emballage += c;
    else { consommable += c; if (!avecPerte(m)) sansPerte += c; }
  }
  /* Règle des centimes : chaque ligne affichée est arrondie au centime, et
     le reste est calculé à partir de ces lignes arrondies. Ce qu'on lit à
     l'écran s'additionne donc toujours exactement. */
  consommable = cts(consommable); emballage = cts(emballage);
  var perte = cts((consommable - sansPerte) * (Number(r.tauxPerte)||0)/100);
  var matieres = cts(consommable + perte + emballage);

  var minutes = 0;
  for (var k in cr.temps) if (Object.prototype.hasOwnProperty.call(cr.temps,k)) minutes += Math.max(0, Number(cr.temps[k])||0);
  var piecesMois = Number(r.piecesParMois)||0;
  /* Le temps passé hors crochet (photos, messages, comptabilité, marchés)
     est aussi du travail : réparti sur les pièces du mois, comme les frais
     fixes. 0 par défaut. */
  var minutesIndirectes = (Number(r.heuresIndirectesMois)||0) * 60 / Math.max(1, piecesMois);
  var heures = (minutes + minutesIndirectes)/60;
  var mainOeuvre = cts(heures * (Number(r.tauxHoraire)||0));

  /* 0 pièce par mois n'efface pas les frais fixes : on les compte sur une. */
  var fixePiece = cts((Number(r.fraisFixes)||0) / Math.max(1, piecesMois));

  var cn = canal(cr.canal), f = fraisCanal(cn);
  var prix = cts(Math.max(0, Number(cr.prix)||0)), expe = Math.max(0, Number(cr.expedition)||0);
  var tauxCotis = (Number(r.cotisations)||0)/100;

  var cotisations = cts(prix * tauxCotis);
  var fraisVar = cts(prix * f.pct);
  var fraisFixesVente = cts(f.fixe + expe);

  var reste = cts(prix - (matieres + fixePiece + fraisFixesVente + fraisVar + cotisations));
  var gainHoraire = heures > 0 ? reste/heures : 0;

  /* Prix juste et prix plancher sont arrondis au centime SUPÉRIEUR : vendre
     au prix affiché ne doit jamais donner « à perte » pour un centime. */
  var denom = 1 - tauxCotis - f.pct;
  var impossible = denom <= 0;
  var prixObjectif = !impossible ? ceilCts((matieres + fixePiece + fraisFixesVente + mainOeuvre)/denom) : 0;
  var prixPlancher = !impossible ? ceilCts((matieres + fixePiece + fraisFixesVente)/denom) : 0;
  /* Vérification après arrondis : au prix affiché, le reste doit vraiment
     couvrir ce qui est promis (sinon on ajoute un centime). */
  function resteA(px){ return cts(px - (matieres + fixePiece + fraisFixesVente + cts(px * f.pct) + cts(px * tauxCotis))); }
  var mainOeuvreBrute = heures * (Number(r.tauxHoraire)||0);
  for (var e1 = 0; !impossible && e1 < 5 && resteA(prixObjectif) + 0.0001 < mainOeuvreBrute; e1++) prixObjectif = cts(prixObjectif + 0.01);
  for (var e2 = 0; !impossible && e2 < 5 && resteA(prixPlancher) < 0; e2++) prixPlancher = cts(prixPlancher + 0.01);
  var coutRevient = cts(matieres + fixePiece + fraisFixesVente + fraisVar + cotisations + mainOeuvre);

  return {detail:detail, consommable:consommable, perte:perte, emballage:emballage, matieres:matieres,
          minutes:minutes, minutesIndirectes:minutesIndirectes, heures:heures, mainOeuvre:mainOeuvre, fixePiece:fixePiece,
          fraisVar:fraisVar, fraisFixesVente:fraisFixesVente, cotisations:cotisations,
          reste:reste, gainHoraire:gainHoraire, prixObjectif:prixObjectif, impossible:impossible,
          prixPlancher:prixPlancher, coutRevient:coutRevient, frais:cts(matieres + fixePiece + fraisFixesVente + fraisVar + cotisations), prix:prix,
          pctVente:f.pct, tauxCotis:tauxCotis};
}

/* Ce qu'il faut ACHETER pour fabriquer n exemplaires : conditionnements entiers,
   argent réellement sorti, et ce qui restera en stock après. */
function besoinAchat(cr, n, tenirCompteStock){
  n = Math.max(1, Number(n)||1);
  var lignes = [], investi = 0, consomme = 0, resteValeur = 0;
  var agrege = {};
  /* Les chutes et la marge de sécurité (taux de perte des réglages) comptent
     aussi dans ce qu'il faut acheter — comme dans le prix de revient. Les
     petites fournitures et l'emballage n'en ont pas. */
  var perte = 1 + (Number(state.reglages.tauxPerte)||0)/100;
  cr.lignes.forEach(function(l){
    var m0 = matiere(l.mid);
    if (!agrege[l.mid]) agrege[l.mid] = 0;
    agrege[l.mid] += (Number(l.qte)||0) * n * (avecPerte(m0) ? perte : 1);
  });
  Object.keys(agrege).forEach(function(mid){
    var m = matiere(mid); if (!m) return;
    var besoin = agrege[mid];
    var dispo = tenirCompteStock ? Math.max(0, Number(m.stock)||0) : 0;
    var manque = Math.max(0, besoin - dispo);
    var cond = m.contenance > 0 ? Math.ceil(manque / m.contenance) : 0;
    var qteAchetee = cond * m.contenance;
    var coutAchat = cond * m.prix;
    var coutConso = besoin * pu(m);
    var apres = dispo + qteAchetee - besoin;
    investi += coutAchat; consomme += coutConso; resteValeur += Math.max(0, apres) * pu(m);
    lignes.push({mid:mid, nom:m.nom, unite:m.unite, besoin:besoin, dispo:dispo, manque:manque,
                 cond:cond, qteAchetee:qteAchetee, coutAchat:coutAchat, coutConso:coutConso, apres:apres,
                 conditionnement:m.contenance, prixCond:m.prix});
  });
  lignes.sort(function(a,b){ return b.coutAchat - a.coutAchat; });
  return {n:n, lignes:lignes, investi:investi, consomme:consomme, resteValeur:resteValeur};
}

/* ═════ 4. STOCK ═════ */

/* Chaque mouvement garde l'état d'AVANT (stock, prix moyen, dernier prix) :
   c'est ce qui permet d'expliquer « pourquoi mon stock est passé de 25 à
   17 », et d'annuler proprement une erreur de saisie. Le journal n'est plus
   tronqué : un achat ancien ne disparaît ni du journal ni des indicateurs. */
function mouvementMatiere(m, type, qte, prixTotal, note, extra){
  extra = extra || {};
  qte = Number(qte)||0;
  if (!Array.isArray(m.mouv)) m.mouv = [];
  var stockAvant = Number(m.stock)||0, pmpAvant = Number(m.pmp)||0, prixAvant = Number(m.prix)||0;
  var cout = null, estime = false;
  var puCatalogue = m.contenance ? m.prix/m.contenance : 0;
  if (type === "entree"){
    if (typeof prixTotal === "number" && prixTotal > 0) cout = prixTotal;
    else { cout = qte * puCatalogue; estime = true; }   /* prix inconnu : estimé au prix de la fiche, et signalé */
    var stockApres = stockAvant + qte;
    /* Stock négatif (consommé avant d'avoir noté l'achat) : l'achat couvre
       d'abord ce manque ; le prix moyen ne porte que sur ce qui est vraiment là. */
    if (stockAvant > 0 && stockApres > 0) m.pmp = (stockAvant * pmpAvant + cout) / stockApres;
    else m.pmp = qte > 0 ? cout / qte : puCatalogue;
    m.stock = stockApres;
    if (qte > 0 && !estime && m.contenance > 0){
      m.prix = Math.round((cout / qte) * m.contenance * 100)/100;   /* le dernier prix payé devient la référence */
    }
    /* Acheté chez un fournisseur connu : son tarif est mis à jour avec le
       prix réellement payé (l'ancien reste dans son historique). */
    if (extra.fid && fournisseur(extra.fid)){
      var oAv = offreDe(m, extra.fid);
      extra.offreAv = oAv ? clone(oAv) : null;
      if (qte > 0 && !estime) noterOffre(m, extra.fid, (cout / qte) * (Number(m.contenance)||1), m.contenance, "achat");
      m.fournisseur = extra.fid;
    }
  } else if (type === "sortie" || type === "perte"){
    m.stock = stockAvant - qte;
  } else if (type === "correction"){
    /* Pesée en fin d'ouvrage : qte est l'écart (positif = du fil revient au
       stock, négatif = il en a fallu plus que prévu). */
    m.stock = stockAvant + qte;
  } else if (type === "inventaire"){
    m.stock = Math.max(0, qte);
  }
  var puMouv = null;
  if (type === "entree") puMouv = qte > 0 ? cout / qte : puCatalogue;
  else if (type === "sortie" || type === "perte" || type === "correction") puMouv = pmpAvant || puCatalogue || null;
  else if (type === "inventaire") puMouv = pmpAvant || puCatalogue || null;
  var ecart = type === "inventaire" ? (Number(m.stock) - stockAvant) : null;
  m.mouv.unshift({
    id: "mv_" + uid(),
    d: Date.now(), t: type, q: qte,
    p: type === "entree" ? cout : ((type === "sortie" || type === "perte" || type === "correction") && puMouv ? puMouv * qte : (type === "inventaire" && puMouv ? puMouv * ecart : null)),
    pu: puMouv,
    est: estime || undefined,
    sav: stockAvant, pmpav: pmpAvant, prixav: prixAvant,
    ecart: ecart,
    sa: Number(m.stock) || 0,
    pmp: Number(m.pmp) || null,
    n: note || "",
    f: extra.fid || undefined, bain: extra.bain || undefined, motif: extra.motif || undefined,
    pid: extra.pid || undefined, offreAv: extra.fid ? (extra.offreAv || null) : undefined
  });
  return m.mouv[0];
}
/* Annule le DERNIER mouvement d'une matière : on remet exactement l'état
   d'avant, et le journal garde la trace des deux lignes. Un mouvement plus
   ancien ne s'annule pas (les suivants en dépendent) : on le corrige par un
   inventaire. */
function peutAnnulerMouvement(m, mv){
  if (!mv || mv.annule || mv.t === "annulation" || typeof mv.sav !== "number") return false;
  for (var i = 0; i < m.mouv.length; i++){
    var x = m.mouv[i];
    if (x.t === "annulation" || x.annule) continue;
    return x === mv;
  }
  return false;
}
function annulerMouvement(m, mv){
  if (!peutAnnulerMouvement(m, mv)) return false;
  m.stock = mv.sav; m.pmp = mv.pmpav; if (typeof mv.prixav === "number") m.prix = mv.prixav;
  /* Le tarif du fournisseur revient aussi à ce qu'il était avant l'achat. */
  if (mv.t === "entree" && mv.f){
    m.offres = offresDe(m).filter(function(o){ return o.fid !== mv.f; });
    if (mv.offreAv) m.offres.push(clone(mv.offreAv));
  }
  mv.annule = Date.now();
  m.mouv.unshift({id:"mv_" + uid(), d: Date.now(), t:"annulation", q: mv.q, p:null, pu:null, sa: Number(m.stock)||0,
                  pmp: Number(m.pmp)||null, ref: mv.id, n: "Annulation : " + ({entree:"achat", sortie:"utilisation", perte:"perte", correction:"pesée", inventaire:"inventaire"}[mv.t] || mv.t) +
                  " du " + new Date(mv.d).toLocaleDateString("fr-FR")});
  return true;
}

function valeurStockMatieres(){
  var v = 0;
  state.matieres.forEach(function(m){ v += Math.max(0, Number(m.stock)||0) * (Number(m.pmp)||pu(m)); });
  return v;
}
/* Un état de stock se lit en une couleur et un mot, jamais en faisant un calcul mental. */
function etatStock(m){
  var st = Number(m.stock)||0, se = Number(m.seuil)||0;
  var suivie = se > 0 || st !== 0 || (m.mouv && m.mouv.length > 0);
  if (!suivie)            return {k:"libre", lib:"Non suivie", c:"var(--rule-strong)", pct:0, muet:true};
  if (st <= 0)            return {k:"rupture", lib:"Rupture",     c:"var(--bad)",  pct:0};
  if (se > 0 && st < se)  return {k:"bas",     lib:"À racheter",  c:"var(--warn)", pct:Math.max(6, st/se*100)};
  if (se > 0)             return {k:"ok",      lib:"Suffisant",   c:"var(--good)", pct:Math.min(100, st/se*100)};
  return {k:"libre", lib:"En stock", c:"var(--rule-strong)", pct:100};
}
function etatFini(cr){
  var st = enStock(cr.id), se = Number(cr.seuilFini)||0;
  if (se > 0 && st === 0) return {k:"rupture", lib:"Épuisée",    c:"var(--bad)",  pct:0};
  if (se > 0 && st < se)  return {k:"bas",     lib:"À refaire",  c:"var(--warn)", pct:Math.max(6, st/se*100)};
  if (se > 0)             return {k:"ok",      lib:"Suffisant",  c:"var(--good)", pct:Math.min(100, st/se*100)};
  return {k:"libre", lib:(st? "En stock":"Aucune"), c:"var(--rule-strong)", pct:0, muet:true};
}
function badgeEtat(e, valeur){
  return '<span class="etat e-'+e.k+'"><span class="pastille"></span>'+esc(valeur||e.lib)+'</span>';
}
function jauge(e){
  if (e.muet) return "";   /* pas de jauge pour ce qu'on ne suit pas : moins de bruit */
  return '<div class="jauge"><i style="width:'+Math.min(100,Math.max(0,e.pct)).toFixed(0)+'%;background:'+e.c+'"></i></div>';
}

function alertesStock(){
  return state.matieres.filter(function(m){
    return (Number(m.seuil)||0) > 0 && (Number(m.stock)||0) < Number(m.seuil);
  });
}

/* ═════ FOURNISSEURS ET PRIX COMPARÉS ═════
   Une matière s'achète rarement chez un seul marchand. Chaque matière garde
   le tarif de chacun de ses fournisseurs (prix d'un lot, contenance du lot,
   date du relevé, lien) : on voit d'un coup d'œil qui est le moins cher, au
   gramme ou au mètre, même si les lots n'ont pas la même taille. Un achat
   noté chez un fournisseur met son tarif à jour tout seul. */
function fournisseurs(){ if (!Array.isArray(state.fournisseurs)) state.fournisseurs = []; return state.fournisseurs; }
function fournisseur(fid){
  var l = fournisseurs();
  for (var i = 0; i < l.length; i++) if (l[i].id === fid) return l[i];
  return null;
}
function nouveauFournisseur(nom){
  var f = {id: "f_" + uid(), nom: String(nom || "").trim(), site: "", note: "", cree: Date.now()};
  fournisseurs().push(f);
  return f;
}
function offresDe(m){ if (!Array.isArray(m.offres)) m.offres = []; return m.offres; }
function offreDe(m, fid){
  var l = offresDe(m);
  for (var i = 0; i < l.length; i++) if (l[i].fid === fid) return l[i];
  return null;
}
function contenanceOffre(o, m){ return Number(o && o.contenance) > 0 ? Number(o.contenance) : (Number(m.contenance) || 1); }
/* Prix d'UNE unité (1 g, 1 m, 1 pièce) chez ce fournisseur. */
function puOffre(o, m){ return o && Number(o.prix) > 0 ? Number(o.prix) / contenanceOffre(o, m) : 0; }
function meilleureOffre(m){
  var best = null;
  offresDe(m).forEach(function(o){
    if (!fournisseur(o.fid) || !(Number(o.prix) > 0)) return;
    if (!best || puOffre(o, m) < puOffre(best, m)) best = o;
  });
  return best;
}
function noterOffre(m, fid, prixLot, contenance, source){
  var o = offreDe(m, fid);
  prixLot = cts(prixLot);
  if (!o){ o = {fid: fid, prix: 0, contenance: Number(contenance) || m.contenance, le: null, lien: "", hist: []}; offresDe(m).push(o); }
  if (Number(o.prix) > 0 && Math.abs(o.prix - prixLot) > 0.004){
    o.hist = Array.isArray(o.hist) ? o.hist : [];
    o.hist.unshift({le: o.le, prix: o.prix, contenance: o.contenance});
    if (o.hist.length > 12) o.hist.length = 12;
  }
  o.prix = prixLot; if (Number(contenance) > 0) o.contenance = Number(contenance);
  o.le = Date.now(); o.src = source || "saisie";
  return o;
}
/* Ce qu'on économiserait, sur le stock qu'on consomme, en achetant chez le
   moins cher plutôt qu'au dernier prix payé (par unité). */
function economieUnitaire(m){
  var b = meilleureOffre(m); if (!b) return 0;
  var dernier = m.contenance ? (Number(m.prix) || 0) / m.contenance : 0;
  return Math.max(0, dernier - puOffre(b, m));
}

/* ═════ PERTES ═════
   Deux sortes de pertes coûtent de l'argent sans rien rapporter : la matière
   jetée (pelote abîmée, ouvrage défait, chutes) et la pièce ratée. Les deux
   sont notées avec un motif et valorisées au prix moyen payé. */
var MOTIFS_PERTE = [
  {k:"rate",   nom:"Ouvrage raté ou défait"},
  {k:"abime",  nom:"Pelote abîmée ou tachée"},
  {k:"chute",  nom:"Chutes et bouts"},
  {k:"perdu",  nom:"Perdue ou introuvable"},
  {k:"autre",  nom:"Autre"}
];
function libMotif(k){ for (var i = 0; i < MOTIFS_PERTE.length; i++) if (MOTIFS_PERTE[i].k === k) return MOTIFS_PERTE[i].nom; return "Perte"; }
/* Nombre de conditionnements (pelotes, bobines…) que représente une quantité. */
function enLots(m, q){ var c = Number(m.contenance) || 0; return c > 1 ? q / c : null; }
function pertesEntre(debut, fin){
  var r = {matiere: 0, pieces: 0, total: 0, parMotif: {}, lignes: [], nbPieces: 0, pelotes: 0};
  state.matieres.forEach(function(m){
    (m.mouv || []).forEach(function(mv){
      if (mv.t !== "perte" || mv.annule || mv.d < debut || mv.d >= fin) return;
      var v = Number(mv.p) || 0;
      r.matiere += v;
      var k = mv.motif || "autre";
      r.parMotif[k] = (r.parMotif[k] || 0) + v;
      var lots = m.cat === "fil" ? enLots(m, Number(mv.q) || 0) : null;
      if (lots) r.pelotes += lots;
      r.lignes.push({d: mv.d, nom: m.nom, q: mv.q, unite: m.unite, v: v, motif: k});
    });
  });
  state.pieces.forEach(function(p){
    if (p.com !== "jete" || !p.jeteLe || p.jeteLe < debut || p.jeteLe >= fin) return;
    var v = Number(p.perteFigee) || 0;
    r.pieces += v; r.nbPieces++;
    var cr = creation(p.cid);
    r.lignes.push({d: p.jeteLe, nom: "Pièce ratée : " + (cr ? cr.nom : "création supprimée"), q: 1, unite: "pièce", v: v, motif: "piece"});
  });
  r.matiere = cts(r.matiere); r.pieces = cts(r.pieces); r.total = cts(r.matiere + r.pieces);
  r.lignes.sort(function(a, b){ return b.d - a.d; });
  return r;
}
/* Une pièce qui ne sera ni vendue ni donnée ne compte pas dans le stock. */
function horsStock(p){ return p.com === "vendu" || p.com === "offert" || p.com === "jete"; }
/* Pelotes (ou lots) de fil en stock, toutes matières « fil » confondues. */
function pelotesEnStock(){
  var n = 0;
  state.matieres.forEach(function(m){
    if (m.cat !== "fil" || !((Number(m.stock) || 0) > 0)) return;
    var l = enLots(m, Number(m.stock)); if (l) n += l;
  });
  return n;
}

/* ═════ 5. FORMATS ═════ */

/* Séparateur de milliers : l'espace fine insécable, comme l'exige la typographie
   française (72 000,00 € et non 72000,00 €). Insécable pour que le nombre ne se
   coupe jamais en fin de ligne, fine pour ne pas écarter les chiffres. */
var FINE = " ";
function grouperMilliers(s){
  var p = s.split(","), e = p[0];
  if (e.length > 3) e = e.replace(/\B(?=(\d{3})+(?!\d))/g, FINE);
  return p.length > 1 ? e + "," + p[1] : e;
}
function eur(n){
  if (!isFinite(n) || Math.abs(n) < 0.005) n = 0;
  return (n<0?"−":"") + grouperMilliers(Math.abs(n).toFixed(2).replace(".",",")) + " €";
}
/* Pour les montants ronds par nature — un plafond légal, un seuil. « 85 000 € »
   se lit d'un coup d'œil ; « 85 000,00 € » fait croire à un calcul. */
function eurRond(n){
  if (!isFinite(n)) n = 0;
  return grouperMilliers(Math.round(n).toString()) + " €";
}
function qte(n, unite){
  if (!isFinite(n)) n = 0;
  var s = (Math.round(n*100)/100).toString().replace(".",",");
  return s + (unite ? " " + unite : "");
}
function dureeTexte(min){
  min = Math.round(Number(min)||0);
  var h = Math.floor(min/60), m = min%60;
  if (h===0) return m + " min";
  if (m===0) return h + " h";
  return h + " h " + (m<10?"0":"") + m;
}
function pct(x){ return (Math.round(x*1000)/10).toString().replace(".",",") + " %"; }
/* Un nombre écrit comme on l'écrit en français : virgule, et pas de zéro
   décoratif derrière (4 et non 4,00 ; 2,25 reste 2,25). */
function nb(x){
  var v = Number(x); if (!isFinite(v)) return "";
  return (Math.round(v*100)/100).toString().replace(".",",");
}
/* Prix unitaire d'une matière, arrondi au centième de centime : à 2 décimales
   seulement, un fil à 2,70 € les 50 g afficherait « 0,05 € / g » et le détail
   ne retomberait jamais sur le total. */
function eurU(n, unite){
  if (!isFinite(n)) n = 0;
  var d = Math.abs(n) >= 1 ? 2 : 4;
  return n.toFixed(d).replace(".",",") + " €" + (unite ? " / " + unite : "");
}
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }
function el(html){
  var t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
/* ═════ SAISIE DES NOMBRES ═════
   Un champ <input type="number"> refuse la virgule française : « 45,50 »
   devenait 4 550 € sans prévenir. Tous les champs numériques deviennent des
   champs texte à clavier décimal ; leur valeur LUE par le code est toujours
   un nombre avec un point (« 45.5 »), leur valeur AFFICHÉE garde la virgule.
   Un seul endroit, pour tous les écrans présents et à venir. */
var VALEUR_INPUT = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
function lireNombre(v){
  var t = String(v === null || v === undefined ? "" : v).replace(/[\s\u00a0\u202f€%]/g, "");
  /* « 1.234,56 » (point des milliers, virgule décimale) → 1234.56 */
  if (t.indexOf(",") >= 0 && t.indexOf(".") >= 0) t = t.replace(/\./g, "");
  return t.replace(",", ".");
}
function decimaliser(inp){
  if (inp.__decimal) return;
  inp.__decimal = true;
  /* Seuls les vrais nombres entiers (nombre de pièces, seuils) ouvrent le
     pavé sans virgule : un pas de 1 n'interdit pas « 12,5 g ». */
  var entier = inp.getAttribute("inputmode") === "numeric" || /^(f-n|p-n|a-n|p-seuil)$/.test(inp.id) ||
               inp.getAttribute("data-r") === "piecesParMois";
  var brute = VALEUR_INPUT.get.call(inp);
  inp.type = "text";
  inp.setAttribute("inputmode", entier ? "numeric" : "decimal");
  inp.setAttribute("autocomplete", "off");
  inp.classList.add("num-saisie");
  Object.defineProperty(inp, "value", {
    configurable: true,
    get: function(){ return lireNombre(VALEUR_INPUT.get.call(this)); },
    set: function(v){ VALEUR_INPUT.set.call(this, String(v === null || v === undefined ? "" : v).replace(".", ",")); }
  });
  if (brute !== "") inp.value = brute;
  /* Lettres, signe moins et second séparateur refusés dès la frappe ; le
     curseur reste où il était. */
  inp.addEventListener("input", function(){
    var v = VALEUR_INPUT.get.call(inp), pos = inp.selectionStart;
    var n = v.replace(/[^0-9,.]/g, "");
    /* Une seule virgule. Les points ne sont gardés que comme séparateurs de
       milliers devant une virgule (« 1.234,56 ») ; sans virgule, un seul. */
    var iv = n.indexOf(",");
    if (iv >= 0) n = n.slice(0, iv + 1) + n.slice(iv + 1).replace(/[,.]/g, "");
    else { var ip = n.indexOf("."); if (ip >= 0) n = n.slice(0, ip + 1) + n.slice(ip + 1).replace(/\./g, ""); }
    if (n !== v){
      VALEUR_INPUT.set.call(inp, n);
      try{ var p2 = Math.max(0, (pos || n.length) - (v.length - n.length)); inp.setSelectionRange(p2, p2); }catch(e){}
    }
  }, true);
  /* Flèches haut / bas : comme l'ancien champ numérique. */
  inp.addEventListener("keydown", function(e){
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    var pas = Number(inp.getAttribute("step")) || 1, v = Number(inp.value) || 0;
    var nv = Math.max(Number(inp.getAttribute("min")) || 0, Math.round((v + (e.key === "ArrowUp" ? pas : -pas)) * 1000) / 1000);
    inp.value = nv; e.preventDefault();
    inp.dispatchEvent(new Event("input", {bubbles:true})); inp.dispatchEvent(new Event("change", {bubbles:true}));
  });
}
function decimaliserDans(racine){
  if (!racine || !racine.querySelectorAll) return;
  if (racine.matches && racine.matches('input[type="number"]')) decimaliser(racine);
  var l = racine.querySelectorAll('input[type="number"]');
  for (var i = 0; i < l.length; i++) decimaliser(l[i]);
}
if (window.MutationObserver){
  new MutationObserver(function(mut){
    for (var i = 0; i < mut.length; i++)
      for (var j = 0; j < mut[i].addedNodes.length; j++) decimaliserDans(mut[i].addedNodes[j]);
  }).observe(document.documentElement, {childList:true, subtree:true});
}
/* Message bref en bas de l'écran. Avec une action (« Annuler »), il reste
   plus longtemps : le temps de lire, de comprendre, et de se raviser. */
/* Les messages s'empilent : une alerte (« stock négatif ») n'est plus
   effacée par le message suivant. Un message identique remplace l'ancien. */
function toast(msg, action){
  var pile = document.getElementById("toasts");
  if (!pile){ pile = el('<div id="toasts" aria-live="polite"></div>'); document.body.appendChild(pile); }
  var existants = pile.querySelectorAll(".toast");
  for (var i = 0; i < existants.length; i++) if (existants[i].__msg === msg) existants[i].remove();
  if (pile.children.length >= 3) pile.firstElementChild.remove();
  var t = el('<div class="toast" role="status"><span>'+esc(msg)+'</span></div>');
  t.__msg = msg;
  var important = action && action.important;
  if (action && action.fn){
    var b = el('<button type="button">'+esc(action.libelle || "Annuler")+'</button>');
    b.addEventListener("click", function(){ if (t.parentNode) t.remove(); action.fn(); });
    t.appendChild(b);
  }
  var bx = el('<button type="button" class="toast-x" aria-label="Fermer ce message">×</button>');
  bx.addEventListener("click", function(){ if (t.parentNode) t.remove(); if (t.__manques) manquesEnAttente = []; });
  t.appendChild(bx);
  pile.appendChild(t);
  var duree = important ? 12000 : (action && action.fn) ? 8000 : 4500;
  var minuteur = setTimeout(function fin(){
    if (t.matches(":hover") || t.contains(document.activeElement)){ minuteur = setTimeout(fin, 1500); return; }
    if (t.parentNode) t.remove();
  }, duree);
  return t;
}

/* Supprimer sans filet, c'est ce qui fait peur dans un outil de gestion. Ici,
   une suppression courante (une pièce, une ligne) se fait d'un geste, et le
   message qui suit propose de revenir en arrière pendant quelques secondes. */
/* « Annuler » ne vaut que tant que rien d'autre n'a changé : revenir à
   l'état d'avant effacerait sinon tout ce qui a été fait entre-temps (une
   commande saisie, un envoi reçu d'un autre appareil). */
var jetonAnnulation = 0;
function avecAnnulation(message, action){
  var avant = JSON.stringify(state);
  action();
  sauverTout(); render();
  var jeton = ++jetonAnnulation, apres = JSON.stringify(state);
  toast(message, {libelle:"Annuler", fn: function(){
    if (jeton !== jetonAnnulation || JSON.stringify(state) !== apres){
      toast("Trop tard pour annuler : d'autres modifications ont été faites depuis.");
      return;
    }
    state = migrer(JSON.parse(avant));
    sauverTout(); render();
    toast("Suppression annulée");
  }});
}

/* ═════ BOÎTE DE CONFIRMATION ═════
   Remplace les fenêtres grises du navigateur (« OK / Annuler », qui ne disent
   pas ce que fait OK). Options :
     titre    — la question, formulée par son effet (« Supprimer ce patron ? »)
     texte    — une ou deux phrases ; « details » — la liste de ce qui sera perdu
     bouton   — le verbe de l'action (« Supprimer »), jamais « OK »
     danger   — bouton rouge, et le focus part sur « Annuler » par sécurité
     saisie   — mot à retaper pour les actions les plus lourdes
   siOui est appelé seulement si la personne confirme. */
/* La question d'accueil : cinq cartes, une par façon de crocheter. Sert
   aussi dans Réglages pour changer de profil. */
var dialogueProfilOuvert = false;
function dialogueProfil(o){
  o = o || {};
  if (dialogueProfilOuvert) return;
  dialogueProfilOuvert = true;
  var actuel = state.reglages.profilType || (o.premiere ? profilDeduit() : "");
  var contenu = el('<div class="profils" role="radiogroup" aria-label="Ton profil"></div>');
  PROFILS.forEach(function(p){
    var b = el('<button type="button" class="profil-carte" role="radio" data-p="'+esc(p.id)+'" aria-checked="'+(p.id === actuel ? "true" : "false")+'">'+
      '<b>'+esc(p.nom)+'</b><span>'+esc(p.d)+'</span></button>');
    b.addEventListener("click", function(){
      [].forEach.call(contenu.querySelectorAll(".profil-carte"), function(x){ x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      actuel = p.id;
    });
    contenu.appendChild(b);
  });
  confirmer({
    titre: o.premiere ? "Qu'est-ce qui te ressemble ?" : "Changer de profil",
    texte: o.premiere ? "Une seule question, pour n'afficher que ce qui te sert. Tu pourras changer d'avis dans Réglages › Mon activité."
                      : "L'outil s'adapte : onglets, calculs, vocabulaire.",
    contenu: contenu, large: true,
    bouton: "C'est moi", annuler: o.premiere ? "Plus tard" : "Annuler", sansAnnuler: false,
    siAnnule: function(){ dialogueProfilOuvert = false; if (o.premiere && !state.reglages.profilType) appliquerProfil(profilDeduit()); },
    siNon: function(){ dialogueProfilOuvert = false; if (o.premiere && !state.reglages.profilType) appliquerProfil(profilDeduit()); }
  }, function(){
    dialogueProfilOuvert = false;
    var avant = state.reglages.profilType;
    if (actuel) appliquerProfil(actuel);
    if (actuel !== avant) toast("Profil « " + (profilActuel() || {}).nom + " » : l'outil s'est adapté.");
  });
}
/* La même question, posée dans la page (Accueil d'un atelier neuf). */
function sectionProfil(){
  var choix = profilDeduit();
  var z = el('<section class="card profil-accueil" aria-label="Ton profil"><div class="body">'+
    '<div class="eyebrow">Bienvenue</div><h2 style="margin:6px 0 4px">Qu\'est-ce qui te ressemble ?</h2>'+
    '<p class="hint" style="margin:0 0 14px">Une seule question, pour n\'afficher que ce qui te sert. Tu pourras changer d\'avis dans Réglages › Mon activité.</p>'+
    '<div class="profils" role="radiogroup" aria-label="Ton profil"></div><div class="savebar" style="margin-top:14px"></div></div></section>');
  var grille = z.querySelector(".profils");
  PROFILS.forEach(function(p){
    var b = el('<button type="button" class="profil-carte" role="radio" data-p="'+esc(p.id)+'" aria-checked="'+(p.id === choix ? "true" : "false")+'">'+
      '<b>'+esc(p.nom)+'</b><span>'+esc(p.d)+'</span></button>');
    b.addEventListener("click", function(){
      [].forEach.call(grille.querySelectorAll(".profil-carte"), function(x){ x.setAttribute("aria-checked", x === b ? "true" : "false"); });
      choix = p.id;
    });
    grille.appendChild(b);
  });
  z.querySelector(".savebar").appendChild(bouton("C'est moi", function(){
    appliquerProfil(choix);
    toast("Profil « " + (profilActuel() || {}).nom + " » : l'outil s'est adapté.");
  }, true));
  return z;
}
function confirmer(o, siOui){
  o = o || {};
  var retourFocus = document.activeElement;
  var fond = el('<div class="dlg-fond"></div>');
  var boite = el('<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titre" aria-describedby="dlg-texte">'+
    '<h2 id="dlg-titre">'+esc(o.titre || "Confirmer ?")+'</h2>'+
    '<div id="dlg-texte">'+
      String(o.texte || "").split("\n").filter(Boolean).map(function(x){ return '<p>'+esc(x)+'</p>'; }).join("")+
      (o.details && o.details.length ? '<ul>'+o.details.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join("")+'</ul>' : '')+
    '</div><div class="dlg-contenu"></div>'+
    (o.saisie ? '<label class="f dlg-saisie"><span>Pour confirmer, tape <b>'+esc(o.saisie)+'</b></span>'+
      '<input type="text" id="dlg-champ" autocomplete="off" autocapitalize="off" spellcheck="false"></label>' : '')+
    '<div class="dlg-act">'+
      (o.sansAnnuler ? '' : '<button type="button" class="btn" data-non>'+esc(o.annuler || "Annuler")+'</button>')+
      '<button type="button" class="btn '+(o.danger ? 'danger-plein' : 'primary')+'" data-oui>'+esc(o.bouton || "Confirmer")+'</button>'+
    '</div></div>');
  if (o.contenu) boite.querySelector(".dlg-contenu").appendChild(o.contenu);
  if (o.large) boite.classList.add("large");
  fond.appendChild(boite);
  document.body.appendChild(fond);
  document.body.classList.add("menu-ouvert");
  var bOui = boite.querySelector("[data-oui]"), bNon = boite.querySelector("[data-non]");
  var champ = boite.querySelector("#dlg-champ");
  if (champ){
    bOui.disabled = true;
    champ.addEventListener("input", function(){
      bOui.disabled = champ.value.trim().toLowerCase() !== String(o.saisie).trim().toLowerCase();
    });
    champ.addEventListener("keydown", function(e){ if (e.key === "Enter" && !bOui.disabled) bOui.click(); });
  }
  var ferme = false, choix = null;
  function retirer(){
    if (ferme) return; ferme = true;
    if (fond.parentNode) fond.remove();
    /* « Non » est parfois un vrai choix (vendre la pièce à part, par
       exemple) ; fermer sans choisir (Échap, clic à côté) n'en est pas un. */
    if (choix === "non" && o.siNon) setTimeout(o.siNon, 0);
    else if (!choix && o.siAnnule) setTimeout(o.siAnnule, 0);
    if (!document.querySelector(".dlg-fond") && document.getElementById("menu-mobile").hidden)
      document.body.classList.remove("menu-ouvert");
    if (retourFocus && retourFocus.focus && document.contains(retourFocus)) try{ retourFocus.focus(); }catch(e){}
  }
  ouvrirCouche(retirer);
  if (bNon) bNon.addEventListener("click", function(){ choix = "non"; fermerCouche(); });
  fond.addEventListener("click", function(e){ if (e.target === fond) fermerCouche(); });
  boite.addEventListener("keydown", function(e){
    if (e.key === "Escape"){ e.preventDefault(); fermerCouche(); return; }
    if (e.key !== "Tab") return;
    var f = [].slice.call(boite.querySelectorAll("button:not([disabled]),input"));
    if (!f.length) return;
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0){ e.preventDefault(); f[f.length-1].focus(); }
    else if (!e.shiftKey && i === f.length-1){ e.preventDefault(); f[0].focus(); }
  });
  bOui.addEventListener("click", function(){
    if (bOui.disabled) return;
    choix = "oui";
    fermerCouche(function(){ if (siOui) siOui(); });
  });
  (champ || (o.danger && bNon ? bNon : bOui)).focus();
}

/* Boîte avec un champ de texte (et, au besoin, une liste de choix) :
   signaler, contester. Même allure et mêmes règles que confirmer(). */
function dialogueTexte(o, siOk){
  var retourFocus = document.activeElement;
  var fond = el('<div class="dlg-fond"></div>');
  var boite = el('<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgt-titre">'+
    '<h2 id="dlgt-titre">'+esc(o.titre)+'</h2>'+(o.texte ? '<p>'+esc(o.texte)+'</p>' : '')+
    (o.choix ? '<label class="f"><span>'+esc(o.choix.lib)+'</span><select id="dlgt-choix">'+
      o.choix.options.map(function(x){ return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>'; }).join("")+'</select></label>' : '')+
    '<label class="f" style="margin-top:10px"><span>'+esc(o.champ)+'</span><textarea id="dlgt-texte" rows="4" maxlength="1000" style="min-height:90px;font-family:inherit;font-size:14px"></textarea></label>'+
    '<p class="hint" id="dlgt-aide" style="margin:6px 0 0"></p>'+
    '<div class="dlg-act"><button type="button" class="btn" data-non>Annuler</button>'+
    '<button type="button" class="btn primary" data-oui>'+esc(o.bouton || "Envoyer")+'</button></div></div>');
  fond.appendChild(boite); document.body.appendChild(fond); document.body.classList.add("menu-ouvert");
  var ta = boite.querySelector("#dlgt-texte"), aide = boite.querySelector("#dlgt-aide");
  function fermer(){ fond.remove(); document.body.classList.remove("menu-ouvert"); if (retourFocus && retourFocus.focus) try{ retourFocus.focus(); }catch(e){} }
  boite.querySelector("[data-non]").addEventListener("click", fermer);
  fond.addEventListener("keydown", function(e){ if (e.key === "Escape") fermer(); });
  boite.querySelector("[data-oui]").addEventListener("click", function(){
    var t = ta.value.trim();
    if (t.length < (o.min || 1)){ aide.textContent = "Écris au moins " + (o.min || 1) + " caractères."; ta.setAttribute("aria-invalid", "true"); ta.focus(); return; }
    var ch = boite.querySelector("#dlgt-choix");
    fermer(); siOk(t, ch ? ch.value : null);
  });
  setTimeout(function(){ (boite.querySelector("#dlgt-choix") || ta).focus(); }, 30);
}

/* Boîte à quelques champs d'une ligne (un nom, un lien, un prix) : même
   allure et mêmes règles que confirmer(). o.champs = [{id, lib, valeur,
   type, placeholder, requis}] ; siOk reçoit {id: valeur}. o.contenu (un
   élément) s'affiche au-dessus des champs. */
function dialogueChamps(o, siOk){
  var retourFocus = document.activeElement;
  var fond = el('<div class="dlg-fond"></div>');
  var boite = el('<div class="dlg'+(o.large ? ' large' : '')+'" role="dialog" aria-modal="true" aria-labelledby="dlgc-titre">'+
    '<h2 id="dlgc-titre">'+esc(o.titre || "")+'</h2>'+(o.texte ? '<p>'+esc(o.texte)+'</p>' : '')+
    '<div class="dlgc-contenu"></div>'+
    (o.champs || []).map(function(c){
      return '<label class="f" style="margin-top:10px"><span>'+esc(c.lib)+'</span><input id="dlgc-'+esc(c.id)+'" type="'+(c.type || "text")+'"'+
        (c.inputmode ? ' inputmode="'+c.inputmode+'"' : '')+' maxlength="'+(c.max || 200)+'" placeholder="'+esc(c.placeholder || "")+'" value="'+esc(c.valeur === undefined || c.valeur === null ? "" : c.valeur)+'"></label>';
    }).join("")+
    '<p class="hint" id="dlgc-aide" role="alert" style="margin:6px 0 0"></p>'+
    '<div class="dlg-act"><button type="button" class="btn" data-non>'+esc(o.annuler || "Annuler")+'</button>'+
    '<button type="button" class="btn primary" data-oui>'+esc(o.bouton || "Enregistrer")+'</button></div></div>');
  if (o.contenu) boite.querySelector(".dlgc-contenu").appendChild(o.contenu);
  fond.appendChild(boite); document.body.appendChild(fond); document.body.classList.add("menu-ouvert");
  var ferme = false, valide = false;
  function retirer(){
    if (ferme) return; ferme = true;
    if (!valide && o.siAnnule) o.siAnnule();
    if (fond.parentNode) fond.remove();
    if (!document.querySelector(".dlg-fond") && document.getElementById("menu-mobile").hidden) document.body.classList.remove("menu-ouvert");
    if (retourFocus && retourFocus.focus && document.contains(retourFocus)) try{ retourFocus.focus(); }catch(e){}
  }
  ouvrirCouche(retirer);
  boite.querySelector("[data-non]").addEventListener("click", function(){ fermerCouche(); });
  fond.addEventListener("click", function(e){ if (e.target === fond) fermerCouche(); });
  boite.addEventListener("keydown", function(e){
    if (e.key === "Escape"){ e.preventDefault(); fermerCouche(); }
    if (e.key === "Enter" && e.target.tagName === "INPUT"){ e.preventDefault(); boite.querySelector("[data-oui]").click(); }
  });
  boite.querySelector("[data-oui]").addEventListener("click", function(){
    var v = {}, manque = null;
    (o.champs || []).forEach(function(c){
      var inp = boite.querySelector("#dlgc-" + c.id);
      v[c.id] = inp ? inp.value.trim() : "";
      inp.removeAttribute("aria-invalid");
      if (c.requis && !v[c.id] && !manque){ manque = inp; inp.setAttribute("aria-invalid", "true"); }
    });
    if (manque){ boite.querySelector("#dlgc-aide").textContent = "Ce champ est nécessaire."; manque.focus(); return; }
    if (o.verifier){ var err = o.verifier(v, boite); if (err){ boite.querySelector("#dlgc-aide").textContent = err; return; } }
    valide = true;
    fermerCouche(function(){ siOk(v, boite); });
  });
  if (o.ouvert) o.ouvert(boite);
  setTimeout(function(){ var p1 = boite.querySelector("input,select,textarea"); if (p1) p1.focus(); }, 30);
}

/* ═════ HISTORIQUE : LE BOUTON « PRÉCÉDENT » ═════
   Le bouton retour du téléphone et la flèche du navigateur doivent faire ce
   que tout le monde attend : revenir à l'écran d'avant, fermer le menu ou la
   boîte ouverte — pas quitter l'application. Chaque changement d'écran ajoute
   donc une étape à l'historique du navigateur, et chaque étape sait
   reconstruire son écran. */
var nav = {cle:null, i:0, pile:[], restauration:false, couches:[], apres:null, minuteur:null};
function etatNav(){
  return {tab:view.tab, sub:view.sub||null, modeleVu:view.modeleVu||null, ficheId:view.ficheId||null,
          cmdVue:view.cmdVue||null, patronVu:view.patronVu||null, sousPatrons:view.sousPatrons||null,
          biblioVu:view.biblioVu||null, regSection:view.regSection||null, catMode:view.catMode||null};
}
function enregistrerNav(){
  if (nav.restauration){ nav.restauration = false; return; }
  var e = etatNav(), k = JSON.stringify(e);
  if (k === nav.cle) return;
  try{
    if (nav.cle === null){ history.replaceState({crochompte:e, i:0}, ""); nav.i = 0; }
    else { nav.i++; history.pushState({crochompte:e, i:nav.i}, ""); }
  }catch(err){}
  nav.pile.length = nav.i;
  nav.pile.push(k);
  nav.cle = k;
}
/* Les boutons « ← Retour » de l'application remontent à l'écran parent
   (la liste pour une fiche, le catalogue pour un modèle). Si cet écran parent
   est justement celui d'où l'on vient, on recule dans l'historique au lieu
   d'y ajouter une étape : sinon « précédent » ramènerait sur la fiche qu'on
   vient de quitter. */
function retourParent(modif){
  modif();
  var cible = JSON.stringify(etatNav());
  if (nav.i > 0 && nav.pile[nav.i - 1] === cible && !nav.couches.length){
    try{ history.back(); return; }catch(e){}
  }
  render();
}
/* Menu du téléphone et boîtes de confirmation : une étape d'historique à
   eux, pour que « précédent » les ferme au lieu de changer d'écran. */
function ouvrirCouche(fermer){
  nav.couches.push(fermer);
  try{ history.pushState({couche:true, i:nav.i}, ""); }catch(e){}
}
function fermerCouche(apres){
  if (!nav.couches.length){ if (apres) apres(); return; }
  nav.apres = apres || null;
  try{ history.back(); }catch(e){}
  clearTimeout(nav.minuteur);
  /* Filet : si le navigateur ne renvoie pas l'événement, on ferme quand même. */
  nav.minuteur = setTimeout(depilerCouche, 450);
}
function depilerCouche(){
  clearTimeout(nav.minuteur);
  var f = nav.couches.pop(); if (f) f();
  var a = nav.apres; nav.apres = null;
  if (a) a();
}
window.addEventListener("popstate", function(ev){
  if (nav.couches.length){ depilerCouche(); return; }
  var st = ev.state || {};
  var e = st.crochompte;
  if (!e) return;
  if (etatAcces.exige && !etatAcces.connecte) return;
  nav.i = st.i || 0;
  if (e.tab === "fiche"){
    if (view.draft){
      /* Il n'y a qu'un brouillon à la fois : c'est lui qu'on retrouve, avec
         SA propre identité (jamais celle d'une autre fiche de l'historique). */
      e.ficheId = view.ficheId;
    } else {
      var c = e.ficheId ? creation(e.ficheId) : null;
      if (c){ view.draft = clone(c); view.draftRef = empreinteFiche(view.draft); }
      else e.tab = "creations";
    }
  }
  for (var k in e) view[k] = e[k];
  nav.cle = JSON.stringify(etatNav());
  nav.restauration = true;
  render();
});
/* Les chutes et ratés (taux de perte) concernent ce qui se coupe ou se
   mesure : fil, rembourrage, tissu. Pas ce qui se compte à l'unité (yeux,
   boutons, anneaux), ni l'emballage. Même règle pour le coût, la sortie de
   stock et la liste d'achats. */
function avecPerte(m){
  if (!m || m.cat === "fin") return false;
  return !/^(pi[eè]ces?|paires?|unit[eé]s?|utilisations?|boutons?|yeux|oeils?|œils?|anneaux?|lots?|u)$/i.test(String(m.unite || "").trim());
}
/* Verdict d'une création calculée : on ne dit « à perte » que si c'est vrai. */
/* Un chiffre qui n'a pas de sens pour une pièce au crochet vient presque
   toujours d'une faute de saisie (virgule oubliée, heures au lieu de
   minutes). On le signale sans rien bloquer. */
function invraisemblance(r){
  var obj = Number(state.reglages.tauxHoraire)||0;
  if (r.prix > 0 && r.heures > 0 && r.gainHoraire > Math.max(100, 5 * obj))
    return "Ce gain de l'heure est très élevé : vérifie le prix (une virgule oubliée ?) et le temps indiqué.";
  if (r.prix > 0 && r.prixObjectif > 0 && r.prix > 10 * r.prixObjectif)
    return "Ce prix est plus de dix fois le prix conseillé : vérifie la saisie.";
  return "";
}
function verdictCalcul(r){
  if (!(r.prix > 0)) return {k:"neutre", t:"Prix à fixer"};
  if (r.reste < 0) return {k:"bad", t:"À perte"};
  if (!(r.minutes > 0)) return {k:"warn", t:"Temps à indiquer"};
  return statut(r.gainHoraire);
}
function statut(gain){
  var obj = Number(state.reglages.tauxHoraire)||0;
  if (gain < 0) return {k:"bad", t:"À perte"};
  if (obj <= 0) return {k:"warn", t:"Objectif non défini"};
  if (gain < obj*0.5) return {k:"bad", t:"Loin de ton objectif"};
  if (gain < obj*0.9) return {k:"warn", t:"Sous ton objectif"};
  return {k:"good", t:"Tu t'y retrouves"};
}

/* ═════ 6. NAVIGATION ═════ */

/* Après un changement d'écran, le focus va au contenu : un lecteur d'écran
   annonce le nouvel écran, et Tab ne repasse pas par les 13 onglets. */
var focusApresRendu = false;
/* ═════ PROFILS ═════
   Une seule question à la première ouverture : « Qu'est-ce qui te
   ressemble ? ». La réponse règle d'un coup le mode (vente ou plaisir), le
   suivi des pièces et les onglets affichés. Elle se change dans Réglages. */
var PROFILS = [
  {id:"loisir",   nom:"Je crochète pour le plaisir",
   d:"Je veux suivre mes ouvrages, ma laine et ce que mon loisir me coûte. Je ne vends pas.",
   profil:"passion", mode:"complet", onglets:["accueil","creations","patrons","stock","indicateurs","reglages"]},
  {id:"quelques", nom:"Je vends quelques pièces",
   d:"À des proches, sur Instagram… Je veux un prix qui ne me fasse pas perdre d'argent, et noter qui me doit quoi.",
   profil:"vend", mode:"complet", onglets:["accueil","creations","commandes","patrons","stock","indicateurs","reglages"]},
  {id:"createur", nom:"Je vends mes créations",
   d:"Micro-entreprise, plateformes, marchés : des prix justes, des commandes et des factures en règle.",
   profil:"vend", mode:"complet", onglets:["accueil","creations","commandes","patrons","stock","indicateurs","reglages"]},
  {id:"artisan",  nom:"Je vends en quantité",
   d:"Séries, boutiques, gros volume : je veux voir ce qui presse, agir sur plusieurs pièces d'un coup et sortir mes registres.",
   profil:"vend", mode:"complet", onglets:["accueil","creations","commandes","patrons","stock","indicateurs","reglages"]},
  {id:"marche",   nom:"Je vends surtout sur les marchés",
   d:"Un stand, des ventes en espèces ou par carte : préparer le stand, noter chaque vente en une seconde, faire la caisse le soir.",
   profil:"vend", mode:"complet", onglets:["accueil","creations","commandes","marche","patrons","stock","indicateurs","reglages"]}
];
function profilActuel(){
  var id = state.reglages.profilType;
  for (var i = 0; i < PROFILS.length; i++) if (PROFILS[i].id === id) return PROFILS[i];
  return null;
}
/* Déduit un profil d'un atelier d'avant la V44, pour ne rien demander deux fois. */
function profilDeduit(){
  var r = state.reglages;
  if (r.profil === "passion") return "loisir";
  if ((state.commandes||[]).length > 40 || (state.pieces||[]).length > 300) return "artisan";
  if (r.mode !== "complet" && (state.commandes||[]).length < 10) return "quelques";
  return "createur";
}
function appliquerProfil(id, opts){
  var p = null;
  for (var i = 0; i < PROFILS.length; i++) if (PROFILS[i].id === id) p = PROFILS[i];
  if (!p) return false;
  state.reglages.profilType = p.id;
  state.reglages.profil = p.profil;
  state.reglages.mode = p.mode;
  if (p.id === "loisir"){ state.reglages.statut = state.reglages.statut || "non_declare"; }
  sauverTout();
  if (!(opts && opts.sansRendu)) render();
  return true;
}
var TABS = [
  {id:"accueil",     nom:"Accueil",        base:true},
  /* La mise en route et le catalogue s'ouvrent depuis l'Accueil ou une
     création : leur onglet n'apparaît que pendant qu'on y est. */
  {id:"demarrage",   nom:"Mise en route",  base:true, tantQueLa:true},
  {id:"catalogue",   nom:"Catalogue",      base:true, tantQueLa:true},
  {id:"creations",   nom:"Mes créations",  base:true},
  {id:"fiche",       nom:"Fiche en cours", brouillon:true},
  {id:"commandes",   nom:"Commandes",      base:true},
  {id:"marche",      nom:"Marché",         base:true, tantQueLa:true},
  /* « Mes pièces » vit dans « Mes créations » depuis la V39 : l'entrée
     reste connue pour les anciens liens, mais n'a plus d'onglet. */
  {id:"atelier",     nom:"Mes pièces",     cache:true},
  {id:"patrons",     nom:"Mes patrons",    base:true},
  {id:"stock",       nom:"Matières",       base:true},
  {id:"indicateurs", nom:"Mes chiffres",   base:true},
  {id:"reglages",    nom:"Réglages",       base:true}
];
/* Les onglets visibles dépendent du mode choisi. Un brouillon non enregistré
   affiche toujours le sien : changer d'onglet perdait le travail saisi. */
function onglets(){
  var complet = state.reglages.mode === "complet";
  var p = profilActuel();
  return TABS.filter(function(t){
    if (t.cache) return false;
    if (t.brouillon) return !!view.draft;
    if (p && p.onglets.indexOf(t.id) >= 0) return true;
    if (t.tantQueLa) return view.tab === t.id;
    if (p && p.onglets.indexOf(t.id) < 0) return false;
    if (!p && t.id === "commandes" && state.reglages.profil === "passion") return false;
    return complet || t.base;
  });
}

/* Changer d'onglet, c'est arriver sur son écran d'accueil — pas reprendre là
   où on avait laissé une fiche ouverte la dernière fois. On referme donc les
   sous-vues, sauf si l'appelant demande explicitement le contraire (par
   exemple « ouvre CETTE commande », depuis un autre écran). */
function aller(tab, opts){
  opts = opts || {};
  if (tab === "atelier") tab = "creations";
  if (!opts.garderVue){
    if (tab !== "catalogue") view.modeleVu = null;
    if (tab !== "commandes") view.cmdVue = null;
    if (tab !== "patrons")   { view.patronVu = null; view.sousPatrons = null; view.biblioVu = null; }
    /* « sub » sert aussi à la Mise en route (import de photos) : on ne
       l'emporte pas dans l'onglet Matières. */
    if (tab !== "demarrage" && view.sub === "photos") view.sub = "matieres";
    /* Le brouillon d'une fiche reste ouvert (onglet « Fiche en cours ») :
       il garde donc son identité, sinon l'enregistrer créait un doublon. */
    if (tab !== "fiche" && !view.draft) view.ficheId = null;
    if (tab !== "reglages")  view.regSection = null;
  }
  if (opts.sub) view.sub = opts.sub;
  view.tab = tab;
  render();
}

/* Toucher le nom d'un onglet ramène toujours à son début : dans Réglages, à
   la liste des rubriques plutôt qu'à la dernière rubrique ouverte. */
function allerOnglet(id){
  if (id === "reglages") view.regSection = null;
  focusApresRendu = true;
  /* Toucher l'onglet où l'on est déjà ramène à son début (liste des
     commandes, catalogue, mes patrons), comme dans toute application. */
  if (id === view.tab){
    view.modeleVu = null; view.cmdVue = null; view.patronVu = null;
    view.sousPatrons = null; view.biblioVu = null;
  }
  aller(id);
}
/* L'onglet de la fiche ouverte porte le nom de la création : « Fiche en
   cours » ne disait pas de quoi il s'agissait. */
function libelleOngletFiche(){
  var d = view.draft; if (!d) return "Fiche en cours";
  var nom = String(d.nom || "").trim();
  if (!view.ficheId && !nom) return "Nouvelle fiche";
  return "Fiche : " + (nom || "sans nom");
}
function renderNav(){
  var nav = document.getElementById("nav");
  var liste = document.getElementById("mm-liste");
  nav.innerHTML = "";
  liste.innerHTML = "";
  document.body.classList.add("app-ouverte");
  onglets().forEach(function(t){
    var nomT = t.brouillon ? libelleOngletFiche() : t.nom;
    var b = el('<button type="button">'+esc(nomT)+'</button>');
    if (view.tab === t.id) b.setAttribute("aria-current","true");
    if (t.brouillon) b.classList.add("ong-fiche");
    b.addEventListener("click", function(){ allerOnglet(t.id); });
    nav.appendChild(b);
    /* Même liste, en colonne, pour le menu du téléphone. */
    var m = el('<button type="button">'+esc(nomT)+'</button>');
    if (view.tab === t.id) m.setAttribute("aria-current","true");
    m.addEventListener("click", function(){ fermerMenuMobile(function(){ allerOnglet(t.id); }); });
    liste.appendChild(m);
  });
  renderEntete();
}

/* ═════ EN-TÊTE : COMPTE ET MENU DU TÉLÉPHONE ═════
   Sur ordinateur, qui est connectée et le bouton pour se déconnecter restent
   en haut à droite, sur tous les écrans. Sur téléphone, les rubriques passent
   dans un menu en liste, et le compte en bas de ce menu — la disposition que
   tout le monde connaît déjà. */
var compteInfo = {connecte:false, pseudo:""};
function definirCompte(info){
  info = info || {};
  var avant = compteInfo.pseudo;
  compteInfo = {connecte: !!info.connecte, pseudo: String(info.pseudo || "")};
  renderEntete();
  /* L'accueil salue par le pseudo : il arrive parfois juste après l'écran. */
  if (avant !== compteInfo.pseudo && view.tab === "accueil" && document.body.classList.contains("app-ouverte")) render();
}
function initiale(p){ var t = String(p||"").trim(); return t ? t.charAt(0) : "?"; }
function seDeconnecter(){
  fermerMenuMobile(function(){
    if (window.CrochompteSync && window.CrochompteSync.deconnecter) window.CrochompteSync.deconnecter();
  });
}
function ouvrirMonCompte(){
  fermerMenuMobile(function(){
    view.regSection = "compte";
    aller("reglages", {garderVue:true});
  });
}
function renderEntete(){
  var ouverte = document.body.classList.contains("app-ouverte");
  var zone = document.getElementById("compte-entete");
  var mm = document.getElementById("mm-compte");
  var note = document.getElementById("brandnote");
  zone.innerHTML = ""; mm.innerHTML = "";
  zone.hidden = true; mm.hidden = true; note.hidden = false;
  if (!ouverte) return;

  if (modeHorsLigne){
    note.hidden = true; zone.hidden = false; mm.hidden = false;
    zone.appendChild(el('<span class="hl-badge" title="Tes modifications partiront au retour du réseau">Hors ligne</span>'));
    mm.appendChild(el('<p class="hint" style="margin:0"><span class="hl-badge">Hors ligne</span> '+
      'Tes modifications restent sur cet appareil et partiront au retour du réseau.</p>'));
    return;
  }
  if (!compteInfo.connecte) return;

  note.hidden = true; zone.hidden = false; mm.hidden = false;
  var nom = compteInfo.pseudo || "Mon compte";
  var bNom = el('<button type="button" class="compte-nom" title="Mon compte">'+
    '<span class="avatar" aria-hidden="true">'+esc(initiale(nom))+'</span>'+
    '<span class="pseudo">'+esc(nom)+'</span></button>');
  bNom.addEventListener("click", ouvrirMonCompte);
  var bOut = el('<button type="button" class="btn sm" id="entete-deconnexion">Se déconnecter</button>');
  bOut.addEventListener("click", seDeconnecter);
  zone.appendChild(bNom); zone.appendChild(bOut);

  mm.appendChild(el('<div class="qui"><span class="avatar" aria-hidden="true">'+esc(initiale(nom))+'</span>'+
    '<span>'+esc(nom)+'<small>Session ouverte</small></span></div>'));
  var mCompte = el('<button type="button" class="btn">Mon compte</button>');
  mCompte.addEventListener("click", ouvrirMonCompte);
  var mOut = el('<button type="button" class="btn" id="menu-deconnexion">Se déconnecter</button>');
  mOut.addEventListener("click", seDeconnecter);
  mm.appendChild(mCompte); mm.appendChild(mOut);
}
function viderEntete(){
  document.getElementById("nav").innerHTML = "";
  document.getElementById("mm-liste").innerHTML = "";
  document.body.classList.remove("app-ouverte");
  cacherMenuMobile();
  renderEntete();
}
function ouvrirMenuMobile(){
  var m = document.getElementById("menu-mobile");
  if (!m.hidden) return;
  m.hidden = false;
  ouvrirCouche(cacherMenuMobile);
  document.body.classList.add("menu-ouvert");
  document.getElementById("menu-btn").setAttribute("aria-expanded","true");
  var cible = m.querySelector('.mm-liste [aria-current="true"]') || m.querySelector(".mm-liste button");
  if (cible) cible.focus();
}
/* Fermer le menu, puis faire ce qui a été demandé (changer d'écran…) une
   fois l'étape d'historique du menu retirée. */
function fermerMenuMobile(apres){
  var m = document.getElementById("menu-mobile");
  if (!m || m.hidden){ if (apres) apres(); return; }
  if (nav.couches.indexOf(cacherMenuMobile) !== -1) fermerCouche(apres);
  else { cacherMenuMobile(); if (apres) apres(); }
}
function cacherMenuMobile(){
  var m = document.getElementById("menu-mobile");
  var i = nav.couches.indexOf(cacherMenuMobile);
  if (i !== -1 && i !== nav.couches.length - 1) nav.couches.splice(i, 1);
  if (!m || m.hidden) return;
  m.hidden = true;
  if (!document.querySelector(".dlg-fond")) document.body.classList.remove("menu-ouvert");
  var b = document.getElementById("menu-btn");
  b.setAttribute("aria-expanded","false");
}
(function(){
  document.getElementById("menu-btn").addEventListener("click", ouvrirMenuMobile);
  document.getElementById("menu-mobile").addEventListener("click", function(e){
    if (e.target.closest("[data-mm-fermer]")){
      fermerMenuMobile(); document.getElementById("menu-btn").focus();
    }
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && !document.getElementById("menu-mobile").hidden){
      fermerMenuMobile(); document.getElementById("menu-btn").focus();
    }
  });
  /* Le menu n'a pas de sens au-delà de la largeur téléphone : s'il reste
     ouvert quand on élargit la fenêtre, on le referme. */
  if (window.matchMedia){
    var mqMenu = window.matchMedia("(max-width:1100px)");
    var surChange = function(){
      if (!mqMenu.matches) fermerMenuMobile();
      if (view.tab === "reglages") render();
    };
    if (mqMenu.addEventListener) mqMenu.addEventListener("change", surChange);
  }
})();

/* ───────────────────────────────────────────────────────────────────────
   Garder sa place pendant qu'on écrit
   L'application redessine l'écran entier à chaque frappe. Sans précaution,
   le champ en cours de saisie est détruit puis recréé : le curseur saute au
   début, et la page remonte en haut. C'était le défaut le plus agaçant de
   l'outil — on effaçait un caractère au milieu d'un mot et on se retrouvait
   ailleurs.
   Plutôt que de corriger écran par écran, on note ici où était le curseur
   avant de redessiner, et on l'y remet après. Une seule fois, pour tous les
   champs de l'application.
   ─────────────────────────────────────────────────────────────────────── */
function repererChamp(){
  var a = document.activeElement;
  if (!a || a === document.body || !a.tagName) return null;
  var t = a.tagName.toLowerCase();
  if (t !== "input" && t !== "textarea" && t !== "select") return null;

  /* Un sélecteur qui survivra à la reconstruction : l'identifiant s'il y en
     a un, sinon la combinaison d'attributs qui désigne ce champ-là et pas
     un autre (la ligne de matière, le poste de temps, le champ de commande). */
  var sel = null;
  if (a.id){
    sel = "#" + a.id.replace(/([^\w-])/g, "\\$1");
  } else {
    var attrs = ["data-role","data-c","data-p","data-r","data-r2f","data-poste"];
    for (var i=0;i<attrs.length;i++){
      var v = a.getAttribute(attrs[i]);
      if (!v) continue;
      var morceau = "[" + attrs[i] + '="' + v + '"]';
      var ligne = a.closest("[data-mid],[data-idx],[data-cid],[data-pid]");
      if (ligne){
        var cle = ligne.hasAttribute("data-mid") ? "data-mid"
                : ligne.hasAttribute("data-cid") ? "data-cid"
                : ligne.hasAttribute("data-pid") ? "data-pid" : "data-idx";
        sel = '[' + cle + '="' + ligne.getAttribute(cle) + '"] ' + morceau;
      } else {
        sel = morceau;
      }
      break;
    }
  }
  if (!sel) return null;
  var d = null, f = null;
  /* selectionStart n'existe pas sur tous les types de champs (date, number
     selon le navigateur) : on tente, sans en faire une condition. */
  try{ d = a.selectionStart; f = a.selectionEnd; }catch(e){}
  return {sel:sel, debut:d, fin:f, defilement:window.scrollY};
}
function remettreChamp(p){
  if (!p) return;
  var e;
  try{ e = document.querySelector(p.sel); }catch(x){ return; }
  if (!e) return;
  try{
    e.focus({preventScroll:true});
    if (p.debut !== null && p.debut !== undefined && e.setSelectionRange)
      e.setSelectionRange(p.debut, p.fin);
  }catch(x){}
  /* Le défilement se restaure même si le champ a disparu : la page ne doit
     jamais sauter toute seule pendant qu'on travaille. */
  if (typeof p.defilement === "number") window.scrollTo(0, p.defilement);
}

/* Les tuiles d'indicateurs ont une largeur fixe et un chiffre de taille très
   variable : 0,00 € chez l'une, 72 000,00 € chez l'autre. Plutôt que de choisir
   une taille qui va mal aux deux, on l'ajuste à ce qu'il y a à lire. */
function ajusterValeurs(racine){
  var vs = racine.querySelectorAll(".tile .v");
  for (var i=0;i<vs.length;i++){
    var n = (vs[i].textContent||"").length;
    vs[i].classList.remove("long","plus-long","tres-long");
    if (n >= 15)      vs[i].classList.add("tres-long");
    else if (n >= 13) vs[i].classList.add("plus-long");
    else if (n >= 10) vs[i].classList.add("long");
  }
}

/* Une commande ou un patron créés d'un clic puis abandonnés sans rien saisir
   ne doivent pas rester dans les listes (« 1 devis en attente » fantôme). */
function commandeVide(c){
  return c.statut === "devis" && !(c.client && (c.client.nom || c.client.contact)) && !c.cid && !c.libelle &&
    !(Number(c.prixConvenu) > 0) && !(c.versement && Number(c.versement.montant) > 0) && !(c.paiements || []).length && !c.factureNum;
}
function patronVide(p){ return !p.titre && !p.texte && !(p.pages || []).length && !p.auteur && !p.notes; }
function nettoyerBrouillons(){
  var avantC = commandes().length, avantP = patrons().length;
  state.commandes = commandes().filter(function(c){ return !(c.brouillon && c.id !== view.cmdVue && commandeVide(c)); });
  state.patrons = patrons().filter(function(p){ return !(p.brouillon && p.id !== view.patronVu && patronVide(p)); });
  if (state.commandes.length !== avantC || state.patrons.length !== avantP) sauverTout();
}

/* L'atelier ne se dessine jamais derrière l'écran de connexion ni pendant
   « Connexion en cours… » : un redimensionnement, un autre onglet ou une
   photo reçue appellent render() à tout moment. */
function atelierFerme(){
  var cfg = window.CROCHOMPTE_CONFIG || {};
  if (cfg.supabaseUrl && cfg.supabaseAnonKey && !etatAcces.recu) return true;
  return etatAcces.exige && !etatAcces.connecte;
}
function render(){
  if (atelierFerme()) return;
  if (figerHistorique()) sauverTout();
  document.body.classList.remove("avec-barre");
  if (view.tab === "atelier") view.tab = "creations";
  var ongletT = TABS.filter(function(t){ return t.id === view.tab; })[0];
  document.title = (ongletT ? (ongletT.brouillon ? libelleOngletFiche() : ongletT.nom) + " · " : "") + "Crochompte";
  oublierIndex();
  nettoyerBrouillons();
  var place = repererChamp();
  arreterVoix();
  renderNav();
  var main = document.getElementById("main");
  main.innerHTML = "";
  if (modeHorsLigne) main.appendChild(bandeauHorsLigne());
  if (view.tab === "accueil")        renderAccueil(main);
  else if (view.tab === "patrons")   renderPatrons(main);
  else if (view.tab === "commandes") renderCommandes(main);
  else if (view.tab === "marche")    renderMarche(main);
  else if (view.tab === "demarrage") renderDemarrage(main);
  else if (view.tab === "catalogue") view.modeleVu ? renderModeleDetail(main) : renderCatalogue(main);
  else if (view.tab === "creations") renderCreations(main);
  else if (view.tab === "fiche")     renderFiche(main);
  else if (view.tab === "indicateurs") renderIndicateurs(main);
  else if (view.tab === "stock")     renderStock(main);
  else                               renderReglages(main);
  hydraterPhotos(main);
  if (focusApresRendu){ focusApresRendu = false; try{ main.focus({preventScroll:true}); }catch(e){} }
  /* Un tableau plus large que l'écran doit pouvoir défiler au clavier. */
  setTimeout(function(){
    [].forEach.call(document.querySelectorAll("#main .tablewrap"), function(w){
      if (w.scrollWidth > w.clientWidth + 1){ w.tabIndex = 0; w.setAttribute("role", "region"); w.setAttribute("aria-label", "Tableau à faire défiler"); }
    });
  }, 0);
  ajusterValeurs(main);
  majBarreChrono();
  /* Remonter en haut n'a de sens qu'en arrivant sur un écran : en pleine
     saisie, c'était la page qui sautait sous les doigts. On ne remonte donc
     que si on a réellement changé de vue. */
  var vueMaintenant = view.tab + "|" + (view.sub||"") + "|" + (view.modeleVu||"") +
                      "|" + (view.ficheId||"") + "|" + (view.cmdVue||"") +
                      "|" + (view.patronVu||"") + "|" + (view.regSection||"");
  if (vueMaintenant !== derniereVue){
    derniereVue = vueMaintenant;
    window.scrollTo(0,0);
  } else {
    remettreChamp(place);
  }
  enregistrerNav();
}
var derniereVue = null;

/* ═════ 6 bis. ÉCRAN DE CONNEXION OBLIGATOIRE ═════
   Seulement quand config.js déclare une installation avec comptes. Sans lui,
   ce qui suit ne s'exécute jamais : render() reste l'unique point d'entrée,
   exactement comme avant.

   sync.js est seul à savoir si une session existe déjà (elle vit dans son
   propre stockage) : tant qu'il n'a rien annoncé via definirEtatConnexion(),
   on ne sait pas s'il faut montrer l'outil ou un formulaire de connexion —
   donc on attend, pour ne jamais laisser entrevoir l'atelier avant d'être
   sûr que la personne a le droit d'y être. */
var etatAcces = {recu:false, exige:false, connecte:false};
var minuteurChargement = null;
var modeHorsLigne = false;

function definirEtatConnexion(info){
  info = info || {};
  if (minuteurChargement){ clearTimeout(minuteurChargement); minuteurChargement = null; }
  etatAcces.recu = true;
  etatAcces.exige = !!info.exige;
  etatAcces.connecte = !!info.connecte;
  modeHorsLigne = false;
  /* On se souvient qu'un compte a été ouvert ici, et on l'oublie à la
     déconnexion : la porte de secours ne doit s'ouvrir que pour quelqu'un
     qui est déjà entré par la grande. */
  if (etatAcces.exige){
    marquer(CLE_SESSION, etatAcces.connecte ? {quand: Date.now(), uid: info.uid || null} : null);
  }
  renderRacine();
}

function renderRacine(){
  if (etatAcces.exige && !etatAcces.connecte) renderPortail();
  else render();
}

/* Bandeau permanent du mode hors ligne. Il dit trois choses, dans cet ordre :
   ce qui marche, ce qui ne marche pas, et que rien n'est perdu. */
function bandeauHorsLigne(){
  var b = el('<div class="card" style="margin-bottom:18px;border-left:4px solid var(--warn)">'+
    '<div class="body">'+
    '<p style="margin:0 0 6px"><b>Tu travailles hors ligne.</b> Tout fonctionne : '+
    'tu peux noter tes pièces, tes ventes et tes commandes comme d\'habitude.</p>'+
    '<p class="hint" style="margin:0 0 10px">Tes modifications restent sur cet appareil et '+
    'partiront sur ton compte dès que la connexion sera revenue. En attendant, l\'atelier de '+
    'tes autres appareils n\'est pas à jour, et la bibliothèque partagée est indisponible.</p>'+
    '<div class="et-act"><button type="button" class="btn" id="hl-reessayer">Réessayer la connexion</button></div>'+
    '</div></div>');
  b.querySelector("#hl-reessayer").addEventListener("click", function(){ window.location.reload(); });
  return b;
}

function renderChargement(){
  arreterVoix();
  viderEntete();
  var main = document.getElementById("main");
  main.innerHTML = "";
  main.appendChild(el(
    '<div style="max-width:420px;margin:20vh auto 0;text-align:center;color:var(--muted)">'+
    '<p>Connexion en cours…</p></div>'
  ));
}

function renderErreurChargement(){
  /* Le module ne s'est pas chargé. Si un compte a déjà été ouvert dans ce
     navigateur, on ouvre l'atelier en mode hors ligne plutôt que de laisser
     l'artisane devant une porte close avec ses données juste derrière. */
  if (marque(CLE_SESSION)){
    modeHorsLigne = true;
    etatAcces.recu = true;
    render();
    return;
  }
  arreterVoix();
  viderEntete();
  var main = document.getElementById("main");
  main.innerHTML = "";
  var box = el(
    '<div style="max-width:420px;margin:14vh auto 0" class="card"><div class="body" style="padding:20px">'+
    '<p style="margin:0 0 10px"><b>La page de connexion n\'a pas pu se charger.</b></p>'+
    '<p class="hint" style="margin:0 0 16px">Vérifie ta connexion internet, puis réessaie. '+
    'Tes données enregistrées dans ton compte ne sont pas concernées.</p>'+
    '<div class="et-act"><button type="button" class="btn primary" id="ea-reessayer">Réessayer</button></div>'+
    '</div></div>'
  );
  main.appendChild(box);
  document.getElementById("ea-reessayer").addEventListener("click", function(){
    window.location.reload();
  });
}

/* Écran plein cadre, hors des onglets habituels : c'est le passage obligé
   avant d'atteindre l'outil quand l'installation demande un compte. Il
   héberge la même zone que sync.js sait déjà peindre (formulaires de
   connexion / inscription / récupération) — seul l'endroit où elle apparaît
   change par rapport à l'ancien emplacement, dans Réglages. */
function renderPortail(){
  arreterVoix();
  viderEntete();
  var main = document.getElementById("main");
  main.innerHTML = "";
  /* À gauche (en dessous sur téléphone) : ce que fait l'outil, en trois
     points vérifiables. À droite : le formulaire, tout de suite accessible. */
  var enveloppe = el(
    '<div class="portail">'+
      '<section class="portail-pres">'+
        '<div class="eyebrow">La gestion pensée pour le crochet</div>'+
        '<h1>Sache ce que chaque création te rapporte vraiment.</h1>'+
        '<p class="lede">Matières, frais de plateforme, cotisations et temps passé : Crochompte fait le calcul '+
        'et te donne ton vrai gain à l\'heure. Puis il t\'aide à suivre tes commandes, ton stock et tes ventes.</p>'+
        '<ul class="portail-points">'+
          '<li><b>Ton vrai coût de revient</b><span>Le fil, les petites fournitures, les chutes, les frais de vente et les cotisations.</span></li>'+
          '<li><b>Tes commandes sous contrôle</b><span>Arrhes ou acompte, date promise, reste à recevoir, factures conformes.</span></li>'+
          '<li><b>Ton atelier sur tous tes appareils</b><span>Sur ton téléphone au marché, sur ton ordinateur à la maison.</span></li>'+
        '</ul>'+
        '<p class="portail-note">Sans publicité, sans revente de données. '+
        '<a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>'+
      '</section>'+
      '<div class="portail-form"></div>'+
    '</div>'
  );
  var zone = el('<div id="zone-compte-portail"></div>');
  enveloppe.querySelector(".portail-form").appendChild(zone);
  main.appendChild(enveloppe);
  if (pontCompte){
    try{ pontCompte(zone); }catch(e){}
  } else {
    zone.innerHTML = '<div class="card"><div class="body" style="padding:20px">'+
      '<p style="margin:0">Chargement du formulaire de connexion…</p></div></div>';
  }
  window.scrollTo(0,0);
}

/* ═════ 7. ACCUEIL : LE TABLEAU DE BORD ═════
   Le premier écran après la connexion, comme dans toute application de
   gestion : ce qui demande une action aujourd'hui, les chiffres du mois, et
   un accès direct à ce qu'on fait le plus souvent. Tout est calculé sur les
   données réelles de l'atelier ; rien n'est affiché qui n'existe pas. */

function dateDuJour(){
  var t = new Date().toLocaleDateString("fr-FR", {weekday:"long", day:"numeric", month:"long"});
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* La liste « À faire » : chaque ligne dit ce qui se passe, pourquoi c'est
   important, et mène à l'écran où l'on règle la question. Les plus urgentes
   d'abord (rouge), puis ce qui mérite attention (orange), puis le reste. */
function pointsAFaire(){
  var l = [];
  var r = state.reglages;
  var vend = r.profil !== "passion";
  function ajout(niveau, titre, detail, lib, action){ l.push({n:niveau, t:titre, d:detail, lib:lib, a:action}); }
  function versCommandes(){ view.cmdVue = null; aller("commandes"); }

  /* Un enregistrement en ligne qui échoue : le dire en premier, jamais en silence. */
  var S = window.CrochompteSync;
  var envoi = S && S.etatEnvoi ? S.etatEnvoi() : null;
  if (envoi && envoi.connecte && envoi.erreur){
    ajout("bad", "Tes dernières modifications ne sont pas encore enregistrées en ligne",
      "Elles sont gardées sur cet appareil et repartiront toutes seules. " + envoi.erreur, "Réessayer",
      function(){ S.reessayer(); toast("Nouvel essai d'enregistrement…"); });
  }
  /* Une fiche commencée et pas enregistrée (page rechargée, appli fermée). */
  var bg = !view.draft ? brouillonGarde() : null;
  if (bg) ajout("info", "Création en cours, pas encore enregistrée : « " + (bg.d.nom || "sans nom") + " »",
    "Commencée le " + new Date(bg.le).toLocaleString("fr-FR", {day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit"}) + ". Tu peux la reprendre là où tu l'avais laissée.",
    "Reprendre", reprendreBrouillon);
  /* Un chronomètre oublié fausse le temps de travail. */
  var ch = chronoEnCours();
  if (ch){
    var pc = piece(ch.pid), crc = pc ? creation(pc.cid) : null;
    var depuis = Math.round((Date.now() - ch.debut) / 60000);
    ajout(depuis > 240 ? "warn" : "info", "Chronomètre en marche depuis " + dureeTexte(depuis),
      crc ? "Sur « " + crc.nom + " »." : "", "Voir", function(){ aller("creations"); });
  }

  var ouvertes = commandesOuvertes().filter(function(c){ return c.statut !== "devis"; });
  var retard = ouvertes.filter(function(c){ var j = joursRestants(c); return j !== null && j < 0; });
  var bientot = ouvertes.filter(function(c){ var j = joursRestants(c); return j !== null && j >= 0 && j <= 7; });
  function noms(liste){
    var n = liste.slice(0,3).map(function(c){ return (c.client && c.client.nom) || "sans nom"; });
    return n.join(", ") + (liste.length > 3 ? "…" : "");
  }
  if (retard.length) ajout("bad", retard.length + " commande" + (retard.length>1?"s":"") + " en retard",
    "Date promise dépassée : " + noms(retard) + ".", "Voir", versCommandes);
  if (bientot.length) ajout("warn", bientot.length + " commande" + (bientot.length>1?"s":"") + " à remettre dans les 7 jours",
    noms(bientot) + ".", "Voir", versCommandes);
  var plan = planDeCharge();
  if (!plan.tenable && plan.bloquante){
    ajout("warn", "Ton carnet de commandes est trop chargé", texteSurcharge(plan), "Voir", versCommandes);
  }
  /* Sur l'Accueil, on ne relance que ce qui est exigible : pièce terminée ou
     livrée et pas entièrement payée. Le total de toutes les commandes en
     attente est dans l'onglet Commandes. */
  var aEncaisser = commandes().filter(function(c){
    return (c.statut === "terminee" || c.statut === "livree") && soldeDu(c) > 0.004;
  });
  if (aEncaisser.length){
    var du = 0; aEncaisser.forEach(function(c){ du += soldeDu(c); });
    ajout("warn", eur(du) + " à réclamer",
      "Pièce terminée ou livrée, pas entièrement payée : " + noms(aEncaisser) + ".",
      "Voir", versCommandes);
  }
  var devis = commandes().filter(function(c){ return c.statut === "devis"; });
  if (devis.length) ajout("info", devis.length + " devis en attente de réponse",
    "Relance pour avoir une réponse, ou passe la commande en « À fabriquer » dès que c'est accepté.", "Voir", versCommandes);

  var negatifs = state.matieres.filter(function(m){ return (Number(m.stock)||0) < -1e-9; });
  if (negatifs.length) ajout("bad", pluriel(negatifs.length, "matière en stock négatif", "matières en stock négatif"),
    negatifs.slice(0,3).map(function(m){ return m.nom; }).join(", ") + (negatifs.length > 3 ? "…" : "") +
    " : plus de sorties que d'achats notés. Note l'achat oublié ou fais un inventaire.",
    "Voir le stock", function(){ view.sub = "matieres"; aller("stock"); });
  var sousSeuil = alertesStock();
  if (sousSeuil.length) ajout("warn", sousSeuil.length + " matière" + (sousSeuil.length>1?"s":"") + " sous ton seuil d'alerte",
    sousSeuil.slice(0,3).map(function(m){ return m.nom; }).join(", ") + (sousSeuil.length > 3 ? "…" : "") + " : pense à en racheter.",
    "Voir le stock", function(){ view.sub = "matieres"; aller("stock"); });
  var finis = alertesFinis();
  if (finis.length) ajout("info", finis.length + " création" + (finis.length>1?"s":"") + " sous ton stock de sécurité",
    finis.slice(0,3).map(function(c){ return c.nom; }).join(", ") + " : il reste moins de pièces prêtes que prévu.",
    "Voir", function(){ aller("creations"); });

  var perte = vend ? creationsActives().filter(function(c){ return (Number(c.prix)||0) > 0 && calculer(c).reste < 0; }) : [];
  if (perte.length) ajout("bad", perte.length + " création" + (perte.length>1?"s":"") + " à perte",
    "Le prix de " + perte.slice(0,3).map(function(c){ return c.nom; }).join(", ") + (perte.length>3?"…":"") + " ne couvre pas les matières, les frais et les cotisations.",
    "Revoir", function(){ aller("creations"); });

  if (vend && r.statut){
    var ca = caAnnuel(), sl = seuilsDuStatut();
    var pTva = sl.tva > 0 ? ca.total / sl.tva : 0;
    var caPrec = caAnnuel(ca.annee - 1).total;
    /* Même règle que la facture (enFranchiseTVA) : la franchise tombe tout
       de suite au-delà du seuil MAJORÉ ; entre les deux seuils, elle reste
       acquise cette année et tombe au 1er janvier suivant. */
    if (sl.tvaMajore > 0 && ca.total > sl.tvaMajore) ajout("bad", "Seuil majoré de franchise de TVA dépassé",
      "Tu as encaissé " + eur(ca.total) + " en " + ca.annee + " (seuil majoré : " + eurRond(sl.tvaMajore) + ") : tu dois facturer la TVA dès maintenant. Renseigne-toi auprès de ton service des impôts des entreprises.",
      "Voir", function(){ aller("indicateurs"); });
    else if (sl.tva > 0 && caPrec > sl.tva) ajout("bad", "Franchise de TVA perdue depuis le 1er janvier",
      "Tu as encaissé " + eur(caPrec) + " en " + (ca.annee - 1) + ", au-delà du seuil de " + eurRond(sl.tva) + " : la TVA est due sur tes ventes de " + ca.annee + ".",
      "Voir", function(){ aller("indicateurs"); });
    else if (ca.total > sl.tva) ajout("warn", "Seuil de franchise de TVA dépassé",
      "Tu as encaissé " + eur(ca.total) + " en " + ca.annee + " (seuil : " + eurRond(sl.tva) + "). Pas de TVA cette année tant que tu restes sous " +
      eurRond(sl.tvaMajore) + ", mais tu devras la facturer à partir du 1er janvier.",
      "Voir", function(){ aller("indicateurs"); });
    else if (pTva >= 0.8) ajout("warn", "Tu approches du seuil de franchise de TVA",
      eur(ca.total) + " encaissés en " + ca.annee + " : " + Math.round(pTva*100) + " % du seuil de " + eurRond(sl.tva) + ".",
      "Voir", function(){ aller("indicateurs"); });
  }
  if (!r.confirmeLe && vend && state.creations.length > 0 && (state.commandes||[]).length > 0) ajout("info", "Vérifie tes réglages de départ",
    "Ton taux horaire, ton statut et tes frais servent à tous les calculs. Tant qu'ils ne sont pas confirmés, les prix affichés restent indicatifs.",
    "Ouvrir", function(){ view.regSection = "activite"; aller("reglages"); });

  var ordre = {bad:0, warn:1, info:2};
  l.sort(function(a,b){ return ordre[a.n] - ordre[b.n]; });
  return l;
}

function renderAccueil(main){
  var r = state.reglages;
  var vend = r.profil !== "passion";
  var qui = (compteInfo.connecte && compteInfo.pseudo) ? compteInfo.pseudo : "";
  /* Atelier neuf : la question est posée en tête de l'Accueil, à la place de
     la bande verte, tant qu'on n'a pas répondu. Atelier déjà rempli (d'avant
     la V44) : on devine, on le dit, et le profil se change dans Réglages. */
  if (!r.profilType){
    if (state.creations.length || (state.pieces||[]).length || (state.commandes||[]).length){
      appliquerProfil(profilDeduit(), {sansRendu:true});
      setTimeout(function(){ toast("Profil « " + (profilActuel() || {}).nom + " » choisi d'après ton atelier.", {libelle:"Changer", fn:function(){ dialogueProfil({}); }}); }, 60);
    } else main.appendChild(sectionProfil());
  }

  var aUneVente = (state.pieces||[]).some(function(p){ return p.com === "vendu"; }) || commandes().length > 0;
  var nouvelleCmd = function(){ dialogueNouvelleCommande(); };

  /* ── La bande verte ──
     Une phrase qui dit l'essentiel avec TES chiffres, et à droite le calcul
     d'une de tes créations, ligne par ligne. Tant qu'il n'y en a aucune, le
     même calcul sur un exemple, présenté comme tel. */
  var calcs = creationsActives().map(function(c){ return {c:c, r:calculer(c)}; });
  var avecPrix = calcs.filter(function(x){ return Number(x.c.prix) > 0 && x.r.heures > 0; });
  var meilleure = avecPrix.slice().sort(function(a, b){ return b.r.gainHoraire - a.r.gainHoraire; })[0] || null;
  var vitrine = meilleure || calcs[calcs.length - 1] || null;
  var bmH = bornesIndicateur("mois");
  var encMois = vend ? sommeEntre(encaissements(), bmH.debut, bmH.fin) : 0;
  var termMois = (state.pieces||[]).filter(function(p){ return p.termineLe && p.termineLe >= bmH.debut; }).length;
  var minMois = minutesTravaillees(bmH.debut, bmH.fin);
  var nbPoints = pointsAFaire().length;
  var objectif = Number(r.tauxHoraire) || 0;

  var titre, lede;
  var etTermine = termMois ? ' et terminé <span class="chiffre">' + termMois + '</span> pièce' + (termMois > 1 ? 's' : '') : '';
  if (!calcs.length){
    titre = (qui ? 'Bonjour ' + esc(qui) + '.' : 'Tu sais crocheter.') + '<span class="suite">Sais-tu ce que ton crochet te rapporte&nbsp;?</span>';
    lede = "Le fil, les chutes, les yeux de sécurité, le pochon, la commission de la plateforme, les cotisations — et surtout "+
           "tes heures. Crochompte compte tout à ta place et te répond en un chiffre : ce que tu gagnes de l'heure.";
  } else if (vend && encMois > 0){
    titre = 'Bonjour' + (qui ? ' ' + esc(qui) : '') + ',<span class="suite">ce mois-ci, tu as encaissé <span class="chiffre">' + esc(eur(encMois)) + '</span>' + etTermine + '.</span>';
    lede = texteResume(nbPoints);
  } else if (termMois > 0){
    titre = 'Bonjour' + (qui ? ' ' + esc(qui) : '') + ',<span class="suite">ce mois-ci, tu as terminé <span class="chiffre">' + termMois + '</span> pièce' + (termMois > 1 ? 's' : '') +
            (minMois >= 30 ? ' en <span class="chiffre">' + esc(dureeTexte(Math.round(minMois))) + '</span> de travail' : '') + '.</span>';
    lede = texteResume(nbPoints);
  } else if (meilleure && vend){
    titre = 'Bonjour' + (qui ? ' ' + esc(qui) : '') + ',<span class="suite">ta meilleure création te paie <span class="chiffre">' +
            esc(eur(meilleure.r.gainHoraire)) + '</span> de l\'heure.</span>';
    lede = texteResume(nbPoints);
  } else {
    titre = 'Bonjour' + (qui ? ' ' + esc(qui) : '') + '.<span class="suite">Voici où en est ton atelier.</span>';
    lede = texteResume(nbPoints);
  }
  function texteResume(n){
    var morceaux = [];
    morceaux.push(n ? n + " point" + (n>1?"s":"") + " à regarder aujourd'hui" : "Rien d'urgent aujourd'hui");
    if (minMois >= 30 && !(termMois > 0 && !(vend && encMois > 0))) morceaux.push(dureeTexte(Math.round(minMois)) + " chronométrées ce mois-ci");
    morceaux.push(calcs.length + " création" + (calcs.length>1?"s":"") + " calculée" + (calcs.length>1?"s":""));
    if (vend){ var nc = commandesOuvertes().length; if (nc) morceaux.push(nc + " commande" + (nc>1?"s":"") + " en cours"); }
    return morceaux.join(" · ") + ".";
  }

  var hero = el('<section class="acc-hero"><div class="acc-hero-in">'+
    '<div><div class="eyebrow">' + esc(dateDuJour()) + '</div>'+
      '<h1>' + titre + '</h1>'+
      '<p class="lede">' + esc(lede) + '</p>'+
      '<div class="cta"></div></div>'+
    '<div class="preuve"></div>'+
  '</div></section>');
  var cta = hero.querySelector(".cta");
  var bH1 = el('<button type="button" class="btn lg">' + (calcs.length ? "Nouvelle création" : "Calculer ma première création") + '</button>');
  bH1.addEventListener("click", function(){ nouvelleFiche(); });
  cta.appendChild(bH1);
  var bH2 = el('<button type="button" class="btn lg alt">' + (vend && calcs.length ? "Nouvelle commande" : "Parcourir le catalogue") + '</button>');
  bH2.addEventListener("click", vend && calcs.length ? nouvelleCmd : function(){ view.modeleVu = null; aller("catalogue"); });
  cta.appendChild(bH2);
  /* Vendre en un geste, et le stand pour un jour de marché. */
  if (vend && calcs.length){
    var marcheProfil = r.profilType === "marche";
    var bV = el('<button type="button" class="btn lg' + (marcheProfil ? '' : ' alt') + '">' + (marcheProfil ? "Jour de marché" : "Vendre une pièce") + '</button>');
    bV.addEventListener("click", marcheProfil ? function(){ aller("marche"); } : function(){ dialogueVente(null); });
    cta.appendChild(bV);
    if (marcheProfil){
      var bV2 = el('<button type="button" class="btn lg alt">Vendre une pièce</button>');
      bV2.addEventListener("click", function(){ dialogueVente(null); });
      cta.appendChild(bV2);
    } else {
      var bM = el('<button type="button" class="btn lg alt">Jour de marché</button>');
      bM.addEventListener("click", function(){ aller("marche"); });
      cta.appendChild(bM);
    }
  }

  var pv = hero.querySelector(".preuve");
  var demo = !vitrine;
  if (!demo){ pv.appendChild(panneauReprise(vend)); pv.classList.add("reprise-p"); }
  var cv = demo ? creationDepuisModele("ami_moyen", "Amigurumi moyen", 32, "etsy") : vitrine.c;
  var rv = demo ? calculer(cv) : vitrine.r;
  var prixV = Number(cv.prix) || 0;
  var entete = demo
    ? 'Exemple : amigurumi de 20 cm vendu ' + esc(eur(32)) + ' sur une plateforme'
    : (meilleure === vitrine && avecPrix.length > 1 ? 'Ta création la mieux payée : ' : 'Ta création ') +
      '<b>« ' + esc(cv.nom || "Sans nom") + ' »</b>' + (prixV ? ', vendue ' + esc(eur(prixV)) + ' · ' + esc(canal(cv.canal).nom) : '');
  if (!demo){
    /* Le panneau « Reprendre » remplace la vitrine d'une création : on
       entre dans son atelier, pas dans une publicité. */
  } else if (vend && prixV > 0 && !(rv.minutes > 0)){
    pv.innerHTML = '<div class="t">' + entete + '</div><div class="rows">'+
      '<div class="row"><span>Prix de vente</span><span>' + esc(eur(prixV)) + '</span></div>'+
      '<div class="row"><span>Reste après matières, frais et cotisations</span><span>' + esc(eur(rv.reste)) + '</span></div></div>'+
      '<div class="big">— / h</div><div class="cap">Indique ton temps de travail dans la fiche pour savoir ce qu\'elle te paie de l\'heure.</div>';
  } else if (vend && prixV > 0){
    var ok = objectif > 0 && rv.gainHoraire >= objectif - 0.005;
    pv.innerHTML = '<div class="t">' + entete + '</div><div class="rows">'+
      '<div class="row"><span>Prix de vente</span><span>' + esc(eur(prixV)) + '</span></div>'+
      '<div class="row"><span>Matières et emballage</span><span>− ' + esc(eur(rv.matieres)) + '</span></div>'+
      '<div class="row"><span>Frais de vente</span><span>− ' + esc(eur(rv.fraisVar + rv.fraisFixesVente)) + '</span></div>'+
      '<div class="row"><span>Cotisations</span><span>− ' + esc(eur(rv.cotisations)) + '</span></div>'+
      (rv.fixePiece > 0 ? '<div class="row"><span>Part des frais fixes</span><span>− ' + esc(eur(rv.fixePiece)) + '</span></div>' : '')+
      '<div class="row"><span>Reste pour ' + esc(dureeTexte(Math.round(rv.heures * 60))) + ' de travail</span><span>' + esc(eur(rv.reste)) + '</span></div></div>'+
      '<div class="big' + (ok ? ' ok' : '') + '">' + esc(eur(rv.gainHoraire)) + ' / h</div>'+
      '<div class="cap">' + (demo ? "C'est ce chiffre que l'application met devant toi. Pas un prix imposé : un fait."
        : objectif > 0 ? (ok ? "Au-dessus de ton objectif de " + esc(eur(objectif)) + " / h."
                             : "Ton objectif : " + esc(eur(objectif)) + " / h. Il manque " + esc(eur(objectif - rv.gainHoraire)) + " par heure.")
        : "Fixe ton taux horaire visé dans Réglages pour le comparer.") + '</div>';
  } else {
    /* Pas de prix (création à chiffrer, ou loisir) : ce qu'elle coûte. */
    pv.innerHTML = '<div class="t">' + entete + '</div><div class="rows">'+
      '<div class="row"><span>Matières et emballage</span><span>' + esc(eur(rv.matieres)) + '</span></div>'+
      '<div class="row"><span>Temps de travail</span><span>' + esc(dureeTexte(rv.minutes)) + '</span></div>'+
      (vend ? '<div class="row"><span>Prix conseillé</span><span>' + esc(rv.prixObjectif > 0 ? eur(rv.prixObjectif) : "—") + '</span></div>' : '')+
      '</div><div class="big ok">' + esc(eur(rv.matieres)) + '</div>'+
      '<div class="cap">' + (vend ? "de matières. Donne-lui un prix de vente pour voir ce qu'elle te paie de l'heure." : "de matières pour cette pièce.") + '</div>';
  }
  main.appendChild(hero);

  /* ── Premiers pas : trois cartes, cochées au fur et à mesure ── */
  var etapes = [
    vend ? {fait: !!r.confirmeLe, t:"Règle tes chiffres",
     d:"Ton statut, ce que tu veux gagner de l'heure et tes frais fixes. Deux minutes, une seule fois.",
     lib:"Ouvrir les réglages", a:function(){ view.regSection = "activite"; aller("reglages"); }}
         : {fait: state.matieres.some(function(m){ return !m.prixIndicatif; }), t:"Note le prix de ta laine",
     d:"Le prix de tes pelotes, tel qu'écrit sur le ticket : c'est ce qui rend le coût de tes ouvrages juste.",
     lib:"Ouvrir mes matières", a:function(){ view.sub = "matieres"; aller("stock"); }},
    {fait: state.creations.length > 0, t:"Calcule ta première création",
     d:"Pars d'un type d'ouvrage du catalogue : matières et temps sont déjà remplis, tu corriges avec tes chiffres.",
     lib:"Commencer", a:function(){ view.modeleVu = null; view.catMode = "types"; aller("catalogue"); }},
    {fait: aUneVente, t: vend ? "Note ta première commande" : "Suis ta première pièce",
     d: vend ? "Tes encaissements, tes échéances et tes indicateurs se remplissent à partir de là."
             : "Ce que tu produis et ce que ton loisir te coûte se calculent à partir de là.",
     lib: vend ? "Nouvelle commande" : "Mes créations",
     a: vend ? nouvelleCmd : function(){ aller("creations"); }}
  ];
  var faites = etapes.filter(function(e){ return e.fait; }).length;
  if (faites < etapes.length){
    var dep = el('<section class="depart" aria-label="Pour bien démarrer"><div class="depart-tete"><h2>Pour bien démarrer</h2>'+
      '<span>' + faites + ' sur ' + etapes.length + ' terminée' + (faites>1?'s':'') + '</span></div><div class="depart-grille"></div></section>');
    var dg = dep.querySelector(".depart-grille");
    var prochaine = -1;
    etapes.forEach(function(e, k){ if (!e.fait && prochaine < 0) prochaine = k; });
    etapes.forEach(function(e, k){
      var carte = el('<div class="dep' + (e.fait ? ' fait' : '') + '"><span class="num" aria-hidden="true">' + (e.fait ? '✓' : (k+1)) + '</span>'+
        '<h3>' + esc(e.t) + '</h3><p>' + esc(e.d) + '</p></div>');
      if (e.fait) carte.appendChild(el('<span class="ok">Fait</span>'));
      else carte.appendChild(bouton(e.lib, e.a, k === prochaine));
      dg.appendChild(carte);
    });
    var lienMer = el('<p class="hint" style="margin:8px 0 0"><a href="#" id="lien-mise-en-route">Voir la mise en route complète →</a></p>');
    lienMer.querySelector("a").addEventListener("click", function(e){ e.preventDefault(); aller("demarrage"); });
    dep.appendChild(lienMer);
    main.appendChild(dep);
  }

  var grille = el('<div class="dash-grid"></div>');
  var col1 = el('<div class="dash-col"></div>'), col2 = el('<div class="dash-col"></div>');
  grille.appendChild(col1); grille.appendChild(col2);

  /* À faire */
  var points = pointsAFaire();
  var cTodo = el('<div class="card"><header><h2>À faire</h2>'+
    '<p>' + (points.length ? points.length + ' point' + (points.length>1?'s':'') + ' demande' + (points.length>1?'nt':'') + ' ton attention.'
                           : 'Rien ne demande ton attention pour l\'instant.') + '</p></header>'+
    '<div class="body"></div></div>');
  if (points.length){
    var ul = el('<ul class="todo"></ul>');
    points.forEach(function(x){
      var li = el('<li class="avec-ico"><span class="ico '+x.n+'" aria-hidden="true">'+(x.n === "bad" ? "!" : x.n === "warn" ? "!" : "i")+'</span>'+
        '<div><b>'+esc(x.t)+'</b><span class="d">'+esc(x.d)+'</span></div></li>');
      var b = bouton(x.lib, x.a); b.classList.add("sm");
      li.appendChild(b);
      ul.appendChild(li);
    });
    cTodo.querySelector(".body").appendChild(ul);
  } else {
    cTodo.querySelector(".body").appendChild(el('<p class="hint" style="margin:0">Commandes, échéances, stock et seuils sont surveillés en continu. '+
      'Dès que quelque chose demande une action, tu le verras ici.</p>'));
  }
  col1.appendChild(cTodo);

  /* Ce mois-ci */
  var bm = bornesIndicateur("mois");
  var enc = vend ? encaissements() : [];
  var ach = achatsMatieres();
  var encM = sommeEntre(enc, bm.debut, bm.fin), encP = sommeEntre(enc, bm.precDebut, bm.precFin);
  var achM = sommeEntre(ach, bm.debut, bm.fin);
  var termM = (state.pieces||[]).filter(function(p){ return p.termineLe && p.termineLe >= bm.debut; }).length;
  var plan2 = planDeCharge();
  var mois = new Date().toLocaleDateString("fr-FR", {month:"long"});
  var cMois = el('<div class="card"><header><h2>En ' + esc(mois) + '</h2><p>Du 1er à aujourd\'hui.</p></header><div class="body"><div class="tiles dash-tiles"></div></div></div>');
  var tl = cMois.querySelector(".tiles");
  if (vend) tl.appendChild(tuile("Encaissé", eur(encM), texteVariation(encM, encP, "au mois dernier à la même date") || "argent reçu ce mois-ci", "acc-good"));
  tl.appendChild(tuile("Achats de matières", eur(achM), "entrées de stock avec leur prix"));
  if (r.mode === "complet") tl.appendChild(tuile("Pièces terminées", String(termM), "suivies dans « Mes créations »"));
  if (r.mode === "complet" && minMois >= 1) tl.appendChild(tuile("Temps chronométré", dureeTexte(Math.round(minMois)), "sur tes pièces ce mois-ci"));
  else tl.appendChild(tuile("Créations calculées", String(creationsActives().length), "dans « Mes créations »"));
  if (vend) tl.appendChild(tuile("Commandes à fabriquer", String(plan2.n),
    plan2.n ? dureeTexte(plan2.heures*60) + " de travail promis" : "aucune pour l'instant"));
  var lienInd = el('<p style="margin:14px 0 0"><a href="#">Voir tous mes chiffres →</a></p>');
  lienInd.querySelector("a").addEventListener("click", function(e){ e.preventDefault(); aller("indicateurs"); });
  cMois.querySelector(".body").appendChild(lienInd);
  col2.appendChild(cMois);

  /* Les dernières créations sont déjà dans la bande verte (« Reprendre ») :
     pas de seconde liste ici. */

  main.appendChild(grille);

  main.appendChild(el('<footer class="foot"><p style="margin:0;max-width:80ch">Les prix de matières, les frais des plateformes '+
    'et les taux proposés par défaut sont des ordres de grandeur, à remplacer par les tiens. Vérifie les frais sur le site de ta '+
    'plateforme et ton taux de cotisations auprès de l\'URSSAF. Crochompte t\'aide à décider ; il ne remplace ni une comptabilité, ni un conseil.</p>'+
    '<p style="margin:10px 0 0"><a href="confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a> · '+
    '<a href="mailto:bonjour@crochompte.com">Nous écrire</a></p>'+
    '<p style="margin:10px 0 0;font-size:12px">© 2026 Crochompte. Tous droits réservés.</p></footer>'));
}


/* Le panneau de droite de l'Accueil : reprendre là où on s'est arrêtée. */
function panneauReprise(vend){
  var z = el('<div class="reprise"></div>');
  var rp = reprise();
  var obj = Number(state.reglages.tauxHoraire) || 0;
  function ligneChiffre(c){
    var x = calculer(c), st = verdictCalcul(x);
    return vend && x.prix > 0 && x.heures > 0 ? '<b class="' + st.k + '">' + esc(eur(x.gainHoraire)) + ' / h</b>' : '<b>' + esc(eur(x.matieres)) + ' de matières</b>';
  }
  if (rp){
    var t, d, acts = [];
    if (rp.type === "chrono"){
      t = "Chronomètre en cours sur « " + rp.c.nom + " »";
      d = dureeLisible(minutesMesurees(rp.p) + (Date.now() - chronoEnCours().debut) / 60000) + " passées sur cette pièce.";
      acts.push(["■ Arrêter et noter le temps", function(){ arreterChrono(); render(); }]);
      acts.push(["Voir la pièce", function(){ view.creaQ = rp.c.nom; aller("creations"); }]);
    } else if (rp.type === "brouillon"){
      t = "Fiche « " + (rp.nom || "sans nom") + " » pas encore enregistrée";
      d = "Tu l'as laissée le " + new Date(rp.b.le).toLocaleDateString("fr-FR") + ". Rien n'est perdu.";
      acts.push(["Reprendre la fiche", reprendreBrouillon, true]);
    } else if (rp.type === "piece"){
      var mm = minutesMesurees(rp.p);
      t = (rp.p.prod === "retouche" ? "À retoucher : « " : rp.p.prod === "afaire" ? "À faire : « " : "En cours : « ") + rp.c.nom + " »";
      d = (mm > 0.5 ? dureeLisible(mm) + " déjà passées" : "pas encore chronométrée") +
          (rp.p.com === "commande" ? " · pour une commande" + (rp.p.client ? " de " + rp.p.client : "") : "") + ".";
      acts.push(["▶ Chronométrer", function(){ demarrerChrono(rp.p.id); view.creaQ = rp.c.nom; aller("creations"); toast("Chronomètre lancé"); }, true]);
      acts.push(["Voir mes pièces", function(){ view.creaQ = rp.c.nom; aller("creations"); }]);
    } else {
      t = "Ta dernière création : « " + rp.c.nom + " »";
      var xr = calculer(rp.c);
      d = vend && xr.prix > 0 && xr.heures > 0 ? "Elle te paie " + eur(xr.gainHoraire) + " de l'heure" + (obj > 0 ? " (objectif " + eur(obj) + ")" : "") + "."
        : vend && !(xr.prix > 0) ? "Son prix reste à fixer." : eur(xr.matieres) + " de matières, " + dureeTexte(xr.minutes) + " de travail.";
      acts.push(["Ouvrir la fiche", function(){ ouvrirFiche(rp.c.id); }, true]);
      if (state.reglages.mode === "complet") acts.push(["+ Pièce", function(){ dialogueAjoutPieces(rp.c.id); }]);
    }
    var m = el('<div class="r-main">' + vignette(rp.c || {nom: rp.nom || "", modele: "vide"}, 44) + '<div><div class="eyebrow" style="opacity:.75">Reprendre</div><h3>' + esc(t) + '</h3><p>' + esc(d) + '</p></div></div>');
    z.appendChild(m);
    var ra = el('<div class="r-act"></div>');
    acts.forEach(function(a){ var b = bouton(a[0], a[1], !!a[2]); b.classList.add("sm"); if (!a[2]) b.classList.add("alt"); ra.appendChild(b); });
    z.appendChild(ra);
  }
  /* Les autres créations récentes, d'un geste. */
  var autres = creationsActives().filter(function(c){ return !rp || !rp.c || c.id !== rp.c.id; })
    .sort(function(a, b){ return derniereActivite(b) - derniereActivite(a); }).slice(0, 3);
  if (autres.length){
    var l = el('<div class="r-liste"></div>');
    autres.forEach(function(c){
      var b = el('<button type="button"><span>' + esc(c.nom) + '</span>' + ligneChiffre(c) + '</button>');
      b.setAttribute("aria-label", "Ouvrir la fiche de " + c.nom);
      b.addEventListener("click", function(){ ouvrirFiche(c.id); });
      l.appendChild(b);
    });
    var tous = el('<button type="button"><span style="text-decoration:underline">Toutes mes créations →</span></button>');
    tous.addEventListener("click", function(){ view.creaQ = ""; aller("creations"); });
    l.appendChild(tous);
    z.appendChild(l);
  }
  return z;
}

/* ═════ 8. CATALOGUE ═════ */

function coutRapide(modeleId){
  var cr = creationDepuisModele(modeleId, "", 0, "direct");
  return calculer(cr);
}
var DIFF = ["Facile", "Intermédiaire", "Exigeant"];
function niveau(d){
  var h = '<span class="niv" title="Difficulté : '+esc(DIFF[d-1])+'">';
  for (var i=1;i<=3;i++) h += '<i class="'+(i<=d?"on":"")+'"></i>';
  return h + '</span>';
}
function fourchette(f){
  if (!f || !f[1]) return "—";   /* pas de relevé : on n'invente pas */
  return String(Math.round(f[0])) + "–" + String(Math.round(f[1])) + " €";
}
/* Un modèle n'entre au catalogue que s'il a une vraie photo de la pièce :
   celle du livret d'origine, ou celle prise par l'artisane. Sans photo, il n'y
   a rien à regarder et rien sur quoi se projeter — c'est un type d'ouvrage,
   pas un modèle. */
/* Un modèle « a un visuel » s'il a la photo de la réalisation de
   l'utilisatrice, la photo d'origine de son livret, ou une photo
   d'illustration sous licence libre. Les trois se valent pour répondre à
   la question « à quoi ça ressemble ? » — elles diffèrent par ce qu'elles
   promettent, et chaque carte le dit en toutes lettres. */
function aVraiePhoto(mid){ return !!epoque(mid) || aPhotoModele(mid) || !!illustration(mid); }

function renderCatalogue(main){
  var total = MODELES.length - 1;
  var avecPhoto = MODELES.filter(function(m){ return m[0]!=="vide" && aVraiePhoto(m[0]); }).length;
  if (view.catMode !== "types") view.catMode = "modeles";
  var modeM = view.catMode === "modeles";

  main.appendChild(enTete(
    modeM ? "Modèles" : "Types d'ouvrage",
    modeM
      ? "Les ouvrages que tu peux voir avant de te lancer : photo d'origine du livret "+
        "quand elle existe, sinon une photo d'illustration sous licence libre. "+
        "Chaque carte précise laquelle."
      : "Les "+total+" entrées qui servent à démarrer une fiche de coût : matières et temps "+
        "habituels. Ce ne sont pas des modèles précis : c'est pourquoi ils n'ont pas de photo."));

  var segs = el('<div class="segs" role="group" aria-label="Affichage du catalogue"></div>');
  [["modeles","Avec visuel ("+avecPhoto+")"],["types","Tous les types d'ouvrage ("+total+")"]]
  .forEach(function(o){
    var b = el('<button type="button">'+esc(o[1])+'</button>');
    b.setAttribute("aria-pressed", view.catMode === o[0] ? "true" : "false");
    b.addEventListener("click", function(){ view.catMode = o[0]; render(); });
    segs.appendChild(b);
  });
  main.appendChild(segs);

  var filtres = el('<div class="filters"></div>');
  var parFamille = {}, nFiltre = 0;
  MODELES.forEach(function(m){
    if (m[0] === "vide") return;
    if (modeM && !aVraiePhoto(m[0])) return;   /* compter ce qui est réellement affiché */
    parFamille[m[1]] = (parFamille[m[1]]||0)+1; nFiltre++;
  });

  var tous = el('<button type="button" class="fchip">Toutes <span class="n">'+nFiltre+'</span></button>');
  tous.setAttribute("aria-pressed", view.filtre === "tous" ? "true" : "false");
  tous.addEventListener("click", function(){ view.filtre = "tous"; render(); });
  filtres.appendChild(tous);
  FAMILLES.forEach(function(f){
    if (!parFamille[f.id]) return;   /* une famille sans modèle affiché n'est pas un filtre */
    var b = el('<button type="button" class="fchip"><span class="pastille" style="background:var(--f-'+esc(f.id)+')"></span> '+
      esc(f.nom)+' <span class="n">'+parFamille[f.id]+'</span></button>');
    b.style.display = "inline-flex"; b.style.alignItems = "center"; b.style.gap = "7px";
    b.setAttribute("aria-pressed", view.filtre === f.id ? "true" : "false");
    b.addEventListener("click", function(){ view.filtre = f.id; render(); });
    filtres.appendChild(b);
  });
  main.appendChild(filtres);

  var barre = el('<div class="grid2" style="max-width:640px;margin-bottom:16px">'+
    '<label class="f"><span>Rechercher un modèle</span><input type="text" id="cat-q" placeholder="lapin, bonnet, panier…"></label>'+
    '<label class="f"><span>Trier par</span><select id="cat-tri">'+
      '<option value="famille">Famille</option>'+
      '<option value="temps">Temps de travail</option>'+
      '<option value="matieres">Coût des matières</option>'+
      '<option value="prix">Prix courant</option>'+
      '<option value="diff">Difficulté</option>'+
    '</select></label>'+
    '<div class="f cat-sens"><span>Sens</span><button type="button" class="btn sm tri-sens" id="cat-sens"></button></div>'+
    '<label class="f"><span>Patron</span><select id="cat-pat">'+
      '<option value="tous">Tous les types</option>'+
      '<option value="avec">Avec patron uniquement</option>'+
    '</select></label></div>');
  barre.querySelector("#cat-pat").value = view.catPat || "tous";
  barre.querySelector("#cat-pat").addEventListener("change", function(e){
    view.catPat = e.target.value; peindreCartes();
  });
  barre.querySelector("#cat-q").value = view.recherche;
  barre.querySelector("#cat-tri").value = view.tri || "famille";
  barre.querySelector("#cat-q").addEventListener("input", function(e){
    view.recherche = e.target.value; peindreCartes();
  });
  barre.querySelector("#cat-tri").addEventListener("change", function(e){
    view.tri = e.target.value; peindreCartes();
  });
  var bSens = barre.querySelector("#cat-sens");
  function peindreSensCat(){ bSens.textContent = view.triSens < 0 ? "↓ Décroissant" : "↑ Croissant"; bSens.setAttribute("aria-label", "Sens du tri : " + (view.triSens < 0 ? "décroissant" : "croissant") + ". Toucher pour inverser."); }
  if (!view.triSens) view.triSens = 1;
  peindreSensCat();
  bSens.addEventListener("click", function(){ view.triSens = -view.triSens; peindreSensCat(); peindreCartes(); });
  main.appendChild(barre);
  var compte = el('<p class="compte" id="cat-compte"></p>');
  main.appendChild(compte);

  var grid = el('<div class="cards" id="cat-grid"></div>');
  main.appendChild(grid);
  var vide = el('<p class="hint" id="cat-vide" hidden>Aucun r\u00e9sultat. Essaie un autre mot, '+
    'ou regarde tous les types d\'ouvrage.</p>');
  main.appendChild(vide);

  function peindreCartes(){
    grid.innerHTML = "";
    var q = view.recherche.trim().toLowerCase();
    var liste = MODELES.filter(function(m){
      if (m[0] === "vide") return false;
      if (view.filtre !== "tous" && m[1] !== view.filtre) return false;
      if (q && (mNom(m)+" "+m[3]).toLowerCase().indexOf(q) === -1) return false;
      if (view.catPat === "avec" && !patronDe(m[0])) return false;
      if (modeM && !q && !aVraiePhoto(m[0])) return false;
      return true;
    });
    var tri = view.tri || "famille";
    var sensCat = view.triSens < 0 ? -1 : 1;
    if (tri !== "famille"){
      liste = liste.slice().sort(function(a,b){
        if (tri === "diff") return (a[4] - b[4]) * sensCat;
        if (tri === "prix") return (a[7][0] - b[7][0]) * sensCat;
        var ra = coutRapide(a[0]), rb = coutRapide(b[0]);
        if (tri === "temps") return (ra.minutes - rb.minutes) * sensCat;
        return (ra.matieres - rb.matieres) * sensCat;
      });
    } else if (sensCat < 0) liste = liste.slice().reverse();
    var n = liste.length;
    compte.textContent = n === 0 ? "" :
      (n + (n>1 ? (modeM ? " modèles affichés" : " types affichés")
                : (modeM ? " modèle affiché"  : " type affiché"))) +
      (view.filtre !== "tous" || q ? " sur " + nFiltre : "");
    grid.className = modeM ? "cards" : "types";
    if (!modeM && liste.length) grid.appendChild(el('<div class="types-tete" aria-hidden="true"><span></span><span>Type d\'ouvrage</span><span>Niveau</span><span>Temps</span><span>Matières</span><span>Prix courant</span></div>'));
    liste.forEach(function(m){
      var r = coutRapide(m[0]);
      var four = m[7];
      if (!modeM){
        /* La liste dit la même chose que la carte : niveau, temps, matières,
           prix courant, patron — en une ligne, colonnes alignées. */
        var ligne = el(
          '<button type="button" class="trow trow-type" aria-label="'+esc(mNom(m))+' : '+esc(DIFF[m[4]-1])+', '+esc(dureeTexte(r.minutes))+', '+esc(eur(r.matieres))+' de matières'+(four[1] ? ', prix courant '+esc(fourchette(four)) : '')+'">'+
            '<span class="mot f-'+esc(m[1])+'">'+motif(m[0],26)+'</span>'+
            '<span class="tt-nom"><h3>'+esc(mNom(m))+'</h3>'+
            '<p class="m">'+esc(m[3])+(patronDe(m[0]) ? ' <span class="chip good">patron inclus</span>' : '')+'</p></span>'+
            '<span class="tt-niv">'+niveau(m[4])+'<span>'+esc(DIFF[m[4]-1])+'</span></span>'+
            '<span class="c tt-tps"><b>'+esc(dureeTexte(r.minutes))+'</b><span>de travail</span></span>'+
            '<span class="c"><b>'+esc(eur(r.matieres))+'</b><span>de matières</span></span>'+
            '<span class="c pc"><b>'+esc(fourchette(four))+'</b><span>'+(four[1] ? 'prix courant' : 'pas de repère')+'</span></span>'+
          '</button>');
        ligne.addEventListener("click", function(){ view.modeleVu = m[0]; render(); });
        grid.appendChild(ligne);
        return;
      }
      var card = el(
        '<button type="button" class="mcard">'+
          bandeauModele(m)+
          '<div class="top"><span class="mot f-'+esc(m[1])+'">'+motif(m[0],30)+'</span><h3>'+esc(mNom(m))+'</h3></div>'+
          '<div class="meta">'+esc(m[3])+' · '+niveau(m[4])+esc(DIFF[m[4]-1])+' · '+esc(dureeTexte(r.minutes))+
            (patronDe(m[0]) ? ' <span class="chip good">patron inclus</span>' : '')+'</div>'+
          '<div class="figs">'+
            '<div class="fig"><b>'+esc(eur(r.matieres))+'</b><span>de matières</span></div>'+
            '<div class="fig"><b>'+esc(fourchette(four))+'</b><span>'+
              (four[1] ? 'prix courant' : 'pas de rep\u00e8re')+'</span></div>'+
          '</div>'+
        '</button>'
      );
      card.addEventListener("click", function(){ view.modeleVu = m[0]; render(); });
      grid.appendChild(card);
    });
    vide.hidden = n > 0;
  }
  peindreCartes();

  if (!modeM) main.appendChild(el(
    '<p class="hint" style="margin-top:20px;max-width:75ch">Les <b>fourchettes indicatives</b> sont des ordres de grandeur destinés à te donner un repère '+
    'face au prix que l\'outil calcule. Ce ne sont pas des relevés de marché : vérifie toi-même ce qui se pratique dans ta région et sur ton canal de vente. '+
    'Les temps et les quantités de fil sont des moyennes : les tiens seront différents, et ce sont eux qui comptent.</p>'
  ));
}

function renderModeleDetail(main){
  var m = modele(view.modeleVu);
  var four = m[7];
  /* Un premier calcul à prix = 0 sert uniquement à obtenir prixObjectif
     (qui ne dépend pas du prix, par construction). On recalcule ensuite au
     prix suggéré : à prix = 0, les cotisations et les frais variables du
     canal — proportionnels au prix de vente — seraient comptés pour zéro,
     et la tuile « Coût de revient complet » sous-estimerait le vrai coût. */
  var crPrevisionnel = creationDepuisModele(m[0], mNom(m), 0, "direct");
  var prixObjectifPrevisionnel = calculer(crPrevisionnel).prixObjectif;
  var prixSuggere = Math.max(four[0], prixObjectifPrevisionnel ? Math.round(prixObjectifPrevisionnel) : four[0]);
  var cr = creationDepuisModele(m[0], mNom(m), prixSuggere, "direct");
  var r = calculer(cr);

  var back = el('<button type="button" class="btn sm" style="margin-bottom:16px">← Retour au catalogue</button>');
  back.addEventListener("click", function(){ retourParent(function(){ view.modeleVu = null; view.tab = "catalogue"; }); });
  function creerFiche(){
    siBrouillonLibre(function(){
      view.draft = creationDepuisModele(m[0], mNom(m), prixSuggere, "direct");
      view.draftRef = empreinteFiche(view.draft);
      view.ficheId = null; view.modeleVu = null;
      aller("fiche");
    });
  }
  var hautBar = el('<div class="savebar" style="margin-bottom:16px;justify-content:space-between"></div>');
  hautBar.appendChild(back); back.style.marginBottom = "0";
  var bFicheHaut = el('<button type="button" class="btn primary">Créer ma fiche à partir de ce modèle</button>');
  bFicheHaut.addEventListener("click", creerFiche);
  hautBar.appendChild(bFicheHaut);
  main.appendChild(hautBar);

  var fam = "";
  FAMILLES.forEach(function(f){ if (f.id === m[1]) fam = f.nom; });

  main.appendChild(el(
    '<div class="sechead" style="margin-top:0"><div style="display:flex;gap:16px;align-items:center">'+
    '<span class="mot grand f-'+esc(m[1])+'">'+motif(m[0],58)+'</span>'+
    '<div><h2 style="font-size:24px">'+esc(mNom(m))+'</h2>'+
    '<p class="hint" style="margin-top:6px">'+esc(fam)+' · '+esc(m[3])+' · '+niveau(m[4])+esc(DIFF[m[4]-1])+' · '+esc(dureeTexte(r.minutes))+' de travail</p>'+
    '</div></div></div>'
  ));

  var tiles = el('<div class="tiles"></div>');
  tiles.appendChild(el('<div class="tile"><div class="k">Matières et emballage</div><div class="v">'+esc(eur(r.matieres))+'</div><div class="s">pertes comprises</div></div>'));
  tiles.appendChild(el('<div class="tile"><div class="k">Temps de travail</div><div class="v">'+esc(dureeTexte(r.minutes))+'</div><div class="s">tous postes</div></div>'));
  /* Un seul chiffre de prix : le « prix juste », qui paie tous les frais ET
     ton temps à ton objectif. Afficher à côté un « coût de revient complet »
     calculé à un autre prix donnait deux montants presque égaux mais
     contradictoires. */
  var vendCat = state.reglages.profil !== "passion";
  if (vendCat) tiles.appendChild(el('<div class="tile"><div class="k">Plancher (sans ton temps)</div><div class="v">'+esc(eur(r.prixPlancher))+'</div><div class="s">en dessous, tu paies pour travailler</div></div>'));
  if (vendCat) tiles.appendChild(el('<div class="tile"><div class="k">Prix conseillé</div><div class="v good">'+esc(eur(r.prixObjectif))+'</div><div class="s">te paie '+esc(eur(state.reglages.tauxHoraire))+' / h en vente directe · '+(four[1] ? 'fourchette courante '+esc(eur(four[0]))+'–'+esc(eur(four[1]))
      : 'aucun repère de marché relevé pour ce modèle')+'</div></div>'));
  main.appendChild(tiles);

  if (vendCat && four[1] && r.prixObjectif > four[1] * 1.15){
    main.appendChild(el(
      '<div class="banner" style="background:var(--warn-soft);border-color:var(--warn)"><p>'+
      '<b>Ton prix dépasse le prix du marché.</b> Le prix qui te paierait '+esc(eur(state.reglages.tauxHoraire))+' de l\'heure ('+esc(eur(r.prixObjectif))+') '+
      'dépasse ce qui se pratique couramment pour ce type de pièce. Ce n\'est pas une erreur de calcul : c\'est la réalité de beaucoup de créations au crochet. '+
      'Tes leviers sont le temps de fabrication, le choix des matières, et le canal de vente, pas seulement le prix affiché.</p></div>'
    ));
  }

  /* On voit d'abord à quoi ça ressemble et comment on le fait.
     Le détail des coûts vient ensuite : on réalise avant de calculer. */
  var ep = epoque(m[0]);
  /* PHOTOS MANQUANTES (signalées dans le rapport V37) : trois vues du point
     de près (dp/etole_etoile_point.jpg, dp/etole_popcorn_point.jpg,
     dp/etole_festons_point.jpg) étaient prévues mais n'ont jamais été
     ajoutées au projet. Elles sont retirées plutôt que remplacées : pour les
     remettre, ajouter les fichiers dans dp/ et la propriété photo2 au modèle. */
  if (ep && !aPhotoModele(m[0])){
    main.appendChild(el('<div class="card" style="margin-bottom:18px;overflow:hidden">'+
      '<img src="'+esc(ep.photo)+'" alt="Photo d\'origine du modèle '+esc(ep.nom)+'" '+
      'style="width:100%;max-height:420px;object-fit:contain;display:block;background:var(--surface-2)" '+
      'loading="lazy" referrerpolicy="no-referrer">'+
      (ep.photo2 ? '<img src="'+esc(ep.photo2)+'" alt="Le point de près, '+esc(ep.nom)+'" '+
        'style="width:100%;max-height:300px;object-fit:cover;display:block;border-top:1px solid var(--rule)" '+
        'loading="lazy">' : '')+
      '<div class="body">'+(ep.photo2 ? '<p class="hint" style="margin:0 0 10px">Le point vu de près, '+
        'tel qu\'il est photographié dans le livret.</p>' : '')+
      '<p class="dessinlab" style="margin:0"><b>La photo du livret d\'origine.</b> '+
      'C\'est exactement la pièce que permet de réaliser le patron ci-dessous, et non un ouvrage ressemblant.</p>'+
      '<p class="hint" style="margin-top:8px">'+esc(ep.source.livre)+' · '+esc(ep.source.editeur)+
      ' · '+esc(ep.source.annee)+' · '+esc(ep.source.plate)+'. Domaine public '+
      '(Project Gutenberg n° '+ep.source.pg+') : photo et patron sont librement reproductibles. '+
      'Texte traduit et converti en centimètres pour cette application.</p></div></div>'));
  } else if (!aPhotoModele(m[0])){
    /* Une photo d'illustration d'abord, si on en a une : elle donne l'idée.
       Le dessin la suit, parce que lui seul dit exactement ce que ce patron
       produit. Les deux ensemble, jamais l'un à la place de l'autre. */
    var cIll = carteIllustration(m[0]);
    if (cIll) main.appendChild(cIll);
    /* Le dessin est construit à partir du patron : il ne peut pas promettre
       autre chose que ce que la fiche fait réellement faire. */
    var cp = el('<div class="card" style="margin-bottom:18px;overflow:hidden">'+
      planche(m[0], 230)+
      '<div class="body"><p class="dessinlab" style="margin:0">'+
      '<b>Dessin d\'après le patron de cette fiche</b> : forme, proportions et dimensions '+
      'finies. Il n\'existe pas encore de photo de cet ouvrage.'+
      '</p>'+
      '<p class="hint">Quand tu auras fait la pièce, ta photo prendra la place du dessin.</p>'+
      '</div></div>');
    main.appendChild(cp);
  }
  var ft = ficheTechnique(m[0]);
  if (ft) main.appendChild(ft);
  main.appendChild(cartePatron(m[0]));

  /* matières du modèle */
  var wrap = el('<div class="tablewrap resp" style="margin-bottom:18px"></div>');
  var t = el('<table><thead><tr><th>Matière du modèle</th><th class="n">Quantité</th><th class="n">Prix unitaire</th><th class="n">Coût dans la pièce</th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  cr.lignes.forEach(function(l){
    var mm = matiere(l.mid); if (!mm) return;
    tb.appendChild(el('<tr><td>'+esc(mm.nom)+'</td><td class="n" data-l="Quantité">'+esc(qte(l.qte, mm.unite))+'</td><td class="n" data-l="Prix unitaire">'+
      esc(eurU(pu(mm), mm.unite))+'</td><td class="n" data-l="Dans la pièce">'+esc(eur(pu(mm)*l.qte))+'</td></tr>'));
  });
  tb.appendChild(el('<tr><td colspan="3" style="font-weight:600">Total matières et emballage, pertes comprises</td><td class="n" data-l="Total" style="font-weight:600">'+esc(eur(r.matieres))+'</td></tr>'));
  wrap.appendChild(t);
  main.appendChild(wrap);

  /* temps */
  var wrap2 = el('<div class="tablewrap resp" style="margin-bottom:18px"></div>');
  var t2 = el('<table style="min-width:420px"><thead><tr><th>Étape</th><th class="n">Durée</th><th class="n">Payée à '+esc(eur(state.reglages.tauxHoraire))+' / h</th></tr></thead><tbody></tbody></table>');
  var tb2 = t2.querySelector("tbody");
  POSTES.forEach(function(p){
    var min = cr.temps[p.k]||0;
    tb2.appendChild(el('<tr><td>'+esc(p.nom)+'<div class="hint" style="margin:2px 0 0">'+esc(p.aide)+'</div></td><td class="n" data-l="Durée">'+
      esc(dureeTexte(min))+'</td><td class="n" data-l="Valorisée">'+esc(eur(min/60*(state.reglages.tauxHoraire||0)))+'</td></tr>'));
  });
  tb2.appendChild(el('<tr><td style="font-weight:600">Total</td><td class="n" data-l="Durée totale" style="font-weight:600">'+esc(dureeTexte(r.minutes))+'</td><td class="n" data-l="Valorisée" style="font-weight:600">'+esc(eur(r.mainOeuvre))+'</td></tr>'));
  wrap2.appendChild(t2);
  main.appendChild(wrap2);

  var bar = el('<div class="savebar"></div>');
  var bFiche = el('<button type="button" class="btn primary lg">Créer ma fiche à partir de ce modèle</button>');
  bFiche.addEventListener("click", creerFiche);
  bar.appendChild(bFiche);
  main.appendChild(bar);

  /* La photo et ses droits intéressent au moment d'illustrer, pas de calculer : repliés. */
  var dPhoto = el('<details class="card" style="margin-top:18px;padding:12px 18px"><summary style="cursor:pointer;font-weight:600">Photo du modèle et droits</summary><div class="d-photo" style="margin-top:12px"></div></details>');
  dPhoto.querySelector(".d-photo").appendChild(blocPhotoModele(m, function(){ hydraterPhotos(document); render(); }));
  if (aPhotoModele(m[0])) dPhoto.open = true;
  main.appendChild(dPhoto);
}

/* ═════ 9. MES CRÉATIONS ═════ */

function renderCreations(main){
  var vend = state.reglages.profil !== "passion";
  var complet = state.reglages.mode === "complet";
  var bAjout = bouton("+ Ajouter des pièces", function(){ dialogueAjoutPieces(null); });
  main.appendChild(enTete("Mes créations",
    vend ? "Tes créations et chaque pièce que tu fabriques : ce qu'elle a coûté vraiment, ce que tu l'as vendue, et ce qu'il te reste."
         : "Tes créations et chaque pièce que tu fabriques : son temps, ses matières, ce qu'elle t'a coûté.",
    [bouton("Partir d'un type d'ouvrage", function(){ view.modeleVu=null; view.catMode="types"; aller("catalogue"); })]
      .concat(complet && creationsActives().length ? [bAjout] : [])
      .concat([bouton("+ Nouvelle création", nouvelleFiche, true)])));

  var archivees = state.creations.filter(function(c){ return c.archive; });
  var calculs = creationsActives().map(function(c){ return {c:c, r:calculer(c)}; });
  var avecPrix = calculs.filter(function(x){ return Number(x.c.prix) > 0; });
  var aPerte = avecPrix.filter(function(x){ return x.r.reste < 0; }).length;
  var obj = Number(state.reglages.tauxHoraire)||0;
  var sousPayees = avecPrix.filter(function(x){ return x.r.reste >= 0 && x.r.heures > 0 && x.r.gainHoraire < obj*0.9; }).length;
  var gains = avecPrix.filter(function(x){ return x.r.heures > 0; }).map(function(x){ return x.r.gainHoraire; });
  var median = 0;
  if (gains.length){
    gains.sort(function(a,b){ return a-b; });
    var mid = Math.floor(gains.length/2);
    median = gains.length%2 ? gains[mid] : (gains[mid-1]+gains[mid])/2;
  }
  var ms = statut(median);
  var st = statsPieces();

  var tiles = el('<div class="tiles"></div>');
  tiles.appendChild(el('<div class="tile"><div class="k">Créations</div><div class="v">'+calculs.length+'</div>'+
    (complet && st.total ? '<div class="s">'+esc(pluriel(st.total, "pièce suivie", "pièces suivies"))+'</div>' : '')+'</div>'));
  if (vend) tiles.appendChild(el('<div class="tile"><div class="k">Gain de l\'heure habituel</div><div class="v '+ms.k+'">'+(gains.length ? esc(eur(median)) : '—')+'</div><div class="s">objectif '+esc(eur(obj))+' / h</div></div>'));
  var aRevoir = aPerte + sousPayees;
  if (!vend){
    var matTot = calculs.reduce(function(a, x){ return a + x.r.matieres; }, 0);
    tiles.appendChild(el('<div class="tile"><div class="k">Matières par pièce</div><div class="v">'+esc(eur(calculs.length ? matTot / calculs.length : 0))+'</div><div class="s">en moyenne, d\'après tes fiches</div></div>'));
  }
  if (vend) tiles.appendChild(el('<div class="tile"><div class="k">À revoir</div><div class="v '+(aPerte ? "bad" : aRevoir ? "warn" : "good")+'">'+aRevoir+'</div>'+
    '<div class="s">'+(aRevoir ? esc(aPerte ? pluriel(aPerte, "à perte", "à perte") + (sousPayees ? " · " + sousPayees + " sous ton objectif" : "") : sousPayees + " sous ton objectif") : "toutes paient ton temps")+'</div></div>'));
  if (complet && st.total){
    var morceaux = [];
    var enFab = st.parProd.afaire + st.parProd.encours + st.parProd.retouche;
    if (enFab) morceaux.push(enFab + " en fabrication" + (st.parProd.retouche ? " (dont " + st.parProd.retouche + " à retoucher)" : ""));
    if (st.stock) morceaux.push(st.stock + (vend ? " prête" + (st.stock > 1 ? "s" : "") + " à vendre" : " terminée" + (st.stock > 1 ? "s" : "")));
    if (vend && st.vendues) morceaux.push(st.vendues + " vendue" + (st.vendues > 1 ? "s" : "") + " · " + eur(st.ca));
    tiles.appendChild(el('<div class="tile"><div class="k">Tes pièces</div><div class="v">'+st.total+'</div><div class="s">'+esc(morceaux.join(" · ") || "aucune pour l'instant")+'</div></div>'));
  }
  if (calculs.length) main.appendChild(tiles);

  var inv = inviteComplet("Suivre chaque pièce une par une, de la fabrication à la vente : temps réel, coût réel, gain réel.");
  if (inv && calculs.length) main.appendChild(inv);

  if (!calculs.length){
    main.appendChild(etatVide("Aucune création pour l'instant",
      "Commence par celle que tu vends ou fabriques le plus souvent : c'est celle où une erreur de prix te coûte le plus cher. Le catalogue remplit les matières et les temps à ta place.",
      [bouton("Partir d'un type d'ouvrage", function(){ view.modeleVu=null; view.catMode="types"; aller("catalogue"); }, true),
       bouton("Partir d'une fiche vide", function(){ nouvelleFiche("vide"); })]));
    return;
  }

  var alertes = complet ? alertesFinis() : [];
  if (alertes.length){
    main.appendChild(el('<div class="banner" style="background:var(--warn-soft);border-color:var(--warn)"><p>'+
      '<b>Sous le stock de sécurité :</b> '+esc(alertes.map(function(c){
        return c.nom + " (" + enStock(c.id) + "/" + (Number(c.seuilFini)||0) + ")"; }).join(" · "))+
      '. Lance une fabrication pour reconstituer ton stock.</p></div>'));
  }

  /* --- filtres et tri --- */
  var FILTRES = [
    {k:"tous",     nom:"Tout"},
    {k:"encours",  nom:"En fabrication", f:function(p){ return p.prod === "afaire" || p.prod === "encours"; }},
    {k:"retouche", nom:"À retoucher",    f:function(p){ return p.prod === "retouche"; }},
    {k:"stock",    nom: vend ? "En stock" : "Terminées", f:function(p){ return p.prod === "termine" && !horsStock(p); }},
    {k:"vendu",    nom:"Vendues",        f:function(p){ return p.com === "vendu"; }, vend:true},
    {k:"jete",     nom:"Ratées",         f:function(p){ return p.com === "jete"; }}
  ];
  var fk = view.fPieces || "tous";
  var filtre = FILTRES.filter(function(x){ return x.k === fk; })[0] || FILTRES[0];
  var barre = el('<div class="crea-barre"></div>');
  if (complet && st.total){
    var f = el('<div class="filters" style="margin:0"></div>');
    FILTRES.forEach(function(x){
      if (x.vend && !vend) return;
      var n = x.f ? state.pieces.filter(x.f).length : st.total;
      if (x.f && n === 0 && fk !== x.k) return;   /* pas de filtre vide qui encombre */
      var b = el('<button type="button" class="fchip">'+esc(x.nom)+' <span class="n">'+n+'</span></button>');
      b.setAttribute("aria-pressed", fk === x.k ? "true" : "false");
      b.addEventListener("click", function(){ view.fPieces = x.k; view.creaTout = {}; render(); });
      f.appendChild(b);
    });
    barre.appendChild(f);
  }
  var outils = el('<div class="crea-outils">'+
    '<label class="f"><span class="sr-only">Rechercher une création</span><input type="search" id="crea-q" placeholder="Rechercher une création…"></label>'+
    '</div>');
  outils.querySelector("#crea-q").value = view.creaQ || "";
  outils.querySelector("#crea-q").addEventListener("input", function(e){ view.creaQ = e.target.value; peindre(); });
  outils.appendChild(barreTri({cle:"crea", defaut:"recent", sens:-1, quand:function(){ peindre(); }, options:
    [["recent","Dernière activité"],["nom","Nom"]].concat(vend ? [["gain","Gain de l'heure"],["prix","Prix de vente"]] : []).concat([["pieces","Nombre de pièces"]])}));
  barre.appendChild(outils);
  main.appendChild(barre);

  if (complet) main.appendChild(barreSelection(vend));
  var zone = el('<div class="crea-liste"></div>');
  main.appendChild(zone);
  var vide = el('<p class="hint" id="crea-vide" hidden></p>');
  main.appendChild(vide);
  var plusCrea = el('<div class="plus-lignes" hidden></div>');
  main.appendChild(plusCrea);

  function activite(x){ return derniereActivite(x.c); }
  function peindre(){
    zone.innerHTML = "";
    var q = String(view.creaQ || "").trim().toLowerCase();
    var tri = etatTri("crea", "recent", -1);
    var liste = calculs.filter(function(x){
      if (q && x.c.nom.toLowerCase().indexOf(q) === -1) return false;
      if (filtre.f && !piecesDe(x.c.id).some(filtre.f)) return false;
      return true;
    });
    liste = trierListe(liste, tri, {
      recent: function(x){ return activite(x); },
      nom:    function(x){ return x.c.nom; },
      gain:   function(x){ return x.r.prix > 0 && x.r.heures > 0 ? x.r.gainHoraire : null; },
      prix:   function(x){ return x.r.prix > 0 ? x.r.prix : null; },
      pieces: function(x){ return piecesDe(x.c.id).length; }
    });
    /* Peu de créations : tout est déplié. Beaucoup : une ligne chacune, et
       vingt à la fois. Un filtre ou une recherche déplie ce qui correspond. */
    var deplie = liste.length <= 3 || !!filtre.f || !!q;
    var PAGE = 20, nMax = view.creaPage ? PAGE * view.creaPage : PAGE;
    liste.slice(0, nMax).forEach(function(x){ zone.appendChild(carteCreation(x, filtre, vend, complet, {ouvert: deplie})); });
    plusCrea.innerHTML = "";
    plusCrea.hidden = liste.length <= nMax;
    if (liste.length > nMax){
      plusCrea.appendChild(el('<span class="hint" style="margin:0">'+nMax+' créations sur '+liste.length+'.</span>'));
      plusCrea.appendChild(bouton("Afficher les " + Math.min(PAGE, liste.length - nMax) + " suivantes", function(){ view.creaPage = (view.creaPage || 1) + 1; peindre(); hydraterPhotos(zone); }));
    }
    majBarreSelection();
    vide.hidden = liste.length > 0;
    vide.textContent = liste.length ? "" : (q ? "Aucune création ne porte ce nom." : "Aucune pièce dans ce filtre.");
    hydraterPhotos(zone);
  }
  peindre();

  if (archivees.length){
    var dA = el('<details class="card" style="margin-top:16px;padding:14px 18px"><summary style="cursor:pointer;font-weight:600">Créations archivées ('+archivees.length+')</summary>'+
      '<p class="hint" style="margin:8px 0">Elles ne sont plus proposées nulle part, mais leurs ventes et leurs commandes restent dans tes indicateurs.</p><div class="arch"></div></details>');
    archivees.forEach(function(c){
      var ligneA = el('<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--rule)"><span>'+esc(c.nom)+'</span></div>');
      var bR = bouton("Ressortir", function(){ delete c.archive; sauverTout(); render(); toast("« " + c.nom + " » est de nouveau dans tes créations."); });
      bR.classList.add("sm"); ligneA.appendChild(bR);
      dA.querySelector(".arch").appendChild(ligneA);
    });
    main.appendChild(dA);
  }

  if (vend) main.appendChild(el('<div class="legetat" style="margin-top:14px">'+
    '<span class="etat e-ok"><span class="pastille"></span>tu t\'y retrouves</span>'+
    '<span class="etat e-bas"><span class="pastille"></span>sous ton objectif horaire</span>'+
    '<span class="etat e-rupture"><span class="pastille"></span>loin de ton objectif ou à perte</span>'+
    '<span class="legnote">En haut de chaque création : l\'<b>estimation</b> de ta fiche. Dans le tableau : ce que chaque pièce a <b>vraiment</b> coûté'+
    (complet ? ' (temps chronométré, matières pesées, retouches).' : '.')+'</span></div>'));
  if (complet){
    main.appendChild(el('<details class="card" style="margin-top:12px;padding:12px 18px"><summary style="cursor:pointer;font-weight:600">Comment ça marche</summary>'+
      '<ul class="aide-liste">'+
      '<li><b>Détail</b> : ouvre le coût de la pièce poste par poste (matières, main-d\'œuvre, emballage, transport, frais de vente, cotisations). Les lignes s\'additionnent exactement.</li>'+
      (vend ? '<li><b>Conseillé</b> : le prix qui paierait le temps réel de cette pièce à ton objectif horaire. Au-dessus, la pièce te rapporte plus que ton objectif.</li>' : '')+
      '<li><b>Provisoire</b> : tant qu\'une pièce n\'est pas terminée, on compte au moins le temps de la fiche.</li>'+
      '<li>Passer une pièce en <b>Terminée</b> sort ses matières de ton stock, une seule fois.'+
      (vend ? ' La passer en <b>Vendue</b> fige son prix : laisse le champ vide pour reprendre le prix de la fiche, ou saisis le prix réellement payé.' : '')+'</li>'+
      '</ul></details>'));
  }
}

/* Quand on a touché à cette création pour la dernière fois : sa fiche, ou
   une de ses pièces. C'est ce qui trie « Mes créations » et l'Accueil. */
function derniereActivite(c){
  var t = Number(c.maj) || Number(c.cree) || 0;
  piecesDe(c.id).forEach(function(p){ if (p.maj > t) t = p.maj; });
  return t;
}
/* Minutes chronométrées entre deux dates, toutes pièces confondues. */
function minutesTravaillees(debut, fin){
  var t = 0;
  (state.pieces || []).forEach(function(p){
    (p.sessions || []).forEach(function(s){ if (s.d >= debut && s.d < fin) t += Number(s.min) || 0; });
  });
  return t;
}
/* Ce qu'on reprend en ouvrant l'application : le chronomètre qui tourne, la
   fiche pas enregistrée, la pièce en cours, ou à défaut la dernière création. */
function reprise(){
  var ch = chronoEnCours();
  if (ch){ var pc = piece(ch.pid), cc = pc ? creation(pc.cid) : null; if (cc) return {type:"chrono", p:pc, c:cc}; }
  var b = brouillonGarde();
  if (b && b.d) return {type:"brouillon", nom: b.d.nom || "", b: b};
  var enCours = (state.pieces || []).filter(function(p){ return (p.prod === "encours" || p.prod === "retouche" || p.prod === "afaire") && creation(p.cid) && !creation(p.cid).archive; })
    .sort(function(a, b2){ var ma = a.prod === "afaire" ? 1 : 0, mb = b2.prod === "afaire" ? 1 : 0; if (ma !== mb) return ma - mb; return b2.maj - a.maj; });
  if (enCours.length) return {type:"piece", p: enCours[0], c: creation(enCours[0].cid)};
  var actives = creationsActives().slice().sort(function(a, b2){ return derniereActivite(b2) - derniereActivite(a); });
  if (actives.length) return {type:"creation", c: actives[0]};
  return null;
}
/* Actions groupées : cocher des pièces, puis un seul geste pour toutes. */
function piecesSelectionnees(){
  var ids = view.selPieces || {};
  return (state.pieces || []).filter(function(p){ return ids[p.id]; });
}
function majBarreSelection(){
  var bar = document.getElementById("sel-barre"); if (!bar) return;
  var l = piecesSelectionnees();
  bar.hidden = !l.length;
  var n = bar.querySelector(".sel-n"); if (n) n.textContent = l.length + (l.length > 1 ? " pièces sélectionnées" : " pièce sélectionnée");
}
function barreSelection(vend){
  var bar = el('<div class="sel-barre" id="sel-barre" hidden><span class="sel-n"></span><div class="sel-act"></div></div>');
  var act = bar.querySelector(".sel-act");
  function pour(lib, fn, primaire){
    var b = bouton(lib, function(){
      var l = piecesSelectionnees(); if (!l.length) return;
      fn(l);
    }, primaire); b.classList.add("sm"); act.appendChild(b);
  }
  pour("Marquer terminées", function(l){
    l.forEach(function(p){ if (p.prod !== "termine") majProd(p, "termine"); });
    view.selPieces = {}; sauverTout(); render(); toast(pluriel(l.length, "pièce terminée", "pièces terminées"));
  }, true);
  if (vend) pour("Marquer vendues", function(l){
    dialogueChamps({titre:"Vendre " + pluriel(l.length, "pièce"), texte:"Au prix de la fiche de chaque création, sauf si tu indiques un prix unique.",
      champs:[{id:"prix", lib:"Prix unique (€, facultatif)", type:"number", inputmode:"decimal"}],
      contenu: el('<label class="f"><span>Payé comment</span><select id="sel-moyen">'+optionsMoyens("especes")+'</select></label>'), bouton:"C'est vendu"}, function(v, boite){
      var prix = v.prix !== "" ? Number(lireNombre(v.prix)) : null, moyen = boite.querySelector("#sel-moyen").value;
      l.forEach(function(p){ if (p.prod !== "termine") majProd(p, "termine"); if (prix !== null) p.prix = prix; p.paiement = moyen; if (p.com !== "vendu") majCom(p, "vendu", prix); });
      view.selPieces = {}; sauverTout(); render(); toast(pluriel(l.length, "pièce vendue", "pièces vendues"));
    });
  });
  pour("Remettre en stock", function(l){
    l.forEach(function(p){ if (p.com !== "atelier") majCom(p, "atelier"); });
    view.selPieces = {}; sauverTout(); render(); toast(pluriel(l.length, "pièce remise", "pièces remises") + " en stock");
  });
  pour("Supprimer", function(l){
    confirmer({titre:"Supprimer " + pluriel(l.length, "pièce") + " ?", texte:"Leur temps chronométré et leurs ventes disparaîtront de tes chiffres.", bouton:"Supprimer", danger:true}, function(){
      var ids = {}; l.forEach(function(p){ ids[p.id] = true; });
      state.pieces = state.pieces.filter(function(p){ return !ids[p.id]; });
      view.selPieces = {}; sauverTout(); render(); toast(pluriel(l.length, "pièce supprimée", "pièces supprimées"));
    });
  });
  var bx = el('<button type="button" class="btn sm">Tout décocher</button>');
  bx.addEventListener("click", function(){ view.selPieces = {}; render(); });
  act.appendChild(bx);
  return bar;
}
/* Une création et ses pièces : le modèle en tête, chaque exemplaire dessous. */
function carteCreation(x, filtre, vend, complet, opts){
  opts = opts || {};
  var c = x.c, r = x.r;
  var stF = verdictCalcul(r);
  /* Du numéro le plus récent au plus ancien : l'ordre dans lequel on les a faites. */
  var toutes = piecesDe(c.id).sort(function(a,b){ return numeroPiece(b) - numeroPiece(a); });
  var pieces = filtre.f ? toutes.filter(filtre.f) : toutes;
  var ef = etatFini(c);
  var card = el('<section class="crea-card" aria-label="'+esc(c.nom)+'">'+
    '<div class="crea-tete">'+
      '<button type="button" class="crea-id" aria-label="Ouvrir la fiche de '+esc(c.nom)+'">'+vignette(c, 46)+
        '<span><h2>'+esc(c.nom)+'</h2><p class="m">'+esc(dureeTexte(r.minutes))+' de travail estimé · '+esc(canal(c.canal).nom)+
        (c.modele && c.modele !== "vide" && modele(c.modele) ? ' · ' + esc(mNom(modele(c.modele))) : '')+'</p></span></button>'+
      '<div class="crea-bloc"><span class="crea-cap">D\'après ta fiche (estimation)</span><div class="crea-chiffres">'+
        (vend ? '<div><span class="k">Prix de vente</span><b>'+esc(r.prix > 0 ? eur(r.prix) : "—")+'</b></div>'
              : '<div><span class="k">Matières</span><b>'+esc(eur(r.matieres))+'</b></div><div><span class="k">Temps</span><b>'+esc(dureeTexte(r.minutes))+'</b></div>')+
        (vend ? '<div><span class="k">Prix conseillé</span><b>'+esc(r.prixObjectif > 0 ? eur(r.prixObjectif) : "—")+'</b></div>' : '')+
        (vend ? '<div><span class="k">Gain de l\'heure</span><b class="'+stF.k+'">'+(r.prix > 0 && r.heures > 0 ? esc(eur(r.gainHoraire)) : '—')+'</b></div>' : '')+
        (vend ? '<div><span class="k">État</span><span class="chip '+stF.k+'">'+esc(stF.t)+'</span></div>' : '')+
        (complet ? '<div><span class="k">En stock</span><span class="lignestock">'+badgeEtat(ef, enStock(c.id) + (enStock(c.id) > 1 ? " pièces" : " pièce"))+jauge(ef)+'</span></div>' : '')+
      '</div></div>'+
      '<div class="crea-act"></div>'+
    '</div></section>');
  card.querySelector(".crea-id").addEventListener("click", function(){ ouvrirFiche(c.id); });
  var act = card.querySelector(".crea-act");
  var bF = bouton("Ouvrir la fiche", function(){ ouvrirFiche(c.id); }); bF.classList.add("sm"); act.appendChild(bF);
  if (complet){ var bP = bouton("+ Pièce", function(){ dialogueAjoutPieces(c.id); }); bP.classList.add("sm"); act.appendChild(bP); }
  if (vend){ var bV = bouton("Vendre", function(){ dialogueVente(c.id); }); bV.classList.add("sm"); act.appendChild(bV); }
  if (!complet) return card;

  if (!pieces.length){
    card.appendChild(el('<p class="crea-vide">'+(toutes.length ? 'Aucune pièce dans ce filtre.' : 'Aucune pièce suivie pour l\'instant.')+'</p>'));
    return card;
  }
  /* Replié par défaut dès qu'il y a plusieurs créations : une ligne par
     création, les pièces sur demande. Le filtre ou la recherche déplient. */
  var ouvert = opts.ouvert || (view.creaOuvert && view.creaOuvert[c.id]);
  if (!ouvert){
    var enCoursN = toutes.filter(function(p){ return p.prod !== "termine"; }).length, stockN = enStock(c.id), venduN = toutes.filter(function(p){ return p.com === "vendu"; }).length;
    var resume = [];
    if (enCoursN) resume.push(enCoursN + " en fabrication");
    if (stockN) resume.push(stockN + (vend ? " en stock" : " terminée" + (stockN > 1 ? "s" : "")));
    if (venduN && vend) resume.push(venduN + " vendue" + (venduN > 1 ? "s" : ""));
    var bO = el('<button type="button" class="crea-deplier" aria-expanded="false">'+esc(pluriel(toutes.length, "pièce"))+(resume.length ? ' · ' + esc(resume.join(" · ")) : '')+' <span aria-hidden="true">▾</span></button>');
    bO.addEventListener("click", function(){ view.creaOuvert = view.creaOuvert || {}; view.creaOuvert[c.id] = true; render(); });
    card.appendChild(bO);
    return card;
  }
  var bR = el('<button type="button" class="crea-deplier" aria-expanded="true">Replier <span aria-hidden="true">▴</span></button>');
  bR.addEventListener("click", function(){ if (view.creaOuvert) delete view.creaOuvert[c.id]; view.creaFiltreOuvre = false; render(); });
  if (!opts.ouvert) card.appendChild(bR);
  /* Les pièces vendues, offertes ou jetées rejoignent un historique replié :
     la table ne montre que ce qui est encore dans l'atelier. */
  var actives = pieces.filter(function(p){ return !horsStock(p); }), passees = pieces.filter(function(p){ return horsStock(p); });
  if (filtre.f && !actives.length){ actives = passees; passees = []; }
  var LIM = 12;
  var tout = view.creaTout && view.creaTout[c.id];
  var visibles = tout ? actives : actives.slice(0, LIM);
  var wrap = el('<div class="tablewrap resp"></div>');
  var t = el('<table class="t-pieces" style="min-width:'+(vend?1020:790)+'px"><thead><tr>'+
    '<th style="width:34px"><input type="checkbox" class="sel-tout" aria-label="Sélectionner toutes les pièces de '+esc(c.nom)+'"></th>'+
    '<th style="width:150px">Pièce</th><th style="width:156px">Fabrication</th>'+
    (vend ? '<th style="width:170px">Destination</th>' : '')+
    '<th style="width:160px">Temps passé</th>'+
    '<th class="n" style="width:130px">'+(vend ? 'Coût réel' : 'Matières')+'</th>'+
    (vend ? '<th class="n" style="width:110px">Prix de vente</th><th class="n" style="width:130px">Gain</th>' : '')+
    '<th style="width:40px"><span class="sr-only">Actions</span></th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  visibles.forEach(function(p, i){ tb.appendChild(lignePiece(p, c, numeroPiece(p), vend)); });
  brancherPieces(tb);
  t.querySelector(".sel-tout").addEventListener("change", function(e){
    view.selPieces = view.selPieces || {};
    visibles.forEach(function(p){ if (e.target.checked) view.selPieces[p.id] = true; else delete view.selPieces[p.id]; });
    [].forEach.call(tb.querySelectorAll('[data-role="sel"]'), function(cb){ cb.checked = e.target.checked; cb.closest("tr").classList.toggle("sel", e.target.checked); });
    majBarreSelection();
  });
  wrap.appendChild(t);
  card.appendChild(wrap);
  if (actives.length > visibles.length){
    var plus = el('<div class="plus-lignes"><span class="hint" style="margin:0">'+visibles.length+' pièces sur '+actives.length+', les plus récentes d\'abord.</span></div>');
    plus.appendChild(bouton("Afficher les " + (actives.length - visibles.length) + " autres", function(){
      view.creaTout = view.creaTout || {}; view.creaTout[c.id] = true; render();
    }));
    card.appendChild(plus);
  }
  if (!actives.length) card.appendChild(el('<p class="crea-vide">Aucune pièce en cours ni en stock.</p>'));
  if (passees.length){
    var venduesN = passees.filter(function(p){ return p.com === "vendu"; }).length;
    var ca = passees.reduce(function(a, p){ return a + (p.com === "vendu" ? Number(p.prix) || 0 : 0); }, 0);
    var hist = el('<details class="crea-hist"><summary>'+(vend ? 'Historique : ' + esc(pluriel(venduesN, "vendue")) + (ca ? ' · ' + esc(eur(ca)) : '') + (passees.length > venduesN ? ' · ' + (passees.length - venduesN) + ' offerte(s) ou ratée(s)' : '')
                                                       : 'Historique : ' + esc(pluriel(passees.length, "pièce")))+'</summary><div class="tablewrap resp"></div></details>');
    var t2 = el('<table class="t-pieces t-hist" style="min-width:'+(vend?1020:790)+'px"><thead><tr><th style="width:34px"></th><th style="width:150px">Pièce</th><th style="width:156px">Fabrication</th>'+
      (vend ? '<th style="width:170px">Destination</th>' : '')+'<th style="width:160px">Temps passé</th><th class="n" style="width:130px">'+(vend ? 'Coût réel' : 'Matières')+'</th>'+
      (vend ? '<th class="n" style="width:110px">Prix de vente</th><th class="n" style="width:130px">Gain</th>' : '')+'<th style="width:40px"></th></tr></thead><tbody></tbody></table>');
    var tb2 = t2.querySelector("tbody");
    var toutH = view.creaTout && view.creaTout["h" + c.id];
    (toutH ? passees : passees.slice(0, LIM)).forEach(function(p){ tb2.appendChild(lignePiece(p, c, numeroPiece(p), vend)); });
    brancherPieces(tb2);
    hist.querySelector(".tablewrap").appendChild(t2);
    if (passees.length > LIM && !toutH){
      var plusH = el('<div class="plus-lignes"></div>');
      plusH.appendChild(bouton("Afficher les " + (passees.length - LIM) + " autres", function(){ view.creaTout = view.creaTout || {}; view.creaTout["h" + c.id] = true; view.creaOuvert = view.creaOuvert || {}; view.creaOuvert[c.id] = true; render(); }));
      hist.appendChild(plusH);
    }
    if (view.creaHist && view.creaHist[c.id]) hist.open = true;
    hist.addEventListener("toggle", function(){ view.creaHist = view.creaHist || {}; if (hist.open) view.creaHist[c.id] = true; else delete view.creaHist[c.id]; });
    card.appendChild(hist);
  }
  return card;
}
function lignePiece(p, cr, numero, vend){
  var k = coutPiece(p, cr);
  var couleur = "var(--muted)";
  PROD.forEach(function(x){ if (x.k === p.prod) couleur = x.c; });
  var ch = chronoEnCours();
  var enCours = !!(ch && ch.pid === p.id);
  var mesMin = minutesMesurees(p);
  var quand = p.com === "vendu" && p.venduLe ? "vendue le " + new Date(p.venduLe).toLocaleDateString("fr-FR")
            : p.termineLe ? "terminée le " + new Date(p.termineLe).toLocaleDateString("fr-FR")
            : "créée le " + new Date(p.cree).toLocaleDateString("fr-FR");
  var sel = !!(view.selPieces && view.selPieces[p.id]);
  var tr = el('<tr data-pid="'+esc(p.id)+'" data-etat="'+esc(p.prod)+'" style="--etat-c:'+couleur+'"'+(sel ? ' class="sel"' : '')+'>'+
    '<td class="sel-cell"><input type="checkbox" data-role="sel" aria-label="Sélectionner la pièce N° '+numero+'"'+(sel ? ' checked' : '')+'></td>'+
    '<td data-l="Pièce"><b>N° '+numero+'</b>'+(p.com==="commande"?' <span class="chip warn">commande</span>':'')+(p.retouches && p.retouches.length ? ' <span class="chip neutre">'+esc(pluriel(p.retouches.length, "retouche"))+'</span>' : '')+
      '<div class="hint" style="margin:2px 0 0">'+esc(quand)+(p.client ? ' · ' + esc(p.client) : '')+'</div></td>'+
    '<td data-l="Fabrication"><select data-role="prod" aria-label="État de fabrication" style="border-left:3px solid '+couleur+'"></select></td>'+
    (vend ? '<td data-l="Destination"><select data-role="com" aria-label="Destination"></select>'+
      '<input type="text" class="cli" data-role="client" aria-label="Commandé par" placeholder="commandé par…" value="'+esc(p.client||"")+'"></td>' : '')+
    '<td data-l="Temps passé"><div class="cel"><div class="tps"><button type="button" class="btn sm chrono'+(enCours?' on':'')+'" data-role="chrono">'+(enCours ? '■ Arrêter' : '▶ Chrono')+'</button>'+
      '<span class="num">'+(mesMin > 0.01 ? esc(dureeLisible(mesMin)) : '<span class="hint">pas chronométrée</span>')+'</span></div>'+
      '<div class="hint num" style="margin:2px 0 0">prévu '+esc(dureeLisible(k.minEst))+'</div></div></td>'+
    (vend ? '<td class="n" data-l="Coût réel"><div class="cel"><b class="num">'+esc(eur(k.total))+'</b>'+
      '<div class="hint num">'+esc(eur(k.matieres))+' mat. · '+esc(eur(k.mainOeuvre))+' temps</div>'
          : '<td class="n" data-l="Matières"><div class="cel"><b class="num">'+esc(eur(k.matieres))+'</b>'+
      '<div class="hint num">'+(k.pesee ? 'pesées' : 'd\'après la fiche')+'</div>')+
      '<button type="button" class="lien-mini" data-role="cout" aria-label="Détail du coût de cette pièce">détail'+(k.provisoire ? ' · provisoire' : k.pesee || k.tempsMesure ? ' · réel' : '')+'</button></div></td>'+
    (vend ? '<td class="n" data-l="Prix de vente"><div class="cel"><input type="number" inputmode="decimal" min="0" step="0.5" data-role="prix" aria-label="Prix de vente de cette pièce" value="'+(p.prix===null||p.prix===undefined?"":p.prix)+'" placeholder="'+(cr.prix||0)+'"><div class="hint num" style="margin:3px 0 0">conseillé '+esc(k.prixCible > 0 ? eur(k.prixCible) : "—")+'</div></div></td>'+
      '<td class="n" data-l="Gain"><div class="cel"><b class="num '+k.etat.k+'">'+esc(k.jete ? "− " + eur(k.total) : (k.prix > 0 ? eur(k.gain) : "—"))+'</b>'+
        '<div class="hint num">'+(k.jete ? 'perte' : k.prix > 0 && k.heures > 0 ? esc(eur(k.gainH)) + ' / h' + (k.provisoire ? ' · provisoire' : '') : esc(k.etat.t))+'</div></div></td>' : '')+
    '<td><div class="act-col">'+
      '<button type="button" class="btn sm ghost" data-role="reel" aria-label="Estimé et réel de cette pièce de '+esc(cr.nom)+'">'+(p.reel && Object.keys(p.reel).length ? 'Pesée ✓' : 'Peser')+'</button>'+
      '<button type="button" class="btn ghost" data-role="del" aria-label="Supprimer cette pièce de '+esc(cr.nom)+'">✕</button></div></td></tr>');
  var sp = tr.querySelector('[data-role=prod]');
  PROD.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; sp.appendChild(o); });
  sp.value = p.prod;
  if (vend){
    var sc = tr.querySelector('[data-role=com]');
    COM.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; sc.appendChild(o); });
    sc.value = p.com;
  }
  return tr;
}
function brancherPieces(tb){
  tb.addEventListener("change", function(e){
    var role = e.target.getAttribute("data-role");
    if (role === "sel"){
      var pidS = e.target.closest("tr").getAttribute("data-pid");
      view.selPieces = view.selPieces || {};
      if (e.target.checked) view.selPieces[pidS] = true; else delete view.selPieces[pidS];
      e.target.closest("tr").classList.toggle("sel", e.target.checked);
      majBarreSelection();
      return;
    }
    if (role !== "prod" && role !== "com") return;
    var pid = e.target.closest("tr").getAttribute("data-pid");
    var p = piece(pid);
    if (!p) return;
    function appliquer(){
      if (role === "prod") majProd(p, e.target.value);
      else majCom(p, e.target.value);
      sauverTout(); render();
      toast(role === "prod" ? "Fabrication : " + libProd(p.prod) : "Statut : " + libCom(p.com));
    }
    if (role === "prod" && e.target.value === "retouche" && p.prod !== "retouche"){
      majProd(p, "retouche"); sauverTout();
      dialogueRetouche(p, function(){ sauverTout(); render(); toast("Retouche notée"); });
      return;
    }
    /* Vendue « à part » alors qu'une commande de la même création attend
       une pièce : c'est souvent la même vente. La relier évite de la
       compter deux fois (la pièce ET les paiements de la commande). */
    var attente = role === "com" && e.target.value === "vendu" && p.com !== "commande" && !p.cmdId
      ? commandes().filter(function(c){ return attendPiece(c, p.cid); })
      : [];
    if (attente.length){
      var c0 = attente[0];
      confirmer({titre:"Cette pièce est-elle pour une commande ?",
        texte:(attente.length > 1 ? attente.length + " commandes" : "La commande de " + ((c0.client && c0.client.nom) || "quelqu'un")) +
              " attend" + (attente.length > 1 ? "ent" : "") + " une pièce de cette création. Si c'est pour elle, relie-la : l'argent sera compté une seule fois, dans la commande.",
        bouton:"Oui, la relier à la commande", annuler:"Non, vente à part",
        siNon: appliquer, siAnnule: function(){ render(); }},
        function(){ p.com = "commande"; appliquer(); });
      return;
    }
    appliquer();
  });
  tb.addEventListener("input", function(e){
    var role = e.target.getAttribute("data-role");
    if (role !== "prix" && role !== "client") return;
    var pid = e.target.closest("tr").getAttribute("data-pid");
    var x = piece(pid); if (!x) return;
    if (role === "prix"){
      x.prix = e.target.value === "" ? null : (Number(e.target.value)||0);
      if (x.com === "vendu" && !x.venduLe) x.venduLe = Date.now();
      var crx = creation(x.cid);
      if (x.com === "vendu" && crx) x.fige = x.fige ? reprixVente(x.fige, crx, Number(x.prix)||0, x.canal || crx.canal)
                                                   : figerVente(crx, Number(x.prix)||0, x.canal || crx.canal, minutesMesurees(x) > 0 ? minutesReellesPiece(x, crx) : 0);
      /* Le gain de la ligne suit le prix tapé, sans redessiner l'écran. */
      if (crx){
        var k = coutPiece(x, crx), tr = e.target.closest("tr"), cg = tr.querySelector('[data-l="Gain"]');
        if (cg) cg.innerHTML = '<div class="cel"><b class="num '+k.etat.k+'">'+esc(k.jete ? "− " + eur(k.total) : (k.prix > 0 ? eur(k.gain) : "—"))+'</b>'+
          '<div class="hint num">'+(k.jete ? 'perte' : k.prix > 0 && k.heures > 0 ? esc(eur(k.gainH)) + ' / h' + (k.provisoire ? ' · provisoire' : '') : esc(k.etat.t))+'</div></div>';
      }
    }
    else x.client = e.target.value;
    x.maj = Date.now();
    sauver();
  });
  tb.addEventListener("click", function(e){
    var b = e.target.closest("[data-role]"); if (!b) return;
    var role = b.getAttribute("data-role");
    var pid = b.closest("tr") ? b.closest("tr").getAttribute("data-pid") : null;
    if (role === "chrono"){
      var ch = chronoEnCours();
      if (ch && ch.pid === pid) arreterChrono();
      else { demarrerChrono(pid); toast("Chronomètre lancé"); }
      render();
      return;
    }
    if (role === "reel"){ var pr = piece(pid); if (pr) dialogueReel(pr); return; }
    if (role === "cout"){ var pk = piece(pid); if (pk) dialogueCoutPiece(pk); return; }
    if (role !== "del") return;
    if (chronoEnCours() && chronoEnCours().pid === pid) arreterChrono(true);
    avecAnnulation("Pièce supprimée du suivi", function(){ supprimerPiece(pid); });
  });
}
/* Ajouter des pièces au suivi, depuis l'écran ou depuis une création. */
/* Noter un achat sans quitter la liste des matières : combien de lots, à
   quel prix. Le stock monte, le dernier prix payé devient la référence. */
function dialogueAchatMatiere(m){
  var box = el('<div><div class="grid2">'+
    '<label class="f"><span>Combien de '+esc(m.contenance > 1 ? "lots de " + qte(m.contenance, m.unite) : m.unite)+'</span><input id="am-n" type="number" min="0.01" step="1" inputmode="decimal" value="1"></label>'+
    '<label class="f"><span>Prix payé au total (€)</span><input id="am-p" type="number" min="0" step="0.01" inputmode="decimal" value="'+esc(Number(m.prix) || "")+'"></label>'+
    '</div><p class="hint" id="am-aide" style="margin:8px 0 0"></p></div>');
  var iN = box.querySelector("#am-n"), iP = box.querySelector("#am-p"), aide = box.querySelector("#am-aide");
  function maj(){
    var n = Number(lireNombre(iN.value)) || 0, p = Number(lireNombre(iP.value)) || 0;
    var q = n * (Number(m.contenance) || 1);
    aide.textContent = n > 0 ? "+ " + qte(q, m.unite) + " en stock" + (p > 0 ? " · " + eurU(p / q, m.unite) : " · au prix de la fiche, faute de prix") + " · stock après : " + qte((Number(m.stock)||0) + q, m.unite) : "";
  }
  iN.addEventListener("input", function(){ var n = Number(lireNombre(iN.value)) || 0; if (n > 0 && Number(m.prix) > 0) iP.value = Math.round(n * m.prix * 100) / 100; maj(); });
  iP.addEventListener("input", maj); maj();
  dialogueChamps({titre:"J'ai acheté « " + m.nom + " »", contenu: box, champs:[], bouton:"Noter l'achat",
    verifier:function(){ return Number(lireNombre(iN.value)) > 0 ? "" : "Indique combien tu as acheté."; }
  }, function(){
    var n = Number(lireNombre(iN.value)) || 0, p = Number(lireNombre(iP.value)) || 0;
    mouvementMatiere(m, "entree", n * (Number(m.contenance) || 1), p > 0 ? p : null, "Achat");
    m.prixIndicatif = false;
    sauverTout(); render();
    toast("Achat noté : " + qte(n * (Number(m.contenance) || 1), m.unite) + " de " + m.nom);
  });
}

/* ═════ VENDRE ═════
   Une vente en un geste : quoi, combien, comment c'est payé. Une pièce en
   stock de cette création passe en « Vendue » ; s'il n'y en a pas, une pièce
   terminée et vendue est créée (les matières sortent du stock). */
var MOYENS_PAIEMENT = [["especes","Espèces"],["carte","Carte"],["virement","Virement"],["paypal","PayPal"],["cheque","Chèque"],["autre","Autre"]];
function libelleMoyen(k){ for (var i = 0; i < MOYENS_PAIEMENT.length; i++) if (MOYENS_PAIEMENT[i][0] === k) return MOYENS_PAIEMENT[i][1]; return k || "—"; }
function optionsMoyens(sel){ return MOYENS_PAIEMENT.map(function(m){ return '<option value="'+m[0]+'"'+(m[0] === sel ? ' selected' : '')+'>'+m[1]+'</option>'; }).join(""); }
function pieceEnStockDe(cid){
  var l = piecesDe(cid).filter(function(p){ return p.prod === "termine" && !horsStock(p) && p.com !== "commande"; });
  l.sort(function(a, b){ return (a.termineLe || a.cree || 0) - (b.termineLe || b.cree || 0); });
  return l[0] || null;
}
/* Enregistre une vente : renvoie la pièce vendue. */
function vendrePiece(cid, prix, moyen, extra){
  extra = extra || {};
  var cr = creation(cid); if (!cr) return null;
  var p = pieceEnStockDe(cid);
  if (!p){
    ajouterPieces(cid, 1, "termine", "atelier");
    p = piecesDe(cid).filter(function(x){ return x.prod === "termine" && x.com === "atelier"; }).sort(function(a, b){ return b.cree - a.cree; })[0];
  }
  if (!p) return null;
  p.prix = Number(prix) || 0;
  p.paiement = moyen || "";
  if (extra.canal) p.canal = extra.canal;
  if (extra.client) p.client = extra.client;
  majCom(p, "vendu", p.prix);
  if (extra.le) p.venduLe = extra.le;
  p.maj = Date.now();
  sauverTout();
  return p;
}
function dialogueVente(cid, opts){
  opts = opts || {};
  var actives = creationsActives();
  if (!actives.length){ toast("Crée d'abord une fiche création"); return; }
  var c0 = creation(cid) || actives[0];
  var box = el('<div><div class="grid2">'+
    '<label class="f"><span>Quoi</span><select id="vt-cid"></select></label>'+
    '<label class="f"><span>Prix payé (€)</span><input id="vt-prix" type="number" min="0" step="0.5" inputmode="decimal"></label>'+
    '<label class="f"><span>Payé comment</span><select id="vt-moyen">'+optionsMoyens(opts.moyen || "especes")+'</select></label>'+
    '<label class="f"><span>Où</span><select id="vt-canal"></select></label>'+
    '<label class="f"><span>Quand</span><input id="vt-date" type="date" value="'+aujourdhuiISO()+'"></label>'+
    '<label class="f"><span>À qui (facultatif)</span><input id="vt-client" type="text" maxlength="80" placeholder="Prénom, pseudo…"></label>'+
    '</div><p class="hint" id="vt-stock" style="margin:8px 0 0"></p></div>');
  var sel = box.querySelector("#vt-cid"), inPrix = box.querySelector("#vt-prix"), selCanal = box.querySelector("#vt-canal"), aide = box.querySelector("#vt-stock");
  actives.forEach(function(c){ sel.appendChild(el('<option value="'+esc(c.id)+'"'+(c.id === c0.id ? ' selected' : '')+'>'+esc(c.nom)+'</option>')); });
  state.canaux.forEach(function(cn){ selCanal.appendChild(el('<option value="'+esc(cn.id)+'">'+esc(cn.nom)+'</option>')); });
  function maj(){
    var c = creation(sel.value); if (!c) return;
    inPrix.value = Number(c.prix) || "";
    selCanal.value = opts.canal || c.canal || "direct";
    var n = enStock(c.id);
    aide.textContent = n > 0 ? n + (n > 1 ? " pièces prêtes" : " pièce prête") + " en stock : la plus ancienne sera vendue." : "Aucune pièce en stock : une pièce terminée et vendue sera créée, et ses matières sortiront du stock.";
  }
  sel.addEventListener("change", maj); maj();
  dialogueChamps({titre: opts.titre || "Vendre", contenu: box, bouton:"C'est vendu", champs:[],
    verifier:function(){ if (!(Number(lireNombre(inPrix.value)) >= 0) || inPrix.value === "") return "Indique le prix payé."; return ""; }
  }, function(){
    var p = vendrePiece(sel.value, Number(lireNombre(inPrix.value)), box.querySelector("#vt-moyen").value, {
      canal: selCanal.value, client: box.querySelector("#vt-client").value.trim(), le: dateVersTs(box.querySelector("#vt-date").value) || Date.now()});
    if (!p){ toast("La vente n'a pas pu être enregistrée."); return; }
    var cr = creation(sel.value);
    toast("Vendu : " + cr.nom + " · " + eur(p.prix) + " · " + libelleMoyen(p.paiement), {libelle:"Annuler", fn:function(){ majCom(p, "atelier"); sauverTout(); render(); toast("Vente annulée : la pièce est de retour en stock."); }});
    if (opts.apres) opts.apres(p); else render();
  });
}

/* ═════ JOUR DE MARCHÉ ═════
   Un écran pour le stand : les créations avec leur stock, une touche par
   vente, le total de la journée par moyen de paiement, les frais du stand,
   et la caisse du soir. Les ventes sont des pièces vendues comme les autres
   (canal « Marché / salon »). */
function marcheDuJour(date){
  state.marches = state.marches || [];
  for (var i = 0; i < state.marches.length; i++) if (state.marches[i].date === date) return state.marches[i];
  var m = {id:"mk_" + uid(), date:date, lieu:"", frais:0, note:""};
  state.marches.push(m);
  return m;
}
function ventesDuJour(date){
  var d0 = dateVersTs(date), d1 = d0 + 86400000;
  return (state.pieces||[]).filter(function(p){ return p.com === "vendu" && p.venduLe >= d0 && p.venduLe < d1 && (p.canal === "marche" || p.marche === date); })
    .sort(function(a, b){ return b.venduLe - a.venduLe; });
}
function renderMarche(main){
  var date = view.marcheDate || aujourdhuiISO();
  var m = marcheDuJour(date);
  var ventes = ventesDuJour(date);
  var total = 0, parMoyen = {};
  ventes.forEach(function(p){ var v = Number(p.prix)||0; total += v; parMoyen[p.paiement || "autre"] = (parMoyen[p.paiement || "autre"] || 0) + v; });
  var hd = enTete("Jour de marché", "Une touche par vente. Le soir, la caisse se fait toute seule.");
  var dateIn = el('<label class="f" style="margin:0"><span class="sr-only">Date du marché</span><input type="date" id="mk-date" value="'+esc(date)+'"></label>');
  dateIn.querySelector("input").addEventListener("change", function(e){ view.marcheDate = e.target.value || aujourdhuiISO(); render(); });
  hd.querySelector(".ph-act").appendChild(dateIn);
  main.appendChild(hd);

  var tiles = el('<div class="tiles"></div>');
  tiles.appendChild(el('<div class="tile"><div class="k">Vendu aujourd\'hui</div><div class="v">'+esc(eur(total))+'</div><div class="s">'+esc(pluriel(ventes.length, "vente"))+'</div></div>'));
  tiles.appendChild(el('<div class="tile"><div class="k">Espèces</div><div class="v">'+esc(eur(parMoyen.especes || 0))+'</div><div class="s">à compter dans la caisse</div></div>'));
  tiles.appendChild(el('<div class="tile"><div class="k">Carte et autres</div><div class="v">'+esc(eur(total - (parMoyen.especes || 0)))+'</div><div class="s">'+esc(Object.keys(parMoyen).filter(function(k){ return k !== "especes"; }).map(function(k){ return libelleMoyen(k) + " " + eur(parMoyen[k]); }).join(" · ") || "—")+'</div></div>'));
  tiles.appendChild(el('<div class="tile"><div class="k">Après les frais du stand</div><div class="v '+(total - (Number(m.frais)||0) >= 0 ? "good" : "bad")+'">'+esc(eur(total - (Number(m.frais)||0)))+'</div><div class="s">'+esc(eur(Number(m.frais)||0))+' de frais</div></div>'));
  main.appendChild(tiles);

  /* le stand : une ligne par création, une touche par vente */
  var cS = el('<div class="card" style="margin-bottom:16px"><header><h2>Ton stand</h2><p>Touche « Vendu » au moment où tu encaisses. Le prix est celui de ta fiche, tu peux le changer.</p></header><div class="body"></div></div>');
  var body = cS.querySelector(".body");
  var moyen = view.marcheMoyen || "especes";
  var bm = el('<div class="filters" style="margin:0 0 12px" role="radiogroup" aria-label="Payé comment"></div>');
  MOYENS_PAIEMENT.forEach(function(mp){
    var b = el('<button type="button" class="fchip" role="radio" aria-checked="'+(mp[0] === moyen ? "true" : "false")+'" aria-pressed="'+(mp[0] === moyen ? "true" : "false")+'">'+esc(mp[1])+'</button>');
    b.addEventListener("click", function(){ view.marcheMoyen = mp[0]; render(); });
    bm.appendChild(b);
  });
  body.appendChild(el('<p class="hint" style="margin:0 0 6px">Payé comment ?</p>'));
  body.appendChild(bm);
  var actives = creationsActives();
  if (!actives.length) body.appendChild(el('<p class="hint">Aucune création : crée d\'abord tes fiches.</p>'));
  var liste = el('<div class="stand"></div>');
  actives.forEach(function(c){
    var n = enStock(c.id), vendus = ventes.filter(function(p){ return p.cid === c.id; }).length;
    var row = el('<div class="stand-ligne">'+vignette(c, 40)+'<div class="stand-nom"><b>'+esc(c.nom)+'</b><span class="hint">'+(n > 0 ? esc(pluriel(n, "pièce")) + " en stock" : "pas de stock : la vente créera la pièce")+(vendus ? ' · '+vendus+' vendue'+(vendus > 1 ? 's' : '')+' aujourd\'hui' : '')+'</span></div>'+
      '<label class="f stand-prix"><span class="sr-only">Prix</span><input type="number" min="0" step="0.5" inputmode="decimal" value="'+esc(Number(c.prix) || "")+'" aria-label="Prix de '+esc(c.nom)+'"></label></div>');
    var bV = bouton("Vendu", function(){
      var prix = Number(lireNombre(row.querySelector("input").value)) || 0;
      var p = vendrePiece(c.id, prix, view.marcheMoyen || "especes", {canal:"marche", le: date === aujourdhuiISO() ? Date.now() : dateVersTs(date) + 43200000});
      if (p){ p.marche = date; sauverTout(); }
      render();
      toast("Vendu : " + c.nom + " · " + eur(prix) + " · " + libelleMoyen(view.marcheMoyen || "especes"));
    }, true);
    bV.classList.add("stand-btn");
    row.appendChild(bV);
    liste.appendChild(row);
  });
  body.appendChild(liste);
  main.appendChild(cS);

  /* les ventes du jour, avec annulation */
  var cV = el('<div class="card" style="margin-bottom:16px"><header><h2>Les ventes du jour</h2></header><div class="body"></div></div>');
  var bv = cV.querySelector(".body");
  if (!ventes.length) bv.appendChild(el('<p class="hint">Rien encore.</p>'));
  else {
    var ul = el('<div class="ventes-jour"></div>');
    ventes.forEach(function(p){
      var c = creation(p.cid);
      var li = el('<div class="vente-ligne"><span class="num">'+esc(new Date(p.venduLe).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"}))+'</span><span>'+esc(c ? c.nom : "?")+'</span><span class="hint">'+esc(libelleMoyen(p.paiement))+'</span><b class="num">'+esc(eur(Number(p.prix)||0))+'</b></div>');
      var bx = el('<button type="button" class="btn sm" aria-label="Annuler cette vente">Annuler</button>');
      bx.addEventListener("click", function(){ majCom(p, "atelier"); p.marche = null; sauverTout(); render(); toast("Vente annulée : la pièce est de retour en stock."); });
      li.appendChild(bx);
      ul.appendChild(li);
    });
    bv.appendChild(ul);
  }
  main.appendChild(cV);

  /* frais du stand et caisse du soir */
  var cF = el('<div class="card" style="margin-bottom:16px"><header><h2>Caisse du soir</h2><p>Les frais du stand (emplacement, terminal, essence) se retirent de la journée.</p></header><div class="body">'+
    '<div class="grid2"><label class="f"><span>Lieu</span><input id="mk-lieu" type="text" maxlength="80" value="'+esc(m.lieu||"")+'" placeholder="Marché de Noël, place du village…"></label>'+
    '<label class="f"><span>Frais du stand (€)</span><input id="mk-frais" type="number" min="0" step="0.5" inputmode="decimal" value="'+esc(m.frais||0)+'"></label></div>'+
    '<p style="margin:12px 0 0"><b>'+esc(eur(total))+'</b> vendus'+(Object.keys(parMoyen).length ? ' (' + esc(Object.keys(parMoyen).map(function(k){ return libelleMoyen(k) + " " + eur(parMoyen[k]); }).join(", ")) + ')' : '')+
    ' − '+esc(eur(Number(m.frais)||0))+' de frais = <b>'+esc(eur(total - (Number(m.frais)||0)))+'</b> pour la journée.</p></div></div>');
  cF.addEventListener("input", function(e){
    if (e.target.id === "mk-lieu") m.lieu = e.target.value;
    if (e.target.id === "mk-frais") m.frais = Math.max(0, Number(lireNombre(e.target.value)) || 0);
    sauver();
  });
  cF.addEventListener("change", function(e){ if (e.target.id === "mk-frais") render(); });
  main.appendChild(cF);
}
function dialogueAjoutPieces(cid){
  var actives = creationsActives();
  if (!actives.length){ toast("Crée d'abord une fiche création"); return; }
  var box = el('<div class="grid2">'+
    '<label class="f"><span>Création</span><select id="ap-cid"></select></label>'+
    '<label class="f"><span>Nombre de pièces</span><input id="ap-n" type="number" min="1" step="1" value="1" inputmode="numeric"></label>'+
    '<label class="f"><span>État au départ</span><select id="ap-prod"></select></label>'+
    (state.reglages.profil !== "passion" ? '<label class="f"><span>Destination</span><select id="ap-com"></select></label>'+
      '<label class="f"><span>Commandé par (facultatif)</span><input id="ap-client" type="text" maxlength="80" placeholder="Prénom, pseudo Instagram…"></label>' : '')+
    '</div><p class="hint" style="margin:10px 0 0">Pour une pièce commandée : état « À faire », destination « Sur commande ». La commande elle-même se gère dans l\'onglet Commandes.</p>');
  var selC = box.querySelector("#ap-cid");
  actives.forEach(function(c){ var o = document.createElement("option"); o.value = c.id; o.textContent = c.nom; selC.appendChild(o); });
  if (cid) selC.value = cid;
  var selP = box.querySelector("#ap-prod"), selCom = box.querySelector("#ap-com");
  PROD.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; selP.appendChild(o); });
  if (selCom) COM.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; selCom.appendChild(o); });
  dialogueChamps({titre:"Ajouter des pièces au suivi", contenu: box, champs: [], bouton:"Ajouter", annuler:"Annuler"}, function(v, boite){
    var n = Math.max(1, Number(box.querySelector("#ap-n").value)||1);
    var cl = box.querySelector("#ap-client");
    ajouterPieces(selC.value, n, selP.value, selCom ? selCom.value : "atelier", cl ? cl.value : "");
    sauverTout(); render(); toast(n + " pièce" + (n>1?"s ajoutées":" ajoutée") + " au suivi");
  });
}

/* ═════ 10. FICHE CRÉATION ═════ */


/* Ouvrir une autre fiche alors que celle en cours a des modifications non
   enregistrées : on demande, comme tout éditeur. */
function siBrouillonLibre(suite, idCible){
  if (!view.draft || !ficheModifiee() || (idCible && view.draft.id === idCible)){ suite(); return; }
  confirmer({
    titre: "Abandonner la fiche en cours ?",
    texte: "Les modifications de « " + (view.draft.nom || "la fiche en cours") + " » n'ont pas été enregistrées.",
    bouton: "Abandonner les modifications", annuler: "Garder la fiche", danger: true
  }, function(){ oublierBrouillon(); suite(); });
}
function nouvelleFiche(modele){
  var mod = typeof modele === "string" ? modele : "ami_moyen";
  if (view.draft && ficheModifiee()){ siBrouillonLibre(function(){ view.draft = null; nouvelleFiche(mod); }); return; }
  view.draft = creationDepuisModele(mod,"",0,"direct");
  view.draft.nom = "";
  view.ficheId = null;
  view.draftRef = empreinteFiche(view.draft);
  aller("fiche");
}
function ouvrirFiche(id){
  var src = null;
  for (var i=0;i<state.creations.length;i++) if (state.creations[i].id===id) src = state.creations[i];
  if (!src) return;
  /* La même fiche, déjà ouverte avec des modifications : on y retourne. */
  if (view.draft && view.draft.id === id){ view.ficheId = id; aller("fiche"); return; }
  if (view.draft && ficheModifiee()){ siBrouillonLibre(function(){ view.draft = null; ouvrirFiche(id); }); return; }
  view.draft = clone(src);
  view.ficheId = id;
  view.draftRef = empreinteFiche(view.draft);
  aller("fiche");
}
/* La photo s'enregistre à part, tout de suite : elle ne compte pas comme une
   modification en attente. */
function empreinteFiche(d){
  if (!d) return "";
  var c = clone(d); delete c.photo; return JSON.stringify(c);
}
function ficheModifiee(){
  return !!view.draft && empreinteFiche(view.draft) !== view.draftRef;
}
/* Quitter une fiche : si rien n'a changé, on part ; sinon on demande, comme
   le fait n'importe quel éditeur, plutôt que de jeter la saisie en silence. */
function quitterFiche(){
  function partir(){
    oublierBrouillon();
    retourParent(function(){ view.draft = null; view.ficheId = null; view.draftRef = null; view.tab = "creations"; });
  }
  if (!ficheModifiee()){ partir(); return; }
  confirmer({
    titre: "Quitter sans enregistrer ?",
    texte: "Les modifications apportées à cette fiche seront perdues.",
    bouton: "Quitter sans enregistrer", annuler: "Continuer la saisie", danger: true
  }, partir);
}

var adapterFiche = null, mqFicheBranche = false;
/* La photo est enregistrée tout de suite, même si la fiche n'est pas validée :
   sinon l'image serait orpheline dans le stockage. */
function sauverBrouillonPhoto(){
  if (!view.ficheId || !view.draft) return;
  var reel = creation(view.ficheId);
  if (reel){ reel.photo = view.draft.photo; sauverTout(); }
}

/* Brouillon de fiche gardé sur l'appareil : un rechargement (fréquent sur
   téléphone) ne fait plus perdre dix minutes de saisie. Un seul brouillon,
   rattaché au compte. */
var CLE_BROUILLON = KEY + ".brouillon";
var minuteurBrouillon = null;
function garderBrouillon(){
  if (minuteurBrouillon) clearTimeout(minuteurBrouillon);
  minuteurBrouillon = setTimeout(function(){
    if (!view.draft || !ficheModifiee()){ oublierBrouillon(); return; }
    try{ localStorage.setItem(CLE_BROUILLON, JSON.stringify({d: view.draft, ficheId: view.ficheId, ref: view.draftRef,
                                                             le: Date.now(), compte: marque(CLE_COMPTE) || null})); }catch(e){}
  }, 400);
}
function oublierBrouillon(){ if (minuteurBrouillon) clearTimeout(minuteurBrouillon); try{ localStorage.removeItem(CLE_BROUILLON); }catch(e){} }
function brouillonGarde(){
  try{
    var b = JSON.parse(localStorage.getItem(CLE_BROUILLON) || "null");
    if (!b || !b.d || (b.compte || null) !== (marque(CLE_COMPTE) || null)) return null;
    return b;
  }catch(e){ return null; }
}
function reprendreBrouillon(){
  var b = brouillonGarde(); if (!b) return;
  view.draft = b.d; view.ficheId = b.ficheId && creation(b.ficheId) ? b.ficheId : null; view.draftRef = b.ref || "";
  if (!view.ficheId) view.draftRef = empreinteFiche(creationDepuisModele("ami_moyen","",0,"direct"));
  aller("fiche");
}
function renderFiche(main){
  var d = view.draft;
  if (!d){ nouvelleFiche(); return; }
  /* Sur téléphone, le résultat reste visible en bas pendant qu'on tape le
     prix, tout en bas de la fiche. */
  main.appendChild(el('<div class="barre-fiche" aria-hidden="true"><span id="bf-t"></span><b id="bf-g"></b></div>'));
  document.body.classList.add("avec-barre");
  /* Fiche déjà enregistrée, non modifiée ici, mais changée ailleurs (autre
     écran, autre appareil) : on repart de la version enregistrée. */
  if (view.ficheId && !ficheModifiee()){
    var src0 = creation(view.ficheId);
    if (src0 && empreinteFiche(src0) !== view.draftRef){ view.draft = d = clone(src0); view.draftRef = empreinteFiche(d); }
  }

  /* Ce que des clientes attendent déjà sur cette création : c'est la première
     chose à savoir en ouvrant la fiche, avant même le prix de revient. */
  /* Dire où l'on est : c'est la fiche de coût d'UNE création, pas un
     écran de plus. */
  var bRet = bouton("← Mes créations", quitterFiche); bRet.classList.add("sm");
  main.appendChild(enTete(view.ficheId ? "Fiche de coût : « " + (d.nom || "sans nom") + " »" : "Nouvelle fiche de coût",
    "C'est ici que tu calcules ce que cette création te coûte et ce qu'elle te rapporte : ses matières, ton temps, "+
    "son prix. Enregistre-la pour la retrouver dans « Mes créations » et y suivre chaque pièce fabriquée.", [bRet]));
  var cmdLiees = carteCommandesLiees(view.ficheId);
  if (cmdLiees) main.appendChild(cmdLiees);

  var wrap = el('<div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start" id="fiche-grid"></div>');
  var left = el('<div style="display:flex;flex-direction:column;gap:16px;min-width:0"></div>');
  var right = el('<div style="position:sticky;top:calc(env(safe-area-inset-top,0px) + 108px)" id="fiche-right"></div>');
  var mq = window.matchMedia("(max-width: 900px)");
  function adapter(){
    if (mq.matches){
      wrap.style.gridTemplateColumns = "1fr";
      right.style.position = "static";
      right.style.order = "-1";
    } else {
      wrap.style.gridTemplateColumns = "minmax(0,1fr) 340px";
      right.style.position = "sticky";
      right.style.order = "0";
    }
  }
  /* Un seul écouteur pour toute la session : en ajouter un à chaque
     affichage de la fiche les accumulait (et gardait en mémoire les
     anciennes fiches). */
  adapterFiche = adapter;
  if (!mqFicheBranche && mq.addEventListener){
    mqFicheBranche = true;
    mq.addEventListener("change", function(){ if (adapterFiche && document.getElementById("fiche-grid")) adapterFiche(); });
  }

  /* --- identité --- */
  var cId = el(
    '<div class="card"><div class="body">'+
      '<div class="grid2">'+
        '<label class="f"><span>Nom de la création</span><input id="f-nom" type="text" placeholder="Lapin gris, bonnet torsadé…"></label>'+
        '<label class="f"><span>Partir d\'un modèle du catalogue</span><select id="f-modele"></select></label>'+
      '</div>'+
      '<p class="hint">Le modèle pré-remplit les matières et les temps avec des ordres de grandeur. Corrige-les avec tes vrais chiffres : c\'est ce qui rend le calcul juste.</p>'+
      '<div class="patron-ligne"><label class="f"><span>Mon patron</span><select id="f-patron"></select></label>'+
      '<button type="button" class="btn" id="f-patron-charger">Charger un patron (PDF, photos)</button>'+
      '<input type="file" id="f-patron-fichier" accept="application/pdf,.pdf,image/*" multiple style="display:none" aria-label="Choisir le fichier du patron"></div>'+
      '<p class="hint" id="f-patron-aide"></p>'+
    '</div></div>'
  );
  left.appendChild(cId);
  left.appendChild(carteChrono(d, function(){ aller("fiche"); }));
  /* Le patron relié s'affiche ici. On le redessine sur place quand on en
     change, sans reconstruire toute la fiche. */
  var zonePatron = el('<div style="display:contents"></div>');
  left.appendChild(zonePatron);
  function peindrePatronFiche(){
    zonePatron.innerHTML = "";
    var cp = cartePatronPerso(d);
    if (cp){ zonePatron.appendChild(cp); hydraterPhotos(zonePatron); }
  }
  peindrePatronFiche();
  left.appendChild(blocPhoto(d, function(){
    sauverBrouillonPhoto();
    aller("fiche");
  }));

  /* --- matières --- */
  var cMat = el(
    '<div class="card"><header><h2>Ce que tu consommes</h2><p>La quantité réellement utilisée, pas le conditionnement acheté.</p></header>'+
    '<div class="body"><div id="f-rows" style="display:flex;flex-direction:column;gap:8px"></div></div></div>'
  );
  var addRow = el('<button type="button" class="btn sm primary" style="margin-top:12px">+ Ajouter une matière</button>');
  cMat.querySelector(".body").appendChild(addRow);
  left.appendChild(cMat);

  /* --- temps --- */
  var cTps = el(
    '<div class="card"><header><h2>Ton temps</h2><p>En minutes. Le temps de crochet est rarement le plus sous-estimé : ce sont les autres postes qui le sont.</p></header>'+
    '<div class="body"><div id="f-temps" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px"></div>'+
    '<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--rule);display:flex;justify-content:space-between;align-items:baseline;gap:10px">'+
    '<span>Temps total sur cette création</span><b class="num" id="f-tot" style="font-size:18px;font-weight:500">—</b></div></div></div>'
  );
  left.appendChild(cTps);

  /* --- temps réellement mesuré --- */
  var bt = view.ficheId ? bilanTemps(view.ficheId) : null;
  if (bt && bt.n > 0){
    var pct2 = Math.round(bt.ecart*100);
    var sens = pct2 > 8 ? "bad" : pct2 < -8 ? "good" : "ok";
    var cReel = el('<div class="card"><header><h2>Ton temps réel</h2>'+
      '<p>Mesuré au chronomètre sur '+bt.n+' pièce'+(bt.n>1?'s':'')+
      (bt.postesMesures && bt.postesMesures.length < POSTES.length ? ', pour ' + esc(POSTES.filter(function(x){ return bt.postesMesures.indexOf(x.k) >= 0; }).map(function(x){ return x.nom.toLowerCase(); }).join(", ")) + ' seulement' : '')+
      '. C\'est ce chiffre-là qui dit la vérité sur ton prix.</p></header>'+
      '<div class="body"><div class="tpsbox">'+
        '<div class="c"><span>Ton estimation</span><b>'+esc(dureeTexte(bt.estime))+'</b></div>'+
        '<div class="c"><span>Moyenne réelle</span><b style="color:'+
          (sens==="bad"?"var(--bad)":sens==="good"?"var(--good)":"inherit")+'">'+esc(dureeTexte(bt.moyenne))+'</b></div>'+
        '<div class="c"><span>La plus rapide</span><b>'+esc(dureeTexte(bt.mini))+'</b></div>'+
        '<div class="c"><span>La plus longue</span><b>'+esc(dureeTexte(bt.maxi))+'</b></div>'+
      '</div>'+
      '<p class="hint" id="r-verdict"></p></div></div>');
    var verdict = cReel.querySelector("#r-verdict");
    if (Math.abs(pct2) <= 8){
      verdict.innerHTML = "Ton estimation est juste. Rien à corriger.";
    } else if (pct2 > 0){
      verdict.innerHTML = "Tu mets <b>"+pct2+" % de plus</b> que prévu. "+
        "Ton prix est donc calculé sur un temps trop court : tu te paies moins que ce que la fiche affiche.";
    } else {
      verdict.innerHTML = "Tu vas <b>"+Math.abs(pct2)+" % plus vite</b> que prévu. "+
        (pct2 <= -50
          ? "C'est énorme : vérifie que le chronomètre couvre toute la fabrication (préparation, assemblage, finition) et qu'il n'a pas été arrêté trop tôt, avant de changer ta fiche."
          : "Ta fiche est trop prudente : ton gain de l'heure réel est meilleur que prévu.");
    }
    if (Math.abs(pct2) > 8){
      function appliquerTempsReel(){
        POSTES.forEach(function(x){
          if (bt.postesMesures.indexOf(x.k) < 0) return;   /* postes non mesurés : on garde ton estimation */
          var v = Math.round(bt.moyPoste[x.k]);
          d.temps[x.k] = v;
          var ch2 = tempsBox.querySelector('[data-poste="'+x.k+'"]');
          if (ch2) ch2.value = v;
        });
        peindre();
        marquerModifie();
        toast("Temps mis à jour. Pense à enregistrer la fiche.");
      }
      var bMaj = bouton("Utiliser le temps réel dans ma fiche", function(){
        /* Un temps très court face à l'estimation vient presque toujours d'un
           chronomètre arrêté trop tôt (ou d'un essai) : il ferait grimper le
           gain de l'heure à des chiffres faux. On demande avant de l'écrire. */
        if (pct2 <= -50){
          confirmer({titre: "Ce temps semble très court",
            texte: "Ta fiche prévoit " + dureeTexte(bt.estime) + " et le chronomètre en a compté " + dureeTexte(bt.moyenne) + ". " +
                   "Si tu as arrêté le chronomètre avant la fin de la pièce (ou si c'était un essai), ne remplace pas ta fiche : ton gain de l'heure deviendrait irréaliste. " +
                   "Tu peux remplacer quand même si c'est vraiment le temps qu'il te faut.",
            bouton: "Remplacer quand même", annuler: "Garder ma fiche"}, appliquerTempsReel);
          return;
        }
        appliquerTempsReel();
      }, true);
      bMaj.style.marginTop = "12px";
      cReel.querySelector(".body").appendChild(bMaj);
    }
    left.appendChild(cReel);
  }
  /* --- prévu et réel : fil pesé, coût complet --- */
  var br = view.ficheId ? bilanReel(view.ficheId) : null;
  if (br && br.n > 0){
    var ecC = br.coutReel - br.coutEst;
    var cPR = el('<div class="card"><header><h2>Prévu et réel</h2>'+
      '<p>Moyenne de '+esc(pluriel(br.n, "pièce terminée", "pièces terminées"))+' chronométrée'+(br.n>1?'s':'')+' ou pesée'+(br.n>1?'s':'')+
      '. Ta fiche est une estimation ; ces chiffres sont ce que tes pièces ont vraiment demandé.</p></header>'+
      '<div class="body"><div class="tpsbox">'+
        '<div class="c"><span>Coût complet prévu</span><b>'+esc(eur(br.coutEst))+'</b></div>'+
        '<div class="c"><span>Coût complet réel</span><b style="color:'+(ecC > 0.005 ? 'var(--bad)' : ecC < -0.005 ? 'var(--good)' : 'inherit')+'">'+esc(eur(br.coutReel))+'</b></div>'+
        '<div class="c"><span>Gain de l\'heure prévu</span><b>'+esc(eur(br.gainEst))+'</b></div>'+
        '<div class="c"><span>Gain de l\'heure réel</span><b>'+esc(eur(br.gainReel))+'</b></div>'+
      '</div><div class="pr-mat"></div></div></div>');
    var zMat = cPR.querySelector(".pr-mat");
    var midsP = Object.keys(br.moy);
    if (midsP.length){
      var tP = el('<div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Matière</th><th class="n">Prévu par pièce</th><th class="n">Réel (moyenne)</th><th class="n">Écart</th></tr></thead><tbody></tbody></table></div>');
      midsP.forEach(function(mid){
        var m = matiere(mid); if (!m) return;
        var e2 = br.prevu[mid] > 0 ? (br.moy[mid] - br.prevu[mid]) / br.prevu[mid] : 0;
        tP.querySelector("tbody").appendChild(el('<tr><td>'+esc(m.nom)+'<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(pluriel(br.nParMat[mid], "pesée", "pesées"))+'</div></td>'+
          '<td class="n">'+esc(qte(br.prevu[mid], m.unite))+'</td><td class="n">'+esc(qte(Math.round(br.moy[mid] * 10) / 10, m.unite))+'</td>'+
          '<td class="n" style="color:'+(e2 > 0.05 ? 'var(--bad)' : e2 < -0.05 ? 'var(--good)' : 'inherit')+'">'+(e2 >= 0 ? '+' : '−')+esc(nb(Math.abs(Math.round(e2 * 100))))+' %</td></tr>'));
      });
      zMat.appendChild(tP);
      var bQ = bouton("Utiliser les quantités réelles dans ma fiche", function(){
        var perte = (Number(state.reglages.tauxPerte)||0) / 100;
        midsP.forEach(function(mid){
          var m = matiere(mid); if (!m) return;
          var lignes = d.lignes.filter(function(l){ return l.mid === mid; });
          var tot = lignes.reduce(function(t, l){ return t + (Number(l.qte)||0); }, 0);
          /* La fiche compte la perte à part : la quantité réelle mesurée (chutes
             comprises) est ramenée à la quantité « nette » de la fiche. */
          var net = br.moy[mid] / (avecPerte(m) ? 1 + perte : 1);
          lignes.forEach(function(l){ l.qte = Math.round((tot > 0 ? (Number(l.qte)||0) / tot : 1 / lignes.length) * net * 10) / 10; });
        });
        redessinerLignes(); peindre(); marquerModifie();
        toast("Quantités mises à jour d'après tes pesées. Pense à enregistrer la fiche.");
      }, true);
      bQ.style.marginTop = "12px";
      zMat.appendChild(bQ);
    } else {
      zMat.appendChild(el('<p class="hint" style="margin:12px 0 0">Aucune pesée pour l\'instant. Dans « Mes créations », le bouton <b>Peser</b> de chaque pièce '+
        'd\'une pièce terminée te laisse noter le fil réellement utilisé : le coût réel devient exact, et ton stock est corrigé.</p>'));
    }
    left.appendChild(cPR);
  }
  if (!(bt && bt.n > 0) && view.ficheId){
    left.appendChild(el('<div class="card"><header><h2>Ton temps réel</h2>'+
      '<p>Aucune pièce chronométrée pour l\'instant. Dans « Mes créations », sur chaque pièce, le bouton '+
      '« ▶ Chronométrer » lance le compteur : il tourne même si tu changes d\'écran ou fermes l\'application, '+
      'et il s\'additionne d\'une séance à l\'autre. Deux ou trois pièces suffisent à savoir si ton estimation tient.</p>'+
      '</header><div class="body" style="padding-top:0"></div></div>'));
  }

  /* --- vente --- */
  var cVente = el(
    '<div class="card"><header><h2>Comment tu la vends</h2></header><div class="body">'+
      '<div class="grid2">'+
        '<label class="f"><span>Où tu la vends</span><select id="f-canal"></select></label>'+
        '<label class="f"><span>Frais d\'expédition à ta charge (€)</span><input id="f-expe" type="number" min="0" step="0.1"></label>'+
      '</div>'+
      '<p class="hint" id="f-canal-note"></p>'+
      '<label class="f" style="margin-top:14px"><span>Ton prix de vente (€)</span><input id="f-prix" type="number" min="0" step="0.5"></label>'+
      '<input id="f-slider" type="range" min="0" step="0.5" style="margin-top:6px" aria-label="Faire varier le prix de vente">'+
    '</div></div>'
  );
  left.appendChild(cVente);

  /* --- besoin d'achat --- */
  var cAchat = el(
    '<div class="card"><header><h2>Ce que tu dois acheter</h2>'+
    '<p>Les matières s\'achètent par conditionnements entiers. L\'argent qui sort aujourd\'hui n\'est pas le coût de la pièce.</p></header>'+
    '<div class="body">'+
      '<div class="grid2" style="align-items:end">'+
        '<label class="f"><span>Nombre de pièces à fabriquer</span><input id="f-n" type="number" min="1" step="1" value="1"></label>'+
        '<label class="f"><span>Déduire ce que tu as déjà en stock</span><select id="f-stockopt"><option value="1">Oui, tenir compte de mon stock</option><option value="0">Non, tout acheter</option></select></label>'+
      '</div>'+
      '<div class="tablewrap" style="margin-top:14px"><table id="f-achat" style="min-width:600px"><thead><tr>'+
        '<th>Matière</th><th class="n">Besoin</th><th class="n">En stock</th><th class="n">À acheter</th><th class="n">Coût d\'achat</th><th class="n">Consommé</th><th class="n">Restera</th>'+
      '</tr></thead><tbody></tbody></table></div>'+
      '<div id="f-achat-tot" style="margin-top:14px"></div>'+
    '</div></div>'
  );
  left.appendChild(cAchat);

  /* --- production (création déjà enregistrée) --- */
  var cProd = null;
  if (view.ficheId){
    var b = bilanCreation(d.id);
    cProd = el(
      '<div class="card"><header><h2>Les pièces de cette création</h2>'+
      '<p>Chaque pièce est suivie individuellement. Passer une pièce en « terminée » sort ses matières du stock.</p></header>'+
      '<div class="body">'+
        '<div class="grid3" style="align-items:end">'+
          '<label class="f"><span>Nombre de pièces</span><input id="p-n" type="number" min="1" step="1" value="1"></label>'+
          '<label class="f"><span>État au départ</span><select id="p-prod"></select></label>'+
          '<label class="f"><span>Destination</span><select id="p-com"></select></label>'+
          '<label class="f"><span>Commandé par (si commande)</span><input id="p-client" type="text" placeholder="Prénom, pseudo Instagram…"></label>'+
          '<label class="f"><span>Stock de sécurité (pièces)</span><input id="p-seuil" type="number" min="0" step="1" value="'+(Number(d.seuilFini)||0)+'"></label>'+
          '<div><button type="button" class="btn primary" id="p-add">Ajouter au suivi</button></div>'+
        '</div>'+
        '<div class="tiles" style="margin:16px 0 0">'+
          '<div class="tile"><div class="k">En fabrication</div><div class="v">'+b.enCours+'</div></div>'+
          '<div class="tile"><div class="k">Prêtes à vendre</div><div class="v">'+b.stock+'</div>'+
            (Number(d.seuilFini)>0 ? '<div class="s">stock de sécurité : '+(Number(d.seuilFini)||0)+'</div>' : '')+'</div>'+
          '<div class="tile"><div class="k">Vendues</div><div class="v">'+b.vendues+'</div></div>'+
          '<div class="tile"><div class="k">Encaissé</div><div class="v good">'+esc(eur(b.ca))+'</div></div>'+
        '</div>'+
        '<p class="hint" style="margin-top:12px">Le détail pièce par pièce, avec les changements d\'état, est dans « Mes créations », sous cette création.</p>'+
      '</div></div>'
    );
    var selP = cProd.querySelector("#p-prod"), selC = cProd.querySelector("#p-com");
    PROD.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; selP.appendChild(o); });
    COM.forEach(function(x){ var o=document.createElement("option"); o.value=x.k; o.textContent=x.nom; selC.appendChild(o); });
    selP.value = "afaire"; selC.value = "atelier";
    left.appendChild(cProd);
  }

  /* --- barre d'action --- */
  var bar = el('<div class="savebar"></div>');
  var existe = !!creation(d.id);
  var bSave = el('<button type="button" class="btn primary">'+(existe?"Enregistrer":"Ajouter à mes créations")+'</button>');
  bar.appendChild(bSave);
  var pastille = el('<span class="chip warn" id="f-dirty" hidden>Modifications non enregistrées</span>');
  bar.appendChild(pastille);
  var bBack = el('<button type="button" class="btn">Fermer</button>');
  bBack.addEventListener("click", function(){ quitterFiche(); });
  bar.appendChild(bBack);
  if (view.ficheId){
    var bDel = el('<button type="button" class="btn ghost danger-texte">Supprimer la création</button>');
    bDel.addEventListener("click", function(){
      var cid = view.ficheId, cr = creation(cid);
      /* Une création déjà vendue ne se supprime pas : ses ventes font partie
         de ton chiffre d'affaires (et de tes seuils). On l'archive. */
      if (aDeLHistorique(cid)){
        confirmer({titre:"Archiver « " + ((cr && cr.nom) || "cette création") + " » ?",
          texte:"Cette création a déjà des ventes ou des commandes : la supprimer effacerait ton chiffre d'affaires passé. "+
                "Archivée, elle disparaît de tes listes et de tes choix, mais ses ventes, ses commandes et tes indicateurs restent intacts. "+
                "Tu pourras la ressortir à tout moment depuis « Mes créations ».",
          bouton:"Archiver", annuler:"Garder"}, function(){
          cr.archive = Date.now(); sauverTout(); view.draft = null; view.ficheId = null; aller("creations");
          toast("« " + cr.nom + " » archivée.");
        });
        return;
      }
      var nb = piecesDe(cid).length;
      var cmdL = commandesOuvertes().filter(function(c){ return commandeContient(c, cid); }).length;
      var details = [];
      if (nb) details.push(nb + " pièce" + (nb>1?"s":"") + " suivie" + (nb>1?"s":"") + " dans « Mes créations », et les ventes qui y sont notées");
      if (cr && cr.photo) details.push("sa photo");
      if (cmdL) details.push("le lien avec " + cmdL + " commande" + (cmdL>1?"s":"") + " en cours (les commandes elles-mêmes sont conservées)");
      confirmer({
        titre: "Supprimer « " + ((cr && cr.nom) || "cette création") + " » ?",
        texte: details.length ? "Seront aussi supprimés :" : "La fiche et son calcul seront supprimés.",
        details: details,
        bouton: "Supprimer", danger: true
      }, function(){
        commandes().forEach(function(c){ if (c.cid === cid) c.cid = null; (c.articles || []).forEach(function(a){ if (a.cid === cid) a.cid = null; }); });
        var np = supprimerCreation(cid);
        sauverTout(); view.draft = null; view.ficheId = null; aller("creations");
        toast(np ? "Création supprimée, avec ses " + np + " pièce" + (np>1?"s":"") : "Création supprimée");
      });
    });
    bar.appendChild(bDel);
  }
  left.appendChild(bar);

  /* --- panneau résultat --- */
  var res = el(
    '<div class="card" style="overflow:hidden">'+
      '<div style="padding:18px;border-bottom:1px solid var(--rule)">'+
        '<div style="font-size:13px;color:var(--muted)" id="r-lead">À ce prix-là, tu te paies</div>'+
        '<div class="num" id="r-gain" style="font-size:38px;line-height:1.05;letter-spacing:-.03em;margin:6px 0 2px">—</div>'+
        '<div style="font-size:15px;color:var(--muted)">de l\'heure</div>'+
        '<div style="margin-top:10px"><span class="chip" id="r-chip">—</span></div>'+
        '<div style="font-size:12.5px;color:var(--muted);margin-top:8px" id="r-after"></div>'+
        '<p class="hint" id="r-vrai" role="status" hidden style="margin:8px 0 0;color:var(--warn)"></p>'+
      '</div>'+
      '<div style="padding:14px 18px">'+
        '<dl style="margin:0;display:grid;grid-template-columns:1fr auto;gap:7px 14px;font-size:13.5px" id="r-dl">'+
          '<dt style="color:var(--muted)">Prix de vente</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-prix">—</dd>'+
          '<dt style="color:var(--muted)">Matières consommées</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-mat">—</dd>'+
          '<dt style="color:var(--muted)">Pertes et ratés</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-perte">—</dd>'+
          '<dt style="color:var(--muted)">Emballage et étiquette</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-emb">—</dd>'+
          '<dt style="color:var(--muted)">Frais de vente</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-frais">—</dd>'+
          '<dt style="color:var(--muted)">Cotisations</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-cotis">—</dd>'+
          '<dt style="color:var(--muted)">Part des frais fixes</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-fixe">—</dd>'+
          '<div style="grid-column:1/-1;border-top:1px solid var(--rule);margin:3px 0 1px"></div>'+
          '<dt style="font-weight:600">Il te reste</dt><dd class="num" style="margin:0;text-align:right;font-size:13px;font-weight:600" id="r-reste">—</dd>'+
          '<dt style="color:var(--muted)">pour</dt><dd class="num" style="margin:0;text-align:right;font-size:13px" id="r-duree">—</dd>'+
        '</dl>'+
      '</div>'+
      '<div style="padding:14px 18px;border-top:1px solid var(--rule);background:var(--surface-2);font-size:13.5px">'+
        '<p style="margin:0" id="r-obj">—</p>'+
        '<p class="hint" id="r-plancher"></p>'+
        '<p class="hint" id="r-leviers"></p>'+
      '</div>'+
      '<details class="marges-d" style="border-top:1px solid var(--rule)"><summary style="cursor:pointer;padding:12px 18px;font-weight:600;font-size:13.5px">Pour aller plus loin : tes marges</summary>'+
      '<div class="marges" id="r-marges" style="padding:0 18px 14px;font-size:13.5px"></div></details>'+
    '</div>'
  );
  right.appendChild(res);
  /* Mode « pour le plaisir » : pas de prix de vente, pas de cotisations, pas
     de marge. La fiche dit ce que la pièce coûte en matières et combien de
     temps elle prend ; le temps n'est pas converti en euros. */
  var loisir = state.reglages.profil === "passion";
  if (loisir){
    cVente.remove();   /* le nœud reste en mémoire : les références restent valables */
    res.querySelector("#r-lead").textContent = "Cette pièce te coûte";
    res.querySelector("#r-gain").nextElementSibling.textContent = "de matières";
    res.querySelector("#r-chip").parentNode.remove();
    ["r-prix","r-frais","r-cotis","r-fixe"].forEach(function(id){ var dd = res.querySelector("#"+id); dd.previousElementSibling.remove(); dd.remove(); });
    res.querySelector("#r-reste").previousElementSibling.textContent = "Matières et emballage";
    res.querySelector("#r-duree").previousElementSibling.textContent = "Temps de travail";
    res.querySelector("#r-obj").parentNode.remove();
    res.querySelector("#r-marges").parentNode.remove();
  }
  right.appendChild(el('<p class="hint">'+(creation(d.id)
    ? 'Une fois enregistrée, ta fiche est dans ton compte et sur tous tes appareils.'
    : 'Pas encore enregistrée : touche « Ajouter à mes créations » pour la garder. En attendant, ta saisie est gardée sur cet appareil.')+'</p>'));

  wrap.appendChild(left); wrap.appendChild(right);
  main.appendChild(wrap);
  adapter();

  /* ---------- références (AVANT tout appel à peindre) ---------- */
  var selModele = cId.querySelector("#f-modele");
  var inNom     = cId.querySelector("#f-nom");
  var selCanal  = cVente.querySelector("#f-canal");
  var inExpe    = cVente.querySelector("#f-expe");
  var inPrix    = cVente.querySelector("#f-prix");
  var slider    = cVente.querySelector("#f-slider");
  var tempsBox  = cTps.querySelector("#f-temps");
  var totTemps  = cTps.querySelector("#f-tot");
  var rowsBox   = cMat.querySelector("#f-rows");
  var inN       = cAchat.querySelector("#f-n");
  var selStock  = cAchat.querySelector("#f-stockopt");
  var achatBody = cAchat.querySelector("#f-achat tbody");
  var achatTot  = cAchat.querySelector("#f-achat-tot");
  var noteCanal = cVente.querySelector("#f-canal-note");

  /* ---------- remplissage ---------- */
  var og = {};
  MODELES.forEach(function(m){
    var famNom = "Fiche vide";
    FAMILLES.forEach(function(f){ if (f.id === m[1]) famNom = f.nom; });
    if (!og[famNom]){
      og[famNom] = document.createElement("optgroup");
      og[famNom].label = famNom;
      selModele.appendChild(og[famNom]);
    }
    var o = document.createElement("option");
    o.value = m[0]; o.textContent = mNom(m);
    og[famNom].appendChild(o);
  });
  selModele.value = d.modele || "vide";
  inNom.value = d.nom || "";

  state.canaux.forEach(function(c){
    var o = document.createElement("option");
    o.value = c.id; o.textContent = c.nom;
    selCanal.appendChild(o);
  });
  selCanal.value = d.canal;
  inExpe.value = d.expedition;
  inPrix.value = d.prix;

  POSTES.forEach(function(p){
    var l = el('<label class="f"><span>'+esc(p.nom)+'</span><input type="number" min="0" step="5" data-poste="'+p.k+'"></label>');
    var i = l.querySelector("input");
    i.value = d.temps[p.k]; i.title = p.aide;
    tempsBox.appendChild(l);
  });

  function redessinerLignes(){
    rowsBox.innerHTML = "";
    d.lignes.forEach(function(l, idx){
      var m = matiere(l.mid);
      var row = el(
        '<div class="matrow" data-idx="'+idx+'" style="display:grid;grid-template-columns:minmax(0,1fr) 118px 74px 34px;gap:8px;align-items:center">'+
          '<button type="button" class="btn matpick" data-role="pick" aria-label="Choisir la matière de la ligne '+(idx+1)+'">'+
            esc(m ? m.nom : "Choisir une matière")+'</button>'+
          '<span class="qte-u"><input type="number" min="0" step="1" data-role="qte" value="'+(Number(l.qte)||0)+'" aria-label="Quantité'+(m ? ' en ' + esc(m.unite) : '')+'">'+
            '<span class="u" aria-hidden="true">'+esc(m ? m.unite : '')+'</span></span>'+
          '<span class="num" data-role="cost" style="font-size:13.5px;text-align:right;color:var(--muted)">—</span>'+
          '<button type="button" class="btn ghost" data-role="del" aria-label="Retirer '+esc(m ? m.nom : "cette ligne")+'">✕</button>'+
        '</div>'
      );
      row.querySelector('[data-role=qte]').title = m ? ("en " + m.unite) : "";
      if (m) row.querySelector('[data-role=pick]').setAttribute("title", m.nom + " — " + eurU(pu(m), m.unite));
      rowsBox.appendChild(row);
    });
    if (!d.lignes.length) rowsBox.appendChild(el('<p class="hint" style="margin:0">Aucune matière. Ajoute au moins ton fil.</p>'));
    peindre();
  }

  /* ---------- écouteurs ---------- */
  addRow.addEventListener("click", function(){
    ouvrirPicker(function(mid){
      var m = matiere(mid);
      d.lignes.push({mid:mid, qte:(m && m.unite === "g") ? 50 : 1});
      redessinerLignes();
    });
  });
  rowsBox.addEventListener("input", function(e){
    var row = e.target.closest(".matrow"); if (!row) return;
    if (e.target.getAttribute("data-role") !== "qte") return;
    d.lignes[Number(row.getAttribute("data-idx"))].qte = Math.max(0, Number(e.target.value)||0);
    peindre();
  });
  rowsBox.addEventListener("click", function(e){
    var role = e.target.getAttribute("data-role");
    var row = e.target.closest(".matrow"); if (!row) return;
    var i = Number(row.getAttribute("data-idx"));
    if (role === "del"){ d.lignes.splice(i,1); redessinerLignes(); return; }
    if (role === "pick"){
      ouvrirPicker(function(mid){ d.lignes[i].mid = mid; redessinerLignes(); });
    }
  });
  selModele.addEventListener("change", function(){
    var m = modele(selModele.value);
    d.modele = m[0];
    d.lignes = mLignes(m);
    d.temps  = mTemps(m);
    if (!d.nom && m[0] !== "vide"){ d.nom = mNom(m); inNom.value = d.nom; }
    POSTES.forEach(function(p){ tempsBox.querySelector('[data-poste="'+p.k+'"]').value = d.temps[p.k]; });
    redessinerLignes();
  });
  inNom.addEventListener("input", function(e){ d.nom = e.target.value; });

  /* Mon patron : relier la fiche à un de ses propres patrons, sans avoir à
     passer par l'onglet Mes patrons. Plusieurs créations peuvent partager le
     même patron (le même bonnet en deux coloris). */
  var selPatron = cId.querySelector("#f-patron");
  var aidePatron = cId.querySelector("#f-patron-aide");
  function remplirSelPatron(){
    selPatron.innerHTML = "";
    var o0 = document.createElement("option");
    o0.value = ""; o0.textContent = "Aucun patron"; selPatron.appendChild(o0);
    patrons().forEach(function(pp){
      var o = document.createElement("option");
      o.value = pp.id;
      o.textContent = (pp.titre || "Patron sans titre") + (pp.auteur ? " · " + pp.auteur : "");
      selPatron.appendChild(o);
    });
    var oN = document.createElement("option");
    oN.value = "__nouveau"; oN.textContent = "+ Ajouter un patron (fichier ou texte)…";
    selPatron.appendChild(oN);
    if (bibliothequePartagee){
      var oB = document.createElement("option");
      oB.value = "__biblio"; oB.textContent = "Choisir dans la bibliothèque partagée…";
      selPatron.appendChild(oB);
    }
    selPatron.value = (d.patron && patronPerso(d.patron)) ? d.patron : "";
    aidePatron.textContent = (patrons().length
      ? "Le patron s'affichera dans cette fiche, avec son compteur de rangs."
      : "Tu n'as pas encore de patron à toi. Choisis « Ajouter un nouveau patron » pour en créer un : il sera relié à cette fiche.") +
      (bibliothequePartagee ? " Un patron de la bibliothèque partagée est d'abord copié dans tes patrons (privés), puis relié." : "");
  }
  remplirSelPatron();
  /* Ajouter un patron sans quitter la fiche : fenêtre « choisir, vérifier,
     valider », puis le patron est relié à cette fiche. */
  function ajouterPatronFiche(fichiers){
    dialoguePatronAjout({fichiers: fichiers, titre: "Ajouter un patron à « " + (d.nom || "cette création") + " »",
      texte: "Il sera rangé dans « Mes patrons » et relié à cette fiche.", bouton: "Ajouter et relier à la fiche",
      siAjoute: function(np){
        d.patron = np.id; remplirSelPatron(); peindrePatronFiche();
        toast("Patron « " + np.titre + " » ajouté et relié. Enregistre la fiche pour garder ce lien.");
      }});
    selPatron.value = (d.patron && patronPerso(d.patron)) ? d.patron : "";
  }
  var inFicPatron = cId.querySelector("#f-patron-fichier");
  cId.querySelector("#f-patron-charger").addEventListener("click", function(){ inFicPatron.click(); });
  inFicPatron.addEventListener("change", function(){
    var fs = [].slice.call(inFicPatron.files || []); inFicPatron.value = "";
    if (fs.length) ajouterPatronFiche(fs);
  });
  selPatron.addEventListener("change", function(){
    /* Un patron de la bibliothèque partagée est d'abord COPIÉ dans « Mes
       patrons » (privés), puis relié à la fiche : la fiche ne dépend pas d'un
       patron que son autrice peut retirer. */
    if (selPatron.value === "__biblio"){
      view.lierPatronFiche = true; view.sousPatrons = "biblio"; view.biblioVu = null;
      aller("patrons", {garderVue:true});
      return;
    }
    if (selPatron.value === "__nouveau"){
      ajouterPatronFiche(null);
      return;
    }
    d.patron = selPatron.value || null;
    peindrePatronFiche();
    toast(d.patron ? "Patron relié. Enregistre la fiche pour conserver ce lien." : "Patron retiré. Enregistre la fiche pour valider.");
  });
  tempsBox.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-poste"); if (!k) return;
    d.temps[k] = Math.max(0, Number(e.target.value)||0);
    peindre();
  });
  selCanal.addEventListener("change", function(){ d.canal = selCanal.value; peindre(); });
  inExpe.addEventListener("input", function(e){ d.expedition = Math.max(0, Number(e.target.value)||0); peindre(); });
  inPrix.addEventListener("input", function(e){
    d.prix = Math.max(0, Number(e.target.value)||0);
    if (slider) slider.value = d.prix;
    peindre(true);
  });
  if (slider) slider.addEventListener("input", function(e){
    d.prix = Number(e.target.value)||0;
    inPrix.value = d.prix;
    peindre(true);
  });
  inN.addEventListener("input", peindreAchat);
  selStock.addEventListener("change", peindreAchat);

  bSave.addEventListener("click", function(){
    /* La création a été modifiée ailleurs (autre appareil, autre onglet)
       depuis l'ouverture de cette fiche : on le dit avant d'écraser. */
    var srcS = creation(d.id);
    if (srcS && view.draftRef && view.ficheId === d.id && empreinteFiche(srcS) !== view.draftRef && !d._forcer){
      confirmer({titre:"Cette création a changé ailleurs",
        texte:"Depuis que tu as ouvert cette fiche, « " + (srcS.nom || "cette création") + " » a été modifiée sur un autre appareil ou dans un autre onglet. "+
              "Enregistrer ta version remplacera l'autre. Pour garder l'autre, touche « Fermer » sans enregistrer.",
        bouton:"Enregistrer ma version", annuler:"Revenir à la fiche"}, function(){ d._forcer = true; bSave.click(); });
      return;
    }
    delete d._forcer;
    if (!d.nom.trim()) d.nom = "Création sans nom";
    d.maj = Date.now(); if (!d.cree) d.cree = d.maj;
    /* On enregistre selon l'identité du brouillon lui-même : c'est elle qui
       dit quelle création on modifie, quel que soit le chemin pris pour
       revenir sur la fiche. */
    var trouve = false;
    for (var i=0;i<state.creations.length;i++){
      if (state.creations[i].id === d.id){ state.creations[i] = clone(d); trouve = true; }
    }
    if (!trouve) state.creations.push(clone(d));
    toast(trouve ? "Modifications enregistrées" : "Création ajoutée");
    sauverTout();
    oublierBrouillon();
    modifie = false;
    retourParent(function(){ view.draft = null; view.ficheId = null; view.draftRef = null; view.tab = "creations"; });
  });

  if (cProd){
    cProd.querySelector("#p-add").addEventListener("click", function(){
      var reel = creation(view.ficheId);
      if (!reel){ toast("Enregistre d'abord la fiche."); return; }
      /* Les pièces se fabriquent d'après la fiche ENREGISTRÉE : si elle a été
         modifiée, on demande d'enregistrer d'abord, plutôt que de recopier
         une partie des changements sans le dire. */
      if (ficheModifiee()){ toast("Enregistre d'abord les modifications de la fiche, puis ajoute les pièces."); return; }
      var n = Math.max(1, Number(cProd.querySelector("#p-n").value)||1);
      ajouterPieces(reel.id, n, cProd.querySelector("#p-prod").value,
                    cProd.querySelector("#p-com").value, cProd.querySelector("#p-client").value);
      sauverTout();
      toast(n + " pièce" + (n>1?"s ajoutées":" ajoutée") + " au suivi");
      render();
    });
    cProd.querySelector("#p-seuil").addEventListener("input", function(e){
      d.seuilFini = Number(e.target.value)||0;
      var reel = creation(view.ficheId);
      if (reel){ reel.seuilFini = d.seuilFini; sauver(); }
    });
  }

  /* ---------- peinture ---------- */
  var maxSliderVu = 0;
  var modifie = false;
  function marquerModifie(){
    if (modifie) return;
    modifie = true;
    var el2 = document.getElementById("f-dirty");
    if (el2) el2.hidden = false;
  }
  wrap.addEventListener("input", marquerModifie);
  wrap.addEventListener("change", marquerModifie);
  wrap.addEventListener("input", garderBrouillon);
  wrap.addEventListener("change", garderBrouillon);

  function peindreAchat(){
    var n = Math.max(1, Number(inN.value)||1);
    var tenir = selStock.value === "1";
    var b = besoinAchat(d, n, tenir);
    achatBody.innerHTML = "";
    if (!b.lignes.length){
      achatBody.appendChild(el('<tr><td colspan="7" class="hint">Ajoute des matières pour voir ce qu\'il faut acheter.</td></tr>'));
    }
    b.lignes.forEach(function(l){
      var m = matiere(l.mid);
      var mo = m && l.cond > 0 ? meilleureOffre(m) : null;
      achatBody.appendChild(el(
        '<tr>'+
          '<td>'+esc(l.nom)+(mo ? '<div class="hint" style="margin:2px 0 0;font-size:11px">le moins cher : '+esc(fournisseur(mo.fid).nom)+', '+esc(eur(mo.prix))+' le lot de '+esc(qte(contenanceOffre(mo, m), m.unite))+'</div>' : '')+'</td>'+
          '<td class="n">'+esc(qte(l.besoin, l.unite))+'</td>'+
          '<td class="n">'+esc(qte(l.dispo, l.unite))+'</td>'+
          '<td class="n">'+(l.cond > 0 ? (l.cond + ' × ' + qte(l.conditionnement, l.unite)) : '—')+'</td>'+
          '<td class="n">'+(l.cond > 0 ? esc(eur(l.coutAchat)) : '—')+'</td>'+
          '<td class="n">'+esc(eur(l.coutConso))+'</td>'+
          '<td class="n" style="color:'+(l.apres < 0 ? 'var(--bad)' : 'var(--muted)')+'">'+esc(qte(l.apres, l.unite))+'</td>'+
        '</tr>'
      ));
    });
    var ecart = b.investi - b.consomme;
    achatTot.innerHTML =
      '<div class="tiles" style="margin:0">'+
        '<div class="tile"><div class="k">À dépenser aujourd\'hui</div><div class="v">'+esc(eur(b.investi))+'</div>'+
          '<div class="s">achat en conditionnements entiers</div></div>'+
        '<div class="tile"><div class="k">Utilisé pour '+esc(pluriel(b.n, "pièce"))+'</div><div class="v">'+esc(eur(b.consomme))+'</div>'+
          '<div class="s">le vrai coût des matières</div></div>'+
        '<div class="tile"><div class="k">Reste en stock après</div><div class="v good">'+esc(eur(b.resteValeur))+'</div>'+
          '<div class="s">du stock, pas une perte</div></div>'+
      '</div>'+
      '<p class="hint" style="margin-top:12px;max-width:74ch">'+
        (ecart > 0.5
          ? 'Tu dépenses <b>'+esc(eur(b.investi))+'</b> aujourd\'hui, mais '+(b.n > 1 ? 'ces '+b.n+' pièces n\'en utilisent' : 'cette pièce n\'en utilise')+' que <b>'+esc(eur(b.consomme))+'</b>. '+
            'L\'écart de '+esc(eur(ecart))+' reste chez toi sous forme de matière : ne le compte pas dans le prix de ces pièces-là.'
          : 'Tes achats correspondent presque exactement à ce que tu consommes.')+
      '</p>';
  }

  function peindre(depuisPrix){
    var r = calculer(d);

    var rows = rowsBox.querySelectorAll(".matrow");
    for (var i=0;i<rows.length;i++){
      var idx = Number(rows[i].getAttribute("data-idx"));
      var l = d.lignes[idx];
      var m = l ? matiere(l.mid) : null;
      rows[i].querySelector('[data-role=cost]').textContent = eur(m ? pu(m)*(Number(l.qte)||0) : 0);
    }

    totTemps.textContent = dureeTexte(r.minutes);

    var cn = canal(d.canal), f = fraisCanal(cn);
    var bits = [];
    if (cn.annonce) bits.push(eur(cn.annonce)+" de mise en vente");
    if (cn.comm) bits.push(pct(cn.comm)+" de commission");
    if (cn.paiePct || cn.paieFixe) bits.push("paiement "+pct(cn.paiePct||0)+(cn.paieFixe?" + "+eur(cn.paieFixe):""));
    if (cn.offPct && cn.offPart) bits.push("publicité externe "+pct(cn.offPct)+" sur "+pct(cn.offPart)+" des ventes");
    if (cn.tva) bits.push("TVA "+cn.tva+" % sur ces frais");
    noteCanal.innerHTML = (bits.length ? esc(bits.join(" · ")) + ' <span class="hint">(valeurs par défaut : vérifie-les sur le site de ta plateforme)</span>' : "Aucun frais prélevé sur la vente.") +
      (cn.note ? '<br><span style="opacity:.85">'+esc(cn.note)+'</span>' : '') +
      (f.pct ? '<br>Prélèvement total : <b>'+esc(pct(f.pct))+'</b> du prix + '+esc(eur(f.fixe))+' par vente.' : '');

    var borne = Math.max(40, Math.ceil((r.prixObjectif*1.6)/10)*10, Math.ceil(r.prix*1.4));
    if (slider){
      if (!depuisPrix || borne > maxSliderVu){ maxSliderVu = borne; slider.max = borne; }
      if (!depuisPrix) slider.value = d.prix;
    }

    var st = verdictCalcul(r);
    var bfT = document.getElementById("bf-t"), bfG = document.getElementById("bf-g");
    if (loisir){
      var matL = cts(r.consommable + r.perte + r.emballage);
      if (bfT && bfG){ bfT.textContent = eur(matL) + " de matières"; bfG.textContent = dureeTexte(r.minutes); bfG.style.color = ""; }
      var gL = res.querySelector("#r-gain"); gL.textContent = eur(matL); gL.style.color = "";
      res.querySelector("#r-after").textContent = r.minutes > 0 ? "et " + dureeTexte(r.minutes) + " de travail, sans compter ton temps en euros." : "";
      res.querySelector("#r-vrai").hidden = true;
      res.querySelector("#r-mat").textContent   = eur(r.consommable);
      res.querySelector("#r-perte").textContent = eur(r.perte);
      res.querySelector("#r-emb").textContent   = eur(r.emballage);
      res.querySelector("#r-reste").textContent = eur(matL); res.querySelector("#r-reste").style.color = "";
      res.querySelector("#r-duree").textContent = dureeTexte(r.minutes);
      var levL = res.querySelector("#r-leviers"); if (levL) levL.hidden = true;
      peindreAchat();
      return;
    }
    if (bfT && bfG){
      bfT.textContent = r.prix > 0 ? "À " + eur(r.prix) + " : " + st.t : "Indique ton prix de vente";
      bfG.textContent = r.prix > 0 && r.heures > 0 ? eur(r.gainHoraire) + " / h" : "—";
      bfG.style.color = st.k === "good" ? "var(--good)" : st.k === "warn" ? "var(--warn)" : st.k === "bad" ? "var(--bad)" : "";
    }
    var gainEl = res.querySelector("#r-gain");
    gainEl.textContent = r.heures > 0 && r.prix > 0 ? eur(r.gainHoraire) : "—";
    gainEl.style.color = st.k === "good" ? "var(--good)" : st.k === "warn" ? "var(--warn)" : st.k === "bad" ? "var(--bad)" : "";
    res.querySelector("#r-lead").textContent = r.prix > 0
      ? ("À " + eur(r.prix) + ", selon ton estimation de temps")
      : "Indique ton prix de vente";
    var chip = res.querySelector("#r-chip");
    chip.textContent = st.t; chip.className = "chip " + st.k;
    var vrai = res.querySelector("#r-vrai"), doute = invraisemblance(r);
    vrai.hidden = !doute; vrai.textContent = doute;
    res.querySelector("#r-after").textContent = r.heures > 0
      ? "soit " + eur(r.reste) + " pour " + dureeTexte(r.minutes) + " de travail, avant impôt sur le revenu." : "";

    res.querySelector("#r-prix").textContent  = eur(r.prix);
    res.querySelector("#r-mat").textContent   = "− " + eur(r.consommable);
    res.querySelector("#r-perte").textContent = "− " + eur(r.perte);
    res.querySelector("#r-emb").textContent   = "− " + eur(r.emballage);
    res.querySelector("#r-frais").textContent = "− " + eur(r.fraisVar + r.fraisFixesVente);
    res.querySelector("#r-cotis").textContent = "− " + eur(r.cotisations);
    res.querySelector("#r-fixe").textContent  = "− " + eur(r.fixePiece);
    var resteEl = res.querySelector("#r-reste");
    resteEl.textContent = eur(r.reste);
    resteEl.style.color = r.reste < 0 ? "var(--bad)" : "";
    res.querySelector("#r-duree").textContent = dureeTexte(r.minutes) + " de travail" +
      (r.minutesIndirectes > 0 ? " + " + dureeTexte(Math.round(r.minutesIndirectes)) + " hors crochet" : "");

    var obj = Number(state.reglages.tauxHoraire)||0;
    if (!r.impossible){
      res.querySelector("#r-obj").innerHTML =
        "<b>Prix conseillé : " + esc(eur(r.prixObjectif)) + "</b>. C'est le prix qui te paie <b>" + esc(eur(obj)) + "</b> de l'heure, ton objectif.";
      res.querySelector("#r-plancher").textContent =
        "En dessous de " + eur(r.prixPlancher) + ", tu paies pour travailler : le prix ne couvre même pas les matières et les frais.";
    } else {
      /* Frais du canal + cotisations ≥ 100 % : aucun prix ne couvre les coûts. */
      res.querySelector("#r-obj").innerHTML =
        "<b>Aucun prix ne peut couvrir tes coûts sur ce canal</b> : ses frais et tes cotisations prennent tout le prix de vente.";
      res.querySelector("#r-plancher").textContent =
        "Vérifie les frais de ce canal dans Réglages › Canaux de vente, et ton taux de cotisations.";
    }

    var lev = res.querySelector("#r-leviers");
    if (r.prix > 0 && r.minutes > 40){
      var a = clone(d); a.prix = r.prix + 5;
      var b2 = clone(d); b2.temps.crochet = Math.max(0, (Number(b2.temps.crochet)||0) - 30);
      var ga = calculer(a), gb = calculer(b2);
      lev.innerHTML = "Tes deux leviers : <b>+ 5 €</b> sur le prix → " + esc(eur(ga.gainHoraire)) +
        " / h. <b>30 min</b> de crochet en moins → " + esc(eur(gb.heures>0?gb.gainHoraire:0)) + " / h.";
      lev.hidden = false;
    } else lev.hidden = true;

    peindreMarges(res.querySelector("#r-marges"), r);
    peindreAchat();
  }

  redessinerLignes();
}

/* Les chiffres des calculateurs de marge (Bpifrance, BGE, experts-comptables),
   traduits pour une créatrice : coût de revient complet, marge au-delà de
   ton salaire horaire, taux de marge (sur le coût), taux de marque (sur le
   prix), coefficient sur les matières, et nombre de pièces par mois qui
   paient tes frais fixes. */
function peindreMarges(z, r){
  if (!z) return;
  if (!(r.prix > 0) || r.impossible){ z.hidden = true; return; }
  z.hidden = false;
  var cr = r.coutRevient, marge = cts(r.prix - cr);
  var tMarge = cr > 0 ? marge / cr : 0, tMarque = r.prix > 0 ? marge / r.prix : 0;
  var coef = r.matieres > 0 ? r.prix / r.matieres : 0;
  var fixes = Number(state.reglages.fraisFixes) || 0;
  var contrib = cts(r.prix - r.matieres - r.fraisVar - r.fraisFixesVente - r.cotisations);
  var h = '<p style="margin:0 0 6px"><b>Tes marges à ' + esc(eur(r.prix)) + '</b></p><dl class="marges-dl">'+
    '<dt>Coût de revient complet</dt><dd>' + esc(eur(cr)) + '</dd>'+
    '<dd class="expl">matières, frais, cotisations et ton temps payé ' + esc(eur(Number(state.reglages.tauxHoraire)||0)) + ' de l\'heure</dd>'+
    '<dt>Marge en plus de ton salaire</dt><dd style="color:' + (marge < 0 ? 'var(--bad)' : 'inherit') + '">' + esc(eur(marge)) + '</dd>'+
    '<dd class="expl">' + (marge >= 0 ? 'ce qui reste une fois ton heure payée à ton objectif : de quoi investir, ou absorber un imprévu'
                                     : 'ton prix ne paie pas ton heure à ton objectif') + '</dd>'+
    '<dt>Taux de marge</dt><dd>' + esc(nb(Math.round(tMarge * 1000) / 10)) + ' %</dd>'+
    '<dd class="expl">la marge rapportée à ton coût de revient</dd>'+
    '<dt>Taux de marque</dt><dd>' + esc(nb(Math.round(tMarque * 1000) / 10)) + ' %</dd>'+
    '<dd class="expl">la marge rapportée au prix : sur 100 € encaissés, ' + esc(eur(Math.max(0, tMarque * 100))) + ' de marge</dd>'+
    (coef ? '<dt>Coefficient sur les matières</dt><dd>× ' + esc(nb(Math.round(coef * 10) / 10)) + '</dd>'+
      '<dd class="expl">ton prix divisé par le coût des matières' +
        (3 * r.matieres < r.prixObjectif - 0.005 ? '. La règle « matières × 3 » donnerait ' + esc(eur(3 * r.matieres)) + ', soit ' +
          esc(eur(r.prixObjectif - 3 * r.matieres)) + ' de moins que ton prix conseillé : elle oublie ton temps.' : '') + '</dd>' : '')+
    (fixes > 0 && contrib > 0 ? '<dt>Pour payer tes frais fixes</dt><dd>' + esc(pluriel(Math.ceil(fixes / contrib - 1e-9), "pièce", "pièces")) + ' / mois</dd>'+
      '<dd class="expl">à ce prix, pour couvrir ' + esc(eur(fixes)) + ' de frais fixes par mois (avant de te payer)</dd>' : '')+
    '</dl>';
  z.innerHTML = h;
}

/* ═════ 11. STOCK ═════ */

function renderStock(main){
  main.appendChild(enTete("Matières",
    "Le catalogue de référence, tes propres matières avec tes prix, et l'état de ton stock."));
  var seg = el('<div class="seg" style="margin-bottom:20px;flex-wrap:wrap">'+
    '<button type="button" data-s="catalogue">Catalogue des matières</button>'+
    '<button type="button" data-s="matieres">Mes matières</button>'+
    '<button type="button" data-s="stock">Historique du stock</button>'+
    '<button type="button" data-s="fournisseurs">Fournisseurs et prix</button></div>');
  seg.querySelectorAll("button").forEach(function(b){
    b.setAttribute("aria-pressed", view.sub === b.getAttribute("data-s") ? "true" : "false");
    b.addEventListener("click", function(){ view.sub = b.getAttribute("data-s"); render(); });
  });
  main.appendChild(seg);
  if (view.sub === "stock" || view.sub === "fournisseurs") main.appendChild(tuilesMatieres());
  if (view.sub === "fournisseurs") renderFournisseurs(main);
  else if (view.sub === "stock") renderStockMatieres(main);
  else if (view.sub === "catalogue") renderCatalogueMatieres(main);
  else renderMesMatieres(main);
}

/* Les matières en un coup d'œil : ce que vaut le stock, combien de pelotes,
   ce que les pertes ont coûté, ce que les fournisseurs permettraient
   d'économiser. */
function economiePossible(depuis){
  var e = 0;
  state.matieres.forEach(function(m){
    var b = meilleureOffre(m); if (!b) return;
    var puB = puOffre(b, m);
    (m.mouv || []).forEach(function(mv){
      if (mv.t !== "entree" || mv.annule || mv.est || mv.d < depuis || !(Number(mv.q) > 0)) return;
      var puPaye = (Number(mv.p) || 0) / mv.q;
      if (puPaye > puB) e += (puPaye - puB) * mv.q;
    });
  });
  return cts(e);
}
function tuilesMatieres(){
  var alertes = alertesStock();
  var an = Date.now() - 365 * 864e5;
  var pertes = pertesEntre(an, Date.now() + 1);
  var eco = economiePossible(an);
  var pel = pelotesEnStock();
  var tiles = el('<div class="tiles"></div>');
  tiles.appendChild(el('<div class="tile"><div class="k">Valeur du stock</div><div class="v">'+esc(eur(valeurStockMatieres()))+'</div><div class="s">au prix moyen de tes achats</div></div>'));
  tiles.appendChild(el('<div class="tile"><div class="k">Pelotes en stock</div><div class="v">'+(pel ? esc(nb(Math.round(pel * 10) / 10)) : '0')+'</div><div class="s">fils et laines, en lots entiers ou entamés</div></div>'));
  tiles.appendChild(el('<div class="tile acc '+(pertes.total > 0 ? "acc-warn" : "")+'"><div class="k">Pertes sur 12 mois</div><div class="v'+(pertes.total > 0 ? ' warn' : '')+'">'+esc(eur(pertes.total))+'</div>'+
    '<div class="s">'+(pertes.total > 0 ? esc((pertes.pelotes ? nb(Math.round(pertes.pelotes * 10) / 10) + " pelote" + (pertes.pelotes >= 2 ? "s" : "") + " jetée" + (pertes.pelotes >= 2 ? "s" : "") : "matière jetée") + (pertes.nbPieces ? " · " + pluriel(pertes.nbPieces, "pièce ratée", "pièces ratées") : "")) : 'rien de jeté noté')+'</div></div>'));
  tiles.appendChild(el('<div class="tile acc '+(alertes.length?"acc-warn":"")+'"><div class="k">À racheter</div>'+
    '<div class="v '+(alertes.length?"warn":"")+'">'+alertes.length+'</div><div class="s">'+(alertes.length ? 'sous ton seuil d\'alerte' : 'rien sous ton seuil')+'</div></div>'));
  if (fournisseurs().length) tiles.appendChild(el('<div class="tile"><div class="k">Économie possible</div><div class="v'+(eco > 0 ? ' good' : '')+'">'+esc(eur(eco))+'</div>'+
    '<div class="s">sur tes achats des 12 derniers mois, au prix le plus bas connu</div></div>'));
  return tiles;
}

function renderFournisseurs(main){
  /* --- la liste des fournisseurs --- */
  var cL = el('<div class="card" style="margin-bottom:20px"><header><h2>Tes fournisseurs</h2>'+
    '<p>Là où tu achètes : merceries, sites, marchés, grossistes. Note leurs prix une fois, Crochompte les compare pour toi.</p></header>'+
    '<div class="body"><div class="fourn-liste"></div><div class="savebar" style="margin-top:12px"></div></div></div>');
  var liste = cL.querySelector(".fourn-liste");
  function editer(f){
    dialogueChamps({titre: f ? "Modifier « " + f.nom + " »" : "Nouveau fournisseur", bouton: f ? "Enregistrer" : "Ajouter",
      champs:[{id:"nom", lib:"Nom", requis:true, max:60, valeur: f ? f.nom : "", placeholder:"Mercerie du centre, Wool Shop…"},
              {id:"site", lib:"Site internet ou adresse (facultatif)", max:200, valeur: f ? f.site : "", placeholder:"www.exemple.fr ou 12 rue des Lilas"},
              {id:"note", lib:"Note (facultatif)", max:200, valeur: f ? f.note : "", placeholder:"livraison offerte dès 49 €, délai 3 jours…"}]}, function(v){
      if (!f) f = nouveauFournisseur(v.nom);
      f.nom = v.nom; f.site = v.site; f.note = v.note;
      sauverTout(); render(); toast("Fournisseur « " + f.nom + " » enregistré.");
    });
  }
  if (!fournisseurs().length){
    liste.appendChild(el('<p class="hint" style="margin:0">Aucun fournisseur pour l\'instant. Ajoute ceux chez qui tu achètes le plus souvent : '+
      'deux ou trois suffisent pour voir des écarts de prix.</p>'));
  } else {
    fournisseurs().slice().sort(function(a, b){ return a.nom.localeCompare(b.nom, "fr"); }).forEach(function(f){
      var nbT = state.matieres.filter(function(m){ var o = offreDe(m, f.id); return o && Number(o.prix) > 0; }).length;
      var nbM = state.matieres.filter(function(m){ var b = meilleureOffre(m); return b && b.fid === f.id; }).length;
      var lien = /^https?:\/\//i.test(f.site) ? f.site : (/^www\./i.test(f.site) ? "https://" + f.site : "");
      var row = el('<div class="fourn-ligne"><div><b>'+esc(f.nom || "Sans nom")+'</b>'+
        '<div class="hint" style="margin:2px 0 0">'+esc(pluriel(nbT, "prix noté", "prix notés"))+
        (nbM ? ' · le moins cher pour '+esc(pluriel(nbM, "matière", "matières")) : '')+
        (f.site ? ' · '+(lien ? '<a href="'+esc(lien)+'" target="_blank" rel="noopener noreferrer">'+esc(f.site)+'</a>' : esc(f.site)) : '')+
        (f.note ? ' · '+esc(f.note) : '')+'</div></div><div class="fourn-act"></div></div>');
      var act = row.querySelector(".fourn-act");
      var bM = bouton("Modifier", function(){ editer(f); }); bM.classList.add("sm"); bM.setAttribute("aria-label", "Modifier le fournisseur " + f.nom);
      var bS = bouton("Supprimer", function(){
        var nbAch = 0; state.matieres.forEach(function(m){ (m.mouv||[]).forEach(function(mv){ if (mv.f === f.id) nbAch++; }); });
        confirmer({titre:"Supprimer « " + f.nom + " » ?",
          texte: "Ses " + pluriel(nbT, "prix noté sera retiré", "prix notés seront retirés") + " de la comparaison." +
                 (nbAch ? " Tes " + pluriel(nbAch, "achat noté chez lui reste", "achats notés chez lui restent") + " dans le journal, sans son nom." : ""),
          bouton:"Supprimer", danger:true}, function(){
          state.matieres.forEach(function(m){ m.offres = offresDe(m).filter(function(o){ return o.fid !== f.id; }); if (m.fournisseur === f.id) m.fournisseur = null; });
          state.fournisseurs = fournisseurs().filter(function(x){ return x.id !== f.id; });
          sauverTout(); render(); toast("Fournisseur supprimé.");
        });
      });
      bS.classList.add("sm", "ghost", "danger-texte"); bS.setAttribute("aria-label", "Supprimer le fournisseur " + f.nom);
      act.appendChild(bM); act.appendChild(bS);
      liste.appendChild(row);
    });
  }
  cL.querySelector(".savebar").appendChild(bouton("+ Ajouter un fournisseur", function(){ editer(null); }, true));
  main.appendChild(cL);

  if (!fournisseurs().length) return;

  /* --- la comparaison --- */
  var cC = el('<div class="card"><header><h2>Comparer les prix</h2>'+
    '<p>Tape le prix d\'un lot chez chaque fournisseur. Les lots n\'ont pas toujours la même taille : la comparaison se fait au gramme (ou au mètre, à la pièce). '+
    'Le moins cher est en vert. Un achat noté dans « Historique du stock » met le prix à jour tout seul.</p></header>'+
    '<div class="body"><div class="grid2" style="margin-bottom:12px">'+
      '<label class="f"><span>Catégorie</span><select id="fc-cat"><option value="">Toutes</option></select></label>'+
      '<label class="f"><span>Matières affichées</span><select id="fc-quoi"><option value="utiles">Celles de mes créations ou de mon stock</option><option value="toutes">Toutes</option><option value="prix">Celles qui ont au moins un prix noté</option></select></label>'+
    '</div><div class="tablewrap fourn-comp"></div></div></div>');
  var selCat = cC.querySelector("#fc-cat"), selQ = cC.querySelector("#fc-quoi");
  CATS.forEach(function(c){ selCat.appendChild(el('<option value="'+c.id+'">'+esc(c.nom)+'</option>')); });
  selCat.value = view.fcCat || ""; selQ.value = view.fcQuoi || "utiles";
  var zone = cC.querySelector(".fourn-comp");
  var fs = fournisseurs().slice().sort(function(a, b){ return a.nom.localeCompare(b.nom, "fr"); });
  function utilisees(){
    var u = {};
    state.creations.forEach(function(c){ if (!c.archive) c.lignes.forEach(function(l){ u[l.mid] = true; }); });
    state.matieres.forEach(function(m){ if ((Number(m.stock)||0) > 0 || (m.mouv||[]).length) u[m.id] = true; });
    return u;
  }
  function peindre(){
    zone.innerHTML = "";
    var u = utilisees();
    var ms = state.matieres.filter(function(m){
      if (selCat.value && m.cat !== selCat.value) return false;
      if (selQ.value === "utiles") return !!u[m.id] || offresDe(m).some(function(o){ return o.prix > 0; });
      if (selQ.value === "prix") return offresDe(m).some(function(o){ return o.prix > 0 && fournisseur(o.fid); });
      return true;
    });
    if (!ms.length){ zone.appendChild(el('<p class="hint" style="margin:0">Aucune matière à afficher avec ces choix. Choisis « Toutes » pour voir tout le catalogue.</p>')); return; }
    var t = el('<table style="min-width:'+(420 + fs.length * 150)+'px"><thead><tr><th>Matière</th><th class="n">Ton dernier prix</th>'+
      fs.map(function(f){ return '<th class="n">'+esc(f.nom)+'</th>'; }).join("")+'<th>Le moins cher</th></tr></thead><tbody></tbody></table>');
    var tb = t.querySelector("tbody");
    ms.forEach(function(m){
      var best = meilleureOffre(m);
      var dernierPU = m.contenance ? (Number(m.prix)||0) / m.contenance : 0;
      var tr = el('<tr data-mid="'+esc(m.id)+'"><td><b>'+esc(m.nom)+'</b><div class="hint" style="margin:2px 0 0;font-size:11px">lot de '+esc(qte(m.contenance, m.unite))+'</div></td>'+
        '<td class="n" data-l="Ton dernier prix">'+esc(eur(m.prix))+'<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(eurU(dernierPU, m.unite))+'</div></td></tr>');
      fs.forEach(function(f){
        var o = offreDe(m, f.id);
        var moins = best && o && best === o;
        var td = el('<td class="n fourn-cell'+(moins ? ' moins-cher' : '')+'" data-l="'+esc(f.nom)+'">'+
          '<input type="number" inputmode="decimal" min="0" step="0.05" data-fid="'+esc(f.id)+'" aria-label="Prix d\'un lot de '+esc(m.nom)+' chez '+esc(f.nom)+'" '+
          'placeholder="€" value="'+(o && o.prix > 0 ? o.prix : "")+'" style="width:84px;text-align:right">'+
          '<div class="hint" style="margin:2px 0 0;font-size:11px"></div></td>');
        var info = td.querySelector(".hint");
        function majInfo(){
          var o2 = offreDe(m, f.id);
          info.innerHTML = "";
          if (!(o2 && o2.prix > 0)){ info.textContent = ""; return; }
          var bLot = el('<button type="button" class="lien-mini">lot '+esc(qte(contenanceOffre(o2, m), m.unite))+'</button>');
          bLot.setAttribute("aria-label", "Taille du lot et lien chez " + f.nom);
          bLot.addEventListener("click", function(){
            dialogueChamps({titre: m.nom + " chez " + f.nom, bouton:"Enregistrer",
              texte:"Si ce fournisseur vend un autre conditionnement (100 g au lieu de 50 g, par exemple), indique-le : la comparaison se fait au " + (m.unite || "gramme") + ".",
              champs:[{id:"cont", lib:"Contenance du lot (" + m.unite + ")", valeur: contenanceOffre(o2, m), inputmode:"decimal", requis:true},
                      {id:"lien", lib:"Lien vers le produit (facultatif)", valeur: o2.lien || "", placeholder:"https://…"}],
              verifier: function(v){ return lireNombre(v.cont) > 0 ? "" : "Indique une contenance supérieure à 0."; }}, function(v){
              o2.contenance = lireNombre(v.cont); o2.lien = v.lien; sauverTout(); peindre();
            });
          });
          info.appendChild(document.createTextNode(eurU(puOffre(o2, m), m.unite) + " · "));
          info.appendChild(bLot);
          if (o2.le) info.appendChild(document.createTextNode(" · " + new Date(o2.le).toLocaleDateString("fr-FR")));
          if (o2.lien && /^https?:\/\//i.test(o2.lien)){
            info.appendChild(document.createTextNode(" · "));
            info.appendChild(el('<a href="'+esc(o2.lien)+'" target="_blank" rel="noopener noreferrer">voir</a>'));
          }
        }
        majInfo();
        td.querySelector("input").addEventListener("change", function(e){
          var v = Number(e.target.value) || 0;
          if (v > 0) noterOffre(m, f.id, v, (offreDe(m, f.id) || {}).contenance || m.contenance, "saisie");
          else m.offres = offresDe(m).filter(function(o3){ return o3.fid !== f.id; });
          sauverTout(); peindre();
        });
        tr.appendChild(td);
      });
      var gain = best ? dernierPU - puOffre(best, m) : 0;
      tr.appendChild(el('<td data-l="Le moins cher">'+(best
        ? '<b class="good">'+esc(fournisseur(best.fid).nom)+'</b><div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(eurU(puOffre(best, m), m.unite))+
          (dernierPU > 0 && gain > 0.00001 ? ' · '+esc(nb(Math.round(gain / dernierPU * 100)))+' % de moins que ton dernier prix' : '')+'</div>'
        : '<span class="hint">aucun prix noté</span>')+'</td>'));
      tb.appendChild(tr);
    });
    zone.appendChild(t);
  }
  selCat.addEventListener("change", function(){ view.fcCat = selCat.value; peindre(); });
  selQ.addEventListener("change", function(){ view.fcQuoi = selQ.value; peindre(); });
  peindre();
  main.appendChild(cC);
  main.appendChild(el('<p class="hint" style="margin-top:12px;max-width:78ch">Pour que tes fiches utilisent automatiquement le prix le plus bas, '+
    'choisis « Le prix le plus bas de mes fournisseurs » dans Réglages › Base de calcul des coûts. '+
    'Sinon, elles gardent ton dernier prix payé (ou ton prix moyen) : la comparaison sert alors à décider où acheter.</p>'));
}

function renderStockMatieres(main){
  var alertes = alertesStock();

  if (alertes.length){
    main.appendChild(el('<div class="banner" style="background:var(--warn-soft);border-color:var(--warn)"><p><b>À racheter :</b> '+
      alertes.map(function(m){ var e = etatStock(m);
        return badgeEtat(e, m.nom + " — " + qte(m.stock, m.unite)); }).join(" &nbsp; ")+'</p></div>'));
  }

  /* --- saisie d'un mouvement --- */
  var cM = el('<div class="card" style="margin-bottom:20px"><header><h2>Noter un achat, une perte ou un inventaire</h2>'+
    '<p>Un achat met à jour ton prix moyen, ton dernier prix payé et le tarif du fournisseur. La matière utilisée pour une pièce sort toute seule quand la pièce passe en « Terminée ».</p></header>'+
    '<div class="body"><div class="grid3" style="align-items:end">'+
      '<label class="f"><span>Matière</span><select id="mv-mid"></select></label>'+
      '<label class="f"><span>Ce qui s\'est passé</span><select id="mv-type">'+
        '<option value="entree">Achat (entrée en stock)</option>'+
        '<option value="perte">Perte (jetée, abîmée, ratée)</option>'+
        '<option value="sortie">Utilisée ou donnée, hors pièce suivie</option>'+
        '<option value="inventaire">Inventaire (je compte ce que j\'ai)</option></select></label>'+
      '<label class="f" id="mv-fw"><span>Fournisseur</span><select id="mv-f"></select></label>'+
      '<label class="f" id="mv-mw" hidden><span>Motif de la perte</span><select id="mv-motif"></select></label>'+
      '<label class="f"><span>Quantité</span><input id="mv-q" type="number" min="0" step="1" value="0"></label>'+
      '<label class="f" id="mv-lw"><span id="mv-ll">Ou en nombre de lots</span><input id="mv-lots" type="number" inputmode="decimal" min="0" step="1" value=""></label>'+
      '<label class="f" id="mv-pw"><span>Prix payé au total (€)</span><input id="mv-p" type="number" min="0" step="0.05" value="0"></label>'+
      '<label class="f" id="mv-bw"><span>N° de bain (facultatif)</span><input id="mv-bain" type="text" maxlength="30" placeholder="sur l\'étiquette : lot, bain, dye lot"></label>'+
      '<label class="f"><span>Note (facultatif)</span><input id="mv-n" type="text" placeholder="Commande du 3 mars"></label>'+
    '</div><p class="hint" id="mv-aide"></p></div></div>');
  var selF = cM.querySelector("#mv-f"), selMotif = cM.querySelector("#mv-motif");
  function remplirFournisseurs(){
    selF.innerHTML = "";
    selF.appendChild(el('<option value="">— non précisé —</option>'));
    fournisseurs().slice().sort(function(a, b){ return a.nom.localeCompare(b.nom, "fr"); }).forEach(function(f){
      selF.appendChild(el('<option value="'+esc(f.id)+'">'+esc(f.nom || "Sans nom")+'</option>'));
    });
    selF.appendChild(el('<option value="__nouveau">+ Nouveau fournisseur…</option>'));
  }
  remplirFournisseurs();
  MOTIFS_PERTE.forEach(function(x){ selMotif.appendChild(el('<option value="'+x.k+'">'+esc(x.nom)+'</option>')); });
  selF.addEventListener("change", function(){
    if (selF.value !== "__nouveau") return;
    dialogueChamps({titre:"Nouveau fournisseur", bouton:"Ajouter",
      champs:[{id:"nom", lib:"Nom du fournisseur (magasin, site, marché)", requis:true, max:60, placeholder:"Mercerie du centre, Wool Shop…"}]}, function(v){
      var nom = v.nom;
      var f = nouveauFournisseur(nom); sauverTout();
      remplirFournisseurs(); selF.value = f.id; majAide();
      toast("Fournisseur « " + nom + " » ajouté.");
    });
    selF.value = "";
  });
  var selMid = cM.querySelector("#mv-mid");
  CATS.forEach(function(cat){
    var g = document.createElement("optgroup"); g.label = cat.nom;
    state.matieres.forEach(function(m){
      if (m.cat !== cat.id) return;
      var o = document.createElement("option"); o.value = m.id; o.textContent = m.nom; g.appendChild(o);
    });
    selMid.appendChild(g);
  });
  var selType = cM.querySelector("#mv-type");
  var inQ = cM.querySelector("#mv-q"), inP = cM.querySelector("#mv-p");
  var pw = cM.querySelector("#mv-pw"), aide = cM.querySelector("#mv-aide");
  var lw = cM.querySelector("#mv-lw"), ll = cM.querySelector("#mv-ll"), inL = cM.querySelector("#mv-lots");
  /* On achète des pelotes, pas des grammes : le nombre de lots remplit la
     quantité (lots × contenance). */
  inL.addEventListener("input", function(){
    var m = matiere(selMid.value), n = Number(inL.value)||0;
    if (m && n > 0) inQ.value = String(Math.round(n * (Number(m.contenance)||1) * 1000) / 1000);
  });
  function majAide(){
    var m = matiere(selMid.value);
    pw.hidden = selType.value !== "entree";
    cM.querySelector("#mv-fw").hidden = selType.value !== "entree";
    cM.querySelector("#mv-bw").hidden = selType.value !== "entree" || !m || m.cat !== "fil";
    cM.querySelector("#mv-mw").hidden = selType.value !== "perte";
    /* Le fournisseur habituel est proposé ; le moins cher est rappelé. */
    if (m && selType.value === "entree" && !selF.value && m.fournisseur && fournisseur(m.fournisseur)) selF.value = m.fournisseur;
    lw.hidden = !m || selType.value === "inventaire" || !((Number(m.contenance)||0) > 1);
    if (m) ll.textContent = "Ou en nombre de lots de " + qte(m.contenance, m.unite);
    inL.value = "";
    if (!m){ aide.textContent = ""; return; }
    if (selType.value === "entree"){
      inP.placeholder = (m.prix).toFixed(2);
      aide.innerHTML = "Quantité totale en <b>"+esc(m.unite)+"</b> (un lot = "+esc(qte(m.contenance, m.unite))+
        ", à "+esc(eur(m.prix))+" la dernière fois). Si tu n'as plus le prix, laisse 0 : l'achat sera estimé et signalé comme tel. "+
        "Tu en as <b>"+esc(qte(m.stock, m.unite))+"</b>, à un prix moyen de "+esc(eurU(Number(m.pmp)||0, m.unite))+".";
      var mo = meilleureOffre(m);
      if (mo) aide.innerHTML += " Le moins cher connu : <b>"+esc(fournisseur(mo.fid).nom)+"</b>, "+esc(eur(mo.prix))+" le lot de "+
        esc(qte(contenanceOffre(mo, m), m.unite))+" ("+esc(eurU(puOffre(mo, m), m.unite))+").";
    } else if (selType.value === "inventaire"){
      aide.innerHTML = "Le stock sera <b>remplacé</b> par la quantité saisie, en "+esc(m.unite)+".";
    } else if (selType.value === "perte"){
      aide.innerHTML = "Quantité perdue, en "+esc(m.unite)+" (un lot = "+esc(qte(m.contenance, m.unite))+"). Elle sort du stock et compte dans tes pertes, "+
        "au prix moyen payé ("+esc(eurU(Number(m.pmp)||pu(m), m.unite))+"). Stock actuel : <b>"+esc(qte(m.stock, m.unite))+"</b>.";
    } else {
      aide.innerHTML = "Quantité retirée, en "+esc(m.unite)+". Stock actuel : <b>"+esc(qte(m.stock, m.unite))+"</b>.";
    }
  }
  selMid.addEventListener("change", majAide);
  selType.addEventListener("change", majAide);
  majAide();
  var bMv = el('<button type="button" class="btn primary" style="margin-top:14px">Enregistrer le mouvement</button>');
  bMv.addEventListener("click", function(){
    var m = matiere(selMid.value); if (!m) return;
    var type = selType.value;
    var q = Number(inQ.value)||0;
    if (q <= 0 && type !== "inventaire"){ toast("Indique une quantité supérieure à 0."); inQ.focus(); return; }
    if (q < 0){ toast("Une quantité ne peut pas être négative."); inQ.focus(); return; }
    var p = type === "entree" ? (Number(inP.value)||0) : null;
    if (p !== null && p < 0){ toast("Un prix ne peut pas être négatif."); inP.focus(); return; }
    /* Récapitulatif avant d'enregistrer, et alerte si le prix paraît
       improbable : une erreur de frappe ici fausserait toutes les fiches. */
    var details = [], alerte = "";
    var lot = m.contenance ? qte(m.contenance, m.unite) : "";
    if (type === "entree"){
      details.push(qte(q, m.unite) + " de « " + m.nom + " »");
      if (p > 0){
        var parLot = m.contenance ? p / q * m.contenance : 0;
        details.push("Prix payé : " + eur(p) + (parLot ? ", soit " + eur(parLot) + " le lot de " + lot : ""));
        var ref = m.contenance ? m.prix : 0;
        if (ref > 0 && parLot > 0 && (parLot > ref * 4 || parLot < ref / 4))
          alerte = "Ce prix est très différent de ton prix habituel (" + eur(ref) + " le lot de " + lot + "). Vérifie la quantité et le prix, virgule comprise.";
      } else details.push("Prix non saisi : l'achat sera estimé à " + eur(q * (m.contenance ? m.prix/m.contenance : 0)) + " (prix de la fiche), et signalé comme estimé.");
      if (selF.value && fournisseur(selF.value)) details.push("Chez " + fournisseur(selF.value).nom + " : son tarif sera mis à jour");
    } else if (type === "perte"){
      var lotsP = enLots(m, q);
      details.push("Perte : " + qte(q, m.unite) + (lotsP ? " (" + nb(Math.round(lotsP * 10) / 10) + " lot" + (lotsP >= 2 ? "s" : "") + ")" : "") + " de « " + m.nom + " »");
      details.push("Motif : " + libMotif(selMotif.value));
      details.push("Valeur perdue : environ " + eur(q * (Number(m.pmp) || pu(m))));
      if ((Number(m.stock)||0) - q < 0) alerte = "Le stock deviendra négatif : as-tu oublié de noter un achat ?";
    } else if (type === "sortie"){
      details.push("Retirer " + qte(q, m.unite) + " de « " + m.nom + " »");
      details.push("Stock après : " + qte((Number(m.stock)||0) - q, m.unite));
      if ((Number(m.stock)||0) - q < 0) alerte = "Le stock deviendra négatif : as-tu oublié de noter un achat ?";
    } else {
      details.push("Stock compté : " + qte(q, m.unite) + " (au lieu de " + qte(m.stock, m.unite) + " selon l'outil)");
      var ec = q - (Number(m.stock)||0);
      if (ec) details.push("Écart : " + (ec > 0 ? "+" : "−") + qte(Math.abs(ec), m.unite) + ", soit environ " + eur(Math.abs(ec) * (Number(m.pmp)||pu(m))));
    }
    confirmer({titre: type === "entree" ? "Enregistrer cet achat ?" : type === "perte" ? "Enregistrer cette perte ?" : type === "sortie" ? "Enregistrer cette sortie ?" : "Enregistrer cet inventaire ?",
               texte: alerte || "Vérifie avant d'enregistrer :", details: details,
               bouton: "Enregistrer", annuler: "Corriger"}, function(){
      var extra = {};
      if (type === "entree"){ if (selF.value && fournisseur(selF.value)) extra.fid = selF.value;
                              var bain = cM.querySelector("#mv-bain").value.trim(); if (bain) extra.bain = bain; }
      if (type === "perte") extra.motif = selMotif.value;
      mouvementMatiere(m, type, q, (p && p > 0) ? p : null, cM.querySelector("#mv-n").value, extra);
      sauverTout(); render();
      toast((type === "entree" ? "Achat enregistré : " : type === "perte" ? "Perte enregistrée : " : type === "sortie" ? "Sortie enregistrée : " : "Inventaire enregistré : ") +
            m.nom + ", stock " + qte(m.stock, m.unite) + ".");
    });
  });
  cM.querySelector(".body").appendChild(bMv);
  main.appendChild(cM);

  /* --- inventaire --- */
  var wrap = el('<div class="tablewrap resp"></div>');
  var t = el('<table style="min-width:820px"><thead><tr><th>Matière</th><th class="n">Stock</th><th class="n">Seuil d\'alerte</th>'+
    '<th class="n">Prix moyen</th><th class="n">Dernier prix</th><th class="n">Valeur du stock</th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  var valeurTotale = 0;
  CATS.forEach(function(cat){
    var items = state.matieres.filter(function(m){ return m.cat === cat.id; });
    if (!items.length) return;
    var sousTotal = 0;
    items.forEach(function(m){ sousTotal += Math.max(0,Number(m.stock)||0) * (Number(m.pmp)||0); });
    valeurTotale += sousTotal;
    tb.appendChild(el('<tr class="catrow"><td colspan="5">'+esc(cat.nom)+'</td>'+
      '<td class="n" style="font-weight:600">'+esc(eur(sousTotal))+'</td></tr>'));
    items.forEach(function(m){
      var e = etatStock(m);
      var dernierPU = m.contenance ? m.prix/m.contenance : 0;
      var valeur = Math.max(0,Number(m.stock)||0) * (Number(m.pmp)||0);
      /* Un écart franc entre le prix moyen payé et le dernier prix du marché
         est une information de gestion : c'est là que se cachent les marges
         qu'on croit avoir et qu'on n'a plus. */
      var ecart = (m.pmp > 0 && dernierPU > 0) ? (dernierPU - m.pmp)/m.pmp : 0;
      tb.appendChild(el(
        '<tr data-mid="'+esc(m.id)+'">'+
          '<td>'+esc(m.nom)+'</td>'+
          '<td class="n" data-l="Stock"><div class="lignestock">'+
            badgeEtat(e, e.muet ? "—" : qte(m.stock, m.unite))+jauge(e)+'</div></td>'+
          '<td class="n" data-l="Seuil d\'alerte"><input type="number" inputmode="numeric" min="0" step="1" data-role="seuil" aria-label="Seuil d\'alerte" value="'+(Number(m.seuil)||0)+'" style="width:82px;text-align:right"></td>'+
          '<td class="n" data-l="Prix moyen">'+esc(eurU(Number(m.pmp)||0, m.unite))+'</td>'+
          '<td class="n" data-l="Dernier prix">'+esc(eurU(dernierPU, m.unite))+
            (Math.abs(ecart) >= 0.08
              ? '<div class="hint" style="margin:2px 0 0;font-size:11px;color:'+(ecart>0?'var(--warn)':'var(--good)')+'">'+
                (ecart>0?'+':'−')+nb(Math.abs(ecart)*100)+' % par rapport au prix moyen</div>' : '')+'</td>'+
          '<td class="n" data-l="Valeur du stock">'+esc(eur(valeur))+'</td>'+
        '</tr>'
      ));
    });
  });
  tb.appendChild(el('<tr style="border-top:2px solid var(--rule-strong)">'+
    '<td colspan="5" style="font-weight:700">Valeur totale du stock</td>'+
    '<td class="n" style="font-weight:700">'+esc(eur(valeurTotale))+'</td></tr>'));
  tb.addEventListener("input", function(e){
    if (e.target.getAttribute("data-role") !== "seuil") return;
    var m = matiere(e.target.closest("tr").getAttribute("data-mid"));
    if (m){ m.seuil = Number(e.target.value)||0; sauver(); }
  });
  wrap.appendChild(t);
  main.appendChild(el('<div class="sechead"><h2>Inventaire des matières</h2></div>'));
  main.appendChild(el('<div class="legetat">'+
    '<span class="etat e-ok"><span class="pastille"></span>suffisant</span>'+
    '<span class="etat e-bas"><span class="pastille"></span>sous ton seuil</span>'+
    '<span class="etat e-rupture"><span class="pastille"></span>rupture</span>'+
    '<span class="etat e-libre"><span class="pastille"></span>non suivie</span>'+
    '<span class="legnote">Renseigne un stock ou un seuil d\'alerte pour qu\'une matière soit surveillée.</span>'+
    '</div>'));
  main.appendChild(wrap);
  main.appendChild(el('<p class="hint" style="margin-top:12px;max-width:78ch">Le <b>prix moyen</b> lisse tes achats successifs : '+
    'si tu as payé une pelote 2,70 € puis la suivante 3,20 €, il vaut 2,95 € tant que les deux sont en stock. '+
    'Dans Réglages, tu choisis le prix qui sert à calculer tes coûts : le dernier payé ou le prix moyen.</p>'));

  /* --- derniers mouvements --- */
  var tousMouv = [];
  state.matieres.forEach(function(m){
    (m.mouv||[]).forEach(function(mv){ tousMouv.push({m:m, mv:mv}); });
  });
  tousMouv.sort(function(a,b){ return b.mv.d - a.mv.d; });
  if (tousMouv.length){
    main.appendChild(el('<div class="sechead"><h2>Journal des mouvements</h2></div>'));
    var w2 = el('<div class="tablewrap resp"></div>');
    var t2 = el('<table style="min-width:860px"><thead><tr><th style="width:86px">Date</th><th>Matière</th>'+
      '<th style="width:96px">Type</th><th class="n">Quantité</th><th class="n">Prix unitaire</th>'+
      '<th class="n">Total</th><th class="n">Stock après</th><th>Note</th></tr></thead><tbody></tbody></table>');
    var tb2 = t2.querySelector("tbody");
    var LIB = {entree:"Achat", sortie:"Utilisé", perte:"Perte", correction:"Pesée", inventaire:"Inventaire", annulation:"Annulation"};
    var SIGNE = {entree:"+", sortie:"−", perte:"✕", correction:"±", inventaire:"=", annulation:"↺"};
    var COUL = {entree:"var(--good)", sortie:"var(--bad)", perte:"var(--bad)", correction:"var(--muted)", inventaire:"var(--muted)", annulation:"var(--muted)"};
    var nMouv = Math.min(tousMouv.length, view.mouvTout ? tousMouv.length : 25);
    var entrees = 0, sorties = 0;
    tousMouv.forEach(function(x){
      if (x.mv.annule) return;
      if (x.mv.t === "entree") entrees += Number(x.mv.p) || 0;
      if (x.mv.t === "sortie" || x.mv.t === "perte") sorties += Number(x.mv.p) || (Number(x.mv.pu)||0) * (Number(x.mv.q)||0);
      if (x.mv.t === "correction") sorties -= Number(x.mv.p) || 0;
    });
    tousMouv.slice(0, nMouv).forEach(function(x){
      var mv = x.mv;
      /* Les mouvements enregistrés avant cette version n'ont ni PU ni stock
         après : on l'affiche honnêtement plutôt que de reconstituer un
         chiffre qu'on ne connaît pas. */
      var puAff = (typeof mv.pu === "number" && isFinite(mv.pu)) ? eurU(mv.pu, x.m.unite)
                : (mv.p && mv.q ? eurU(mv.p/mv.q, x.m.unite) : "—");
      var totAff = (typeof mv.p === "number" && mv.p) ? eur(mv.p) : "—";
      var saAff = (typeof mv.sa === "number") ? qte(mv.sa, x.m.unite) : "—";
      if (mv.t === "annulation"){ puAff = "—"; totAff = "—"; }
      var qAff = mv.t === "inventaire" && typeof mv.ecart === "number"
        ? qte(mv.q, x.m.unite) + " (écart " + (mv.ecart >= 0 ? "+" : "−") + qte(Math.abs(mv.ecart), x.m.unite) + ")"
        : qte(mv.q, x.m.unite);
      var ligneMv = el('<tr'+(mv.annule ? ' style="opacity:.55;text-decoration:line-through"' : '')+'><td class="n" data-l="Date">'+new Date(mv.d).toLocaleDateString("fr-FR")+'</td>'+
        '<td data-l="Matière">'+esc(x.m.nom)+'</td>'+
        '<td data-l="Type"><span style="color:'+COUL[mv.t]+';font-weight:700" aria-hidden="true">'+SIGNE[mv.t]+'</span> '+esc(LIB[mv.t]||mv.t)+(mv.est ? ' <span class="hint">(prix estimé)</span>' : '')+'</td>'+
        '<td class="n" data-l="Quantité">'+esc(qAff)+'</td>'+
        '<td class="n" data-l="Prix unitaire">'+esc(puAff)+'</td>'+
        '<td class="n" data-l="Total">'+esc(totAff)+'</td>'+
        '<td class="n" data-l="Stock après">'+esc(saAff)+'</td>'+
        '<td data-l="Note">'+[mv.f && fournisseur(mv.f) ? "Chez " + fournisseur(mv.f).nom : "", mv.bain ? "bain " + mv.bain : "",
                               mv.t === "perte" ? libMotif(mv.motif) : "", mv.n || ""].filter(Boolean).map(esc).join(" · ")+
          (mv.annule ? ' <i>(annulé)</i>' : '')+'</td></tr>');
      if (peutAnnulerMouvement(x.m, mv)){
        var bAn = el('<button type="button" class="btn sm ghost" style="margin-left:6px">Annuler</button>');
        bAn.setAttribute("aria-label", "Annuler ce mouvement de " + x.m.nom);
        bAn.addEventListener("click", function(){
          confirmer({titre:"Annuler ce mouvement ?",
            texte:"Le stock, le prix moyen et le dernier prix de « " + x.m.nom + " » reviennent à ce qu'ils étaient avant. Le journal garde la trace de l'annulation.",
            bouton:"Annuler le mouvement", annuler:"Garder"}, function(){
            annulerMouvement(x.m, mv); sauverTout(); render();
            toast("Mouvement annulé. Stock de « " + x.m.nom + " » : " + qte(x.m.stock, x.m.unite) + ".");
          });
        });
        ligneMv.lastElementChild.appendChild(bAn);
      }
      tb2.appendChild(ligneMv);
    });
    tb2.appendChild(el('<tr style="border-top:2px solid var(--rule-strong)">'+
      '<td colspan="5" style="font-weight:700">Cumul sur tout l\'historique</td>'+
      '<td class="n" style="font-weight:700">'+esc(eur(entrees))+' entrés</td>'+
      '<td class="n" colspan="2" style="font-weight:700">'+esc(eur(sorties))+' consommés</td></tr>'));
    w2.appendChild(t2);
    main.appendChild(w2);
    if (tousMouv.length > nMouv){
      var bPlus = bouton("Voir les " + (tousMouv.length - nMouv) + " mouvements plus anciens",
        function(){ view.mouvTout = true; render(); });
      bPlus.style.marginTop = "12px";
      main.appendChild(bPlus);
    }
    main.appendChild(el('<p class="hint" style="margin-top:12px;max-width:78ch">'+
      'Le <b>prix unitaire</b> est celui du jour du mouvement : le prix d\'achat pour une entrée, '+
      'le prix moyen pour une sortie. Tout l\'historique est conservé. Le dernier mouvement d\'une matière '+
      'peut être annulé ; pour corriger un mouvement plus ancien, fais un inventaire.</p>'));
  }
}

/* ═════ 12. CATALOGUE DES MATIÈRES ═════ */

/* Le prix d'un fil se lit comme en mercerie : à la pelote.
   Vérifié le 21 septembre 2026 sur Sperenza, Créa Magic, Laines du Monde,
   Bergère de France et DMC — aucun de ces marchands n'affiche de prix au
   100 g. C'est le prix du ticket de caisse, celui qu'une artisane reconnaît.
   Le coût au gramme reste affiché juste en dessous : c'est lui qui sert au
   calcul (on consomme 38 g d'une pelote de 50 g, jamais 0,76 pelote) et
   c'est la seule unité de comparaison entre deux conditionnements. */
function conditionnementTexte(m){
  var u = m.unite || "unité";
  if (u === "g" || u === "m") return nb(m.contenance) + " " + u;
  return nb(m.contenance) + " " + u + (m.contenance > 1 ? "s" : "");
}
function motConditionnement(m){
  if (m.cat === "fil") return "la pelote";
  if (m.unite === "pièce" || m.unite === "paire") return "le lot";
  return "l'unité";
}
function coutUnitaireTexte(m){
  var pu = m.contenance ? m.prix/m.contenance : 0;
  return eur(m.prix) + " " + motConditionnement(m);
}
function coutDetailTexte(m){
  var pu = m.contenance ? m.prix/m.contenance : 0;
  if (!pu) return conditionnementTexte(m);
  return conditionnementTexte(m) + " · " + eurU(pu, m.unite);
}

function renderMesMatieres(main){
  var ind = state.matieres.filter(function(m){ return m.prixIndicatif; }).length;
  var ban = el('<div class="banner"><p>'+
    (ind ? '<b>'+ind+' matière'+(ind>1?'s ont':' a')+' encore un prix indicatif.</b> Remplace-'+(ind>1?'les':'le')+
           ' par tes vrais tickets de caisse : c\'est ce qui rend tous tes calculs justes d\'un coup.'
         : '<b>Tous tes prix sont les tiens.</b> Tes calculs reposent sur tes achats réels.')+
    '</p></div>');
  if (ind){
    ban.appendChild(bouton("Voir le catalogue des matières", function(){ view.sub = "catalogue"; render(); }));
  }
  main.appendChild(ban);

  /* Faute de tickets de caisse, autant partir de prix réellement constatés en
     boutique plutôt que d'ordres de grandeur : un clic, et les matières les plus
     utilisées portent un prix daté et sourcé. Ça ne remplace pas ses factures,
     et l'outil continue de le dire. */
  var dejaMarche = state.matieres.filter(function(m){ return m.prixSource; }).length;
  if (dejaMarche < PRIX_MARCHE.length){
    var cM = el('<div class="card" style="margin-bottom:16px"><div class="body">'+
      '<p style="margin:0"><b>Tu n\'as pas tes factures sous la main ?</b> '+
      'Nous avons relevé le '+esc(PRIX_MARCHE_DATE)+' le prix réel en boutique de '+
      PRIX_MARCHE.length+' matières parmi les plus utilisées. En un clic, elles sont mises à jour, '+
      'avec le nom de la boutique et la date du relevé.</p>'+
      '<p class="hint">Ce ne sont pas tes prix d\'achat : ils resteront signalés comme prix relevés en boutique. '+
      'Ils restent plus fiables qu\'une estimation.</p>'+
      '<div class="et-act" style="margin-top:12px"></div></div></div>');
    cM.querySelector(".et-act").appendChild(bouton(
      "Appliquer les "+PRIX_MARCHE.length+" prix relevés en boutique",
      function(){ var n = appliquerPrixMarche(); render(); toast(n+" prix mis à jour"); }, true));
    main.appendChild(cM);
  }

  var card = el('<div class="card"><header><h2>Mes matières</h2>'+
    '<p>Le prix payé pour une pelote, et ce qu\'elle pèse. Le coût au gramme se calcule tout seul.</p></header>'+
    '<div class="body" style="padding-top:14px"></div></div>');
  var body = card.querySelector(".body");

  /* Filtres : une artisane cherche « ce qui va avec mon crochet 4 mm »,
     pas « ce qui est classé Moyen-fin ». Le filtre parle sa langue. */
  var filtres = el('<div class="matfiltres" style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-bottom:16px">'+
    '<label class="f" style="flex:2;min-width:180px"><span>Chercher</span>'+
      '<input type="search" id="mf-q" placeholder="coton, ouate, yeux…" value="'+esc(view.mfQ||"")+'"></label>'+
    '<label class="f" style="flex:1;min-width:150px"><span>Catégorie</span><select id="mf-cat"></select></label>'+
    '<label class="f" style="flex:1;min-width:150px"><span>Va avec mon crochet</span><select id="mf-cro"></select></label>'+
    '<div class="mf-tri"></div></div>');
  filtres.querySelector(".mf-tri").appendChild(barreTri({cle:"mat", defaut:"nom", quand:function(){ render(); }, options:[
    ["nom","Nom"],["prix","Prix payé"],["cout","Coût unitaire"],["contenance","Contenance"]]}));
  var fCat = filtres.querySelector("#mf-cat");
  fCat.appendChild(el('<option value="">Toutes</option>'));
  CATS.forEach(function(c){
    fCat.appendChild(el('<option value="'+esc(c.id)+'"'+(view.mfCat===c.id?' selected':'')+'>'+esc(c.nom)+'</option>'));
  });
  var fCro = filtres.querySelector("#mf-cro");
  fCro.appendChild(el('<option value="">Toutes tailles</option>'));
  CROCHETS.forEach(function(c){
    fCro.appendChild(el('<option value="'+c+'"'+(String(view.mfCro)===String(c)?' selected':'')+'>'+nb(c)+' mm</option>'));
  });
  filtres.addEventListener("input", function(e){
    if (e.target.id === "mf-q")   view.mfQ = e.target.value;
    if (e.target.id === "mf-cat") view.mfCat = e.target.value;
    if (e.target.id === "mf-cro") view.mfCro = e.target.value;
    render();
  });
  body.appendChild(filtres);

  function visible(m){
    if (view.mfCat && m.cat !== view.mfCat) return false;
    if (view.mfQ){
      var q = view.mfQ.toLowerCase();
      var champ = (m.nom + " " + (m.fibre||"") + " " + (m.composition||"") + " " + (m.grosseur||"")).toLowerCase();
      if (champ.indexOf(q) === -1) return false;
    }
    /* Le filtre crochet ne s'applique qu'aux fils : une boîte d'yeux de
       sécurité n'a pas de taille de crochet, et la masquer serait absurde.
       Un fil dont la taille n'est pas renseignée n'est pas masqué non plus —
       il est simplement signalé : faire disparaître une matière sans le dire
       ferait croire à l'artisane qu'elle ne l'a pas. */
    if (view.mfCro && m.cat === "fil" && !m.crochetMin && !m.crochetMax && !m.grosseur) return true;
    if (view.mfCro && m.cat === "fil" && !matiereVaAvecCrochet(m, view.mfCro)) return false;
    return true;
  }
  function sansTaille(m){
    return view.mfCro && m.cat === "fil" && !m.crochetMin && !m.crochetMax && !m.grosseur;
  }
  function mentionTaille(m){
    if (!view.mfCro || m.cat !== "fil") return "";
    if (sansTaille(m)) return "taille de crochet non renseignée";
    if (matiereVaAvecCrochet(m, view.mfCro) === "proche")
      return "taille voisine : prévu pour " + crochetTexte(m);
    return "";
  }

  var wrap = el('<div class="tablewrap resp"></div>');
  var t = el('<table><thead><tr><th style="min-width:170px">Matière</th><th style="width:105px">Prix payé</th>'+
    '<th style="width:95px">Contenance</th><th style="width:95px">Unité</th>'+
    '<th style="width:125px">Crochet</th>'+
    '<th class="n" style="width:150px">Coût unitaire</th><th style="width:150px">En stock</th><th style="width:44px"><span class="sr-only">Actions</span></th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  var nVisibles = 0;
  CATS.forEach(function(cat){
    var items = trierListe(state.matieres.filter(function(m){ return m.cat === cat.id && visible(m); }), etatTri("mat", "nom"), {
      nom: function(m){ return m.nom; },
      prix: function(m){ return Number(m.prix) || 0; },
      cout: function(m){ return m.contenance > 0 ? m.prix / m.contenance : null; },
      contenance: function(m){ return Number(m.contenance) || 0; }
    });
    if (!items.length) return;
    nVisibles += items.length;
    tb.appendChild(el('<tr class="catrow"><td colspan="8">'+esc(cat.nom)+'</td></tr>'));
    items.forEach(function(m){
      var cellCrochet = m.cat === "fil"
        ? '<select data-role="crochet" aria-label="Taille de crochet">'+
            '<option value="">—</option>'+
            CROCHETS.map(function(c){
              return '<option value="'+c+'"'+(Number(m.crochetMin)===c?' selected':'')+'>'+nb(c)+' mm</option>';
            }).join("")+
          '</select>'+
          (!m.crochetMin && m.grosseur
            ? '<div class="hint" style="margin:2px 0 0;font-size:11px">épaisseur « '+esc(m.grosseur)+' » : '+esc(crochetTexte(m))+'</div>'
            : '')
        : '<span class="hint">—</span>';
      tb.appendChild(el(
        '<tr data-mid="'+esc(m.id)+'"'+(mentionTaille(m)?' style="color:var(--muted)"':'')+'>'+
          '<td><input type="text" data-role="nom" aria-label="Nom de la matière" value="'+esc(m.nom)+'">'+
            (mentionTaille(m) ? '<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(mentionTaille(m))+'</div>' : '')+
            (m.composition ? '<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(m.composition)+
              (m.metrage ? ' · '+nb(m.metrage)+' m' : '')+'</div>' : '')+'</td>'+
          '<td data-l="Prix payé"><input type="number" inputmode="decimal" data-role="prix" aria-label="Prix payé" min="0" step="0.05" value="'+m.prix+'"></td>'+
          '<td data-l="Contenance"><input type="number" inputmode="decimal" data-role="contenance" aria-label="Contenance" min="0.01" step="1" value="'+m.contenance+'"></td>'+
          '<td data-l="Unité"><input type="text" data-role="unite" aria-label="Unité" value="'+esc(m.unite)+'"></td>'+
          '<td data-l="Crochet">'+cellCrochet+'</td>'+
          '<td class="n" data-l="Coût unitaire" data-role="pu">'+esc(coutUnitaireTexte(m))+
            '<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(coutDetailTexte(m))+'</div>'+
            (m.prixSource
               ? '<div style="margin-top:3px"><span class="chip">prix '+esc(m.prixSource.src)+' · '+esc(m.prixSource.date)+'</span></div>'
               : m.prixIndicatif ? '<div style="margin-top:3px"><span class="hypo">INDICATIF</span></div>' : '')+'</td>'+
          '<td data-l="En stock"><div class="cel"><span class="num'+((Number(m.stock)||0) < 0 ? ' bad' : '')+'">'+esc(qte(Number(m.stock)||0, m.unite))+'</span>'+
            '<button type="button" class="lien-mini" data-role="achat">J\'ai acheté</button></div></td>'+
          '<td><button type="button" class="btn ghost" data-role="del" aria-label="Supprimer la matière '+esc(m.nom)+'">✕</button></td>'+
        '</tr>'
      ));
    });
  });
  if (!nVisibles){
    tb.appendChild(el('<tr><td colspan="7" style="padding:18px 10px"><span class="hint">'+
      'Aucune matière ne correspond'+(view.mfCro ? ' à un crochet '+nb(view.mfCro)+' mm' : '')+
      '. Élargis la recherche, ou ajoute-la plus bas.</span></td></tr>'));
  }
  tb.addEventListener("change", function(e){
    if (e.target.getAttribute("data-role") === "contenance"){
      var trC = e.target.closest("tr[data-mid]"), mC = trC && matiere(trC.getAttribute("data-mid")); if (!mC) return;
      var nvC = Math.max(0.01, Number(e.target.value) || 0);
      if (!(Number(e.target.value) > 0)){ e.target.value = mC.contenance; toast("La contenance doit être supérieure à 0."); return; }
      if (nvC === mC.contenance) return;
      var appliquer = function(){
        mC.contenance = nvC; mC.maj = Date.now();
        if (!(mC.mouv||[]).some(function(mv){ return mv.t === "entree"; })) mC.pmp = mC.prix / mC.contenance;
        sauverTout(); render();
      };
      var sertC = state.creations.filter(function(c){ return c.lignes.some(function(l){ return l.mid === mC.id; }); }).length;
      if (!sertC){ appliquer(); return; }
      var puAv = mC.prix / mC.contenance, puAp = mC.prix / nvC;
      confirmer({titre:"Changer la contenance de « " + mC.nom + " » ?",
        texte:"Le prix au " + mC.unite + " passe de " + eurU(puAv, mC.unite) + " à " + eurU(puAp, mC.unite) + " : " +
              pluriel(sertC, "création sera recalculée", "créations seront recalculées") + ". Fais-le seulement si la contenance était fausse (poids écrit sur l'étiquette).",
        bouton:"Changer la contenance", annuler:"Garder " + qte(mC.contenance, mC.unite)}, appliquer);
      e.target.value = mC.contenance;
      return;
    }
    if (e.target.getAttribute("data-role") === "unite"){
      /* Changer l'unité ne convertit rien : 150 « g » deviendraient 150
         « pelotes », et le coût serait multiplié d'autant. Si la matière a
         déjà servi, on le dit et on propose la bonne solution. */
      var trU = e.target.closest("tr[data-mid]"), mU = trU && matiere(trU.getAttribute("data-mid")); if (!mU) return;
      var nouvelle = String(e.target.value || "").trim() || mU.unite;
      if (nouvelle === mU.unite) return;
      var utilisee = state.creations.some(function(c){ return c.lignes.some(function(l){ return l.mid === mU.id; }); }) ||
                     (mU.mouv||[]).length > 0 || (Number(mU.stock)||0) !== 0;
      if (!utilisee){ mU.unite = nouvelle; mU.maj = Date.now(); sauverTout(); return; }
      confirmer({titre:"Changer l'unité de « " + mU.nom + " » ?",
        texte:"Cette matière est déjà utilisée (fiches, stock ou achats) en « " + mU.unite + " ». Les quantités ne seront PAS converties : "+
              "une fiche qui utilisait 150 " + mU.unite + " utiliserait 150 " + nouvelle + ", et ton prix serait faux. "+
              "Mieux vaut créer une nouvelle matière dans la bonne unité.",
        bouton:"Changer quand même", annuler:"Garder « " + mU.unite + " »", danger:true}, function(){
        mU.unite = nouvelle; mU.maj = Date.now(); sauverTout(); render();
        toast("Unité changée. Vérifie les quantités des fiches qui utilisent « " + mU.nom + " ».");
      });
      e.target.value = mU.unite;
      return;
    }
    if (e.target.getAttribute("data-role") !== "crochet") return;
    var tr = e.target.closest("tr[data-mid]"); if (!tr) return;
    var m = matiere(tr.getAttribute("data-mid")); if (!m) return;
    var v = Number(e.target.value)||0;
    m.crochetMin = v || null; m.crochetMax = v || null; m.maj = Date.now();
    sauverTout();
    toast(v ? "Crochet " + nb(v) + " mm enregistré" : "Taille de crochet effacée");
  });
  attacherVerif(tb, [
    {sel:'[data-role="nom"]', type:"texte", requis:true, min:2, max:80, msgRequis:"Une matière a besoin d'un nom."},
    {sel:'[data-role="prix"]', type:"prix", requis:true, max:100000},
    {sel:'[data-role="contenance"]', type:"nombre", requis:true, strict:true, max:1000000},
    {sel:'[data-role="unite"]', type:"texte", requis:true, max:12, msgRequis:"Indique l'unité."}
  ]);
  tb.addEventListener("input", function(e){
    var tr = e.target.closest("tr[data-mid]"); if (!tr) return;
    var m = matiere(tr.getAttribute("data-mid")); if (!m) return;
    var role = e.target.getAttribute("data-role");
    /* un prix illisible (« abc ») ou vide n'écrase pas le prix gardé */
    if (role === "prix" && (e.target.validity.badInput || String(e.target.value).trim() === "")) return;
    if (role === "nom" && String(e.target.value).trim().length < 2) return;
    if (role === "nom") m.nom = e.target.value;
    if (role === "prix"){ m.prix = Math.max(0, Number(e.target.value)||0); m.prixIndicatif = false;
                          m.prixSource = null; m.maj = Date.now(); }
    if (role === "contenance") return;   /* traité au « change » : voir ci-dessous */
    /* Tant qu'aucun achat réel n'a été noté, le prix moyen EST le prix saisi :
       sinon la valeur du stock et le calcul « au prix moyen » gardaient
       l'ancien prix indicatif. */
    if ((role === "prix" || role === "contenance") && !(m.mouv||[]).some(function(mv){ return mv.t === "entree"; })){
      m.pmp = m.contenance ? m.prix / m.contenance : 0;
    }
    if (role === "unite") return;   /* traité au « change » : voir ci-dessous */
    tr.querySelector('[data-role=pu]').innerHTML = esc(coutUnitaireTexte(m)) +
      '<div class="hint" style="margin:2px 0 0;font-size:11px">'+esc(coutDetailTexte(m))+'</div>' +
      (m.prixSource
         ? '<div style="margin-top:3px"><span class="chip">prix '+esc(m.prixSource.src)+' · '+esc(m.prixSource.date)+'</span></div>'
         : m.prixIndicatif ? '<div style="margin-top:3px"><span class="hypo">INDICATIF</span></div>' : '');
    sauver();
  });
  /* Supprimer une matière ne doit jamais être un mur : si elle sert quelque
     part, on dit OÙ, et on laisse décider. Refuser sans expliquer, c'est la
     version de l'outil qui décide à la place de l'artisane. */
  tb.addEventListener("click", function(e){
    if (e.target.getAttribute("data-role") === "achat"){
      var mA = matiere(e.target.closest("tr[data-mid]").getAttribute("data-mid"));
      if (mA) dialogueAchatMatiere(mA);
      return;
    }
    if (e.target.getAttribute("data-role") !== "del") return;
    var bouton2 = e.target;
    var mid = bouton2.closest("tr[data-mid]").getAttribute("data-mid");
    var m = matiere(mid); if (!m) return;
    var ou = state.creations.filter(function(c){
      return c.lignes.some(function(l){ return l.mid === mid; });
    });
    var achats = (m.mouv||[]).filter(function(mv){ return mv.t === "entree" && !mv.annule; });
    var enStockM = Number(m.stock) || 0;
    if (!ou.length && !achats.length && enStockM <= 0){
      avecAnnulation("« " + m.nom + " » supprimée", function(){
        retirerMatiere(mid);
      });
      return;
    }
    var detM = ou.slice(0,5).map(function(c){ return "utilisée dans « " + c.nom + " » (la fiche sera recalculée sans elle)"; })
               .concat(ou.length > 5 ? ["… et " + (ou.length - 5) + " autre" + (ou.length-5>1?"s":"") + " création" + (ou.length-5>1?"s":"")] : []);
    if (enStockM > 0) detM.push("il t'en reste " + qte(enStockM, m.unite) + " en stock (valeur " + eur(enStockM * (Number(m.pmp)||pu(m))) + ")");
    if (achats.length) detM.push("tes " + achats.length + " achat" + (achats.length>1?"s":"") + " restent comptés dans tes indicateurs");
    confirmer({
      titre: "Supprimer « " + m.nom + " » ?",
      texte: "Avant de supprimer, vérifie :",
      details: detM,
      bouton: "Supprimer la matière", danger: true
    }, function(){
      avecAnnulation("Matière supprimée et retirée de " + ou.length + " fiche" + (ou.length>1?"s":""), function(){
        ou.forEach(function(c){
          c.lignes = c.lignes.filter(function(l){ return l.mid !== mid; });
        });
        retirerMatiere(mid);
      });
    });
  });
  wrap.appendChild(t);
  body.appendChild(wrap);

  /* Saisie d'une matière : les champs suivent l'étiquette de la pelote, dans
     l'ordre où on la lit. Seuls le nom, le prix et la contenance sont requis —
     ce sont les trois seuls dont le calcul a besoin. Le reste sert à s'y
     retrouver plus tard, et peut rester vide. */
  var add = el('<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--rule)">'+
    '<p style="margin:0 0 4px"><b>Ajouter une matière</b></p>'+
    '<p class="hint" style="margin:0 0 12px">Recopie ce qui est écrit sur l\'étiquette. '+
    'Seuls le nom, le prix et la contenance sont nécessaires au calcul.</p>'+
    '<div class="grid3" style="align-items:end">'+
      '<label class="f"><span>Nom</span><input id="nm-nom" type="text" placeholder="Coton bio écru 50 g"></label>'+
      '<label class="f"><span>Catégorie</span><select id="nm-cat"></select></label>'+
      '<label class="f"><span>Prix payé (€)</span><input id="nm-prix" type="number" min="0" step="0.05" value="0"></label>'+
      '<label class="f"><span>Contenance (ex. poids d\'une pelote)</span><input id="nm-cont" type="number" min="0.01" step="1" value="50"></label>'+
      '<label class="f"><span>Unité</span><input id="nm-unite" type="text" value="g"></label>'+
      '<label class="f"><span>Crochet (mm)</span><select id="nm-cro"></select></label>'+
      '<label class="f"><span>Composition</span><input id="nm-comp" type="text" placeholder="100 % coton"></label>'+
      '<label class="f"><span>Métrage (m)</span><input id="nm-met" type="number" min="0" step="1" placeholder="85"></label>'+
      '<label class="f"><span>Coloris / bain</span><input id="nm-bain" type="text" placeholder="écru · bain 4821"></label>'+
    '</div></div>');
  var selCat = add.querySelector("#nm-cat");
  CATS.forEach(function(c){ var o=document.createElement("option"); o.value=c.id; o.textContent=c.nom; selCat.appendChild(o); });
  var selCro = add.querySelector("#nm-cro");
  selCro.appendChild(el('<option value="">—</option>'));
  CROCHETS.forEach(function(c){ selCro.appendChild(el('<option value="'+c+'">'+nb(c)+' mm</option>')); });
  body.appendChild(add);
  add.appendChild(el('<p class="hint" style="margin:10px 0 0">Le <b>numéro de bain</b> est le lot de teinture. '+
    'Deux pelotes du même coloris mais de bains différents ne donnent pas tout à fait la même nuance : '+
    'le noter évite la démarcation en plein milieu d\'un ouvrage.</p>'));
  var verifAdd = attacherVerif(add, [
    {sel:"#nm-nom", type:"texte", requis:true, min:2, max:80, msgRequis:"Indique le nom de la matière."},
    {sel:"#nm-prix", type:"prix", requis:true, max:100000},
    {sel:"#nm-cont", type:"nombre", requis:true, strict:true, max:1000000},
    {sel:"#nm-unite", type:"texte", requis:true, max:12, msgRequis:"Indique l'unité (g, m, pièce…)."},
    {sel:"#nm-met", type:"nombre", min:0, max:100000},
    {sel:"#nm-comp", type:"texte", max:120},
    {sel:"#nm-bain", type:"texte", max:80}
  ]);
  var barAdd = el('<div class="savebar" style="margin-top:14px"></div>');
  var bAdd = el('<button type="button" class="btn primary">Ajouter cette matière</button>');
  bAdd.addEventListener("click", function(){
    var errsAdd = verifAdd.valider();
    if (errsAdd.length){ toast(errsAdd[0].lib + " : " + errsAdd[0].msg); try{ errsAdd[0].champ.focus(); }catch(e){} return; }
    var nom = add.querySelector("#nm-nom").value.trim();
    var prix = Math.max(0, Number(lireNombre(add.querySelector("#nm-prix").value))||0);
    var cont = Math.max(0.01, Number(lireNombre(add.querySelector("#nm-cont").value))||1);
    var cro  = Number(selCro.value)||null;
    state.matieres.push({id:uid(), nom:nom, cat:selCat.value, prix:prix, contenance:cont,
      unite:add.querySelector("#nm-unite").value.trim()||"unité", stock:0, seuil:0, pmp:prix/cont, mouv:[],
      refCat:null, fibre:"", composition:add.querySelector("#nm-comp").value.trim(),
      grosseur:"", metrage:Number(add.querySelector("#nm-met").value)||null,
      crochetMin:cro, crochetMax:cro, bain:add.querySelector("#nm-bain").value.trim(),
      prixIndicatif:false, perso:true, maj:Date.now()});
    sauverTout(); render(); toast("Matière ajoutée");
  });
  barAdd.appendChild(bAdd);
  var bCat = el('<button type="button" class="btn">Prendre une matière du catalogue</button>');
  bCat.addEventListener("click", function(){ view.sub = "catalogue"; render(); });
  barAdd.appendChild(bCat);
  body.appendChild(barAdd);
  main.appendChild(card);

  main.appendChild(el('<p class="hint" style="margin-top:16px;max-width:78ch">C\'est ici que se joue l\'erreur la plus fréquente : '+
    'une pelote à 2,70 € n\'est pas le coût de ta pièce. Si tu en consommes 38 g, ta pièce a coûté 2,05 € de fil. '+
    'Le reste de la pelote n\'est pas perdu : il reste dans ton stock.</p>'));
}

/* ═════ 13. RÉGLAGES ═════ */

/* Les rubriques de Réglages. « aide » s'affiche dans la liste, « intro » en
   tête de la rubrique ouverte. */
var SECTIONS_REG = [
  {id:"compte",      nom:"Mon compte",      siCompte:true,
   aide:"Profil, sécurité, déconnexion",
   intro:"Ton profil, l\'enregistrement de tes données, ton mot de passe et la déconnexion."},
  {id:"activite",    nom:"Mon activité",
   aide:"Ce que tu fais, ton statut, ton taux horaire",
   intro:"Ce qui décide de tous les calculs : si tu vends, sous quel statut, et ce que tu veux gagner de l'heure."},
  {id:"charges",     nom:"Mes charges",
   aide:"Cotisations, frais fixes, coût des matières",
   intro:"Ce qui part avant que ton travail soit payé : cotisations, frais fixes, et la façon de compter le prix de tes matières."},
  {id:"canaux",      nom:"Canaux de vente",   siVend:true,
   aide:"Frais des plateformes et des marchés",
   intro:"Ce que chaque plateforme, boutique ou marché prélève sur une vente."},
  {id:"facturation", nom:"Facturation",       siVend:true,
   aide:"Mentions obligatoires de tes factures",
   intro:"Ce qui s'imprime en haut de chaque facture. Sans ces mentions, une facture n'est pas valable."},
  {id:"donnees",     nom:"Mes données",
   aide:"Sauvegarde, restauration, remise à zéro",
   intro:"Une copie de ton atelier, à garder de côté ou à restaurer."}
];

function renderReglages(main){
  var r = state.reglages;
  var vend = r.profil !== "passion";
  main.appendChild(enTete("Réglages",
    "Tes chiffres, ton activité et ton compte, rangés par rubrique. Tu peux y revenir à tout moment.",
    [bouton("Revoir la mise en route", function(){ view.sub = null; aller("demarrage"); })]));

  var c1 = el('<div class="card" style="margin-bottom:16px"><header><h2>Ce que tu veux gagner</h2>'+
    '<p>Le seul chiffre vraiment personnel de l\'outil.</p></header><div class="body">'+
    '<div class="grid2">'+
      '<label class="f"><span>Taux horaire visé (€ / h)</span><input type="number" min="0" step="0.5" data-r="tauxHoraire" value="'+r.tauxHoraire+'"></label>'+
      '<label class="f"><span>Taux de perte et de ratés (%)</span><input type="number" min="0" max="60" step="1" data-r="tauxPerte" value="'+r.tauxPerte+'"></label>'+
    '</div>'+
    '<p class="hint">Le taux de perte couvre les chutes de fil, les erreurs défaites, les prototypes et les pièces invendables. '+
    'Il s\'applique à ce qui se coupe ou se mesure (fils, rembourrage, tissu), pas à ce qui se compte à l\'unité (yeux, boutons, anneaux) ni aux emballages. '+
    '8 % est un point de départ, à ajuster quand tu auras compté tes ratés sur un mois.</p>'+
    '</div></div>');

  /* Le taux de cotisations est une donnée publique : l'utilisateur choisit sa
     situation, l'outil met le bon chiffre. Pas de recherche à faire. */
  var cStat = el('<div class="card" style="margin-bottom:16px"><header><h2>Ton statut</h2>'+
    '<p>Choisis ta situation : le taux de cotisations se met tout seul. '+
    'Tu n\'as rien à chercher ni à calculer.</p></header><div class="body">'+
    '<label class="f" style="max-width:520px"><span>Ma situation</span>'+
    '<select id="r-statut"></select></label>'+
    '<div id="statut-detail" style="margin-top:12px"></div>'+
    '<p class="hint" style="margin-top:14px">Taux en vigueur au 1er janvier 2026 (décret 2024-484), '+
    'relevés le 16 septembre 2026 sur economie.gouv.fr et portail-autoentrepreneur.fr. '+
    '<b>Si tu bénéficies de l\'ACRE</b>, ton taux est réduit la première année : il figure sur ton '+
    'compte URSSAF, et le champ « Cotisations » de la rubrique Mes charges reste modifiable à la main.</p>'+
    '</div></div>');
  var selSt = cStat.querySelector("#r-statut");
  var o0 = document.createElement("option");
  o0.value = ""; o0.textContent = "Choisis ta situation"; selSt.appendChild(o0);
  STATUTS.forEach(function(st){
    var o = document.createElement("option");
    o.value = st.id; o.textContent = st.nom + "  —  " + pct(st.taux/100);
    selSt.appendChild(o);
  });
  selSt.value = r.statut || "";
  function peindreStatut(){
    var d = cStat.querySelector("#statut-detail");
    var st = statutCotis(selSt.value);
    d.innerHTML = st
      ? '<div class="banner"><p><b>' + esc(pct(st.taux/100)) + '</b> — ' + esc(st.detail) + '.<br>' +
        esc(st.quand) + '</p></div>'
      : '<p class="hint" style="margin:0">Tant que tu n\'as pas choisi, l\'outil garde le taux ' +
        'saisi dans « Mes charges » comme une hypothèse.</p>';
    if (!selSt.value || selSt.value === "non_declare"){
      d.appendChild(el('<div class="banner" style="margin-top:10px"><p><b>Faut-il déclarer mes ventes ?</b> Vendre de temps en temps une pièce faite pour soi n\'est pas une activité. '+
        'Vendre régulièrement ce que tu fabriques (sur un marché, sur Instagram, sur une plateforme) en est une : elle se déclare en micro-entreprise, gratuitement et en ligne sur le '+
        '<a href="https://formalites.entreprises.gouv.fr" target="_blank" rel="noopener">guichet unique des entreprises</a>. L\'<a href="https://www.autoentrepreneur.urssaf.fr" target="_blank" rel="noopener">URSSAF</a> explique le statut et répond aux questions. '+
        'Une fois déclarée, choisis ton statut ci-dessus : les cotisations entreront dans tes prix.</p></div>'));
    }
  }
  selSt.addEventListener("change", function(){
    var st = statutCotis(selSt.value);
    r.statut = selSt.value || null;
    if (st){
      r.cotisations = st.taux;
      var champ = document.querySelector('[data-r="cotisations"]');
      if (champ) champ.value = st.taux;
    }
    sauverTout(); render();
    if (st) toast("Cotisations réglées à " + pct(st.taux/100));
  });
  peindreStatut();

  var cConf = el('<div class="card" style="margin-bottom:16px"><div class="body">'+
    (r.confirmeLe
      ? '<p style="margin:0"><b>Tes chiffres ont été confirmés</b> le '+esc(dateLisible(r.confirmeLe))+'. '+
        'Tous les prix affichés dans l\'application reposent dessus.</p>'+
        '<p class="hint">Reviens ici si ton taux horaire, ton statut ou tes frais changent.</p>'
      : '<p style="margin:0"><b>Ces valeurs sont encore celles proposées par défaut.</b> Relis-les une par une, '+
        'corrige ce qui ne te correspond pas, puis confirme-le ci-dessous : tant que ce n\'est pas fait, '+
        'l\'application considère tous ses prix comme indicatifs.</p>')+
    '<div class="et-act" style="margin-top:12px"></div></div></div>');
  cConf.querySelector(".et-act").appendChild(bouton(
    r.confirmeLe ? "Annuler la confirmation" : "J'ai vérifié : ce sont bien mes chiffres",
    function(){
      r.confirmeLe = r.confirmeLe ? null : new Date().toISOString();
      sauverTout(); render();
      toast(r.confirmeLe ? "Chiffres confirmés" : "Confirmation retirée : confirme à nouveau après tes corrections");
    }, !r.confirmeLe));

  var c2 = el('<div class="card" style="margin-bottom:16px"><header><h2>Tes charges</h2></header><div class="body">'+
    '<div class="grid2">'+
      '<label class="f"><span>Cotisations URSSAF (% de tes ventes)</span><input type="number" min="0" max="50" step="0.1" data-r="cotisations" value="'+r.cotisations+'"></label>'+
      '<label class="f"><span>Frais fixes par mois (€)</span><input type="number" min="0" step="1" data-r="fraisFixes" value="'+r.fraisFixes+'"></label>'+
      '<label class="f"><span>Pièces vendues par mois</span><input type="number" min="1" step="1" data-r="piecesParMois" value="'+r.piecesParMois+'"></label>'+
      '<label class="f"><span>Heures de crochet par jour</span><input type="number" min="0" max="16" step="0.5" data-r="heuresParJour" value="'+(r.heuresParJour === undefined || r.heuresParJour === null ? 3 : r.heuresParJour)+'"></label>'+
      '<label class="f"><span>Heures par mois hors crochet</span><input type="number" min="0" step="1" data-r="heuresIndirectesMois" value="'+(Number(r.heuresIndirectesMois)||0)+'"></label>'+
    '</div>'+
    '<p class="hint">Les frais fixes comprennent l\'abonnement de ta boutique, l\'assurance, la comptabilité et le site. Ils sont répartis sur le nombre de pièces vendues dans le mois. '+
    'Les <b>heures hors crochet</b> (photos, messages, comptabilité, marchés, achats) sont aussi du travail : réparties sur les pièces du mois, elles donnent un gain de l\'heure plus juste. Laisse 0 pour ne compter que la fabrication. '+
    'Le <b>taux de cotisations</b> est rempli par ton statut, choisi dans la rubrique « Mon activité » : tu n\'as pas à le calculer. '+
    'Tu peux le corriger à la main si ta situation est particulière (ACRE, exonération, taux transitoire).</p>'+
    '<p class="hint">Volontairement absents : l\'amortissement de tes crochets, l\'électricité et le mètre carré de ton salon. '+
    'Répartis sur une pièce, ces frais ne représentent que quelques centimes et compliquent le calcul sans le rendre plus juste.</p>'+
    '</div></div>');

  /* Ce qui figure en haut des factures. Sans ces mentions, une facture n'est
     pas valable : le vendeur doit être identifiable (article 242 nonies A de
     l'annexe II du CGI, et articles L441-9 du code de commerce). */
  var cFact = el('<div class="card" style="margin-bottom:16px"><header><h2>Tes mentions de facture</h2>'+
    '<p>Ce qui s\'imprimera en haut de chaque facture que tu émets.</p></header><div class="body">'+
    '<div class="grid2">'+
      '<label class="f"><span>Ton nom, ou le nom de ton entreprise</span><input type="text" data-r2f="raisonSociale" placeholder="Camille Dupont, ou Crochet & Cie"></label>'+
      '<label class="f"><span>SIRET (ton numéro d\'entreprise, 14 chiffres)</span><input type="text" data-r2f="siret" placeholder="14 chiffres, après l\'immatriculation"></label>'+
      '<label class="f"><span>Adresse</span><input type="text" data-r2f="adresse" placeholder="12 rue des Lilas, 69000 Lyon"></label>'+
      '<label class="f"><span>Contact sur la facture</span><input type="text" data-r2f="contact" placeholder="e-mail ou téléphone"></label>'+
    '</div>'+
    '<p class="hint" style="margin-top:10px">Tant que ces champs sont vides, tes factures portent '+
    'des mentions à compléter et ne sont pas valables. Une facture doit permettre d\'identifier '+
    'qui vend. La mention « TVA non applicable, article 293 B du CGI » est ajoutée automatiquement '+
    'tant que tu es en franchise de TVA.</p>'+
    '</div></div>');
  ["raisonSociale","siret","adresse","contact"].forEach(function(k){
    cFact.querySelector('[data-r2f="'+k+'"]').value = r[k] || "";
  });
  cFact.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-r2f"); if (!k) return;
    state.reglages[k] = e.target.value; sauver();
  });

  var c3 = el('<div class="card" style="margin-bottom:16px"><header><h2>Base de calcul des coûts</h2></header><div class="body">'+
    '<label class="f" style="max-width:460px"><span>Prix de référence de mes matières</span><select data-r2="baseCout">'+
    '<option value="dernier">Le dernier prix que j\'ai payé (le plus simple)</option>'+
    '<option value="pmp">La moyenne de ce que j\'ai payé (plus juste si je note mes achats)</option>'+
    '<option value="moinsCher">Le prix le plus bas de mes fournisseurs (pour savoir combien je pourrais payer)</option></select></label>'+
    '<p class="hint">Le prix moyen lisse les variations entre deux achats : il n\'a de sens que si tu enregistres tes achats. '+
    'Le prix le plus bas vient des tarifs de tes fournisseurs (Matières › Fournisseurs et prix) ; une matière sans tarif garde son dernier prix payé.</p>'+
    '</div></div>');
  c3.querySelector("[data-r2]").value = r.baseCout || "dernier";
  c3.querySelector("[data-r2]").addEventListener("change", function(e){
    state.reglages.baseCout = e.target.value; sauverTout(); toast("Base de calcul mise à jour"); render();
  });

  [c1,c2].forEach(function(card){
    card.addEventListener("input", function(e){
      var k = e.target.getAttribute("data-r"); if (!k) return;
      var lim = LIMITES_REGLAGES[k] || [0];
      state.reglages[k] = borne(Number(e.target.value)||0, lim[0], lim[1]);
      sauver();
    });
    card.addEventListener("change", function(e){
      var k = e.target.getAttribute("data-r"); if (!k) return;
      if (Number(e.target.value) !== state.reglages[k]){
        e.target.value = state.reglages[k];
        toast("Valeur ramenée à " + nb(state.reglages[k]) + " (limite de ce réglage).");
      }
    });
  });

  var pA = profilActuel();
  var c0 = el('<div class="card" style="margin-bottom:16px"><header><h2>Ton profil</h2>'+
    '<p>Il règle les onglets, les calculs et le vocabulaire. '+(pA && pA.id === "loisir"
      ? 'En mode « pour le plaisir », rien ne parle de prix ni de cotisations : l\'outil compte tes matières et ton temps.'
      : 'Tout ce qui touche à la vente est affiché : prix conseillé, commandes, factures.')+'</p></header><div class="body">'+
    '<p style="margin:0 0 10px"><b>'+esc(pA ? pA.nom : "Pas encore choisi")+'</b>'+(pA ? '<br><span class="hint">'+esc(pA.d)+'</span>' : '')+'</p></div></div>');
  c0.querySelector(".body").appendChild(bouton("Changer de profil", function(){ dialogueProfil({}); }));

  /* --- plateformes --- */
  var cP = el('<div class="card" style="margin-bottom:16px"><header><h2>Frais des plateformes et canaux de vente</h2>'+
    '<p>Ces chiffres changent souvent et dépendent de ton pays, de ta devise et de tes options. '+
    'Vérifie-les sur le site de ta plateforme et corrige-les ici.</p></header><div class="body" style="padding-top:14px"></div></div>');
  var wp = el('<div class="tablewrap resp"></div>');
  var tp = el('<table style="min-width:900px"><thead><tr><th style="min-width:150px">Canal</th>'+
    '<th class="n" style="width:92px">Mise en vente €</th><th class="n" style="width:92px">Commission %</th>'+
    '<th class="n" style="width:92px">Paiement %</th><th class="n" style="width:92px">Paiement €</th>'+
    '<th class="n" style="width:92px">Publicité externe %</th><th class="n" style="width:110px">Part des ventes %</th>'+
    '<th class="n" style="width:82px">TVA %</th><th class="n" style="width:130px">Prélèvement total</th></tr></thead><tbody></tbody></table>');
  var tpb = tp.querySelector("tbody");
  state.canaux.forEach(function(c){
    var f = fraisCanal(c);
    tpb.appendChild(el('<tr data-cid="'+esc(c.id)+'">'+
      '<td><b>'+esc(c.nom)+'</b><div class="hint" style="margin:2px 0 0">'+esc(c.note||"")+'</div></td>'+
      '<td data-l="Mise en vente €"><input type="number" inputmode="decimal" aria-label="Frais de mise en vente" min="0" step="0.01" data-c="annonce" value="'+c.annonce+'"></td>'+
      '<td data-l="Commission %"><input type="number" inputmode="decimal" aria-label="Commission" min="0" step="0.1" data-c="comm" value="'+(Math.round(c.comm*1000)/10)+'"></td>'+
      '<td data-l="Paiement %"><input type="number" inputmode="decimal" aria-label="Frais de paiement en pourcentage" min="0" step="0.1" data-c="paiePct" value="'+(Math.round(c.paiePct*1000)/10)+'"></td>'+
      '<td data-l="Paiement €"><input type="number" inputmode="decimal" aria-label="Frais de paiement fixes" min="0" step="0.01" data-c="paieFixe" value="'+c.paieFixe+'"></td>'+
      '<td data-l="Publicité externe %"><input type="number" inputmode="decimal" aria-label="Taux de publicité externe" min="0" step="0.5" data-c="offPct" value="'+(Math.round(c.offPct*1000)/10)+'"></td>'+
      '<td data-l="Part des ventes %"><input type="number" inputmode="decimal" aria-label="Part des ventes issues de la publicité" min="0" max="100" step="1" data-c="offPart" value="'+(Math.round(c.offPart*1000)/10)+'"></td>'+
      '<td data-l="TVA %"><input type="number" inputmode="decimal" aria-label="TVA sur les frais" min="0" max="30" step="0.1" data-c="tva" value="'+c.tva+'"></td>'+
      '<td class="n" data-l="Prélèvement total" data-role="tot">'+esc(pct(f.pct))+' + '+esc(eur(f.fixe))+'</td></tr>'));
  });
  tpb.addEventListener("input", function(e){
    var f = e.target.getAttribute("data-c"); if (!f) return;
    var tr = e.target.closest("tr[data-cid]");
    var c = canal(tr.getAttribute("data-cid")); if (!c) return;
    var v = Number(e.target.value)||0;
    if (f === "comm" || f === "paiePct" || f === "offPct" || f === "offPart") c[f] = v/100;
    else c[f] = v;
    var ff = fraisCanal(c);
    tr.querySelector('[data-role=tot]').textContent = pct(ff.pct) + " + " + eur(ff.fixe);
    sauver();
  });
  wp.appendChild(tp);
  cP.querySelector(".body").appendChild(wp);
  cP.querySelector(".body").appendChild(el('<p class="hint" style="margin-top:12px;max-width:80ch">'+
    '<b>Publicité externe</b> : certaines plateformes prélèvent un pourcentage sur les ventes issues de leurs publicités. '+
    '« Part des ventes » est le pourcentage de tes ventes qui en proviennent. Mets 0 si ça ne te concerne pas. '+
    '<b>TVA</b> : la plateforme facture généralement la TVA sur ses propres frais, ce qui les alourdit d\'autant. '+
    'Le « prélèvement total » est ce qui part réellement du prix affiché. Les valeurs proposées sont des ordres de grandeur : vérifie-les sur le site de chaque plateforme.</p>'));
  var bReset = el('<button type="button" class="btn sm" style="margin-top:12px">Rétablir les valeurs par défaut</button>');
  bReset.addEventListener("click", function(){
    confirmer({
      titre: "Rétablir les frais par défaut ?",
      texte: "Les frais que tu as saisis pour chaque canal de vente seront remplacés par les valeurs de départ. Les calculs de toutes tes créations seront mis à jour.",
      bouton: "Rétablir les valeurs par défaut", danger: true
    }, function(){
      avecAnnulation("Frais de vente rétablis", function(){ state.canaux = clone(CANAUX_DEFAUT); });
    });
  });
  cP.querySelector(".body").appendChild(bReset);

  /* --- données --- */
  var cfgCompte = window.CROCHOMPTE_CONFIG || {};
  var avecCompte = !!(cfgCompte.supabaseUrl && cfgCompte.supabaseAnonKey);
  var texteDonnees = avecCompte
    ? 'Ton atelier est enregistré automatiquement dans ton compte. Une sauvegarde reste utile '
      + 'pour garder une version datée de ton atelier et pouvoir y revenir.'
    : 'Tes données sont enregistrées uniquement sur cet appareil : '
      + 'une sauvegarde est ta seule copie de sécurité.';
  var zone = document.createElement("textarea");
  zone.id = "reg-restaurer";
  zone.placeholder = '{"reglages":…}';

  var cSauv = el('<div class="card" style="margin-bottom:16px"><header><h2>Faire une sauvegarde</h2>'+
    '<p>' + esc(texteDonnees) + '</p></header><div class="body"></div></div>');
  var bar = el('<div class="savebar"></div>');
  /* Un vrai fichier, daté, comme l'export de n'importe quelle application :
     c'est aussi ce qui permet d'emporter ses données ailleurs (RGPD, art. 20). */
  var bDl = el('<button type="button" class="btn primary">Télécharger ma sauvegarde</button>');
  /* Le fichier emporte aussi les photos (créations, modèles, pages de
     patrons) : sans elles, restaurer sur un nouvel appareil rendrait un
     atelier sans images. */
  bDl.addEventListener("click", function(){
    bDl.disabled = true; bDl.textContent = "Préparation…";
    photosPourSauvegarde().then(function(photos){
      var d = new Date();
      var nom = "crochompte-sauvegarde-" + d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" +
                String(d.getDate()).padStart(2,"0") + ".json";
      var copie = clone(state);
      if (photos.n) copie._photos = photos.donnees;
      /* Ton profil de compte fait partie de tes données (droit à la portabilité). */
      var prof = window.CrochompteSync && window.CrochompteSync.profil ? window.CrochompteSync.profil() : null;
      if (prof) copie._profil = prof;
      var url = URL.createObjectURL(new Blob([JSON.stringify(copie)], {type:"application/json"}));
      var a = document.createElement("a");
      a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      marquerSauvegarde();
      toast("Sauvegarde téléchargée : " + nom + (photos.n ? " (avec " + photos.n + " photo" + (photos.n > 1 ? "s" : "") + ")" : ""));
    }).catch(function(){ toast("Le téléchargement n'a pas abouti. Utilise « Copier la sauvegarde »."); })
      .then(function(){ bDl.disabled = false; bDl.textContent = "Télécharger ma sauvegarde"; });
  });
  bar.appendChild(bDl);
  var bCopy = el('<button type="button" class="btn">Copier la sauvegarde</button>');
  bCopy.addEventListener("click", function(){
    var txt = JSON.stringify(state);
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ marquerSauvegarde(); toast("Sauvegarde copiée"); },
        function(){ zone.value = txt; toast("Copie automatique impossible : sélectionne le texte de la zone « Contenu de la sauvegarde » ci-dessous"); });
    } else { zone.value = txt; toast("Copie automatique impossible : sélectionne le texte de la zone « Contenu de la sauvegarde » ci-dessous"); }
  });
  bar.appendChild(bCopy);
  cSauv.querySelector(".body").appendChild(bar);
  cSauv.querySelector(".body").appendChild(el('<p class="hint" style="margin:12px 0 0">'+
    (r.sauvegardeLe ? 'Dernière sauvegarde le ' + esc(dateLisible(r.sauvegardeLe)) + '.'
                    : 'Aucune sauvegarde faite pour l\'instant.') +
    ' Garde le fichier dans tes documents ou envoie-le toi par e-mail. Le fichier téléchargé contient aussi tes photos ; '+
    '« Copier la sauvegarde » ne copie que le texte, sans les photos.</p>'));

  var cRest = el('<div class="card" style="margin-bottom:16px"><header><h2>Restaurer une sauvegarde</h2>'+
    '<p>Choisis un fichier de sauvegarde, ou colle son contenu : il <b>remplace</b> tout ce qui est actuellement dans ton atelier.</p>'+
    '</header><div class="body"></div></div>');
  var bdR = cRest.querySelector(".body");
  var inFichier = el('<input type="file" accept=".json,application/json" id="reg-fichier" style="display:none">');
  var bFichier = bouton("Choisir un fichier de sauvegarde…", function(){ inFichier.click(); });
  inFichier.addEventListener("change", function(){
    var f = inFichier.files && inFichier.files[0]; if (!f) return;
    var lr = new FileReader();
    lr.onload = function(){ zone.value = String(lr.result || ""); bRest.click(); inFichier.value = ""; };
    lr.onerror = function(){ toast("Ce fichier n'a pas pu être lu. Réessaie."); };
    lr.readAsText(f);
  });
  var ligneF = el('<div class="savebar" style="margin-bottom:12px"></div>');
  ligneF.appendChild(bFichier); ligneF.appendChild(inFichier);
  bdR.appendChild(ligneF);
  bdR.appendChild(el('<label class="f" for="reg-restaurer"><span>Contenu de la sauvegarde</span></label>'));
  bdR.appendChild(zone);
  var bRest = el('<button type="button" class="btn" style="margin-top:10px">Restaurer cette sauvegarde</button>');
  bRest.addEventListener("click", function(){
    var p = null;
    try{ p = JSON.parse(zone.value); }catch(e){}
    if (!p || !p.matieres || !p.creations){
      toast("Ce contenu n'est pas une sauvegarde Crochompte complète. Vérifie le fichier ou recopie le texte en entier.");
      return;
    }
    confirmer({
      titre: "Remplacer ton atelier par cette sauvegarde ?",
      texte: "Tout ce qui est actuellement dans ton atelier sera remplacé par le contenu de la sauvegarde :",
      details: [pluriel((p.creations||[]).length, "création"), pluriel((p.pieces||[]).length, "pièce suivie", "pièces suivies"),
                pluriel((p.commandes||[]).length, "commande"), pluriel((p.patrons||[]).length, "patron")],
      bouton: "Remplacer par la sauvegarde", danger: true
    }, function(){
      /* On vérifie d'abord que la sauvegarde se calcule sans erreur : une
         sauvegarde abîmée ne doit jamais remplacer un atelier qui marche. */
      var photos = p._photos && typeof p._photos === "object" ? p._photos : null;
      delete p._photos; delete p._profil;
      var neuf;
      try{
        neuf = migrer(p);
        (neuf.creations || []).forEach(function(c){ calculer(c); });
      }catch(e){
        toast("Cette sauvegarde est abîmée : ton atelier n'a pas été modifié. Essaie avec un autre fichier.");
        return;
      }
      if (neuf.chrono) neuf.chrono.debut = null;
      /* Une sauvegarde ancienne ne fait jamais disparaître une facture émise
         depuis, ni reculer la numérotation. */
      var regActuel = registre(), connus = {};
      if (!Array.isArray(neuf.registreFactures)) neuf.registreFactures = [];
      neuf.registreFactures.forEach(function(x){ connus[x.num] = true; });
      regActuel.forEach(function(x){ if (!connus[x.num]) neuf.registreFactures.push(x); });
      var cptA = state.reglages.compteurFactures || {}, cptN = neuf.reglages.compteurFactures = neuf.reglages.compteurFactures || {};
      Object.keys(cptA).forEach(function(an){ cptN[an] = Math.max(Number(cptN[an])||0, Number(cptA[an])||0); });
      if (!neuf.reglages.codeFacture && state.reglages.codeFacture) neuf.reglages.codeFacture = state.reglages.codeFacture;
      neuf.reinitialiseLe = Date.now();   /* un choix volontaire, même si la sauvegarde est presque vide */
      state = neuf; sauverTout();
      view = vueInitiale();
      render();
      restaurerPhotos(photos).then(function(n){
        if (n) render();
        toast("Sauvegarde restaurée" + (n ? ", avec " + n + " photo" + (n > 1 ? "s" : "") : ""));
      });
    });
  });
  bdR.appendChild(bRest);

  /* L'action irréversible à part, en bas, en rouge — jamais à côté d'un
     bouton qu'on clique tous les jours. */
  var cZero = el('<div class="card zone-sensible"><header><h2>Tout remettre à zéro</h2>'+
    '<p>Efface tes créations, tes matières, tes pièces, tes commandes et tes réglages. C\'est irréversible'+
    (avecCompte ? ', et ton compte en ligne sera vidé lui aussi à la prochaine synchronisation' : '') +
    '. Fais une sauvegarde avant.</p></header><div class="body"></div></div>');
  var bZero = el('<button type="button" class="btn danger">Tout remettre à zéro</button>');
  bZero.addEventListener("click", function(){
    confirmer({
      titre: "Tout effacer ?",
      texte: "Cette action est définitive. Seront effacés :" ,
      details: [pluriel(state.creations.length, "création") + " et leurs calculs",
                pluriel(state.pieces.length, "pièce suivie", "pièces suivies") + " et les ventes notées",
                pluriel(commandes().length, "commande") + " et leurs règlements",
                pluriel(patrons().length, "patron"),
                "tes matières, tes stocks et tous tes réglages"]
        .concat(avecCompte ? ["la copie de ton atelier enregistrée en ligne, dès la prochaine synchronisation"] : [])
        .concat(registre().length ? ["tes " + registre().length + " factures et avoirs sont conservés (obligation de 10 ans)"] : []),
      saisie: "EFFACER",
      bouton: "Tout effacer", danger: true
    }, function(){
      /* Les factures et avoirs émis ne s'effacent pas : obligation de les
         garder 10 ans et de ne jamais reprendre un numéro déjà donné. */
      var garde = {reg: registre(), code: state.reglages.codeFacture, cpt: state.reglages.compteurFactures};
      state = etatInitial();
      state.registreFactures = garde.reg;
      if (garde.code) state.reglages.codeFacture = garde.code;
      if (garde.cpt) state.reglages.compteurFactures = garde.cpt;
      /* Marque de remise à zéro voulue : c'est elle qui autorise cet atelier
         vide à remplacer la version en ligne (qui reste dans l'historique). */
      state.reinitialiseLe = new Date().toISOString();
      sauverTout();
      view = vueInitiale();
      render(); toast("Toutes tes données ont été effacées.");
    });
  });
  cZero.querySelector(".body").appendChild(bZero);

  /* ─── Assemblage : une rubrique à la fois ───
     Tout sur une seule page, c'était onze cartes à faire défiler sans savoir
     où chercher. On range par ce que la personne vient faire, et on dit en
     face de chaque rubrique ce qui reste à compléter. */
  var sections = SECTIONS_REG.filter(function(sc){
    if (sc.siCompte && !pontCompte) return false;
    if (sc.siVend && !vend) return false;
    return true;
  });
  var aFaire = {
    activite: (vend && !r.statut) ? "à compléter" : "",
    charges: !r.confirmeLe ? "à vérifier" : "",
    facturation: (!r.raisonSociale || !r.adresse) ? "à compléter" : ""
  };
  var mobile = !!(window.matchMedia && window.matchMedia("(max-width:720px)").matches);
  var ids = sections.map(function(sc){ return sc.id; });
  if (view.regSection && ids.indexOf(view.regSection) === -1) view.regSection = null;
  var courante = view.regSection || (mobile ? null : ids[0]);

  var wrap = el('<div class="reg' + (mobile ? (courante ? ' reg-detail' : ' reg-liste') : '') + '"></div>');
  var navR = el('<nav class="reg-nav" aria-label="Rubriques des réglages"></nav>');
  sections.forEach(function(sc){
    var b = el('<button type="button" class="reg-item" data-section="'+esc(sc.id)+'">'+
      '<span class="ri-t"><b>'+esc(sc.nom)+'</b>'+
      (aFaire[sc.id] ? '<span class="ri-badge">'+esc(aFaire[sc.id])+'</span>' : '')+'</span>'+
      '<span class="ri-a">'+esc(sc.aide)+'</span></button>');
    if (sc.id === courante) b.setAttribute("aria-current","true");
    b.addEventListener("click", function(){ view.regSection = sc.id; render(); });
    navR.appendChild(b);
  });
  wrap.appendChild(navR);

  if (courante){
    var sc = SECTIONS_REG.filter(function(x){ return x.id === courante; })[0];
    var cont = el('<div class="reg-contenu"></div>');
    if (mobile){
      var bRet = el('<button type="button" class="reg-retour">‹ Tous les réglages</button>');
      bRet.addEventListener("click", function(){ retourParent(function(){ view.regSection = null; }); });
      cont.appendChild(bRet);
    }
    cont.appendChild(el('<div class="reg-tete"><h2>'+esc(sc.nom)+'</h2><p>'+esc(sc.intro)+'</p></div>'));
    var cartes = {
      activite:    [c0, cStat, c1],
      charges:     [c2, c3, cConf],
      canaux:      [cP],
      facturation: [cFact],
      donnees:     [cSauv, cRest, cZero]
    };
    if (courante === "compte"){
      /* La zone n'est créée que quand elle est visible : le module de compte
         y peint ses formulaires, et doit peindre là où on regarde. */
      var zc = el('<div id="zone-compte" style="margin-bottom:16px"></div>');
      cont.appendChild(zc);
      try{ pontCompte(zc); }catch(e){}
    } else {
      (cartes[courante] || []).forEach(function(c){ cont.appendChild(c); });
    }
    if (courante === "activite" || courante === "charges"){
      cont.appendChild(el('<p class="hint" style="margin-top:18px;max-width:75ch">Cet outil ne fait pas de comptabilité '+
        'et ne remplace aucun conseil. Il additionne ce que tu lui donnes et te montre ce qu\'il te reste par heure.</p>'));
    }
    wrap.appendChild(cont);
  }
  main.appendChild(wrap);
}


/* ═════ 15. PIÈCES : LE SUIVI D'ATELIER ═════
   Une pièce = un objet physique, avec son état de fabrication et son état commercial. */

var PROD = [
  {k:"afaire",   nom:"À faire",      c:"var(--s-neutre)"},
  {k:"encours",  nom:"En cours",     c:"var(--s-1)"},
  {k:"retouche", nom:"À retoucher",  c:"var(--s-2)"},
  {k:"termine",  nom:"Terminée",     c:"var(--s-3)"}
];
var COM = [
  {k:"atelier",  nom:"En atelier",      vendable:true},
  {k:"envente",  nom:"En vente",        vendable:true},
  {k:"reserve",  nom:"Réservée",        vendable:true},
  {k:"commande", nom:"Sur commande", vendable:true},
  {k:"vendu",    nom:"Vendue",          vendable:false},
  {k:"offert",   nom:"Offerte / gardée",vendable:false},
  {k:"jete",     nom:"Ratée / jetée",   vendable:false}
];
function libProd(k){ for (var i=0;i<PROD.length;i++) if (PROD[i].k===k) return PROD[i].nom; return k; }
function libCom(k){ for (var i=0;i<COM.length;i++) if (COM[i].k===k) return COM[i].nom; return k; }

function creation(cid){
  for (var i=0;i<state.creations.length;i++) if (state.creations[i].id===cid) return state.creations[i];
  return null;
}
/* Les pièces rangées par création, calculées une fois par affichage :
   parcourir toutes les pièces pour chaque ligne de chaque tableau devenait
   lent dès quelques milliers de pièces. L'index est jeté à chaque rendu et à
   chaque enregistrement, donc jamais périmé. */
var indexPieces = null;
function oublierIndex(){ indexPieces = null; }
/* Le numéro d'une pièce est celui de son ordre de création (N° 1 = la
   première fabriquée) : il ne change plus quand on la modifie. */
function numeroPiece(p){
  var l = piecesDe(p.cid).slice();
  l.sort(function(a, b){ var d = (a.cree || 0) - (b.cree || 0); return d ? d : state.pieces.indexOf(a) - state.pieces.indexOf(b); });
  return l.indexOf(p) + 1;
}
function piecesDe(cid){
  if (!indexPieces || indexPieces.src !== state.pieces || indexPieces.n !== state.pieces.length){
    var m = {};
    state.pieces.forEach(function(p){ (m[p.cid] = m[p.cid] || []).push(p); });
    indexPieces = {src: state.pieces, n: state.pieces.length, m: m};
  }
  return (indexPieces.m[cid] || []).slice();
}
function enStock(cid){
  return piecesDe(cid).filter(function(p){
    return p.prod === "termine" && !horsStock(p);
  }).length;
}
function ajouterPieces(cid, n, prod, com, client){
  var cr = creation(cid); if (!cr) return 0;
  var r = calculer(cr);
  n = Math.max(1, Number(n)||1);
  var sorties = 0, manquants = [];
  for (var i=0;i<n;i++){
    var p = {id:uid(), cid:cid, prod:prod||"afaire", com:com||"atelier",
             cree:Date.now(), maj:Date.now(), termineLe:null, venduLe:null,
             prix:null, canal:cr.canal, client:client||"", note:"", sortie:false,
             coutFige:r.coutRevient, mesure:{prep:0,crochet:0,assemb:0,finition:0,emball:0}, sessions:[]};
    if (p.prod === "termine"){
      manquants = manquants.concat(consommerPour(cr, 1));
      p.sortie = true; p.termineLe = Date.now(); sorties++;
    }
    /* Ajoutée directement « Vendue » : c'est une vente, datée d'aujourd'hui,
       au prix de la fiche (modifiable ensuite dans « Mes créations »). Sans ça, elle
       ne comptait ni dans l'encaissé ni dans le chiffre d'affaires. */
    if (p.com === "vendu"){ p.com = "atelier"; state.pieces.push(p); majCom(p, "vendu"); continue; }
    state.pieces.push(p);
  }
  prevenirManques(manquants.filter(function(v,i,a){ return a.indexOf(v)===i; }));
  return sorties;
}
/* Sort les matières et renvoie celles qui passent en négatif, pour prévenir l'artisan. */
function consommerPour(cr, n){
  var manques = [];
  cr.lignes.forEach(function(l){
    var m = matiere(l.mid); if (!m) return;
    /* Même règle que le calcul du coût : les chutes et ratés s'ajoutent à
       tout sauf à l'emballage, sinon le stock baisse moins que ce qu'on paie. */
    var perte = avecPerte(m) ? (Number(state.reglages.tauxPerte)||0)/100 : 0;
    var besoin = Math.round((Number(l.qte)||0) * n * (1 + perte) * 1000) / 1000;
    if ((Number(m.stock)||0) < besoin) manques.push(m.nom);
    mouvementMatiere(m, "sortie", besoin, null, "Fabrication : " + cr.nom);
  });
  return manques;
}
/* Un seul message, même quand plusieurs pièces sortent d'un coup : les
   matières manquantes s'accumulent et le message existant est mis à jour au
   lieu de s'empiler. La liste se vide dès qu'on ouvre le stock ou qu'on
   ferme le message. */
var manquesEnAttente = [];
function prevenirManques(manques){
  if (!manques || !manques.length) return;
  manques.forEach(function(n){ if (manquesEnAttente.indexOf(n) < 0) manquesEnAttente.push(n); });
  var pile = document.getElementById("toasts");
  if (pile){ [].forEach.call(pile.querySelectorAll(".toast"), function(t){ if (t.__manques) t.remove(); }); }
  var n = manquesEnAttente.length;
  var t = toast(n === 1
    ? "Le stock de « " + manquesEnAttente[0] + " » passe en négatif : note ton achat dans Matières."
    : n + " matières passent en stock négatif (" + manquesEnAttente.slice(0, 2).join(", ") + (n > 2 ? "…" : "") + ") : note tes achats dans Matières.",
    {important:true, libelle:"Voir le stock", fn:function(){ manquesEnAttente = []; view.sub = "stock"; aller("stock"); }});
  if (t) t.__manques = true;
}
function majProd(p, k){
  var cr = creation(p.cid);
  var avantP = p.prod;
  p.prod = k; p.maj = Date.now();
  /* Retouche : à partir de là, le temps chronométré et les matières
     ajoutées s'additionnent au coût de la pièce (voir coutPiece). */
  if (k === "retouche" && avantP !== "retouche"){ p.retouches = p.retouches || []; p.retouches.push({le: Date.now(), note: "", mat: 0, min: 0}); }
  if (k === "termine"){
    p.termineLe = p.termineLe || Date.now();
    if (!p.sortie && cr){
      prevenirManques(consommerPour(cr, 1)); p.sortie = true;
      if (p.reel) appliquerPesee(p, cr, p.reel);
    }
  }
}

/* ═════ ESTIMÉ ET RÉEL ═════
   La fiche est une estimation : les quantités et les temps qu'on pense
   mettre. Chaque pièce terminée peut dire la vérité — le temps chronométré,
   et le fil réellement utilisé (on pèse ce qui reste). Crochompte montre les
   deux côte à côte, puis propose de corriger la fiche avec la moyenne réelle.
   La pesée corrige aussi le stock : la sortie faite à la fin de la pièce
   était une estimation, l'écart est rendu (ou repris) au stock. */
function pesable(m){ return !!m && m.cat !== "fin" && avecPerte(m); }
/* Quantité prévue pour UNE pièce, pertes comprises, par matière. */
function consommationPrevue(cr){
  var q = {};
  var perte = (Number(state.reglages.tauxPerte)||0) / 100;
  cr.lignes.forEach(function(l){
    var m = matiere(l.mid); if (!m) return;
    q[l.mid] = (q[l.mid] || 0) + (Number(l.qte)||0) * (avecPerte(m) ? 1 + perte : 1);
  });
  for (var k in q) q[k] = Math.round(q[k] * 1000) / 1000;
  return q;
}
function appliquerPesee(p, cr, reel){
  var prevu = consommationPrevue(cr);
  p.reel = p.reel || {};
  if (!p.reelApplique) p.reelApplique = {};
  Object.keys(reel).forEach(function(mid){
    var m = matiere(mid); if (!m) return;
    var v = Math.max(0, Number(reel[mid]) || 0);
    p.reel[mid] = v;
    if (!p.sortie) return;   /* pas encore sortie du stock : la pesée s'appliquera à la fin de la pièce */
    var deja = p.reelApplique[mid] !== undefined ? p.reelApplique[mid] : (prevu[mid] || 0);
    var ecart = Math.round((deja - v) * 1000) / 1000;
    if (Math.abs(ecart) > 1e-9){
      mouvementMatiere(m, "correction", ecart, null,
        "Pesée « " + cr.nom + " » : " + qte(v, m.unite) + " utilisés (prévu " + qte(prevu[mid] || 0, m.unite) + ")", {pid: p.id});
    }
    p.reelApplique[mid] = v;
  });
  p.maj = Date.now();
}
/* Coût d'une pièce : prévu (la fiche) et réel (pesée + chronomètre). */
function estimeReelPiece(p, cr){
  var r = calculer(cr);
  var prevu = consommationPrevue(cr);
  var reel = p.reel || {};
  var matReel = r.matieres, pesee = false;
  Object.keys(reel).forEach(function(mid){
    var m = matiere(mid); if (!m || prevu[mid] === undefined) return;
    pesee = true;
    matReel += ((Number(reel[mid]) || 0) - prevu[mid]) * pu(m);
  });
  matReel = cts(matReel);
  var minEst = r.minutes, mesure = minutesMesurees(p) > 0;
  var minReel = mesure ? minutesReellesPiece(p, cr) : minEst;
  var taux = Number(state.reglages.tauxHoraire) || 0;
  var prix = p.com === "vendu" && Number(p.prix) > 0 ? Number(p.prix) : r.prix;
  var hEst = (minEst + (r.minutesIndirectes || 0)) / 60, hReel = (minReel + (r.minutesIndirectes || 0)) / 60;
  var fraisHorsMat = cts(r.fixePiece + r.fraisFixesVente + r.fraisVar + r.cotisations);
  var resteEst = cts(r.prix - r.matieres - fraisHorsMat);
  var resteReel = cts(r.prix - matReel - fraisHorsMat);
  return {
    matEst: r.matieres, matReel: matReel, minEst: minEst, minReel: minReel, pesee: pesee, mesure: mesure,
    coutEst: cts(r.matieres + fraisHorsMat + hEst * taux), coutReel: cts(matReel + fraisHorsMat + hReel * taux),
    gainEst: hEst > 0 ? resteEst / hEst : 0, gainReel: hReel > 0 ? resteReel / hReel : 0, prix: r.prix, prixPiece: prix
  };
}

/* ═════ COÛT D'UNE PIÈCE, POSTE PAR POSTE ═════
   Ce que cette pièce précise a coûté : ses matières (pesées si on l'a fait),
   son temps (chronométré si on l'a fait), son emballage, son transport, ses
   frais de vente et cotisations, et ce qu'ont coûté ses retouches. Face à
   son prix de vente et au prix cible de la fiche, on voit le gain réel. */
function retouchesDe(p){
  var r = {min: 0, mat: 0, n: 0};
  (p.retouches || []).forEach(function(x){ r.n++; r.min += Number(x.min) || 0; r.mat += Number(x.mat) || 0; });
  r.mat = cts(r.mat);
  return r;
}
function coutPiece(p, cr){
  var r = calculer(cr);
  var er = estimeReelPiece(p, cr);
  var ret = retouchesDe(p);
  var taux = Number(state.reglages.tauxHoraire) || 0;
  var fg = p.com === "vendu" && p.fige ? p.fige : null;
  var prix = Number(p.prix) > 0 ? Number(p.prix) : r.prix;
  var jete = p.com === "jete";
  /* Les frais proportionnels au prix (commission, cotisations) se calculent
     sur le prix de CETTE pièce, pas sur celui de la fiche. */
  var crP = clone(cr); crP.prix = prix; if (p.canal) crP.canal = p.canal;
  var rp = calculer(crP);
  /* Matières : réelles si pesées, sinon celles de la fiche ; plus ce que les
     retouches ont consommé. Une pièce ratée vaut ce qu'on a jeté. */
  var matieres = jete ? cts(Number(p.perteFigee) || 0) : cts(er.matReel + ret.mat);
  var emballage = jete ? 0 : r.emballage;
  var transport = jete ? 0 : cts(Math.max(0, Number(cr.expedition) || 0));
  if (fg){
    /* Vente figée : le transport du jour de la vente, s'il a été gardé. */
    var ffv = Number(fg.fraisFixesVente) || 0;
    transport = fg.transport !== undefined ? cts(fg.transport) : cts(Math.min(transport, ffv));
  }
  var minutes = er.mesure ? er.minReel : er.minEst;   /* les minutes de retouche sont déjà dans le chronomètre */
  var heures = (minutes + (r.minutesIndirectes || 0)) / 60;
  var mainOeuvre = cts(heures * taux);
  /* frais de vente = commission, paiement, frais fixes du canal, SANS le
     transport (affiché à part mais compté dans le total). */
  var frVente = jete ? 0 : (fg ? cts(Math.max(0, fg.fraisVente - transport)) : cts(rp.fraisVar + Math.max(0, rp.fraisFixesVente - transport)));
  var cotis = jete ? 0 : (fg ? cts(fg.cotisations) : rp.cotisations);
  var fixe = jete ? 0 : (fg ? cts(fg.fixe) : rp.fixePiece);
  var total = cts(matieres + mainOeuvre + fixe + transport + frVente + cotis);
  var vendu = p.com === "vendu";
  var prixVente = jete ? 0 : prix;
  var horsMO = cts(matieres + fixe + transport + frVente + cotis);
  var reste = cts(prixVente - horsMO);
  var gain = cts(prixVente - total);
  var gainH = heures > 0 ? reste / heures : 0;
  /* Prix cible de CETTE pièce : le prix pour lequel son gain serait nul, donc
     qui paie son temps réel au taux visé. Au-dessus, le gain est positif. */
  var pctV = fg && fg.pctVente !== undefined ? fg.pctVente : rp.pctVente;
  var tCot = fg && fg.tauxCotis !== undefined ? fg.tauxCotis : rp.tauxCotis;
  var denomP = 1 - (Number(pctV) || 0) - (Number(tCot) || 0);
  var ciblePiece = jete || denomP <= 0 ? 0 : ceilCts((matieres + fixe + transport + (fg ? Math.max(0, (Number(fg.fraisFixesVente) || 0) - transport) : Math.max(0, rp.fraisFixesVente - transport)) + mainOeuvre) / denomP);
  var etat;
  if (jete) etat = {k:"bad", t:"Perte"};
  else if (!(prixVente > 0)) etat = {k:"neutre", t:"Prix à fixer"};
  else if (reste < 0) etat = {k:"bad", t:"À perte"};
  else etat = statut(gainH);
  return {matieres: matieres, matieresHorsEmb: cts(matieres - emballage), emballage: emballage, transport: transport,
          mainOeuvre: mainOeuvre, heures: heures, minutes: minutes, tempsMesure: er.mesure, pesee: er.pesee,
          provisoire: pieceProvisoire(p), minutesChrono: minutesMesurees(p),
          fraisVente: frVente, cotisations: cotis, fixe: fixe, total: total, prix: prixVente, prixCible: ciblePiece, prixCibleFiche: r.prixObjectif,
          reste: reste, gain: gain, gainH: gainH, etat: etat, retouche: ret, vendu: vendu, jete: jete, taux: taux,
          matEst: r.matieres, minEst: r.minutes};
}
function dialogueCoutPiece(p){
  var cr = creation(p.cid); if (!cr) return;
  var k = coutPiece(p, cr);
  function l(lib, v, aide){ return '<div class="row"><span>'+esc(lib)+(aide ? '<small>'+esc(aide)+'</small>' : '')+'</span><span>'+esc(eur(v))+'</span></div>'; }
  var h = '<div class="cout-piece">'+
    (k.provisoire ? '<p class="hint" style="margin:0 0 8px">Pièce pas encore terminée : chiffres provisoires. Le temps compté est au moins celui de la fiche ; il sera remplacé par le temps chronométré quand la pièce sera terminée.</p>' : '')+
    l("Matières" + (k.pesee ? " (pesées)" : ""), k.matieresHorsEmb, k.pesee ? "" : "d'après la fiche") +
    l("Conditionnement", k.emballage, "emballage de la fiche") +
    l("Main-d'œuvre", k.mainOeuvre, dureeLisible(k.minutes) + (k.provisoire ? " (temps de la fiche" + (k.minutesChrono > 0 ? ", " + dureeLisible(k.minutesChrono) + " déjà chronométrées" : "") + ")" : k.tempsMesure ? " chronométrées" : " estimées") + " à " + eur(k.taux) + " / h") +
    (k.retouche.n ? l("dont retouches", cts(k.retouche.mat + (k.retouche.min / 60) * k.taux), pluriel(k.retouche.n, "retouche") + " : " + dureeLisible(k.retouche.min) + (k.retouche.mat ? " et " + eur(k.retouche.mat) + " de matières" : "")) : "") +
    l("Transport", k.transport, "expédition de la fiche") +
    l("Frais de vente", k.fraisVente, "commission, paiement, frais fixes du canal") +
    l("Cotisations", k.cotisations, "") +
    (k.fixe ? l("Part des frais fixes", k.fixe, "") : "") +
    '<div class="row tot"><span>Coût de revient complet' + (k.provisoire ? ' (provisoire)' : '') + '</span><span>'+esc(eur(k.total))+'</span></div>'+
    '<div class="row"><span>Prix de vente' + (k.vendu ? " (vendue)" : "") + '</span><span>'+esc(k.prix > 0 ? eur(k.prix) : "—")+'</span></div>'+
    '<div class="row"><span>Prix conseillé d\'après son temps réel<small>le prix qui paierait son temps réel à ton objectif</small></span><span>'+esc(k.prixCible > 0 ? eur(k.prixCible) : "—")+'</span></div>'+
    '<div class="row tot"><span>Gain en plus de ton salaire</span><span class="'+k.etat.k+'">'+esc(eur(k.gain))+'</span></div>'+
    '<div class="row"><span>Ce que cette pièce te paie de l\'heure</span><span class="'+k.etat.k+'">'+esc(k.heures > 0 && k.prix > 0 ? eur(k.gainH) + " / h" : "—")+'</span></div>'+
    '</div>';
  var box = el('<div></div>'); box.innerHTML = h;
  confirmer({titre: "« " + cr.nom + " » : ce que cette pièce a coûté", contenu: box, bouton: "Fermer", sansAnnuler: true}, function(){});
}
/* Passer une pièce en retouche : on note pourquoi, et ce que la retouche
   ajoute en matières. Le temps viendra du chronomètre. */
function dialogueRetouche(p, suite){
  var cr = creation(p.cid);
  dialogueChamps({titre: "Retouche de « " + (cr ? cr.nom : "la pièce") + " »",
    texte: "Ce que tu ajoutes s'additionne au coût de la pièce. Le temps de retouche se chronomètre comme le reste.",
    champs: [{id:"note", lib:"Ce qu'il y a à reprendre (facultatif)", placeholder:"oreille décousue, taille à refaire…", max:120},
             {id:"mat", lib:"Matières ajoutées (€, facultatif)", type:"number", inputmode:"decimal", placeholder:"0"}],
    bouton: "Noter la retouche", annuler: "Annuler"}, function(v){
    var ret = p.retouches && p.retouches.length ? p.retouches[p.retouches.length - 1] : null;
    if (ret){ ret.note = v.note; ret.mat = Math.max(0, lireNombre(v.mat) || 0); }
    if (suite) suite();
  });
}
/* Moyenne réelle d'une création, sur ses pièces pesées ou chronométrées. */
function bilanReel(cid){
  var cr = creation(cid); if (!cr) return null;
  var prevu = consommationPrevue(cr);
  var somme = {}, n = {}, nPesees = 0, nPieces = 0, coutE = 0, coutR = 0, gE = 0, gR = 0;
  piecesDe(cid).forEach(function(p){
    if (p.prod !== "termine") return;
    var aReel = p.reel && Object.keys(p.reel).length, aMes = minutesMesurees(p) > 0;
    if (!aReel && !aMes) return;
    nPieces++;
    if (aReel){ nPesees++; Object.keys(p.reel).forEach(function(mid){ if (prevu[mid] === undefined) return;
      somme[mid] = (somme[mid] || 0) + (Number(p.reel[mid]) || 0); n[mid] = (n[mid] || 0) + 1; }); }
    var er = estimeReelPiece(p, cr);
    coutE += er.coutEst; coutR += er.coutReel; gE += er.gainEst; gR += er.gainReel;
  });
  if (!nPieces) return {n: 0};
  var moy = {};
  Object.keys(somme).forEach(function(mid){ moy[mid] = somme[mid] / n[mid]; });
  var matE = 0, matR = 0;
  Object.keys(moy).forEach(function(mid){ var m = matiere(mid); if (!m) return; matE += prevu[mid] * pu(m); matR += moy[mid] * pu(m); });
  return {n: nPieces, nPesees: nPesees, prevu: prevu, moy: moy, nParMat: n, matPrevuPese: cts(matE), matReelPese: cts(matR),
          coutEst: cts(coutE / nPieces), coutReel: cts(coutR / nPieces), gainEst: gE / nPieces, gainReel: gR / nPieces};
}
function dialogueReel(p){
  var cr = creation(p.cid); if (!cr) return;
  var prevu = consommationPrevue(cr);
  var mids = Object.keys(prevu).filter(function(mid){ return pesable(matiere(mid)); });
  var box = el('<div></div>');
  if (mids.length){
    box.appendChild(el('<p class="hint" style="margin:0 0 8px">Pèse ce qui reste de chaque pelote et retire-le de ce que tu avais au départ : '+
      'c\'est la quantité réellement utilisée, bouts et essais compris. Laisse vide ce que tu n\'as pas pesé.</p>'));
    var t = el('<div class="tablewrap"><table><thead><tr><th>Matière</th><th class="n">Prévu</th><th class="n">Réellement utilisé</th></tr></thead><tbody></tbody></table></div>');
    mids.forEach(function(mid){
      var m = matiere(mid);
      var v = p.reel && p.reel[mid] !== undefined ? p.reel[mid] : "";
      t.querySelector("tbody").appendChild(el('<tr><td>'+esc(m.nom)+'</td><td class="n">'+esc(qte(prevu[mid], m.unite))+'</td>'+
        '<td class="n"><span class="qte-u" style="justify-content:flex-end"><input type="number" inputmode="decimal" min="0" step="1" data-reel="'+esc(mid)+'" '+
        'aria-label="Quantité de '+esc(m.nom)+' réellement utilisée, en '+esc(m.unite)+'" value="'+v+'" placeholder="'+esc(nb(prevu[mid]))+'" style="width:90px;text-align:right">'+
        '<span class="u" aria-hidden="true">'+esc(m.unite)+'</span></span></td></tr>'));
    });
    box.appendChild(t);
  } else {
    box.appendChild(el('<p class="hint" style="margin:0 0 8px">Cette création n\'utilise que des articles comptés à l\'unité : rien à peser.</p>'));
  }
  var synth = el('<div class="tpsbox" style="margin-top:12px"></div>');
  box.appendChild(synth);
  function lire(){
    var reel = {};
    [].forEach.call(box.querySelectorAll("[data-reel]"), function(inp){
      if (String(inp.value).trim() !== "") reel[inp.getAttribute("data-reel")] = Math.max(0, lireNombre(inp.value) || 0);
    });
    return reel;
  }
  function peindre(){
    var copie = clone(p); copie.reel = lire();
    var er = estimeReelPiece(copie, cr);
    var ecartC = er.coutReel - er.coutEst;
    synth.innerHTML =
      '<div class="c"><span>Matières</span><b>'+esc(eur(er.matEst))+' → '+esc(eur(er.matReel))+'</b></div>'+
      '<div class="c"><span>Temps</span><b>'+esc(dureeTexte(er.minEst))+' → '+esc(dureeTexte(er.minReel))+'</b>'+
        (!er.mesure ? '<span class="hint" style="font-size:11px">pas chronométrée</span>'
          : pieceProvisoire(copie) ? '<span class="hint" style="font-size:11px">pas terminée : au moins le temps de la fiche ('+esc(dureeTexte(minutesMesurees(copie)))+' chronométrées)</span>' : '')+'</div>'+
      '<div class="c"><span>Coût complet (ton temps payé)</span><b style="color:'+(ecartC > 0.005 ? 'var(--bad)' : ecartC < -0.005 ? 'var(--good)' : 'inherit')+'">'+
        esc(eur(er.coutEst))+' → '+esc(eur(er.coutReel))+'</b></div>'+
      '<div class="c"><span>Gain de l\'heure à '+esc(eur(er.prix))+'</span><b>'+esc(eur(er.gainEst))+' → '+esc(eur(er.gainReel))+'</b></div>';
  }
  box.addEventListener("input", peindre);
  peindre();
  dialogueChamps({titre:"« " + cr.nom + " » : prévu et réel", texte: p.sortie ? "" : "La pièce n'est pas encore terminée : la pesée s'appliquera au stock quand elle le sera.",
    contenu: box, large: true, bouton:"Enregistrer", annuler:"Fermer"}, function(){
    var reel = lire();
    if (!Object.keys(reel).length){ toast("Rien de pesé : aucune quantité notée."); return; }
    appliquerPesee(p, cr, reel);
    sauverTout(); render();
    toast(p.sortie ? "Quantités réelles notées ; le stock est corrigé de l'écart." : "Quantités réelles notées.");
  });
}
/* Une vente passée se fige : ce qu'elle a rapporté ne doit pas changer
   parce que le prix du fil ou ton taux horaire changent six mois plus tard.
   Le temps retenu est le temps MESURÉ au chronomètre s'il existe. */
function figerVente(cr, prix, canalId, minutesMesurees){
  var copie = clone(cr); copie.prix = prix; if (canalId) copie.canal = canalId;
  var r = calculer(copie);
  var minutes = minutesMesurees > 0 ? minutesMesurees : r.minutes;
  var heures = (minutes + (r.minutesIndirectes || 0)) / 60;
  return {le: Date.now(), prix: r.prix, canal: copie.canal, matieres: r.matieres, fraisVente: cts(r.fraisVar + r.fraisFixesVente),
          fixe: r.fixePiece, cotisations: r.cotisations, reste: r.reste, minutes: minutes, tempsMesure: minutesMesurees > 0,
          transport: cts(Math.max(0, Number(cr.expedition) || 0)),
          gainHoraire: heures > 0 ? r.reste / heures : 0, tauxHoraire: Number(state.reglages.tauxHoraire)||0,
          heures: heures, fraisFixesVente: r.fraisFixesVente, pctVente: r.pctVente, tauxCotis: r.tauxCotis};
}
/* Corriger le PRIX d'une vente déjà figée : seules les lignes qui dépendent
   du prix changent (cotisations, frais de vente en %, reste, gain de
   l'heure), avec les taux du jour de la vente. Matières, frais fixes, temps
   et taux horaire restent ceux de la vente : corriger une faute de frappe
   ne réécrit pas l'historique aux prix d'aujourd'hui. */
function reprixVente(fg, cr, prix, canalId){
  var px = cts(Math.max(0, Number(prix)||0));
  var pct = fg.pctVente, tc = fg.tauxCotis, ffv = fg.fraisFixesVente;
  if (pct === undefined || tc === undefined || ffv === undefined){
    /* Vente figée avant la V37 : les taux n'étaient pas gardés, on prend
       ceux d'aujourd'hui pour ces seules lignes. */
    var copie = clone(cr); copie.prix = px; if (canalId) copie.canal = canalId;
    var r0 = calculer(copie); pct = r0.pctVente; tc = r0.tauxCotis; ffv = r0.fraisFixesVente;
  }
  var fraisVar = cts(px * pct), cot = cts(px * tc);
  var reste = cts(px - ((Number(fg.matieres)||0) + (Number(fg.fixe)||0) + ffv + fraisVar + cot));
  var heures = fg.heures !== undefined ? fg.heures
             : (fg.gainHoraire ? fg.reste / fg.gainHoraire : (Number(fg.minutes)||0) / 60);
  var n = clone(fg);
  n.prix = px; n.fraisVente = cts(ffv + fraisVar); n.cotisations = cot; n.reste = reste;
  n.gainHoraire = heures > 0 ? reste / heures : 0; n.heures = heures;
  n.fraisFixesVente = ffv; n.pctVente = pct; n.tauxCotis = tc; n.prixCorrigeLe = Date.now();
  return n;
}
function commandeLiee(p){ return p.cmdId ? commande(p.cmdId) : null; }
function majCom(p, k, prix){
  var avant = p.com;
  p.com = k; p.maj = Date.now();
  /* Une pièce qui n'est plus vendue (erreur de statut, vente annulée) n'a
     plus de date ni de chiffres de vente, et n'est plus reliée à la
     commande : si elle est revendue, ce sera à sa vraie date. */
  /* Pièce ratée et jetée : ce qu'elle a coûté en matières devient une perte,
     figée au jour où on la jette. La remettre en stock annule la perte. */
  if (k === "jete" && avant !== "jete"){
    var crJ = creation(p.cid);
    p.jeteLe = Date.now();
    p.perteFigee = crJ ? calculer(crJ).matieres : 0;
  } else if (avant === "jete" && k !== "jete"){ p.jeteLe = null; p.perteFigee = null; }
  if (avant === "vendu" && k !== "vendu"){
    p.venduLe = null; p.fige = null; p.coutFige = null;
    var cl = commandeLiee(p);
    if (cl){ if (cl.pieceId === p.id) cl.pieceId = null; journaliser(cl, "Pièce détachée de la commande (elle n'est plus vendue)"); }
    p.cmdId = null;
  }
  if (k === "vendu"){
    var cr = creation(p.cid);
    p.venduLe = p.venduLe || Date.now();
    if (p.prix === null) p.prix = (typeof prix === "number") ? prix : (cr ? Number(cr.prix)||0 : 0);
    /* Pièce faite pour une commande cliente : l'argent est compté dans la
       commande (ses paiements), pas une deuxième fois ici. */
    if (avant === "commande" && !p.cmdId){
      var cands = commandes().filter(function(c){ return attendPiece(c, p.cid); });
      /* Plusieurs commandes de cette création attendent une pièce : la plus
         ancienne à livrer d'abord (échéance, puis date de commande). */
      cands.sort(function(a, b){
        var ea = a.datePromise || "9999", eb = b.datePromise || "9999";
        if (ea !== eb) return ea < eb ? -1 : 1;
        var da = a.dateCommande || "", db = b.dateCommande || "";
        return da < db ? -1 : da > db ? 1 : 0;
      });
      if (cands.length){ p.cmdId = cands[0].id; if (!cands[0].pieceId) cands[0].pieceId = p.id; journaliser(cands[0], "Pièce reliée à la commande"); }
    }
    if (cr) p.fige = figerVente(cr, Number(p.prix)||0, p.canal || cr.canal, minutesMesurees(p) > 0 ? minutesReellesPiece(p, cr) : 0);
    /* Le coût figé à la production peut dater d'avant que le prix de vente
       ne soit fixé (cotisations et frais variables du canal, proportionnels
       au prix, comptaient alors pour zéro). Au moment de la vente, le prix
       réel est connu : on refige le coût dessus pour que la marge affichée
       dans les Indicateurs reflète la vente réellement faite. */
    if (cr){
      var crVendu = clone(cr); crVendu.prix = p.prix;
      p.coutFige = calculer(crVendu).coutRevient;
    }
    if (p.prod !== "termine") majProd(p, "termine");
  }
}
function supprimerPiece(id){ state.pieces = state.pieces.filter(function(p){ return p.id !== id; }); verifierChrono(); }
/* Supprimer une création emporte ses pièces : sans ça le suivi se remplit
   de lignes « Création supprimée » impossibles à interpréter. */
function supprimerCreation(cid){
  var n = piecesDe(cid).length;
  var cr = creation(cid);
  if (cr && cr.photo) effacerPhoto(cr.photo);
  state.pieces = state.pieces.filter(function(p){ return p.cid !== cid; });
  state.creations = state.creations.filter(function(c){ return c.id !== cid; });
  verifierChrono();
  return n;
}

/* Valeurs d'ensemble */
function statsPieces(){
  var s = {total:0, parProd:{}, parCom:{}, stock:0, vendues:0, ca:0, coutVendu:0, valStock:0, valStockPrix:0};
  PROD.forEach(function(x){ s.parProd[x.k] = 0; });
  COM.forEach(function(x){ s.parCom[x.k] = 0; });
  state.pieces.forEach(function(p){
    s.total++;
    if (s.parProd[p.prod] !== undefined) s.parProd[p.prod]++;
    if (s.parCom[p.com] !== undefined) s.parCom[p.com]++;
    var cr = creation(p.cid);
    if (p.com === "vendu"){
      s.vendues++;
      /* Reliée à une commande : l'argent est compté dans la commande (ses
         paiements), comme dans les Indicateurs. */
      if (!commandeLiee(p)){ s.ca += Number(p.prix)||0; s.coutVendu += Number(p.coutFige)||0; }
    } else if (p.prod === "termine" && !horsStock(p)){
      s.stock++; s.valStock += Number(p.coutFige) || (cr ? calculer(cr).coutRevient : 0); s.valStockPrix += cr ? (Number(cr.prix)||0) : 0;
    }
  });
  return s;
}
/* Une création archivée disparaît des listes et des choix, mais son
   historique (ventes, commandes, indicateurs) reste intact. */
function creationsActives(){ return state.creations.filter(function(c){ return !c.archive; }); }
function aDeLHistorique(cid){
  return state.pieces.some(function(p){ return p.cid === cid && p.com === "vendu"; }) ||
         commandes().some(function(c){ return commandeContient(c, cid) && (c.statut !== "devis" || c.factureNum); });
}
function alertesFinis(){
  return creationsActives().filter(function(c){
    var seuil = Number(c.seuilFini)||0;
    return seuil > 0 && enStock(c.id) < seuil;
  });
}

/* ═════ 16. SÉRIES TEMPORELLES ═════ */

var PERIODES = [
  {k:"jour",    nom:"Par jour",     n:14,  pas:864e5},
  {k:"semaine", nom:"Par semaine",  n:12,  pas:7*864e5},
  {k:"mois",    nom:"Par mois",     n:12,  pas:0},
  {k:"annee",   nom:"Par année",    n:5,   pas:0}
];
function debutPeriode(ts, k){
  var d = new Date(ts);
  d.setHours(0,0,0,0);
  if (k === "semaine"){ var j = (d.getDay()+6)%7; d.setDate(d.getDate()-j); }
  else if (k === "mois"){ d.setDate(1); }
  else if (k === "annee"){ d.setMonth(0,1); }
  return d.getTime();
}
function reculer(ts, k, n){
  var d = new Date(ts);
  if (k === "jour") d.setDate(d.getDate()-n);
  else if (k === "semaine") d.setDate(d.getDate()-7*n);
  else if (k === "mois") d.setMonth(d.getMonth()-n);
  else d.setFullYear(d.getFullYear()-n);
  return debutPeriode(d.getTime(), k);
}
function libPeriode(ts, k){
  var d = new Date(ts);
  if (k === "jour")    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
  if (k === "semaine") return "s. "+d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"});
  if (k === "mois")    return d.toLocaleDateString("fr-FR",{month:"short",year:"2-digit"});
  return String(d.getFullYear());
}
/* Construit les N derniers seaux de la période demandée. */
function seaux(k, n){
  var maintenant = debutPeriode(Date.now(), k);
  var out = [];
  for (var i=n-1;i>=0;i--) out.push({t:reculer(maintenant, k, i), lib:"", v:0, v2:0});
  out.forEach(function(s){ s.lib = libPeriode(s.t, k); });
  return out;
}
function rangerDans(sx, ts, champ, valeur){
  if (!ts) return;
  for (var i=sx.length-1;i>=0;i--){
    if (ts >= sx[i].t){ sx[i][champ] += valeur; return; }
  }
}


/* ═════ 17. PAGE ATELIER ═════ */

function bilanCreation(cid){
  var b = {stock:0, enCours:0, vendues:0, ca:0, offertes:0, commandes:0, total:0};
  state.pieces.forEach(function(p){
    if (p.cid !== cid) return;
    b.total++;
    if (p.com === "vendu"){ b.vendues++; if (!commandeLiee(p)) b.ca += Number(p.prix)||0; }
    else if (p.com === "offert") b.offertes++;
    else if (p.com === "jete") b.jetees = (b.jetees || 0) + 1;
    else if (p.prod === "termine") b.stock++;
    else b.enCours++;
    if (p.com === "commande") b.commandes++;
  });
  return b;
}

/* ═════ 18. GRAPHIQUES ═════
   Palette catégorielle validée (écarts CVD et vision normale vérifiés sur les deux fonds). */


/* Barres groupées dans le temps. series = [{nom, champ, couleur, fmt}] */
function barTemporel(sx, series, fmtVal){
  var W = 720, H = 220, mT = 18, mB = 34, mL = 54, mR = 8;
  var iw = W - mL - mR, ih = H - mT - mB;
  var max = 0;
  sx.forEach(function(s){ series.forEach(function(se){ max = Math.max(max, s[se.champ]||0); }); });
  if (max <= 0) max = 1;
  var pas = iw / sx.length;
  var nb = series.length;
  var largeur = Math.max(3, Math.min(22, (pas - 8) / nb - 2));

  var g = '';
  /* grille discrète : 3 repères */
  for (var k=0;k<=2;k++){
    var v = max * k / 2;
    var y = mT + ih - (v/max)*ih;
    g += '<line x1="'+mL+'" y1="'+y.toFixed(1)+'" x2="'+(W-mR)+'" y2="'+y.toFixed(1)+'" stroke="var(--rule)" stroke-width="1"/>';
    g += '<text x="'+(mL-8)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end" font-size="10" fill="var(--muted)">'+esc(fmtVal(v,true))+'</text>';
  }
  sx.forEach(function(s, i){
    var x0 = mL + i*pas + (pas - (largeur+2)*nb)/2;
    series.forEach(function(se, j){
      var v = s[se.champ]||0;
      var h = Math.max(v > 0 ? 2 : 0, (v/max)*ih);
      var x = x0 + j*(largeur+2);
      var y = mT + ih - h;
      if (h > 0){
        /* extrémité de donnée arrondie, pied ancré carré sur la ligne de base */
        var rr = Math.min(4, largeur/2, h);
        var d = "M"+x.toFixed(1)+" "+(y+h).toFixed(1)+
                "V"+(y+rr).toFixed(1)+"a"+rr+" "+rr+" 0 0 1 "+rr+" -"+rr+
                "h"+(largeur-2*rr).toFixed(1)+"a"+rr+" "+rr+" 0 0 1 "+rr+" "+rr+
                "V"+(y+h).toFixed(1)+"Z";
        g += '<path d="'+d+'" fill="'+se.couleur+'"><title>'+esc(s.lib+" · "+se.nom+" : "+fmtVal(v))+'</title></path>';
      }
    });
    if (sx.length <= 14 || i % 2 === 0){
      g += '<text x="'+(mL + i*pas + pas/2).toFixed(1)+'" y="'+(H-12)+'" text-anchor="middle" font-size="10" fill="var(--muted)">'+esc(s.lib)+'</text>';
    }
  });
  g += '<line x1="'+mL+'" y1="'+(mT+ih)+'" x2="'+(W-mR)+'" y2="'+(mT+ih)+'" stroke="var(--rule-strong)" stroke-width="1"/>';
  var nomGraph = "Graphique : " + series.map(function(se){ return se.nom; }).join(", ") + " sur " + sx.length + " période" + (sx.length > 1 ? "s" : "") +
    " (" + sx.map(function(x){ return x.lib; }).slice(0, 3).join(", ") + (sx.length > 3 ? "…" : "") + "). Le détail de chaque barre s'affiche au survol.";
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="auto" role="img" aria-label="'+esc(nomGraph)+'" style="display:block;overflow:visible">'+g+'</svg>';
}

/* Barres horizontales avec étiquette de valeur directe. items = [{lib, val, couleur}] */

/* Une seule barre segmentée : l'œil compare des largeurs, pas des nombres. */
function barreRepartition(items){
  var tot = 0; items.forEach(function(i){ tot += i.val||0; });
  if (!tot) return '<p class="hint" style="margin:0">Aucune pièce suivie pour l\'instant.</p>';
  var h = '<div class="pipe">';
  items.forEach(function(i){
    if (!i.val) return;
    var pc = i.val/tot*100;
    h += '<span style="width:'+pc.toFixed(2)+'%;background:'+i.couleur+'" title="'+esc(i.lib+' : '+i.val)+'">'+
         (pc > 11 ? i.val : '')+'</span>';
  });
  h += '</div><div class="pipeleg">';
  items.forEach(function(i){
    h += '<span style="display:inline-flex;align-items:center;gap:6px">'+
         '<span style="width:10px;height:10px;border-radius:3px;background:'+i.couleur+';display:inline-block"></span>'+
         esc(i.lib)+' <b>'+i.val+'</b></span>';
  });
  return h + '</div>';
}

function legende(series){
  var h = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px">';
  series.forEach(function(s){
    h += '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--muted)">'+
         '<span style="width:10px;height:10px;border-radius:3px;background:'+s.couleur+';display:inline-block"></span>'+esc(s.nom)+'</span>';
  });
  return h + '</div>';
}

/* ═════ 19. PAGE INDICATEURS ═════ */

/* La carte des seuils. Elle prévient AVANT, parce qu'un seuil franchi ne se
   rattrape pas : on l'apprend en général au moment de la déclaration, quand
   il est trop tard pour ajuster ses prix ou étaler ses ventes. */
function origineCA(ca){
  var parts = [];
  if (ca.pieces > 0) parts.push(esc(eur(ca.pieces)) + " de pièces vendues dans « Mes créations »");
  if (ca.commandes > 0) parts.push(esc(eur(ca.commandes)) + " encaissés sur tes commandes (arrhes, acomptes, soldes)");
  return parts.length ? parts.join(" et ") : "aucun encaissement pour l'instant cette année";
}
/* ═════ REGISTRES ═════
   Le livre des recettes et le registre des achats, tenus obligatoirement en
   micro-entreprise. Ils se déduisent de ce qui est déjà saisi : ventes,
   règlements de commandes, achats de matières, frais de stand. */
function anneeDe(t){ return t ? new Date(t).getFullYear() : null; }
function livreRecettes(annee){
  var l = [];
  (state.pieces||[]).forEach(function(p){
    if (p.com !== "vendu" || !p.venduLe || commandeLiee(p)) return;
    if (anneeDe(p.venduLe) !== annee) return;
    var cr = creation(p.cid);
    l.push({t:p.venduLe, ref:"Vente" + (p.marche ? " (marché)" : ""), qui:p.client || "Vente au comptant", nature:"Vente de " + (cr ? cr.nom : "pièce") + " (marchandise)", montant:Number(p.prix)||0, moyen:libelleMoyen(p.paiement)});
  });
  commandes().forEach(function(c){
    var qui = (c.client && c.client.nom) || "Sans nom", ref = c.factureNum ? "Facture " + c.factureNum : "Commande " + (c.num || "");
    var v = c.versement || {}, mv = Number(v.montant)||0, tv = dateVersTs(v.date) || dateVersTs(c.dateCommande);
    if (mv > 0 && anneeDe(tv) === annee) l.push({t:tv, ref:ref, qui:qui, nature:(v.type === "arrhes" ? "Arrhes" : "Acompte") + " sur commande", montant:mv, moyen:"—"});
    (c.paiements||[]).forEach(function(pp){
      var m = Number(pp.montant)||0; if (!m) return;
      var tp = dateVersTs(pp.date) || pp.saisiLe || null;
      if (anneeDe(tp) !== annee) return;
      l.push({t:tp, ref:ref, qui:qui, nature: m < 0 ? "Remboursement" : "Règlement de commande (marchandise)", montant:m, moyen: m < 0 ? (pp.moyen === "remboursement" ? "—" : libelleMoyen(pp.moyen)) : libelleMoyen(pp.moyen)});
    });
  });
  l.sort(function(a, b){ return a.t - b.t; });
  return l;
}
function registreAchats(annee){
  var l = [];
  (state.matieres||[]).forEach(function(m){
    (m.mouv||[]).forEach(function(mv){
      if (mv.t !== "entree" || mv.annule || !(Number(mv.p) > 0) || mv.est) return;
      if (anneeDe(mv.d) !== annee) return;
      var f = mv.f ? fournisseur(mv.f) : null;
      l.push({t:mv.d, ref:mv.n || "Achat", qui:f ? f.nom : "—", nature:"Matière : " + m.nom + " (" + qte(mv.q, m.unite) + ")", montant:Number(mv.p)||0, moyen:"—"});
    });
  });
  (state.marches||[]).forEach(function(mk){
    var f = Number(mk.frais)||0; if (!(f > 0)) return;
    var t = dateVersTs(mk.date); if (anneeDe(t) !== annee) return;
    l.push({t:t, ref:"Marché", qui:mk.lieu || "—", nature:"Frais de stand", montant:f, moyen:"—"});
  });
  l.sort(function(a, b){ return a.t - b.t; });
  return l;
}
function exporterRegistre(nom, titre, lignes){
  var rows = [["Date","Référence","Client ou fournisseur","Nature","Montant (€)","Mode de règlement"]];
  lignes.forEach(function(x){ rows.push([new Date(x.t).toLocaleDateString("fr-FR"), x.ref, x.qui, x.nature, cts(x.montant).toFixed(2).replace(".", ","), x.moyen]); });
  var cellule = function(v, i){ v = String(v); if (i !== 4 && /^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  var csv = "\ufeff" + rows.map(function(r){ return r.map(cellule).join(";"); }).join("\r\n");
  var url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
  var a = document.createElement("a"); a.href = url; a.download = nom + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}
function imprimerRegistre(titre, annee, lignes){
  var total = lignes.reduce(function(a, x){ return a + x.montant; }, 0);
  var r = state.reglages;
  var h = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+esc(titre)+' '+annee+'</title>'+
    '<style>body{font:13px/1.4 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 12px;color:#444}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#555}td.n,th.n{text-align:right;white-space:nowrap}tfoot td{font-weight:600}.barre{margin:16px 0}@media print{.barre{display:none}}</style></head><body>'+
    '<h1>'+esc(titre)+' — '+annee+'</h1><p>'+esc(r.raisonSociale || "")+(r.siret ? ' · SIRET ' + esc(r.siret) : '')+' · édité le '+new Date().toLocaleDateString("fr-FR")+' avec Crochompte</p>'+
    '<table><thead><tr><th>Date</th><th>Référence</th><th>Client ou fournisseur</th><th>Nature</th><th class="n">Montant</th><th>Règlement</th></tr></thead><tbody>'+
    lignes.map(function(x){ return '<tr><td>'+esc(new Date(x.t).toLocaleDateString("fr-FR"))+'</td><td>'+esc(x.ref)+'</td><td>'+esc(x.qui)+'</td><td>'+esc(x.nature)+'</td><td class="n">'+esc(eur(x.montant))+'</td><td>'+esc(x.moyen)+'</td></tr>'; }).join("")+
    '</tbody><tfoot><tr><td colspan="4">Total</td><td class="n">'+esc(eur(total))+'</td><td></td></tr></tfoot></table>'+
    '<div class="barre"><button onclick="window.print()">Imprimer ou enregistrer en PDF</button></div></body></html>';
  var w = window.open("", "_blank");
  if (!w){ toast("Ton navigateur a bloqué la fenêtre : autorise les pop-up pour ce site."); return; }
  w.document.open(); w.document.write(h); w.document.close();
}
function carteRegistres(){
  var annee = view.regAnnee || new Date().getFullYear();
  var rec = livreRecettes(annee), ach = registreAchats(annee);
  var tR = rec.reduce(function(a, x){ return a + x.montant; }, 0), tA = ach.reduce(function(a, x){ return a + x.montant; }, 0);
  var c = el('<div class="card" style="margin-bottom:18px"><header><h2>Tes registres</h2>'+
    '<p>Le <b>livre des recettes</b> et le <b>registre des achats</b> sont obligatoires en micro-entreprise. Ils se remplissent tout seuls avec tes ventes, tes règlements et tes achats de matières : il n\'y a qu\'à les télécharger.</p></header>'+
    '<div class="body"><div class="savebar" style="margin:0 0 12px;align-items:center"><label class="f" style="margin:0"><span>Année</span><select id="reg-annee"></select></label></div>'+
    '<div class="reg-2"><div class="reg-bloc"><h3>Livre des recettes</h3><p class="hint">'+esc(pluriel(rec.length, "ligne"))+' · '+esc(eur(tR))+' encaissés en '+annee+'</p><div class="reg-act"></div></div>'+
    '<div class="reg-bloc"><h3>Registre des achats</h3><p class="hint">'+esc(pluriel(ach.length, "ligne"))+' · '+esc(eur(tA))+' d\'achats en '+annee+' (matières au prix payé, frais de stand)</p><div class="reg-act"></div></div></div>'+
    '<p class="hint" style="margin:12px 0 0">Les achats sans prix noté, estimés au prix de la fiche, n\'y figurent pas : note le prix de tes tickets dans Matières. À conserver 10 ans, comme tes factures.</p></div></div>');
  var sel = c.querySelector("#reg-annee"), y0 = new Date().getFullYear();
  for (var y = y0; y >= y0 - 5; y--) sel.appendChild(el('<option value="'+y+'"'+(y === annee ? ' selected' : '')+'>'+y+'</option>'));
  sel.addEventListener("change", function(){ view.regAnnee = Number(sel.value); render(); });
  var acts = c.querySelectorAll(".reg-act");
  acts[0].appendChild(bouton("Télécharger (tableur)", function(){ exporterRegistre("crochompte-livre-recettes-" + annee, "Livre des recettes", rec); }));
  acts[0].appendChild(bouton("Imprimer / PDF", function(){ imprimerRegistre("Livre des recettes", annee, rec); }));
  acts[1].appendChild(bouton("Télécharger (tableur)", function(){ exporterRegistre("crochompte-registre-achats-" + annee, "Registre des achats", ach); }));
  acts[1].appendChild(bouton("Imprimer / PDF", function(){ imprimerRegistre("Registre des achats", annee, ach); }));
  return c;
}
function carteSeuils(){
  var ca = caAnnuel();
  var sl = seuilsDuStatut();
  if (!state.reglages.statut){
    var cS = el('<div class="card" style="margin-bottom:18px"><header><h2>Tes seuils</h2>'+
      '<p>Choisis ton statut pour que l\'outil surveille tes plafonds '+
      'de TVA et de régime micro.</p></header><div class="body"></div></div>');
    cS.querySelector(".body").appendChild(bouton("Choisir mon statut", function(){ view.regSection = "activite"; aller("reglages"); }, true));
    return cS;
  }
  /* Deux paliers de vigilance : on alerte à 80 % du seuil, et on signale le
     dépassement. Entre les deux, on informe sans dramatiser. */
  function jaugeSeuil(titre, montant, seuil, majore, aide, perdue){
    var pct = seuil > 0 ? Math.min(100, montant / seuil * 100) : 0;
    var etat = perdue || montant > seuil ? "depasse" : (pct >= 80 ? "proche" : "ok");
    var coul = etat === "depasse" ? "var(--bad)" : etat === "proche" ? "var(--warn)" : "var(--good)";
    var reste = seuil - montant;
    return '<div style="margin-bottom:18px">'+
      '<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline">'+
        '<b>'+esc(titre)+'</b>'+
        '<span style="font-variant-numeric:tabular-nums">'+esc(eur(montant))+
        ' <span class="hint">sur '+esc(eurRond(seuil))+'</span></span>'+
      '</div>'+
      '<div class="jauge" style="margin:6px 0 4px"><i style="width:'+pct.toFixed(1)+'%;background:'+coul+'"></i></div>'+
      '<p class="hint" style="margin:0">'+
        (perdue
          ? '<b style="color:var(--bad)">' + esc(perdue) + '</b> '
          : etat === "depasse"
          ? '<b style="color:var(--bad)">Seuil franchi.</b> ' + (majore && montant <= majore ? 'La franchise reste acquise cette année tant que tu restes sous ' + esc(eurRond(majore)) + ', puis tombe au 1er janvier. ' : '')
          : etat === "proche"
            ? '<b style="color:var(--warn)">Il te reste '+esc(eur(reste))+'.</b> '
            : 'Il te reste '+esc(eur(reste))+' avant ce seuil. ')+
        esc(aide)+
        (majore ? ' Tolérance jusqu\'à '+esc(eurRond(majore))+' sur une année.' : '')+
      '</p></div>';
  }

  var c = el('<div class="card" style="margin-bottom:18px"><header>'+
    '<h2>Tes seuils '+ca.annee+'</h2>'+
    '<p>Ce que tu as encaissé cette année, face aux plafonds de ton statut '+
    '('+esc(sl.nom)+').</p></header><div class="body">'+
    jaugeSeuil("Franchise de TVA", ca.total, sl.tva, sl.tvaMajore,
      "Au-delà, tu dois facturer la TVA : ton prix de vente change, et la mention "+
      "« TVA non applicable » disparaît de tes factures.",
      caAnnuel(ca.annee - 1).total > sl.tva ? "Franchise perdue depuis le 1er janvier (seuil dépassé l'an dernier)." :
      (sl.tvaMajore && ca.total > sl.tvaMajore ? "Seuil majoré dépassé : la TVA est due dès maintenant." : ""))+
    jaugeSeuil("Plafond du régime micro", ca.total, sl.micro, null,
      "Au-delà, tu sors du régime micro-entreprise et passes au régime réel.")+
    '<p class="hint" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--rule)">'+
    '<b>Ce total vient de :</b> '+origineCA(ca)+'.'+
    (ca.pieces > 0 && ca.commandes > 0 ? ' Une pièce suivie dans « Mes créations » et faite pour une commande n\'est comptée qu\'une fois, dans la commande.' : '')+'</p>'+
    '<p class="hint">Seuils relevés le '+esc(SEUILS_DATE)+' sur service-public.gouv.fr. '+
    'Ils changent : en cas de doute au moment de la déclaration, vérifie-les.</p>'+
    '</div></div>');
  return c;
}

/* Une seule source de vérité pour l'argent : ce qui a réellement été reçu, à
   sa date, qu'il vienne d'une pièce vendue dans « Mes pièces » ou d'un règlement de
   commande (arrhes, acompte, solde). Jusqu'ici, seules les ventes de « Mes pièces »
   étaient comptées : une artisane qui ne travaille qu'à la commande voyait
   « 0 € encaissé ». */

function dateVersTs(v){
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  var s = String(v);
  var t = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00").getTime() : Date.parse(s);   /* minuit : un règlement daté d'aujourd'hui compte dès ce matin */
  return isNaN(t) ? null : t;
}
function encaissements(){
  var l = [];
  (state.pieces||[]).forEach(function(p){
    if (p.com !== "vendu" || !p.venduLe) return;
    if (commandeLiee(p)) return;   /* l'argent est compté dans la commande */
    var m = Number(p.prix)||0; if (m <= 0) return;
    l.push({t:p.venduLe, montant:m, source:"atelier", cid:p.cid});
  });
  commandes().forEach(function(c){
    var v = c.versement || {};
    var mv = Number(v.montant)||0;
    var parts = partsCommande(c);
    if (mv > 0) l.push({t: dateVersTs(v.date) || dateVersTs(c.dateCommande), montant:mv,
                        source:"commande", cid:c.cid, cmd:c.id, parts:parts});
    /* Un règlement annulé ou un remboursement est une ligne négative : il
       diminue l'encaissé à sa propre date, sans réécrire le passé. */
    (c.paiements||[]).forEach(function(pp){
      var m = Number(pp.montant)||0; if (!m) return;
      l.push({t: dateVersTs(pp.date) || pp.saisiLe || null, montant:m, source:"commande", cid:c.cid, cmd:c.id, parts:parts});
    });
  });
  /* Un règlement daté de demain n'est pas encore de l'argent reçu : il ne
     compte ni dans les graphiques ni dans les seuils. */
  var finJour = new Date(); finJour.setHours(23,59,59,999);
  return l.filter(function(x){ return !!x.t && x.t <= finJour.getTime(); });
}
function achatsMatieres(){
  var l = [];
  state.matieres.concat(Array.isArray(state.achatsArchives) ? state.achatsArchives : []).forEach(function(m){
    (m.mouv||[]).forEach(function(mv){
      if (mv.t !== "entree" || mv.annule || !(Number(mv.p) > 0) || !mv.d) return;
      l.push({t:mv.d, montant:Number(mv.p), mid:m.id, estime:!!mv.est});
    });
  });
  return l;
}
function sommeEntre(l, a, b){ var t = 0; l.forEach(function(x){ if (x.t >= a && x.t < b) t += x.montant; }); return t; }
function compteEntre(l, a, b){ var n = 0; l.forEach(function(x){ if (x.t >= a && x.t < b) n++; }); return n; }

/* La période se lit comme on en parle : « ce mois-ci », « cette année ». La
   comparaison se fait toujours à durée égale — le 23 du mois contre le 23 du
   mois dernier, jamais un mois entamé contre un mois entier. */
var PER_IND = [
  {k:"mois",      nom:"Ce mois-ci",       comp:"au mois dernier à la même date"},
  {k:"trimestre", nom:"Ce trimestre",     comp:"au trimestre dernier à la même date"},
  {k:"annee",     nom:"Cette année",      comp:"à l'an dernier à la même date"},
  {k:"12m",       nom:"12 derniers mois", comp:"aux 12 mois d'avant"}
];
function bornesIndicateur(k){
  var now = Date.now(), d = new Date(); d.setHours(0,0,0,0);
  var a, ap;
  if (k === "trimestre"){ var q = Math.floor(d.getMonth()/3)*3;
    a = new Date(d.getFullYear(), q, 1); ap = new Date(d.getFullYear(), q-3, 1); }
  else if (k === "annee"){ a = new Date(d.getFullYear(), 0, 1); ap = new Date(d.getFullYear()-1, 0, 1); }
  else if (k === "12m"){ a = new Date(d.getFullYear(), d.getMonth()-12, d.getDate());
    ap = new Date(d.getFullYear(), d.getMonth()-24, d.getDate()); }
  else { a = new Date(d.getFullYear(), d.getMonth(), 1); ap = new Date(d.getFullYear(), d.getMonth()-1, 1); }
  var debut = a.getTime(), precDebut = ap.getTime();
  return {debut:debut, fin:now + 1, precDebut:precDebut,
          precFin: Math.min(debut, precDebut + (now - debut))};
}
function texteVariation(actuel, avant, comp){
  if (!(avant > 0)) return actuel > 0 ? "rien à comparer " + comp : "";
  var v = (actuel - avant) / avant;
  if (Math.abs(v) < 0.005) return "stable par rapport " + comp;
  return (v > 0 ? "+" : "−") + pct(Math.abs(v)) + " par rapport " + comp;
}
function tuile(cle, valeur, sous, acc, classeV){
  return el('<div class="tile acc '+(acc||'')+'"><div class="k">'+esc(cle)+'</div>'+
    '<div class="v '+(classeV||'')+'">'+esc(valeur)+'</div>'+
    (sous ? '<div class="s">'+esc(sous)+'</div>' : '')+'</div>');
}

/* Quand rien n'est encore enregistré : pas un tableau de zéros, qui
   décourage, mais les trois gestes qui le remplissent. */
function guideIndicateurs(vend){
  var atelierActif = state.reglages.mode === "complet";
  var g = el('<div class="card"><header><h2>Tes indicateurs se remplissent tout seuls</h2>'+
    '<p>Il n\'y a rien à configurer. Chaque chose que tu enregistres dans l\'outil apparaît ici, à sa date.</p>'+
    '</header><div class="body"><ol class="ind-guide"></ol>'+
    '</div></div>');
  var ol = g.querySelector("ol");
  function etape(titre, texte, lib, action){
    var li = el('<li><div><b>'+esc(titre)+'</b><p>'+esc(texte)+'</p></div></li>');
    li.appendChild(bouton(lib, action));
    ol.appendChild(li);
  }
  if (vend) etape("Tes commandes et leurs règlements",
    "Arrhes, acompte, solde : chaque montant reçu compte dans « Encaissé », à la date où tu l'as reçu.",
    "Ouvrir les commandes", function(){ aller("commandes"); });
  etape("Tes achats de matières",
    "Une entrée de stock saisie avec son prix compte dans tes achats du mois.",
    "Ouvrir le stock", function(){ view.sub = "stock"; aller("stock"); });
  etape(vend ? "Tes pièces vendues, une par une" : "Tes pièces terminées",
    atelierActif ? "Chaque pièce passée en « terminée » ou « vendue » dans « Mes créations » est comptée."
                 : "Facultatif : le suivi des pièces suit chaque pièce de la fabrication à la vente.",
    atelierActif ? "Ouvrir « Mes créations »" : "Activer le suivi des pièces",
    function(){
      if (!atelierActif){ state.reglages.mode = "complet"; sauverTout(); toast("Le suivi des pièces est activé dans « Mes créations »"); }
      aller("creations");
    });
  return g;
}

function origineEncaisse(nbAt, nbCmd){
  var parts = [];
  if (nbAt) parts.push(nbAt + ' vente' + (nbAt > 1 ? 's notées' : ' notée') + ' dans « Mes créations »');
  if (nbCmd) parts.push(nbCmd + ' règlement' + (nbCmd > 1 ? 's' : '') + ' de commandes (arrhes, acomptes, soldes)');
  if (!parts.length) return '« Encaissé » est vide pour l\'instant : il additionnera tes ventes et les règlements de tes commandes, à leur date de paiement.';
  return '« Encaissé » additionne ' + parts.join(' et ') + ', chacun à sa date de paiement. C\'est aussi la base de ce que tu déclares en micro-entreprise.';
}
function renderIndicateurs(main){
  var r = state.reglages;
  var vend = r.profil !== "passion";
  var enc = vend ? encaissements() : [];
  var ach = achatsMatieres();
  var pieces = state.pieces || [];
  var cmds = commandes();
  /* Quatre chiffres en haut ; le reste se déplie. */
  function plier(titre, ouvert){
    var d = el('<details class="card ind-pli" style="margin-bottom:16px"><summary style="cursor:pointer;font-weight:600;padding:14px 18px">'+esc(titre)+'</summary><div class="ind-pli-corps" style="padding:0 18px 14px"></div></details>');
    if (ouvert) d.open = true;
    return d;
  }
  var pliActivite = plier("Le détail : activité, matières, pertes", false), pliGraph = plier("Les graphiques", false), pliPieces = plier("Où en sont tes pièces", false);
  var zA = pliActivite.querySelector(".ind-pli-corps"), zG = pliGraph.querySelector(".ind-pli-corps"), zP = pliPieces.querySelector(".ind-pli-corps");
  main.appendChild(enTete("Mes chiffres",
    vend ? "Ce qui rentre, ce qui sort, et ce que ton travail te rapporte, calculé à partir de ce que tu enregistres."
         : "Ce que tu produis, ce que ton loisir te coûte, et l'état de tes stocks."));

  if (!enc.length && !ach.length && !pieces.length && !(vend && cmds.length)){
    main.appendChild(guideIndicateurs(vend));
    return;
  }

  /* --- période --- */
  if (!view.indPer) view.indPer = "mois";
  var per = PER_IND[0];
  PER_IND.forEach(function(x){ if (x.k === view.indPer) per = x; });
  var B = bornesIndicateur(per.k);
  var barre = el('<div class="filters" role="group" aria-label="Période" style="margin-bottom:6px"></div>');
  PER_IND.forEach(function(x){
    var b = el('<button type="button" class="fchip">'+esc(x.nom)+'</button>');
    b.setAttribute("aria-pressed", x.k === per.k ? "true" : "false");
    b.addEventListener("click", function(){ view.indPer = x.k; render(); });
    barre.appendChild(b);
  });
  main.appendChild(barre);

  var nbAlertes = alertesStock().length + alertesFinis().length;
  var valMat = valeurStockMatieres();
  var termP = pieces.filter(function(p){ return p.termineLe && p.termineLe >= B.debut && p.termineLe < B.fin; }).length;
  var stockFini = 0, valFini = 0, coutMatCache = {};
  pieces.forEach(function(p){
    /* Valeur d'une pièce en stock = ce qu'elle a coûté en matières. Le coût
       de revient complet compterait ton temps, les cotisations et les frais
       de vente, qui ne sont pas encore dépensés sur une pièce invendue. */
    if (p.prod === "termine" && !horsStock(p)){
      stockFini++;
      if (!(p.cid in coutMatCache)){ var crf = creation(p.cid); coutMatCache[p.cid] = crf ? calculer(crf).matieres : 0; }
      valFini += coutMatCache[p.cid];
    }
  });
  var achP = sommeEntre(ach, B.debut, B.fin), nbAchP = compteEntre(ach, B.debut, B.fin);

  /* --- ton argent --- */
  if (vend){
    var encP = sommeEntre(enc, B.debut, B.fin), encAv = sommeEntre(enc, B.precDebut, B.precFin);
    var tx = Number(r.cotisations) || 0;
    var rae = resteAEncaisser(), resteDu = rae.total, nbDus = rae.n;
    main.appendChild(el('<h2 class="ind-groupe">Ton argent · '+esc(per.nom.toLowerCase())+'</h2>'));
    var t1 = el('<div class="tiles"></div>');
    t1.appendChild(tuile("Encaissé", eur(encP), texteVariation(encP, encAv, per.comp) || "aucun paiement reçu sur la période",
      "acc-good", "good"));
    t1.appendChild(tuile("Achats de matières", eur(achP),
      nbAchP ? nbAchP + " achat" + (nbAchP > 1 ? "s" : "") + " enregistré" + (nbAchP > 1 ? "s" : "") : "aucun achat saisi sur la période",
      "acc-2"));
    t1.appendChild(tuile("À mettre de côté", eur(encP * tx / 100),
      r.statut ? "pour tes cotisations : " + pct(tx/100) + " de l'encaissé"
               : "à " + pct(tx/100) + " (taux provisoire) : choisis ton statut dans Réglages pour le taux exact",
      "acc-warn"));
    t1.appendChild(tuile("Reste à recevoir", eur(resteDu),
      nbDus ? "sur " + nbDus + " commande" + (nbDus > 1 ? "s" : "") + " acceptée" + (nbDus > 1 ? "s" : "")
            : "aucune commande en attente de paiement",
      "acc-3"));
    main.appendChild(t1);
  }

  /* --- ton activité --- */
  zA.appendChild(el('<h2 class="ind-groupe" style="margin-top:6px">Ton activité</h2>'));
  var t2 = el('<div class="tiles"></div>');
  if (!vend){
    t2.appendChild(tuile("Achats de matières · " + per.nom.toLowerCase(), eur(achP),
      nbAchP ? nbAchP + " achat" + (nbAchP > 1 ? "s" : "") : "aucun achat saisi", "acc-2"));
  }
  if (pieces.length){
    t2.appendChild(tuile("Pièces terminées · " + per.nom.toLowerCase(), String(termP),
      "passées en « terminée » dans « Mes créations »", "acc-1"));
  }
  if (vend){
    var plan = planDeCharge();
    t2.appendChild(tuile("Commandes à fabriquer", String(plan.n),
      plan.n ? dureeTexte(plan.heures * 60) + " de travail promis" + (plan.enRetard ? " · " + plan.enRetard + " en retard" : "")
             : "aucune commande acceptée",
      plan.enRetard ? "acc-bad" : "acc-1"));
  }
  t2.appendChild(tuile("Matières en stock", eur(valMat),
    nbAlertes ? nbAlertes + " à racheter bientôt" : "aucune alerte", nbAlertes ? "acc-warn" : "acc-good"));
  if (stockFini){
    t2.appendChild(tuile("Pièces finies en stock", String(stockFini),
      eur(valFini) + " de matières", "acc-3"));
  }
  var minTot = 0;
  pieces.forEach(function(x){ minTot += minutesMesurees(x); });
  if (minTot > 0) t2.appendChild(tuile("Temps chronométré", dureeTexte(minTot), "mesuré, toutes pièces confondues", "acc-2"));
  zA.appendChild(t2);

  /* --- matières, pertes, prévu/réel --- */
  var pertesP = pertesEntre(B.debut, B.fin);
  var ecartPR = 0, nPR = 0;
  pieces.forEach(function(p){
    if (p.prod !== "termine" || !p.termineLe || p.termineLe < B.debut || p.termineLe >= B.fin) return;
    var crp = creation(p.cid); if (!crp) return;
    if (!(p.reel && Object.keys(p.reel).length) && !(minutesMesurees(p) > 0)) return;
    var erp = estimeReelPiece(p, crp); ecartPR += erp.coutReel - erp.coutEst; nPR++;
  });
  zA.appendChild(el('<h2 class="ind-groupe">Tes matières et tes pertes · '+esc(per.nom.toLowerCase())+'</h2>'));
  var t3 = el('<div class="tiles"></div>');
  t3.appendChild(tuile("Pertes", eur(pertesP.total),
    pertesP.total > 0 ? (pertesP.pelotes ? nb(Math.round(pertesP.pelotes * 10) / 10) + " pelote" + (pertesP.pelotes >= 2 ? "s" : "") + " jetée" + (pertesP.pelotes >= 2 ? "s" : "") : "matière jetée") +
      (pertesP.nbPieces ? " · " + pluriel(pertesP.nbPieces, "pièce ratée", "pièces ratées") : "") : "rien de jeté noté sur la période",
    pertesP.total > 0 ? "acc-warn" : "acc-good", pertesP.total > 0 ? "warn" : ""));
  var pel = pelotesEnStock();
  t3.appendChild(tuile("Pelotes en stock", pel ? nb(Math.round(pel * 10) / 10) : "0", eur(valMat) + " de matières au prix moyen", "acc-2"));
  if (nPR) t3.appendChild(tuile(ecartPR > 0.005 ? "Tes pièces coûtent plus que prévu" : ecartPR < -0.005 ? "Tes pièces coûtent moins que prévu" : "Tes pièces coûtent ce que tu prévois", (ecartPR >= 0 ? "+ " : "− ") + eur(Math.abs(ecartPR)),
    "sur " + pluriel(nPR, "pièce pesée ou chronométrée", "pièces pesées ou chronométrées") + " : " + (ecartPR > 0.005 ? "tes pièces coûtent plus que prévu" : ecartPR < -0.005 ? "tes pièces coûtent moins que prévu" : "conforme à tes fiches"),
    ecartPR > 0.005 ? "acc-warn" : "acc-good", ecartPR > 0.005 ? "warn" : ""));
  if (fournisseurs().length){
    var eco12 = economiePossible(Date.now() - 365 * 864e5);
    t3.appendChild(tuile("Économie possible", eur(eco12), "sur tes achats des 12 derniers mois, au prix le plus bas de tes fournisseurs", "acc-1", eco12 > 0 ? "good" : ""));
  }
  zA.appendChild(t3);
  main.appendChild(pliActivite);
  if (pertesP.lignes.length){
    var cPe = el('<details class="card" style="margin-bottom:18px"><summary>Le détail des pertes ('+pertesP.lignes.length+')</summary>'+
      '<div class="body"><div class="tablewrap"><table><thead><tr><th>Date</th><th>Quoi</th><th>Motif</th><th class="n">Quantité</th><th class="n">Valeur</th></tr></thead><tbody></tbody></table></div>'+
      '<p class="hint" style="margin:10px 0 0">Une perte se note dans Matières › Historique du stock (« Perte »), ou en passant une pièce en « Ratée / jetée ». '+
      'Si les ouvrages ratés reviennent souvent, ton taux de chutes et ratés des Réglages est peut-être trop bas.</p></div></details>');
    pertesP.lignes.forEach(function(x){
      cPe.querySelector("tbody").appendChild(el('<tr><td>'+esc(new Date(x.d).toLocaleDateString("fr-FR"))+'</td><td>'+esc(x.nom)+'</td>'+
        '<td>'+esc(x.motif === "piece" ? "Pièce ratée" : libMotif(x.motif))+'</td><td class="n">'+esc(qte(x.q, x.unite))+'</td><td class="n">'+esc(eur(x.v))+'</td></tr>'));
    });
    zA.appendChild(cPe);
  }

  /* --- seuils : annuels, quelle que soit la période affichée --- */
  if (vend){ var cS = carteSeuils(); if (cS) main.appendChild(cS); main.appendChild(carteRegistres()); }

  /* --- évolution --- */
  var gran = PERIODES[2];
  PERIODES.forEach(function(pp){ if (pp.k === view.periode) gran = pp; });
  var cE = el('<div class="card" style="margin-bottom:18px"><header><h2>'+
    (vend ? 'Ce qui rentre, ce qui sort' : 'Ce que tu dépenses en matières')+'</h2>'+
    '<p>'+(vend ? 'Encaissements et achats de matières, ' : 'Achats de matières, ')+esc(gran.nom.toLowerCase())+'.</p></header>'+
    '<div class="body"><div class="filters" role="group" aria-label="Échelle du graphique" style="margin-bottom:12px"></div>'+
    '<div id="lgE"></div><div style="overflow-x:auto" id="gE"></div><p class="hint" id="nE"></p></div></div>');
  var fE = cE.querySelector(".filters");
  PERIODES.forEach(function(pp){
    var b = el('<button type="button" class="fchip">'+esc(pp.nom)+'</button>');
    b.setAttribute("aria-pressed", pp.k === gran.k ? "true" : "false");
    b.addEventListener("click", function(){ view.periode = pp.k; render(); });
    fE.appendChild(b);
  });
  var sx = seaux(gran.k, gran.n);
  ach.forEach(function(x){ rangerDans(sx, x.t, "v", x.montant); });
  enc.forEach(function(x){ rangerDans(sx, x.t, "v2", x.montant); });
  var totDep = 0, totEnc = 0;
  sx.forEach(function(q){ totDep += q.v; totEnc += q.v2; });
  var series = vend
    ? [{nom:"Encaissé", champ:"v2", couleur:"var(--s-3)"}, {nom:"Achats de matières", champ:"v", couleur:"var(--s-2)"}]
    : [{nom:"Achats de matières", champ:"v", couleur:"var(--s-2)"}];
  cE.querySelector("#lgE").innerHTML = legende(series);
  cE.querySelector("#gE").innerHTML = (totDep || totEnc)
    ? barTemporel(sx, series, function(v){ return eur(v); })
    : '<p class="hint" style="margin:0">Rien d\'enregistré sur cette échelle de temps.</p>';
  cE.querySelector("#nE").innerHTML = (vend ? "Sur le graphique : <b>" + esc(eur(totEnc)) + "</b> encaissés, " : "Sur le graphique : ") +
    "<b>" + esc(eur(totDep)) + "</b> d'achats. Un achat de fil sert souvent plusieurs mois : ce graphique montre les mouvements d'argent, pas ton bénéfice.";
  zG.appendChild(cE);

  /* --- production --- */
  if (pieces.length){
    var sxP = seaux(gran.k, gran.n);
    pieces.forEach(function(p){ if (p.termineLe) rangerDans(sxP, p.termineLe, "v", 1); });
    var totP = 0; sxP.forEach(function(q){ totP += q.v; });
    var cP = el('<div class="card" style="margin-bottom:18px"><header><h2>Ce que tu as produit</h2>'+
      '<p>Pièces passées en « terminée », '+esc(gran.nom.toLowerCase())+'.</p></header>'+
      '<div class="body"><div style="overflow-x:auto" id="gP"></div></div></div>');
    cP.querySelector("#gP").innerHTML = totP
      ? barTemporel(sxP, [{nom:"Pièces terminées", champ:"v", couleur:"var(--s-1)"}],
          function(v, axe){ return axe ? String(Math.round(v)) : Math.round(v) + " pièce" + (v>1?"s":""); })
      : '<p class="hint" style="margin:0">Aucune pièce terminée sur cette échelle de temps.</p>';
    zG.appendChild(cP);
  }
  main.appendChild(pliGraph);

  /* --- ce qui te rapporte le plus --- */
  if (vend){
    var parCid = {};
    enc.forEach(function(x){
      if (x.parts && Object.keys(x.parts).length){ for (var k in x.parts) parCid[k] = (parCid[k]||0) + x.montant * x.parts[k]; return; }
      if (!x.cid) return; parCid[x.cid] = (parCid[x.cid]||0) + x.montant; });
    /* « Ton heure » se calcule sur ce qui a réellement été vendu, au prix
       réellement pratiqué — pas sur le prix affiché de la fiche, qui peut
       n'avoir rien à voir avec ce qu'une commande a rapporté. */
    var lignes = state.creations.map(function(c){
      var gains = [];
      pieces.forEach(function(p){
        if (p.cid !== c.id || p.com !== "vendu" || !(Number(p.prix) > 0) || commandeLiee(p)) return;
        if (p.fige) gains.push(p.fige.gainHoraire);
        else { var copie = clone(c); copie.prix = Number(p.prix); copie.canal = p.canal || c.canal; gains.push(calculer(copie).gainHoraire); }
      });
      var livrees = cmds.filter(function(k){ return commandeContient(k, c.id) && k.statut === "livree"; });
      livrees.forEach(function(k){ var bk = bilanCommande(k); if (bk && bk.heures > 0) gains.push(bk.gainHoraire); });
      var reel = gains.length > 0;
      var gain = reel ? gains.reduce(function(a,b){ return a + b; }, 0) / gains.length : calculer(c).gainHoraire;
      var vendues = pieces.filter(function(p){ return p.cid === c.id && p.com === "vendu" && !commandeLiee(p); }).length +
                    livrees.reduce(function(t, k){ return t + quantiteCreation(k, c.id); }, 0);
      var enStk = pieces.filter(function(p){
        return p.cid === c.id && p.prod === "termine" && !horsStock(p); }).length;
      return {nom:c.nom, gain:gain, reel:reel, vendues:vendues, ca:parCid[c.id]||0, stock:enStk};
    }).filter(function(x){ return x.vendues > 0 || x.ca > 0; });
    if (lignes.length){
      lignes.sort(function(a,b){ return b.ca - a.ca; });
      var cR = el('<div class="card" style="margin-bottom:18px"><header><h2>Ce qui te rapporte le plus</h2>'+
        '<p>Tout ce que chaque création t\'a rapporté (ventes de pièces et commandes) et ce qu\'elle te paie de l\'heure.</p>'+
        '</header><div class="body" style="padding-top:14px"></div></div>');
      var wR = el('<div class="tablewrap"></div>');
      var tR = el('<table style="min-width:560px"><thead><tr><th>Création</th><th class="n">Vendues</th>'+
        '<th class="n">Reçu</th><th class="n">Gain de l\'heure</th><th class="n">En stock</th></tr></thead><tbody></tbody></table>');
      lignes.forEach(function(x){
        var stt = statut(x.gain);
        tR.querySelector("tbody").appendChild(el('<tr><td><b>'+esc(x.nom)+'</b></td><td class="n">'+x.vendues+'</td>'+
          '<td class="n">'+esc(eur(x.ca))+'</td>'+
          '<td class="n" style="color:'+(stt.k==="good"?"var(--good)":stt.k==="warn"?"var(--warn)":"var(--bad)")+'">'+esc(eur(x.gain))+
            (x.reel ? '' : '<span class="hint" style="display:block;margin:0;font-size:11.5px">prix de la fiche</span>')+'</td>'+
          '<td class="n">'+x.stock+'</td></tr>'));
      });
      wR.appendChild(tR);
      cR.querySelector(".body").appendChild(wR);
      cR.querySelector(".body").appendChild(el('<p class="hint" style="margin:10px 0 0">« Gain de l\'heure » : ce que la création t\'a '+
        'réellement payé de l\'heure, en moyenne sur ses ventes et ses commandes livrées, au prix encaissé, une fois '+
        'matières, frais et cotisations payés. Vert : au moins ton objectif de '+esc(eur(Number(r.tauxHoraire)||0))+'/h.</p>'));
      main.appendChild(cR);
    }
  }

  /* --- état des pièces : seulement si l'Atelier est utilisé --- */
  if (pieces.length){
    var parProd = {};
    PROD.forEach(function(x){ parProd[x.k] = 0; });
    pieces.forEach(function(p){ if (parProd[p.prod] !== undefined) parProd[p.prod]++; });
    var cO = el('<div class="card" style="margin-bottom:18px"><header><h2>Où en sont tes pièces</h2>'+
      '<p>Toutes tes pièces suivies dans « Mes créations », par étape de fabrication.</p></header>'+
      '<div class="body"><div id="gO"></div></div></div>');
    cO.querySelector("#gO").innerHTML = barreRepartition(PROD.map(function(x){
      return {lib:x.nom, val:parProd[x.k], couleur:x.c};
    }));
    zP.appendChild(cO);
    main.appendChild(pliPieces);
  }

  /* --- d'où viennent ces chiffres --- */
  var nbAt = enc.filter(function(x){ return x.source === "atelier"; }).length;
  var nbCmd = enc.filter(function(x){ return x.source === "commande"; }).length;
  main.appendChild(el('<div class="ind-source"><p><b>D\'où viennent ces chiffres.</b> '+
    (vend ? origineEncaisse(nbAt, nbCmd) + ' ' : '')+
    '« Achats de matières » reprend les entrées de stock saisies avec leur prix. '+
    (vend && nbAt && nbCmd ? 'Une pièce suivie dans « Mes créations » et faite pour une commande (« Sur commande ») n\'est comptée qu\'une fois, dans la commande. ' : '')+
    'Les ventes passées sont figées au jour de la vente : un changement de prix ou de taux ne les modifie pas. '+
    '</p>'+
    '<p>Ce n\'est pas une comptabilité : c\'est ton tableau de bord. Il se met à jour tout seul, sur tous tes appareils.</p></div>'));
}


/* ═════ 20. ILLUSTRATIONS DU CATALOGUE ═════
   Dessins d'origine — aucune photo empruntée. Un motif par type d'ouvrage
   et une couleur par famille : le catalogue se lit d'un coup d'œil. */

var MOTIF_DE = {
  dp_echarpe_beret:"bonnet", dp_etole_coquille:"chale", dp_ceinture_pompons:"bandeau",
  dp_etole_etoile:"chale", dp_etole_popcorn:"chale", dp_etole_festons:"chale",
  dp_bas_resille:"chausson", dp_damier:"snood", dp_plaid_fleurs:"couverture",
  ami_petit:"ours", ami_moyen:"ours", ami_grand:"peluche", ami_perso:"personnage",
  doudou:"doudou", pcle:"portecle", duo:"coffret",
  chaussons:"chausson", bonnet_bebe:"bonnetbebe", couverture:"couverture",
  tetine:"attache", hochet:"hochet", cube:"cube",
  bonnet:"bonnet", snood:"snood", mitaines:"mitaine", bandeau:"bandeau",
  chouchou:"chouchou", sac:"sac", pochette_zip:"pochette", filet:"filet",
  panier:"panier", corbeille:"corbeille", coussin:"coussin", suspension:"suspension",
  tawashi:"eponge", dessous:"disques",
  fleur:"fleur", bouquet:"bouquet", cactus:"cactus",
  noel:"sapin", couronne:"couronne", paques:"oeuf", coeur:"coeur",
  perso_photo:"ours", prenom:"lettres", naissance:"coffret",
  ami_mini:"ours", ami_poulpe:"poulpe", ami_dino:"dino", ami_licorne:"licorne", ami_poupee:"poupee",
  bebe_gilet:"gilet", bebe_bavoir:"bavoir", bebe_moufles:"mitaine", bebe_mobile:"mobile", bebe_granny:"granny",
  mode_chale:"chale", mode_top:"top", mode_gilet:"gilet", mode_bucket:"chapeau",
  mode_bandana:"bandeau", mode_sacgranny:"granny",
  maison_tapis:"tapis", maison_bouillotte:"bouillotte", maison_videpoche:"corbeille",
  maison_guirlande:"fanions", maison_setdetable:"disques", maison_cachepot:"cachepot",
  veg_rose:"rose", veg_tournesol:"tournesol", veg_succulente:"cactus", veg_couronnefleurs:"couronne",
  fete_chaussette:"chaussette", fete_guirlandenoel:"fanions", fete_citrouille:"citrouille",
  fete_flocon:"flocon", fete_lapinpaques:"lapin",
  perso_mariage:"maries", perso_pcleprenom:"portecle", perso_doudouprenom:"doudou"
};

function dessins(){
  var T='fill="none" stroke="var(--fc)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  var F='fill="var(--fcb)" stroke="var(--fc)" stroke-width="2.2" stroke-linejoin="round"';
  var P='fill="var(--fc)"';
  return {
ours:'<circle cx="15" cy="13" r="5" '+F+'/><circle cx="33" cy="13" r="5" '+F+'/><circle cx="24" cy="26" r="14" '+F+'/>'+
     '<circle cx="19" cy="23" r="1.8" '+P+'/><circle cx="29" cy="23" r="1.8" '+P+'/><path d="M21 31c1.5 1.6 4.5 1.6 6 0" '+T+'/>',
peluche:'<circle cx="16" cy="9" r="4" '+F+'/><circle cx="32" cy="9" r="4" '+F+'/><circle cx="24" cy="15" r="9" '+F+'/>'+
     '<path d="M14 26h20a6 6 0 0 1 6 6v4a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6v-4a6 6 0 0 1 6-6z" '+F+'/>'+
     '<circle cx="21" cy="14" r="1.6" '+P+'/><circle cx="27" cy="14" r="1.6" '+P+'/>',
personnage:'<circle cx="24" cy="12" r="8" '+F+'/><path d="M16 23h16a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" '+F+'/>'+
     '<path d="M12 28H7M36 28h5M19 40v4M29 40v4" '+T+'/><circle cx="21" cy="12" r="1.6" '+P+'/><circle cx="27" cy="12" r="1.6" '+P+'/>',
doudou:'<circle cx="15" cy="15" r="4.5" '+F+'/><circle cx="33" cy="15" r="4.5" '+F+'/>'+
     '<path d="M14 15h20a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V20a5 5 0 0 1 5-5z" '+F+'/>'+
     '<circle cx="19" cy="25" r="1.7" '+P+'/><circle cx="29" cy="25" r="1.7" '+P+'/><path d="M21 31c1.5 1.4 4.5 1.4 6 0" '+T+'/>',
portecle:'<circle cx="24" cy="9" r="5.5" '+T+'/><path d="M24 15v4" '+T+'/><circle cx="24" cy="31" r="11" '+F+'/>'+
     '<circle cx="20" cy="29" r="1.6" '+P+'/><circle cx="28" cy="29" r="1.6" '+P+'/>',
coffret:'<path d="M9 19h30v18a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" '+F+'/><path d="M7 12h34v7H7z" '+F+'/>'+
     '<path d="M24 12v28" '+T+'/><path d="M24 12c-3-6-9-5-9-1M24 12c3-6 9-5 9-1" '+T+'/>',
chausson:'<path d="M10 31c0-8 3-13 8-13h6c5 0 6 3 10 5 5 2 5 8 0 8H14a4 4 0 0 1-4 0z" '+F+'/>'+
     '<path d="M9 34h26" '+T+'/><path d="M17 18c2.5-3.5 6.5-3.5 9 0" '+T+'/><circle cx="31" cy="26" r="1.6" '+P+'/>',
bonnetbebe:'<path d="M12 31c0-8 5-14 12-14s12 6 12 14z" '+F+'/><path d="M9 31h30" '+T+'/>'+
     '<path d="M24 17v-4" '+T+'/><circle cx="24" cy="11" r="3" '+F+'/>',
couverture:'<path d="M9 14h30a2 2 0 0 1 2 2v20a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V16a2 2 0 0 1 2-2z" '+F+'/>'+
     '<path d="M11 21c3-2 5 2 8 0s5 2 8 0 5 2 8 0M11 29c3-2 5 2 8 0s5 2 8 0 5 2 8 0" '+T+'/>',
attache:'<path d="M7 20h7v8H7z" '+F+'/><circle cx="21" cy="24" r="4" '+F+'/><circle cx="30" cy="24" r="4" '+F+'/>'+
     '<circle cx="39" cy="24" r="4" '+F+'/><path d="M14 24h3M25 24h1M34 24h1" '+T+'/>',
hochet:'<circle cx="24" cy="14" r="8" '+F+'/><circle cx="24" cy="33" r="8.5" '+T+'/><path d="M24 22v2.5" '+T+'/>'+
     '<circle cx="21" cy="13" r="1.5" '+P+'/><circle cx="27" cy="13" r="1.5" '+P+'/>',
cube:'<path d="M12 18l12-6 12 6-12 6z" '+F+'/><path d="M12 18v13l12 6V24z" '+F+'/><path d="M36 18v13l-12 6V24z" '+F+'/>'+
     '<circle cx="18" cy="27" r="1.7" '+P+'/><circle cx="30" cy="27" r="1.7" '+P+'/>',
bonnet:'<path d="M9 32c0-9 6-16 15-16s15 7 15 16z" '+F+'/><path d="M6 32h36" '+T+'/><path d="M24 16v-5" '+T+'/><circle cx="24" cy="9" r="3" '+F+'/>',
snood:'<ellipse cx="24" cy="18" rx="13" ry="7" '+T+'/><ellipse cx="24" cy="31" rx="13" ry="7" '+F+'/><path d="M11 18v13M37 18v13" '+T+'/>',
mitaine:'<path d="M17 12h10a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V17a5 5 0 0 1 5-5z" '+F+'/>'+
     '<path d="M32 19h3a4 4 0 0 1 0 8h-3" '+F+'/><path d="M12 25h20" '+T+'/>',
bandeau:'<path d="M8 21h32a4 4 0 0 1 0 6H8a4 4 0 0 1 0-6z" '+F+'/><path d="M20 18l4 6-4 6M28 18l-4 6 4 6" '+T+'/>',
chouchou:'<circle cx="24" cy="24" r="14" '+T+'/><circle cx="24" cy="24" r="6" '+F+'/>'+
     '<path d="M24 10v4M38 24h-4M24 38v-4M10 24h4M34 14l-3 3M34 34l-3-3M14 34l3-3M14 14l3 3" '+T+'/>',
sac:'<path d="M12 19h24l-2 19a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" '+F+'/><path d="M18 19v-3a6 6 0 0 1 12 0v3" '+T+'/>',
pochette:'<path d="M9 17h30a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V19a2 2 0 0 1 2-2z" '+F+'/>'+
     '<path d="M9 22h30" '+T+'/><path d="M30 22v5" '+T+'/><circle cx="30" cy="29" r="2" '+F+'/>',
filet:'<path d="M13 18h22l-2 18a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4z" '+T+'/><path d="M18 14a6 6 0 0 1 12 0" '+T+'/>'+
     '<path d="M16 24h16M15 30h18M19 18v20M29 18v20" '+T+' opacity=".75"/>',
panier:'<path d="M11 18h26l-3 18a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" '+F+'/><path d="M8 18h32" '+T+'/>'+
     '<path d="M18 13c2-3 10-3 12 0" '+T+'/><path d="M20 24v9M28 24v9" '+T+'/>',
corbeille:'<path d="M15 21h18l-2 13a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" '+F+'/><path d="M12 21h24" '+T+'/>'+
     '<path d="M21 17c1.5-2 4.5-2 6 0" '+T+'/>',
coussin:'<path d="M12 12h24a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" '+F+'/>'+
     '<path d="M13 15c2 3 2 15 0 18M35 15c-2 3-2 15 0 18" '+T+' opacity=".7"/>',
suspension:'<path d="M12 12h24" '+T+'/><circle cx="24" cy="23" r="8" '+F+'/>'+
     '<path d="M15 12v9M24 12v3M33 12v9M17 31v8M24 31v11M31 31v8" '+T+'/>',
eponge:'<path d="M10 16h28a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z" '+F+'/>'+
     '<circle cx="16" cy="25" r="2" '+T+'/><circle cx="24" cy="21" r="2" '+T+'/><circle cx="32" cy="27" r="2" '+T+'/>',
disques:'<circle cx="18" cy="30" r="11" '+F+'/><circle cx="30" cy="22" r="11" '+F+'/><circle cx="30" cy="22" r="5" '+T+'/>',
fleur:'<circle cx="24" cy="18" r="4.5" '+F+'/><ellipse cx="24" cy="9" rx="4" ry="6" '+F+'/><ellipse cx="33" cy="18" rx="6" ry="4" '+F+'/>'+
     '<ellipse cx="24" cy="27" rx="4" ry="6" '+F+'/><ellipse cx="15" cy="18" rx="6" ry="4" '+F+'/><path d="M24 32v9" '+T+'/>',
bouquet:'<circle cx="16" cy="14" r="5" '+F+'/><circle cx="24" cy="10" r="5" '+F+'/><circle cx="32" cy="14" r="5" '+F+'/>'+
     '<path d="M16 19l5 9M24 15v13M32 19l-5 9" '+T+'/><path d="M17 28h14l-3 12H20z" '+F+'/>',
cactus:'<path d="M20 12a4 4 0 0 1 8 0v18h-8z" '+F+'/><path d="M20 20h-4a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3h4" '+F+'/>'+
     '<path d="M28 17h4a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-4" '+F+'/><path d="M16 30h16l-2 10H18z" '+F+'/>',
sapin:'<path d="M24 7l8 11h-5l7 10h-6l6 9H14l6-9h-6l7-10h-5z" '+F+'/><path d="M21 37h6v5h-6z" '+F+'/>',
couronne:'<circle cx="24" cy="25" r="14" '+T+' stroke-width="5"/><circle cx="24" cy="25" r="14" '+T+'/>'+
     '<circle cx="14" cy="16" r="2.5" '+F+'/><circle cx="34" cy="32" r="2.5" '+F+'/><circle cx="31" cy="13" r="2.5" '+F+'/>',
oeuf:'<path d="M24 8c7 0 12 10 12 18a12 12 0 0 1-24 0c0-8 5-18 12-18z" '+F+'/>'+
     '<path d="M13 24l4-3 4 3 4-3 4 3 4-3 3 2" '+T+'/>',
coeur:'<path d="M24 38S10 29 10 20a7.5 7.5 0 0 1 14-3.5A7.5 7.5 0 0 1 38 20c0 9-14 18-14 18z" '+F+'/>'+
     '<path d="M17 22c2.5-2 5.5-2 8 0s5.5 2 8 0" '+T+'/>',
lettres:'<path d="M7 16h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7z" '+F+'/><path d="M24 16h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H24z" '+F+'/>'+
     '<path d="M11 21h4M11 27h4M28 21h4M28 27h4" '+T+'/><path d="M20 24h4" '+T+'/>',
poulpe:'<circle cx="24" cy="17" r="11" '+F+'/><path d="M13 22c-2 6-4 8-6 9M18 26c-1 7-2 10-4 12M24 28v13M30 26c1 7 2 10 4 12M35 22c2 6 4 8 6 9" '+T+'/>'+
     '<circle cx="20" cy="16" r="1.7" '+P+'/><circle cx="28" cy="16" r="1.7" '+P+'/><path d="M21 21c1.5 1.5 4.5 1.5 6 0" '+T+'/>',
dino:'<path d="M9 33c0-9 6-15 14-15h5a8 8 0 0 1 0 16H14a5 5 0 0 1-5-1z" '+F+'/>'+
     '<path d="M14 18l3-5 3 5 3-5 3 5" '+T+'/><path d="M13 34v6M22 34v6M31 34v5" '+T+'/>'+
     '<circle cx="30" cy="25" r="1.7" '+P+'/>',
licorne:'<circle cx="24" cy="26" r="13" '+F+'/><path d="M24 13l3-11 3 11" '+F+'/>'+
     '<path d="M14 15c-3-3-2-7 1-7 2 0 3 2 3 4" '+F+'/><path d="M31 17c2-4 6-5 8-3" '+T+'/>'+
     '<circle cx="20" cy="24" r="1.7" '+P+'/><circle cx="28" cy="24" r="1.7" '+P+'/><path d="M21 31c1.5 1.4 4.5 1.4 6 0" '+T+'/>',
poupee:'<circle cx="24" cy="12" r="8" '+F+'/><path d="M13 9c2-5 9-7 14-5 4 2 5 5 5 7" '+F+'/>'+
     '<path d="M17 22h14l4 12a3 3 0 0 1-3 4H16a3 3 0 0 1-3-4z" '+F+'/><path d="M19 38v5M29 38v5" '+T+'/>'+
     '<circle cx="21" cy="13" r="1.5" '+P+'/><circle cx="27" cy="13" r="1.5" '+P+'/>',
gilet:'<path d="M18 10h12l8 5-3 7-3-2v18H16V20l-3 2-3-7z" '+F+'/><path d="M24 12v26" '+T+'/>'+
     '<circle cx="21" cy="22" r="1.4" '+P+'/><circle cx="21" cy="29" r="1.4" '+P+'/>',
bavoir:'<path d="M17 11h14a4 4 0 0 1 0 7c4 3 6 7 6 11a9 9 0 0 1-9 9h-8a9 9 0 0 1-9-9c0-4 2-8 6-11a4 4 0 0 1 0-7z" '+F+'/>'+
     '<circle cx="24" cy="28" r="4" '+T+'/>',
mobile:'<path d="M8 12h32" '+T+'/><circle cx="24" cy="12" r="3" '+F+'/>'+
     '<path d="M14 12v8M24 15v10M34 12v6" '+T+'/>'+
     '<circle cx="14" cy="25" r="5" '+F+'/><circle cx="24" cy="31" r="6" '+F+'/><circle cx="34" cy="23" r="5" '+F+'/>',
granny:'<path d="M9 9h13v13H9zM26 9h13v13H26zM9 26h13v13H9zM26 26h13v13H26z" '+F+'/>'+
     '<circle cx="15.5" cy="15.5" r="2.5" '+T+'/><circle cx="32.5" cy="15.5" r="2.5" '+T+'/>'+
     '<circle cx="15.5" cy="32.5" r="2.5" '+T+'/><circle cx="32.5" cy="32.5" r="2.5" '+T+'/>',
chale:'<path d="M8 12h32l-14 27a3 3 0 0 1-4 0z" '+F+'/><path d="M13 20h22M17 27h14" '+T+' opacity=".7"/>'+
     '<path d="M22 39l-2 5M26 39l2 5" '+T+'/>',
top:'<path d="M17 11l7 4 7-4 6 4-3 7-2-1v18H16V21l-2 1-3-7z" '+F+'/><path d="M19 12a5 5 0 0 0 10 0" '+T+'/>',
chapeau:'<ellipse cx="24" cy="32" rx="17" ry="5" '+F+'/><path d="M13 32V21a11 11 0 0 1 22 0v11" '+F+'/>'+
     '<path d="M13 26h22" '+T+'/>',
tapis:'<circle cx="24" cy="24" r="16" '+F+'/><circle cx="24" cy="24" r="10" '+T+'/><circle cx="24" cy="24" r="4" '+T+'/>',
bouillotte:'<path d="M20 8h8v5h-8z" '+F+'/><path d="M14 13h20a4 4 0 0 1 4 4v18a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5V17a4 4 0 0 1 4-4z" '+F+'/>'+
     '<path d="M15 22h18M15 29h18" '+T+' opacity=".65"/>',
fanions:'<path d="M6 13c8 5 28 5 36 0" '+T+'/><path d="M11 15l5 11 5-12z" '+F+'/><path d="M22 16l5 11 5-12z" '+F+'/>'+
     '<path d="M33 15l4 10 5-11z" '+F+'/>',
cachepot:'<path d="M14 19h20l-2 17a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3z" '+F+'/><path d="M11 19h26" '+T+'/>'+
     '<path d="M21 15c0-4 3-7 6-6M27 15c3-2 6-1 7 1" '+T+'/>',
rose:'<circle cx="24" cy="19" r="12" '+F+'/><path d="M24 26a7 7 0 0 1 0-14 5 5 0 0 1 0 10 3 3 0 0 1 0-6" '+T+'/>'+
     '<path d="M24 31v10" '+T+'/><path d="M24 35c4-3 8-2 9 1-3 2-7 1-9-1z" '+F+'/>',
tournesol:'<circle cx="24" cy="18" r="6" '+T+'/>'+
     '<path d="M24 5v6M33 9l-4 4M38 18h-6M33 27l-4-4M24 31v-6M15 27l4-4M10 18h6M15 9l4 4" '+F+' stroke-linecap="round"/>'+
     '<path d="M24 31v11" '+T+'/>',
chaussette:'<path d="M15 8h11v16c0 4 3 5 7 7 5 3 5 10-1 10H19a7 7 0 0 1-7-7V12a4 4 0 0 1 3-4z" '+F+'/>'+
     '<path d="M13 15h13" '+T+'/>',
citrouille:'<ellipse cx="24" cy="28" rx="16" ry="12" '+F+'/><path d="M18 17c-1 6-1 16 0 22M30 17c1 6 1 16 0 22" '+T+'/>'+
     '<path d="M24 16v-5c4 0 5-2 5-4" '+T+'/>',
flocon:'<path d="M24 6v36M9 15l30 18M39 15L9 33" '+T+'/>'+
     '<path d="M19 11l5 5 5-5M19 37l5-5 5 5M13 20l1 6-6 1M35 28l-1-6 6-1M13 28l1-6-6-1M35 20l-1 6 6 1" '+T+'/>',
lapin:'<path d="M17 18c-2-8-1-12 1-12s4 5 3 11M31 18c2-8 1-12-1-12s-4 5-3 11" '+F+'/>'+
     '<circle cx="24" cy="29" r="12" '+F+'/><circle cx="20" cy="27" r="1.7" '+P+'/><circle cx="28" cy="27" r="1.7" '+P+'/>'+
     '<path d="M24 32v2M21 36c1.5 1.2 4.5 1.2 6 0" '+T+'/>',
maries:'<circle cx="16" cy="15" r="6" '+F+'/><circle cx="32" cy="15" r="6" '+F+'/>'+
     '<path d="M9 24h14v15H9zM25 24h14l-3 15H28z" '+F+'/>'+
     '<path d="M12 9c1-3 7-3 8 0" '+T+'/><path d="M28 12c2-4 6-4 8-1" '+T+'/>'
  };
}
var DESSINS = null;

function motif(modeleId, taille){
  if (!DESSINS) DESSINS = dessins();
  var t = taille || 44;
  var m = modele(modeleId);
  var fam = (m && m[1]) || "perso";
  var cle = MOTIF_DE[modeleId] || "coeur";
  return '<svg class="motif" viewBox="0 0 48 48" width="'+t+'" height="'+t+'" aria-hidden="true" '+
    'style="--fc:var(--f-'+fam+');--fcb:var(--f-'+fam+'-b);flex:none">'+
    (DESSINS[cle] || DESSINS.coeur) + '</svg>';
}

/* ═════ 21. (libérée — les patrons sont dans l'application) ═════ */





/* ═════ 22. EN-TÊTES DE PAGE ET ÉTATS VIDES ═════
   Chaque écran annonce son objectif en une phrase : l'utilisateur ne doit
   jamais avoir à deviner où il est ni ce qu'on attend de lui. */

function enTete(titre, phrase, actions){
  var h = el('<header class="pagehead"><div><h1>'+esc(titre)+'</h1>'+
    (phrase ? '<p>'+esc(phrase)+'</p>' : '')+'</div><div class="ph-act"></div></header>');
  (actions||[]).forEach(function(a){ h.querySelector(".ph-act").appendChild(a); });
  return h;
}

function etatVide(titre, texte, boutons){
  var d = el('<div class="vide"><h2>'+esc(titre)+'</h2><p>'+esc(texte)+'</p><div class="v-act"></div></div>');
  (boutons||[]).forEach(function(b){ d.querySelector(".v-act").appendChild(b); });
  return d;
}
function bouton(libelle, action, primaire){
  var b = el('<button type="button" class="btn'+(primaire?' primary':'')+'">'+esc(libelle)+'</button>');
  b.addEventListener("click", action);
  return b;
}

/* ═════ TRIER UNE LISTE ═════
   Toutes les listes se trient de la même façon : un critère au choix et un
   bouton pour le sens (croissant ↑ / décroissant ↓). L'état est gardé par
   liste (view.tris[cle]) tant que l'application reste ouverte. */
function etatTri(cle, defaut, sensDefaut){
  if (!view.tris) view.tris = {};
  var t = view.tris[cle];
  if (!t) t = view.tris[cle] = {k: defaut, sens: sensDefaut || 1};
  return t;
}
/* Compare deux valeurs : nombres comme nombres, textes en français sans tenir
   compte des accents ni des majuscules, valeurs vides toujours en dernier. */
function comparer(a, b){
  var va = a === undefined || a === null || a === "" || (typeof a === "number" && isNaN(a));
  var vb = b === undefined || b === null || b === "" || (typeof b === "number" && isNaN(b));
  if (va && vb) return 0;
  if (va) return 2;     /* le vide passe après, quel que soit le sens */
  if (vb) return -2;
  if (typeof a === "number" && typeof b === "number") return a < b ? -1 : a > b ? 1 : 0;
  return String(a).localeCompare(String(b), "fr", {sensitivity:"base", numeric:true});
}
/* liste triée (copie) selon l'état de tri ; defs = {critère: fonction(x) → valeur} */
function trierListe(liste, t, defs){
  var f = defs[t.k] || defs[Object.keys(defs)[0]];
  return liste.slice().sort(function(a, b){
    var c = comparer(f(a), f(b));
    if (c === 2 || c === -2) return c > 0 ? 1 : -1;
    return c * (t.sens < 0 ? -1 : 1);
  });
}
/* Le sélecteur de critère et le bouton de sens. o = {cle, options:[[k, nom]],
   defaut, sens (sens du départ), quand (rappel à chaque changement)} */
function barreTri(o){
  var t = etatTri(o.cle, o.defaut, o.sens);
  var box = el('<div class="tri-barre" data-cle="'+esc(o.cle)+'" role="group" aria-label="Trier la liste">'+
    '<label class="f"><span class="sr-only">Trier par</span><select class="tri-crit">'+
      o.options.map(function(x){ return '<option value="'+esc(x[0])+'">'+esc(x[1])+'</option>'; }).join("")+
    '</select></label>'+
    '<button type="button" class="btn sm tri-sens"></button></div>');
  var sel = box.querySelector("select"), bs = box.querySelector(".tri-sens");
  sel.value = t.k;
  if (sel.value !== t.k) { t.k = o.defaut; sel.value = t.k; }
  function peindreSens(){
    bs.textContent = t.sens < 0 ? "↓ Décroissant" : "↑ Croissant";
    bs.setAttribute("aria-label", "Sens du tri : " + (t.sens < 0 ? "décroissant" : "croissant") + ". Toucher pour inverser.");
  }
  peindreSens();
  sel.addEventListener("change", function(){ t.k = sel.value; if (o.quand) o.quand(t); });
  bs.addEventListener("click", function(){ t.sens = -t.sens; peindreSens(); if (o.quand) o.quand(t); });
  return box;
}
/* En-têtes de tableau cliquables : toucher le titre d'une colonne trie par
   cette colonne, une seconde fois inverse le sens. th porte data-tri="critère". */
function entetesTriables(thead, cle, quand){
  var t = etatTri(cle, null);
  [].forEach.call(thead.querySelectorAll("th[data-tri]"), function(th){
    var k = th.getAttribute("data-tri"), nom = th.textContent;
    var b = el('<button type="button" class="th-tri"></button>');
    function peindre(){
      var actif = t.k === k;
      b.textContent = nom + (actif ? (t.sens < 0 ? " ↓" : " ↑") : "");
      th.setAttribute("aria-sort", actif ? (t.sens < 0 ? "descending" : "ascending") : "none");
    }
    peindre(); th.textContent = ""; th.appendChild(b);
    b.addEventListener("click", function(){
      if (t.k === k) t.sens = -t.sens; else { t.k = k; t.sens = 1; }
      [].forEach.call(thead.querySelectorAll("th[data-tri]"), function(x){
        var bb = x.querySelector(".th-tri"), kk = x.getAttribute("data-tri"), on = t.k === kk;
        var nomx = bb.textContent.replace(/ [↑↓]$/, "");
        bb.textContent = nomx + (on ? (t.sens < 0 ? " ↓" : " ↑") : "");
        x.setAttribute("aria-sort", on ? (t.sens < 0 ? "descending" : "ascending") : "none");
      });
      var sel = document.querySelector('.tri-barre[data-cle="'+cle+'"] select');
      if (sel){ sel.value = t.k; var bs = document.querySelector('.tri-barre[data-cle="'+cle+'"] .tri-sens'); if (bs) bs.textContent = t.sens < 0 ? "↓ Décroissant" : "↑ Croissant"; }
      quand(t);
    });
  });
}

/* ═════ SAISIES : VÉRIFIER, PUIS ENREGISTRER ═════
   Chaque champ dit tout de suite s'il ne correspond pas à ce qu'on attend
   (un e-mail, un nombre, une date, un SIREN…), et le bouton « Enregistrer »
   relit tout le formulaire avant de valider. Les modifications restent
   gardées au fur et à mesure : le bouton vérifie, confirme et envoie. */
function cleSiren(v){   /* clé de contrôle d'un SIREN (algorithme de Luhn) */
  var somme = 0;
  for (var i = 0; i < 9; i++){
    var n = Number(v.charAt(8 - i)); if (i % 2 === 1){ n *= 2; if (n > 9) n -= 9; }
    somme += n;
  }
  return somme % 10 === 0;
}
/* Renvoie le message d'erreur pour la valeur d'un champ, ou "" si tout va bien.
   r = {type: texte|contact|entier|nombre|prix|pourcentage|date|siren, requis, min, max, strict} */
function messageSaisie(inp, r){
  r = r || {};
  var v = String(inp.value === null || inp.value === undefined ? "" : inp.value).trim();
  if (inp.validity && inp.validity.badInput) return "Écris un nombre : des chiffres, avec une virgule si besoin.";
  if (v === "") return r.requis ? (r.msgRequis || "Ce champ est nécessaire.") : "";
  var t = r.type || "texte";
  if (t === "texte"){
    if (v.length < (r.min || 1)) return "Écris au moins " + (r.min || 1) + " caractères.";
    if (r.max && v.length > r.max) return "Trop long : " + r.max + " caractères au plus.";
    return "";
  }
  if (t === "contact"){
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "";
    if (/^@[A-Za-z0-9._]{2,30}$/.test(v)) return "";
    if (/^\+?\d{8,15}$/.test(v.replace(/[\s.\-()]/g, ""))) return "";
    return "Ce contact ne ressemble ni à un e-mail (nom@site.fr), ni à un téléphone (06 12 34 56 78), ni à un pseudo Instagram (@nom).";
  }
  if (t === "entier" || t === "nombre" || t === "prix" || t === "pourcentage"){
    var brut = lireNombre(v), n = Number(brut);
    if (brut === "" || !isFinite(n)) return "Écris un nombre.";
    if (t === "entier" && Math.floor(n) !== n) return "Écris un nombre entier, sans virgule.";
    var mn = r.min !== undefined ? r.min : (t === "prix" || t === "pourcentage" ? 0 : null);
    var mx = r.max !== undefined ? r.max : (t === "pourcentage" ? 100 : null);
    if (mn !== null && n < mn) return "Le minimum est " + nb(mn) + (t === "prix" ? " €" : t === "pourcentage" ? " %" : "") + ".";
    if (mx !== null && n > mx) return "Le maximum est " + nb(mx) + (t === "pourcentage" ? " %" : "") + ".";
    if (r.strict && n <= 0) return "Ce nombre doit être supérieur à 0.";
    return "";
  }
  if (t === "date"){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return "Choisis une date valide.";
    var dd = new Date(+m[1], +m[2] - 1, +m[3]);
    if (isNaN(dd.getTime()) || dd.getMonth() !== +m[2] - 1) return "Cette date n'existe pas.";
    if (+m[1] < 2000 || +m[1] > 2100) return "L'année " + m[1] + " semble une faute de frappe.";
    return "";
  }
  if (t === "siren"){
    var s9 = v.replace(/\s/g, "");
    if (!/^\d{9}$/.test(s9)) return "Un SIREN compte 9 chiffres.";
    if (!cleSiren(s9)) return "Ce SIREN n'existe pas (la clé de contrôle ne correspond pas) : vérifie les chiffres.";
    return "";
  }
  return "";
}
function libelleChamp(inp){
  var lab = inp.closest("label"), sp = lab && lab.querySelector("span");
  return sp ? sp.textContent.replace(/\(.*\)/, "").trim() : (inp.getAttribute("aria-label") || "Un champ");
}
function afficherErreurChamp(inp, msg){
  var lab = inp.closest("label") || inp.parentNode, err = lab.querySelector(".champ-err");
  if (msg){
    inp.setAttribute("aria-invalid", "true");
    if (!err){ err = document.createElement("small"); err.className = "champ-err"; err.setAttribute("role", "alert"); lab.appendChild(err); }
    err.textContent = msg;
    inp.__err = msg;
  } else {
    inp.removeAttribute("aria-invalid"); inp.__err = "";
    if (err) err.remove();
  }
}
/* Branche les règles sur un formulaire. regles = [{sel, type, requis, min, max,
   strict, quand (fonction : la règle ne s'applique que si elle renvoie vrai)}].
   Les champs ajoutés plus tard (lignes d'articles…) sont couverts. */
function attacherVerif(racine, regles){
  function regleDe(inp){
    for (var i = 0; i < regles.length; i++) if (inp.matches && inp.matches(regles[i].sel)) return regles[i];
    return null;
  }
  function actif(inp, r){ return !inp.disabled && !inp.closest("[hidden]") && (!r.quand || r.quand(inp)); }
  function verifier(inp){
    var r = regleDe(inp); if (!r) return "";
    if (!actif(inp, r)){ afficherErreurChamp(inp, ""); return ""; }
    var msg = messageSaisie(inp, r); afficherErreurChamp(inp, msg); return msg;
  }
  /* pendant la frappe on ne critique pas un champ encore vide ; à la sortie du champ, oui */
  racine.addEventListener("input", function(e){
    var r = regleDe(e.target); if (!r) return;
    if (e.target.__err || String(e.target.value).trim() !== "") verifier(e.target);
  });
  racine.addEventListener("focusout", function(e){ if (regleDe(e.target)) verifier(e.target); });
  racine.addEventListener("change", function(e){ if (regleDe(e.target)) verifier(e.target); });
  return {
    valider: function(){
      var erreurs = [];
      regles.forEach(function(r){
        [].forEach.call(racine.querySelectorAll(r.sel), function(inp){
          var msg = verifier(inp);
          if (msg) erreurs.push({champ: inp, msg: msg, lib: libelleChamp(inp)});
        });
      });
      /* dans l'ordre de la page */
      erreurs.sort(function(a, b){ return (a.champ.compareDocumentPosition(b.champ) & 4) ? -1 : 1; });
      return erreurs;
    }
  };
}
/* Le bouton « Enregistrer » d'un formulaire : vérifie tous les champs, se
   plaint des erreurs (en amenant sur la première), sinon enregistre et le dit. */
function barreEnregistrer(o){
  var box = el('<div class="enreg"><button type="button" class="btn primary">'+esc(o.libelle || "Enregistrer")+'</button>'+
    '<span class="enreg-etat" role="status" aria-live="polite">'+esc(o.aide || "Tes modifications sont gardées au fur et à mesure.")+'</span></div>');
  var b = box.querySelector("button"), etat = box.querySelector(".enreg-etat");
  b.addEventListener("click", function(){
    var erreurs = o.verif.valider();
    if (erreurs.length){
      etat.classList.add("err");
      etat.textContent = erreurs.length === 1 ? "1 champ à corriger : " + erreurs[0].lib + "." : erreurs.length + " champs à corriger : " + erreurs.slice(0, 3).map(function(x){ return x.lib; }).join(", ") + (erreurs.length > 3 ? "…" : ".");
      toast(erreurs[0].lib + " : " + erreurs[0].msg);
      try{ erreurs[0].champ.focus(); erreurs[0].champ.scrollIntoView({block:"center"}); }catch(e){}
      return;
    }
    etat.classList.remove("err");
    if (o.surOk) o.surOk();
    sauverTout();
    var h = new Date();
    etat.textContent = "✓ Enregistré à " + (h.getHours() < 10 ? "0" : "") + h.getHours() + ":" + (h.getMinutes() < 10 ? "0" : "") + h.getMinutes() + ".";
    toast(o.message || "Enregistré ✓");
  });
  return box;
}

/* Invitation à passer en mode complet, affichée une seule fois par page concernée. */
function inviteComplet(raison){
  if (state.reglages.mode === "complet") return null;
  var d = el('<div class="banner"><p><b>Besoin de plus ?</b> '+esc(raison)+'</p></div>');
  d.appendChild(bouton("Activer le suivi des pièces", function(){
    state.reglages.mode = "complet"; sauverTout(); render();
    toast("Le suivi des pièces est activé dans « Mes créations »");
  }));
  return d;
}


/* ═════ 23. PHOTOS DES CRÉATIONS ═════
   Les images vivent dans IndexedDB, pas dans localStorage : quelques photos
   suffiraient à saturer les 5 Mo du stockage classique. Elles restent sur
   l'appareil, comme le reste des données. */

var DBphotos = null, urlsPhotos = {}, photosDispo = true;

function ouvrirDB(){
  return new Promise(function(res){
    if (DBphotos) return res(DBphotos);
    try{
      var rq = indexedDB.open("atelier-photos", 1);
      rq.onupgradeneeded = function(){ rq.result.createObjectStore("img"); };
      rq.onsuccess = function(){
        DBphotos = rq.result;
        /* iOS peut couper la connexion (« Connection to Indexed Database server
           lost ») : on la rouvrira à la prochaine opération. */
        DBphotos.onclose = function(){ DBphotos = null; };
        res(DBphotos);
      };
      rq.onerror = function(){ photosDispo = false; res(null); };
    }catch(e){ photosDispo = false; res(null); }
  });
}
function ecrirePhoto(id, blob){
  return ouvrirDB().then(function(db){
    if (!db) return false;
    return new Promise(function(res){
      try{
        var tx = db.transaction("img","readwrite");
        tx.objectStore("img").put(blob, id);
        tx.oncomplete = function(){ res(true); };
        /* Mémoire pleine : Chrome n'envoie qu'un « abort », jamais d'erreur. */
        tx.onerror = tx.onabort = function(){
          if (tx.error && tx.error.name === "QuotaExceededError")
            toast("La mémoire de cet appareil est pleine : la photo n'a pas pu être enregistrée.");
          res(false);
        };
      }catch(e){ DBphotos = null; res(false); }
    });
  });
}
function lirePhoto(id){
  return ouvrirDB().then(function(db){
    if (!db) return null;
    return new Promise(function(res){
      try{
        var rq = db.transaction("img","readonly").objectStore("img").get(id);
        rq.onsuccess = function(){ res(rq.result || null); };
        rq.onerror = function(){ res(null); };
      }catch(e){ res(null); }
    });
  });
}
function effacerPhoto(id){
  if (id && window.CrochompteSync && window.CrochompteSync.photoEffacee) window.CrochompteSync.photoEffacee(id);
  return effacerPhotoLocale(id);
}
/* Vide toutes les photos de cet appareil (déconnexion, changement de
   compte). Les copies en ligne restent dans le compte. */
/* garder : {id: 1} des photos à laisser sur l'appareil (celles d'une autre
   personne qui ne sont pas encore parties en ligne : elles partiront quand
   elle se reconnectera ici). */
function viderPhotosLocales(garder){
  garder = garder || {};
  var aGarder = Object.keys(garder).length > 0;
  for (var k in urlsPhotos){ if (garder[k]) continue; try{ URL.revokeObjectURL(urlsPhotos[k]); }catch(e){} delete urlsPhotos[k]; }
  return ouvrirDB().then(function(db){
    if (!db) return;
    return new Promise(function(res){
      try{
        var tx = db.transaction("img","readwrite");
        var magasin = tx.objectStore("img");
        if (!aGarder) magasin.clear();
        else {
          var rq = magasin.getAllKeys();
          rq.onsuccess = function(){ (rq.result || []).forEach(function(cle){ if (!garder[cle]) magasin["delete"](cle); }); };
        }
        tx.oncomplete = tx.onerror = tx.onabort = function(){ res(); };
      }catch(e){ res(); }
    });
  });
}
/* Photos de l'atelier pour le fichier de sauvegarde, en texte (data URL). */
function idsPhotosAtelier(){ return window.CrochomptePont.photo.lister(); }
function photosPourSauvegarde(){
  var donnees = {}, n = 0;
  return idsPhotosAtelier().reduce(function(chaine, id){
    return chaine.then(function(){
      return lirePhoto(id).then(function(b){
        if (!b || !(b instanceof Blob)) return;
        return new Promise(function(res){
          var lr = new FileReader();
          lr.onload = function(){ donnees[id] = String(lr.result); n++; res(); };
          lr.onerror = function(){ res(); };
          lr.readAsDataURL(b);
        });
      });
    });
  }, Promise.resolve()).then(function(){ return {donnees:donnees, n:n}; });
}
function blobDepuisDataURL(u){
  var i = u.indexOf(","), entete = u.slice(0, i);
  var bin = atob(u.slice(i + 1)), octets = new Uint8Array(bin.length);
  for (var k = 0; k < bin.length; k++) octets[k] = bin.charCodeAt(k);
  return new Blob([octets], {type: (entete.match(/^data:([^;,]+)/) || [,"image/jpeg"])[1]});
}
function restaurerPhotos(photos){
  if (!photos) return Promise.resolve(0);
  var utiles = {}; idsPhotosAtelier().forEach(function(id){ utiles[id] = 1; });
  var n = 0;
  return Object.keys(photos).filter(function(id){ return utiles[id] && /^data:image\//.test(String(photos[id])); })
    .reduce(function(chaine, id){
      return chaine.then(function(){
        /* Décodage à la main plutôt que fetch(data:) : la politique de
           sécurité du site n'autorise pas les connexions vers « data: ». */
        return Promise.resolve().then(function(){ return blobDepuisDataURL(photos[id]); }).then(function(b){
          if (urlsPhotos[id]){ try{ URL.revokeObjectURL(urlsPhotos[id]); }catch(e){} delete urlsPhotos[id]; }
          return ecrirePhoto(id, b).then(function(ok){ if (ok){ n++; if (window.CrochompteSync && window.CrochompteSync.photoRestauree) window.CrochompteSync.photoRestauree(id); } });
        }).catch(function(){});
      });
    }, Promise.resolve()).then(function(){ return n; });
}
/* Retire la photo de cet appareil seulement (déconnexion) : la copie en
   ligne reste dans le compte. */
function effacerPhotoLocale(id){
  if (urlsPhotos[id]){ try{ URL.revokeObjectURL(urlsPhotos[id]); }catch(e){} delete urlsPhotos[id]; }
  return ouvrirDB().then(function(db){
    if (!db) return;
    try{ db.transaction("img","readwrite").objectStore("img").delete(id); }catch(e){}
  });
}

/* Les photos HEIC des iPhone ne se lisent que dans Safari : ailleurs, on
   explique quoi faire plutôt qu'un « illisible » sans issue. */
function messageImageIllisible(f){
  if (/\.(heic|heif)$/i.test((f && f.name) || "") || /hei[cf]/i.test((f && f.type) || ""))
    return "Ce navigateur ne sait pas lire les photos HEIC de l'iPhone. Ouvre Crochompte dans Safari, ou enregistre la photo en JPEG (Réglages › Appareil photo › Formats › « Le plus compatible »).";
  return "Impossible de lire cette image. Essaie avec une autre photo.";
}
/* Une photo de téléphone pèse 3 à 8 Mo : on la réduit avant de la garder. */
function redimensionner(fichier, cote){
  return new Promise(function(res){
    var u;
    try{ u = URL.createObjectURL(fichier); }catch(e){ return res(null); }
    var img = new Image();
    img.onload = function(){
      var r = Math.min(1, cote / Math.max(img.width, img.height));
      var c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * r));
      c.height = Math.max(1, Math.round(img.height * r));
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0,0,c.width,c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      try{ URL.revokeObjectURL(u); }catch(e){}
      try{ c.toBlob(function(b){ c.width = c.height = 0; res(b); }, "image/jpeg", 0.82); }
      catch(e){ res(null); }
    };
    img.onerror = function(){ try{ URL.revokeObjectURL(u); }catch(e){} res(null); };
    img.src = u;
  });
}

/* ═════ IMPORT DE PDF ═════
   Beaucoup de patrons s'achètent en PDF. Plutôt que de demander des captures
   d'écran, on lit le PDF sur l'appareil (pdf.js, Mozilla, hébergé dans
   vendor/pdfjs/ et chargé seulement à ce moment-là) : chaque page devient une
   image, et le texte est récupéré pour être lisible en grand et cherchable.
   Rien n'est envoyé ailleurs pour la conversion. */
var PDF_PAGES_MAX = 60;
var pdfjsPromesse = null;
function estPdf(f){ return !!f && (f.type === "application/pdf" || /\.pdf$/i.test(f.name || "")); }
function estImage(f){ return !!f && /^image\//.test(f.type || ""); }
function chargerPdfjs(){
  if (!pdfjsPromesse){
    pdfjsPromesse = import("./vendor/pdfjs/pdf.min.mjs").then(function(m){
      m.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
      return m;
    });
    pdfjsPromesse.catch(function(){ pdfjsPromesse = null; });
  }
  return pdfjsPromesse;
}
/* Lit un PDF : renvoie {pages:[images JPEG], texte, total, tronque}.
   opts.cote : largeur des images ; opts.maxPages ; opts.surPage(n, total). */
function lirePdf(fichier, opts){
  opts = opts || {};
  var base = new URL("vendor/pdfjs/", location.href).href;
  return chargerPdfjs().then(function(pdfjs){
    return fichier.arrayBuffer().then(function(buf){
      return pdfjs.getDocument({data: new Uint8Array(buf), standardFontDataUrl: base + "standard_fonts/",
                                wasmUrl: base + "wasm/", isEvalSupported: false}).promise;
    }).then(function(doc){
      var total = doc.numPages;
      var n = Math.min(total, opts.maxPages || PDF_PAGES_MAX);
      var pages = [], textes = [];
      var chaine = Promise.resolve();
      for (var i = 1; i <= n; i++){
        chaine = chaine.then((function(num){ return function(){
          if (opts.surPage) opts.surPage(num, n);
          return doc.getPage(num).then(function(page){
            var vp1 = page.getViewport({scale: 1});
            var echelle = Math.min(3, (opts.cote || 1400) / Math.max(vp1.width, 1));
            /* Une page très longue (plan, patron en bande) donnerait une image
               géante : les téléphones refusent au-delà de ~16 millions de
               pixels ou 8192 px de côté, et l'image sortirait blanche. */
            var aire = vp1.width * vp1.height * echelle * echelle;
            if (aire > 12e6) echelle *= Math.sqrt(12e6 / aire);
            var cote = Math.max(vp1.width, vp1.height) * echelle;
            if (cote > 8000) echelle *= 8000 / cote;
            var vp = page.getViewport({scale: echelle});
            var c = document.createElement("canvas");
            c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            var ctx = c.getContext("2d");
            ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
            return page.render({canvasContext: ctx, viewport: vp}).promise.then(function(){
              return new Promise(function(res){ c.toBlob(function(b){ res(b); }, "image/jpeg", 0.85); });
            }).then(function(blob){
              c.width = c.height = 0;   /* libère la mémoire de l'image tout de suite (iOS) */
              if (blob) pages.push(blob);
              if (opts.texte === false) return;
              return page.getTextContent().then(function(tc){
                var t = "";
                tc.items.forEach(function(it){ t += (it.str || "") + (it.hasEOL ? "\n" : ""); });
                t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
                if (t) textes.push(t);
              }).catch(function(){});
            }).then(function(){ try{ page.cleanup(); }catch(e){} });
          });
        }; })(i));
      }
      return chaine.then(function(){
        try{ doc.destroy(); }catch(e){}
        return {pages: pages, texte: textes.join("\n\n"), total: total, tronque: total > n};
      }, function(e){
        try{ doc.destroy(); }catch(e2){}
        throw e;
      });
    });
  });
}
function messageErreurPdf(e){
  var nom = e && e.name || "";
  if (nom === "PasswordException") return "Ce PDF est protégé par un mot de passe. Enregistre une version sans mot de passe, puis réessaie.";
  if (nom === "InvalidPDFException") return "Ce fichier PDF est illisible ou abîmé. Essaie avec une autre copie.";
  return "Le PDF n'a pas pu être lu. Vérifie ta connexion internet (la première fois), puis réessaie.";
}
/* Une image à partir d'une photo ou d'un PDF (sa première page). */
function imageDepuisFichier(f, cote){
  if (estPdf(f)) return lirePdf(f, {maxPages:1, cote: Math.max(cote, 900), texte:false})
    .then(function(r){ return r.pages[0] ? redimensionner(r.pages[0], cote) : null; });
  return redimensionner(f, cote);
}

/* ═════ VISIONNEUSE DE PAGES ═════
   Toucher une page de patron l'ouvre en grand, avec page précédente et
   suivante. « Précédent » (téléphone ou navigateur) la referme. */
function ouvrirVisionneuse(images, depart){
  if (!images.length) return;
  var i = Math.max(0, Math.min(depart, images.length - 1));
  var v = el('<div class="visio" role="dialog" aria-modal="true" aria-label="Page du patron">'+
    '<div class="visio-barre"><span class="visio-num"></span>'+
      '<button type="button" class="btn sm" data-v="prec" aria-label="Page précédente">‹ Précédente</button>'+
      '<button type="button" class="btn sm" data-v="suiv" aria-label="Page suivante">Suivante ›</button>'+
      '<button type="button" class="btn sm primary" data-v="fermer">Fermer</button></div>'+
    '<div class="visio-page"><img alt=""></div></div>');
  var img = v.querySelector("img"), num = v.querySelector(".visio-num");
  function montrer(){
    img.src = images[i].src; img.alt = images[i].alt || ("Page " + (i+1));
    num.textContent = "Page " + (i+1) + " sur " + images.length;
    v.querySelector('[data-v="prec"]').disabled = i === 0;
    v.querySelector('[data-v="suiv"]').disabled = i === images.length - 1;
    v.querySelector(".visio-page").scrollTop = 0;
  }
  function retirer(){ if (v.parentNode) v.remove(); if (!document.querySelector(".dlg-fond")) document.body.classList.remove("menu-ouvert"); }
  v.addEventListener("click", function(e){
    var a = e.target.getAttribute && e.target.getAttribute("data-v");
    if (a === "prec" && i > 0){ i--; montrer(); }
    else if (a === "suiv" && i < images.length - 1){ i++; montrer(); }
    else if (a === "fermer") fermerCouche();
  });
  v.addEventListener("keydown", function(e){
    if (e.key === "Escape"){ e.preventDefault(); fermerCouche(); }
    else if (e.key === "ArrowLeft" && i > 0){ i--; montrer(); }
    else if (e.key === "ArrowRight" && i < images.length - 1){ i++; montrer(); }
  });
  document.body.appendChild(v);
  document.body.classList.add("menu-ouvert");
  ouvrirCouche(retirer);
  montrer();
  v.querySelector('[data-v="fermer"]').focus();
}
document.addEventListener("click", function(e){
  var im = e.target && e.target.closest ? e.target.closest(".pages img") : null;
  if (!im || im.hidden || !im.src) return;
  var toutes = [].slice.call(im.closest(".pages").querySelectorAll("img")).filter(function(x){ return !x.hidden && x.src; });
  ouvrirVisionneuse(toutes, toutes.indexOf(im));
});

/* Après chaque rendu, on remplit les <img data-photo> encore vides. */
function hydraterPhotos(racine){
  (racine || document).querySelectorAll("img[data-photo]").forEach(function(im){
    var id = im.getAttribute("data-photo");
    if (!id || im.getAttribute("data-fait") === "1") return;
    im.setAttribute("data-fait","1");
    /* Le porteur doit passer en mode photo dans les deux cas, cache compris :
       sinon l'illustration reste affichée par-dessus l'image. */
    function afficher(u){
      im.src = u; im.hidden = false;
      var slot = im.closest(".vignette, .photoslot, .band");
      if (slot) slot.classList.add("a-photo");
    }
    if (urlsPhotos[id]){ afficher(urlsPhotos[id]); return; }
    lirePhoto(id).then(function(bl){
      if (!bl) return;
      try{ urlsPhotos[id] = URL.createObjectURL(bl); afficher(urlsPhotos[id]); }catch(e){}
    });
  });
}

/* Vignette : la photo si elle existe, sinon l'illustration du modèle. */
function vignette(cr, taille){
  var t = taille || 44;
  var fam = modele(cr.modele)[1] || "perso";
  var img = cr.photo
    ? '<img data-photo="'+esc(cr.photo)+'" alt="Photo de '+esc(cr.nom)+'" hidden>'
    : '';
  return '<span class="vignette f-'+esc(fam)+'" style="width:'+t+'px;height:'+t+'px">'+
    img + motif(cr.modele, Math.round(t*0.78)) + '</span>';
}

/* Bloc d'import, utilisé dans la fiche création. */
function blocPhoto(cr, apres){
  var fam = modele(cr.modele)[1] || "perso";
  var c = el(
    '<div class="card"><header><h2>La photo de ta création</h2>'+
    '<p>Pour la reconnaître d\'un coup d\'œil dans tes listes. Elle est enregistrée dans ton compte et s\'affiche sur tous tes appareils.</p></header>'+
    '<div class="body"><div class="photorow">'+
      '<span class="photoslot f-'+esc(fam)+'">'+
        (cr.photo ? '<img data-photo="'+esc(cr.photo)+'" alt="Photo de la création" hidden>' : '')+
        motif(cr.modele, 62)+
      '</span>'+
      '<div class="photoact"></div>'+
    '</div></div></div>'
  );
  var act = c.querySelector(".photoact");
  if (!photosDispo){
    act.appendChild(el('<p class="hint" style="margin:0">Ton navigateur bloque l\'enregistrement des photos (navigation privée ?). Ouvre l\'application dans une fenêtre normale pour en ajouter. L\'illustration du modèle sera utilisée.</p>'));
    return c;
  }
  var inp = el('<input type="file" accept="image/*,application/pdf,.pdf" id="photo-input" tabindex="-1" aria-label="Choisir une photo ou un PDF de la création" style="display:none">');
  var libAdd = cr.photo ? "Changer la photo" : "Ajouter une photo";
  var bAdd = bouton(libAdd, function(){ inp.click(); }, !cr.photo);
  act.appendChild(bAdd);
  act.appendChild(inp);
  if (cr.photo){
    act.appendChild(bouton("Supprimer la photo", function(){
      confirmer({titre:"Supprimer la photo ?", texte:"La photo de « " + (cr.nom || "cette création") + " » sera supprimée de cet appareil et de ton compte.",
                 bouton:"Supprimer la photo", danger:true}, function(){
        effacerPhoto(cr.photo);
        cr.photo = null;
        if (apres) apres();
      });
    }));
  }
  act.appendChild(el('<p class="hint" style="margin:8px 0 0;flex-basis:100%">'+
    'Photographie la pièce finie sur un fond uni, ou choisis une image ou un PDF (sa première page sera utilisée). '+
    'L\'image est réduite automatiquement : elle ne prendra pas de place et restera nette dans les listes.</p>'));

  inp.addEventListener("change", function(){
    var f = inp.files && inp.files[0];
    if (!f) return;
    inp.value = "";
    if (!estImage(f) && !estPdf(f)){ toast("Ce fichier n'est ni une image ni un PDF. Choisis une photo (JPEG, PNG…) ou un PDF."); return; }
    bAdd.disabled = true; bAdd.textContent = estPdf(f) ? "Lecture du PDF…" : "Traitement…";
    imageDepuisFichier(f, 900).then(function(blob){
      if (!blob){ toast(estPdf(f) ? "Ce PDF n'a pas pu être lu. Essaie avec une autre copie." : messageImageIllisible(f)); bAdd.disabled = false; bAdd.textContent = libAdd; return; }
      /* Toujours un nouvel identifiant : sinon la nouvelle photo, rangée sous
         le nom de l'ancienne déjà en ligne, ne serait jamais renvoyée et les
         autres appareils garderaient l'ancienne. */
      var ancienne = cr.photo, id = "ph_" + uid();
      return ecrirePhoto(id, blob).then(function(ok){
        bAdd.disabled = false;
        if (!ok){ toast("La photo n'a pas pu être enregistrée. Réessaie."); bAdd.textContent = libAdd; return; }
        cr.photo = id;
        if (ancienne && ancienne !== id) effacerPhoto(ancienne);
        toast(ancienne ? "Photo remplacée" : "Photo ajoutée");
        if (apres) apres();
      });
    }, function(e){ bAdd.disabled = false; bAdd.textContent = libAdd; toast(messageErreurPdf(e)); });
  });
  return c;
}


/* ═════ 24. CATALOGUE DE MATIÈRES ═════
   Référentiel de matières du crochet, décrit par ses caractéristiques physiques
   plutôt que par des marques. AUCUN nom de marque, AUCUNE référence fournisseur,
   AUCUN prix relevé : tous les prix sont des ORDRES DE GRANDEUR à remplacer par
   les tickets de caisse de l'artisane. Les métrages sont les plages habituelles
   pour une fibre et une grosseur données, pas des valeurs de produit.
   Structure volontairement générique : `cat` et `fibre` accueilleront demain
   le tissu, le cuir, la cire ou la céramique sans changer de modèle. */

var FAMILLES_MAT = [
  {id:"fil",  nom:"Fils et laines",       aide:"Ce qui se crochète"},
  {id:"garn", nom:"Rembourrage",          aide:"Ouate, fibres, lestage"},
  {id:"acc",  nom:"Accessoires",          aide:"Yeux, perles, anses, quincaillerie"},
  {id:"fin",  nom:"Finition et emballage",aide:"Étiquettes, pochons, boîtes"},
  {id:"outil",nom:"Outils",               aide:"Crochets, aiguilles (non consommés)"}
];

/* ───────────────────────────────────────────────────────────────────────
   Grosseurs de fil et tailles de crochet
   Les fourchettes en millimètres viennent du Standard Yarn Weight System
   du Craft Yarn Council (craftyarncouncil.com/standards/yarn-weight-system),
   relevé le 19 septembre 2026. C'est la seule référence publiée : il n'existe
   aucune norme française ni européenne de grosseur de fil.
   Les bornes se CHEVAUCHENT volontairement (4,5 appartient à deux catégories) :
   c'est ainsi dans le standard, et un crochet donné doit pouvoir convenir à
   plusieurs grosseurs. D'où une comparaison par intervalles, jamais par égalité.
   ─────────────────────────────────────────────────────────────────────── */
var GROSSEURS = [
  {id:"Dentelle",   cyc:"0", min:1.4, max:2.25, nom:"Dentelle",   exemple:"coton à napperon n° 10 à 30"},
  {id:"Très fin",   cyc:"1", min:2.25,max:3.5,  nom:"Très fin",   exemple:"fil à chaussettes, fingering"},
  {id:"Fin",        cyc:"2", min:3.5, max:4.5,  nom:"Fin",        exemple:"sport, layette"},
  {id:"Moyen-fin",  cyc:"3", min:4.5, max:5.5,  nom:"Moyen-fin",  exemple:"DK"},
  {id:"Moyen",      cyc:"4", min:5.5, max:6.5,  nom:"Moyen",      exemple:"worsted, aran"},
  {id:"Épais",      cyc:"5", min:6.5, max:9,    nom:"Épais",      exemple:"chunky"},
  {id:"Très épais", cyc:"6-7", min:9, max:20,   nom:"Très épais", exemple:"trapilho, corde"}
];

/* Tailles de crochet réellement vendues, pour proposer un choix plutôt
   qu'un champ libre où chacune écrirait « 4 », « 4,0 » ou « 4 mm ». */
var CROCHETS = [1.5,1.75,2,2.25,2.5,2.75,3,3.5,4,4.5,5,5.5,6,6.5,7,8,9,10,12,15,20];

function grosseurInfo(g){
  for (var i=0;i<GROSSEURS.length;i++) if (GROSSEURS[i].id === g) return GROSSEURS[i];
  return null;
}
/* Cette matière convient-elle à ce crochet ? On croit d'abord ce qui est écrit
   sur l'étiquette (champ « crochet » saisi), et seulement à défaut la
   fourchette déduite de la grosseur. L'étiquette de la pelote fait foi. */
/* Renvoie "exact", "proche" ou false.
   « proche » existe parce que le standard américain et l'usage français ne
   disent pas tout à fait la même chose : le CYC place le DK à 4,5–5,5 mm,
   alors qu'en France on le crochète volontiers au 4 mm, et plus serré encore
   en amigurumi. Masquer ces fils donnerait une réponse fausse à une question
   légitime ; on les montre donc, en disant qu'ils sont un peu à côté. */
function matiereVaAvecCrochet(m, taille){
  if (!taille) return "exact";
  var t = Number(taille), a, b, g;
  if (m.crochetMin || m.crochetMax){
    a = Number(m.crochetMin) || Number(m.crochetMax);
    b = Number(m.crochetMax) || Number(m.crochetMin);
  } else {
    g = grosseurInfo(m.grosseur);
    if (!g) return false;
    a = g.min; b = g.max;
  }
  if (t >= a - 0.001 && t <= b + 0.001) return "exact";
  if (t >= a - 1.001 && t <= b + 1.001) return "proche";
  return false;
}
function crochetTexte(m){
  if (m.crochetMin && m.crochetMax && m.crochetMin !== m.crochetMax)
    return nb(m.crochetMin) + " à " + nb(m.crochetMax) + " mm";
  if (m.crochetMin || m.crochetMax) return nb(m.crochetMin || m.crochetMax) + " mm";
  var g = grosseurInfo(m.grosseur);
  return g ? nb(g.min) + " à " + nb(g.max) + " mm" : "";
}

/* [id, nom, cat, fibre, composition, grosseur, prixIndicatif, contenance, unite, metrage] */
var CATALOGUE_MATIERES = [
["cat_cot_fing","Coton peigné fin (fingering)","fil","coton","100 % coton","Fin",3.20,50,"g",125],
["cat_cot_sport","Coton peigné sport","fil","coton","100 % coton","Moyen-fin",3.40,50,"g",105],
["cat_cot_dk","Coton peigné DK","fil","coton","100 % coton","Moyen",2.70,50,"g",85],
["cat_cot_aran","Coton peigné épais (aran)","fil","coton","100 % coton","Épais",3.80,50,"g",70],
["cat_cot_ami","Coton amigurumi (petite pelote)","fil","coton","100 % coton","Fin",2.00,25,"g",62],
["cat_cot_merc_fin","Coton mercerisé fin","fil","coton mercerisé","100 % coton mercerisé","Fin",3.60,50,"g",125],
["cat_cot_merc_dk","Coton mercerisé moyen","fil","coton mercerisé","100 % coton mercerisé","Moyen",3.90,50,"g",90],
["cat_cot_bio","Coton biologique non teint","fil","coton bio","100 % coton biologique","Moyen",4.50,50,"g",85],
["cat_cot_recycle","Coton recyclé","fil","coton recyclé","mélange coton recyclé","Moyen",4.00,100,"g",120],
["cat_cot_dentelle","Fil dentelle n°10","fil","coton","100 % coton","Très fin",4.20,50,"g",280],

["cat_mer_fin","Laine mérinos fine","fil","mérinos","100 % laine mérinos","Fin",8.50,50,"g",160],
["cat_mer_dk","Laine mérinos moyenne","fil","mérinos","100 % laine mérinos","Moyen",9.00,50,"g",105],
["cat_mer_aran","Laine mérinos épaisse","fil","mérinos","100 % laine mérinos","Épais",14.00,100,"g",100],
["cat_laine_vierge","Laine vierge","fil","laine","100 % laine vierge","Moyen",6.50,50,"g",120],
["cat_laine_feutre","Laine feutrable","fil","laine","100 % laine non traitée","Moyen",6.00,50,"g",100],
["cat_mel_laine_acr","Mélange laine et acrylique","fil","mélange","50 % laine, 50 % acrylique","Moyen",4.20,50,"g",125],
["cat_mel_cot_acr","Mélange coton et acrylique","fil","mélange","55 % coton, 45 % acrylique","Moyen",3.10,50,"g",130],
["cat_alpaga","Alpaga","fil","alpaga","100 % alpaga","Fin",11.00,50,"g",150],

["cat_acr_dk","Acrylique moyen","fil","acrylique","100 % acrylique","Moyen",4.00,100,"g",250],
["cat_acr_bebe","Acrylique bébé","fil","acrylique","100 % acrylique","Fin",3.20,50,"g",150],
["cat_acr_epais","Acrylique épais","fil","acrylique","100 % acrylique","Très épais",5.50,100,"g",120],
["cat_chenille","Fil chenille / velours","fil","polyester","100 % polyester","Épais",6.50,100,"g",90],
["cat_peluche","Fil peluche poil long","fil","polyester","100 % polyester","Très épais",7.50,100,"g",70],
["cat_polyamide","Fil polyamide renforcé","fil","polyamide","75 % laine, 25 % polyamide","Fin",7.00,50,"g",200],

["cat_bambou","Viscose de bambou","fil","bambou","100 % viscose de bambou","Fin",6.00,50,"g",110],
["cat_lin","Lin","fil","lin","100 % lin","Moyen",7.50,50,"g",120],
["cat_raphia","Raphia synthétique","fil","papier/synthétique","100 % polypropylène","Épais",4.50,50,"g",90],
["cat_jute","Ficelle de jute","fil","jute","100 % jute","Épais",3.50,100,"g",55],
["cat_lurex","Fil métallisé (lurex)","fil","mélange","60 % viscose, 40 % polyester métallisé","Très fin",4.80,25,"g",100],

["cat_trapilho","Trapilho (jersey recyclé)","fil","coton recyclé","mélange jersey recyclé","Très épais",7.50,500,"g",120],
["cat_corde3","Corde de coton 3 mm","fil","coton","100 % coton","Très épais",11.00,500,"g",100],
["cat_corde5","Corde de coton 5 mm","fil","coton","100 % coton","Très épais",12.00,500,"g",55],
["cat_broder","Fil à broder mouliné (échevette)","fil","coton","100 % coton","Très fin",1.20,20,"utilisation",8],
["cat_elastique_fil","Fil élastique transparent","fil","synthétique","100 % polyuréthane","Très fin",3.00,50,"m",50],

["cat_ouate_sili","Ouate polyester siliconée","garn","polyester","100 % polyester","",13.00,1000,"g",null],
["cat_ouate_std","Ouate polyester standard","garn","polyester","100 % polyester","",4.50,250,"g",null],
["cat_fibre_bambou","Fibre de rembourrage bambou","garn","bambou","100 % viscose de bambou","",9.00,500,"g",null],
["cat_billes_pl","Billes de lestage plastique","garn","plastique","100 % polypropylène","",6.00,500,"g",null],
["cat_billes_verre","Billes de lestage verre","garn","verre","100 % verre","",8.50,500,"g",null],

["cat_yeux6","Yeux de sécurité 6 mm (lot)","acc","plastique","","",3.50,20,"pièce",null],
["cat_yeux9","Yeux de sécurité 9 mm (lot)","acc","plastique","","",4.00,20,"pièce",null],
["cat_yeux12","Yeux de sécurité 12 mm (lot)","acc","plastique","","",4.50,20,"pièce",null],
["cat_yeux18","Yeux de sécurité 18 mm (lot)","acc","plastique","","",5.00,10,"pièce",null],
["cat_nez12","Nez de sécurité 12 mm (lot)","acc","plastique","","",3.50,20,"pièce",null],
["cat_articulation","Articulations pour peluche (lot)","acc","plastique","","",6.00,5,"jeu",null],
["cat_grelot","Grelot 15 mm (lot)","acc","métal","","",4.00,10,"pièce",null],
["cat_anneau40","Anneau bois 40 mm (lot)","acc","bois","hêtre non traité","",5.00,10,"pièce",null],
["cat_anneau65","Anneau bois 65 mm (lot)","acc","bois","hêtre non traité","",6.50,10,"pièce",null],
["cat_perle12","Perles bois 12 mm (lot)","acc","bois","hêtre non traité","",6.00,100,"pièce",null],
["cat_perle15","Perles bois 15 mm (lot)","acc","bois","hêtre non traité","",7.00,50,"pièce",null],
["cat_bouton","Bouton bois 15 mm (lot)","acc","bois","","",3.00,20,"pièce",null],
["cat_zip20","Fermeture éclair 20 cm","acc","synthétique","","",0.80,1,"pièce",null],
["cat_mousqueton","Mousqueton porte-clés (lot)","acc","métal","","",4.00,20,"pièce",null],
["cat_anses","Anses de sac simili cuir (paire)","acc","simili cuir","","",7.00,1,"paire",null],
["cat_chenille_fer","Fil de fer gainé, armature (lot)","acc","métal","","",3.00,30,"pièce",null],
["cat_cercle20","Cercle en bois 20 cm","acc","bois","","",3.50,1,"pièce",null],
["cat_cercle_metal","Cercle métal 15 cm","acc","métal","","",2.80,1,"pièce",null],
["cat_amidon","Amidon textile / raidisseur","acc","chimique","","",5.00,20,"utilisation",null],
["cat_pot","Pot en terre cuite 8 cm","acc","terre cuite","","",2.50,1,"pièce",null],
["cat_elastique_plat","Élastique plat 10 mm","acc","synthétique","","",3.00,5,"m",null],

["cat_etiq_tissee","Étiquette tissée personnalisée (lot)","fin","textile","","",18.00,50,"pièce",null],
["cat_etiq_carton","Étiquette carton (lot)","fin","papier","","",7.00,100,"pièce",null],
["cat_carte","Carte de remerciement (lot)","fin","papier","","",6.00,50,"pièce",null],
["cat_pochon_org","Pochon organza (lot)","fin","synthétique","","",5.00,25,"pièce",null],
["cat_pochon_cot","Pochon coton (lot)","fin","coton","","",9.00,25,"pièce",null],
["cat_boite","Boîte kraft (lot)","fin","papier","","",22.00,25,"pièce",null],
["cat_soie","Papier de soie","fin","papier","","",4.00,50,"feuille",null],
["cat_ruban","Ruban satin 10 mm","fin","synthétique","","",3.00,25,"m",null],
["cat_ficelle","Ficelle coton","fin","coton","","",3.50,50,"m",null],
["cat_pochette_exp","Pochette d'expédition (lot)","fin","synthétique","","",9.00,50,"pièce",null],
["cat_carton_exp","Carton d'expédition (lot)","fin","carton","","",14.00,25,"pièce",null],

["cat_crochet_alu","Crochet aluminium (l'unité)","outil","métal","","",3.00,1,"pièce",null],
["cat_crochet_ergo","Crochet ergonomique (l'unité)","outil","métal et plastique","","",7.00,1,"pièce",null],
["cat_jeu_crochets","Jeu de crochets 2 à 6 mm","outil","métal","","",18.00,1,"jeu",null],
["cat_aiguilles","Aiguilles à laine (lot)","outil","métal","","",3.50,5,"pièce",null],
["cat_marqueurs","Marqueurs de mailles (lot)","outil","plastique","","",4.00,20,"pièce",null],
["cat_ciseaux","Ciseaux de broderie","outil","métal","","",7.00,1,"pièce",null],
["cat_compte_rangs","Compte-rangs","outil","plastique","","",4.50,1,"pièce",null],
["cat_metre","Mètre ruban","outil","synthétique","","",2.50,1,"pièce",null]
];

function catMat(id){
  for (var i=0;i<CATALOGUE_MATIERES.length;i++) if (CATALOGUE_MATIERES[i][0]===id) return CATALOGUE_MATIERES[i];
  return null;
}
function catObjet(c){
  return {id:c[0], nom:c[1], cat:c[2], fibre:c[3], composition:c[4], grosseur:c[5],
          prix:c[6], contenance:c[7], unite:c[8], metrage:c[9]};
}
/* Texte de recherche : on cherche aussi bien « coton » que « 100 g » ou « amigurumi ». */
function texteRecherche(o){
  return [o.nom, o.fibre, o.composition, o.grosseur, o.unite,
          o.contenance + " " + o.unite, famNomMat(o.cat)].join(" ").toLowerCase();
}
function famNomMat(id){
  for (var i=0;i<FAMILLES_MAT.length;i++) if (FAMILLES_MAT[i].id===id) return FAMILLES_MAT[i].nom;
  return id;
}
/* Ajoute une matière du catalogue à « Mes matières », sans doublon. */
function adopterMatiere(catId){
  var c = catMat(catId); if (!c) return null;
  var o = catObjet(c);
  var deja = null;
  state.matieres.forEach(function(m){ if (m.refCat === catId) deja = m; });
  if (deja) return deja;
  var m = {id: uid(), nom:o.nom, cat:o.cat, prix:o.prix, contenance:o.contenance, unite:o.unite,
           stock:0, seuil:0, pmp:o.contenance ? o.prix/o.contenance : 0, mouv:[],
           refCat:catId, fibre:o.fibre, composition:o.composition, grosseur:o.grosseur,
           metrage:o.metrage, prixIndicatif:true, perso:false, maj:Date.now()};
  state.matieres.push(m);
  return m;
}


/* ═════ 25. SÉLECTEUR DE MATIÈRE ═════
   Remplace la longue liste déroulante : on tape « coton », on voit ses propres
   matières d'abord, puis le catalogue. Un clic suffit, rien à ressaisir. */

var pickerOuvert = null;

function ouvrirPicker(choisie){
  if (pickerOuvert) retirerPicker();
  var ov = el('<div class="picker-ov" role="dialog" aria-modal="true" aria-label="Choisir une matière">'+
    '<div class="picker">'+
      '<header>'+
        '<label class="f" style="margin:0"><span>Chercher une matière</span>'+
        '<input type="text" id="pk-q" placeholder="coton, mérinos, yeux, 100 g…" autocomplete="off"></label>'+
        '<button type="button" class="btn ghost" id="pk-x" aria-label="Fermer">✕</button>'+
      '</header>'+
      '<div class="pk-fams" id="pk-fams"></div>'+
      '<div class="pk-list" id="pk-list"></div>'+
      '<footer><span class="hint" style="margin:0">Les prix du catalogue sont des ordres de grandeur, '+
      'à remplacer par tes tickets de caisse.</span></footer>'+
    '</div></div>');
  document.body.appendChild(ov);
  pickerOuvert = ov;
  /* Une étape d'historique : « précédent » ferme le sélecteur au lieu de
     changer l'écran derrière lui. */
  ouvrirCouche(retirerPicker);

  var q = ov.querySelector("#pk-q"), liste = ov.querySelector("#pk-list");
  var famActive = "tous";

  var fams = ov.querySelector("#pk-fams");
  function chipFam(lib, id){
    var b = el('<button type="button" class="fchip">'+esc(lib)+'</button>');
    b.setAttribute("aria-pressed", famActive === id ? "true" : "false");
    b.addEventListener("click", function(){ famActive = id; majFams(); peindre(); });
    return b;
  }
  function majFams(){
    fams.innerHTML = "";
    fams.appendChild(chipFam("Toutes", "tous"));
    FAMILLES_MAT.forEach(function(f){ fams.appendChild(chipFam(f.nom, f.id)); });
  }
  majFams();

  function ligne(o, source, mid){
    var det = [];
    if (o.composition) det.push(o.composition);
    else if (o.fibre) det.push(o.fibre);
    if (o.grosseur) det.push(o.grosseur);
    det.push(qte(o.contenance, o.unite) + (o.metrage ? " · environ " + o.metrage + " m" : ""));
    var pu2 = o.contenance ? o.prix / o.contenance : 0;
    var b = el('<button type="button" class="pk-item">'+
      '<span class="pk-n">'+esc(o.nom)+
        (source === "perso" ? ' <span class="chip good">à moi</span>' : '')+
        (source === "cat" ? ' <span class="chip neutral">catalogue</span>' : '')+'</span>'+
      '<span class="pk-d">'+esc(det.join(" · "))+'</span>'+
      '<span class="pk-p num">'+esc(eur(o.prix))+'<small>'+esc(eur(pu2))+' / '+esc(o.unite)+'</small></span>'+
    '</button>');
    b.addEventListener("click", function(){
      var id = mid;
      if (source === "cat"){
        var m = adopterMatiere(o.id);
        if (!m) return;
        id = m.id; sauverTout();
        toast("« " + o.nom + " » ajoutée à tes matières");
      }
      fermerPicker(function(){ choisie(id); });
    });
    return b;
  }

  function peindre(){
    var t = q.value.trim().toLowerCase();
    liste.innerHTML = "";
    var n = 0;

    var miennes = state.matieres.filter(function(m){
      if (famActive !== "tous" && m.cat !== famActive) return false;
      if (!t) return true;
      return texteRecherche(m).indexOf(t) !== -1;
    });
    if (miennes.length){
      liste.appendChild(el('<div class="pk-t">Mes matières</div>'));
      miennes.slice(0,40).forEach(function(m){ liste.appendChild(ligne(m, "perso", m.id)); n++; });
    }

    var dejaRef = {};
    state.matieres.forEach(function(m){ if (m.refCat) dejaRef[m.refCat] = true; });
    var cataGen = CATALOGUE_MATIERES.map(catObjet).filter(function(o){
      if (dejaRef[o.id]) return false;
      if (famActive !== "tous" && o.cat !== famActive) return false;
      if (!t) return true;
      return texteRecherche(o).indexOf(t) !== -1;
    });
    if (cataGen.length){
      liste.appendChild(el('<div class="pk-t">Catalogue : choisis une matière pour l\'ajouter à tes matières</div>'));
      cataGen.slice(0,60).forEach(function(o){ liste.appendChild(ligne(o, "cat", null)); n++; });
    }

    if (!n){
      liste.appendChild(el('<p class="hint" style="padding:18px 4px;margin:0">'+
        'Rien ne correspond à « '+esc(q.value)+' ».</p>'));
      var bn = bouton("Créer la matière « " + (q.value.trim() || "Nouvelle matière") + " »", function(){
        var nom = q.value.trim() || "Nouvelle matière";
        var m = {id:uid(), nom:nom, cat:(famActive === "tous" ? "fil" : famActive),
                 prix:0, contenance:100, unite:"g", stock:0, seuil:0, pmp:0, mouv:[],
                 refCat:null, fibre:"", composition:"", grosseur:"", metrage:null,
                 prixIndicatif:false, perso:true, maj:Date.now()};
        state.matieres.push(m); sauverTout();
        fermerPicker(function(){ choisie(m.id); });
        toast("Matière créée. Pense à renseigner son prix dans « Mes matières ».");
      }, true);
      bn.style.margin = "0 4px 8px";
      liste.appendChild(bn);
    }
  }

  q.addEventListener("input", peindre);
  ov.querySelector("#pk-x").addEventListener("click", function(){ fermerPicker(); });
  ov.addEventListener("click", function(e){ if (e.target === ov) fermerPicker(); });
  document.addEventListener("keydown", echap);
  peindre();
  setTimeout(function(){ q.focus(); }, 30);
}
function echap(e){ if (e.key === "Escape") fermerPicker(); }
/* Fermer depuis l'interface : on retire l'étape d'historique, puis on fait
   ce qui a été demandé (ajouter la matière choisie). */
function fermerPicker(apres){
  if (pickerOuvert && nav.couches.indexOf(retirerPicker) !== -1) fermerCouche(apres);
  else { retirerPicker(); if (apres) apres(); }
}
function retirerPicker(){
  var i = nav.couches.indexOf(retirerPicker);
  if (i !== -1 && i !== nav.couches.length - 1) nav.couches.splice(i, 1);
  if (pickerOuvert && pickerOuvert.parentNode) pickerOuvert.remove();
  pickerOuvert = null;
  document.removeEventListener("keydown", echap);
}


/* ═════ 26. PAGE CATALOGUE DES MATIÈRES ═════ */

function renderCatalogueMatieres(main){
  main.appendChild(el('<div class="banner"><p><b>Un référentiel, pas un tarif.</b> '+
    'Ces matières sont décrites par leurs caractéristiques (fibre, composition, grosseur, conditionnement), '+
    'sans nom de marque ni référence fournisseur, parce qu\'ils ne sont pas vérifiables. '+
    'Les prix sont des <b>ordres de grandeur</b> : ils te servent à démarrer, tu les remplaces par tes vrais achats.</p></div>'));

  var barre = el('<div class="grid2" style="max-width:640px;margin-bottom:14px">'+
    '<label class="f"><span>Chercher</span><input type="text" id="cm-q" placeholder="coton, mérinos, yeux, 100 g…"></label>'+
    '<label class="f"><span>Famille</span><select id="cm-fam"><option value="tous">Toutes les familles</option></select></label>'+
    '</div>');
  var selFam = barre.querySelector("#cm-fam");
  FAMILLES_MAT.forEach(function(f){
    var o = document.createElement("option"); o.value = f.id; o.textContent = f.nom; selFam.appendChild(o);
  });
  selFam.value = view.cmFam || "tous";
  barre.querySelector("#cm-q").value = view.cmQ || "";
  main.appendChild(barre);

  var compte = el('<p class="compte" id="cm-compte"></p>');
  main.appendChild(compte);
  var wrap = el('<div class="tablewrap resp"></div>');
  var t = el('<table style="min-width:860px"><thead><tr>'+
    '<th style="min-width:200px">Matière</th><th>Composition</th><th>Grosseur</th>'+
    '<th class="n">Conditionnement</th><th class="n">Prix indicatif</th><th class="n">Prix unitaire</th>'+
    '<th style="width:190px"><span class="sr-only">Actions</span></th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  wrap.appendChild(t);
  main.appendChild(wrap);

  function peindre(){
    tb.innerHTML = "";
    var q = (view.cmQ||"").trim().toLowerCase();
    var fam = view.cmFam || "tous";
    var dejaRef = {};
    state.matieres.forEach(function(m){ if (m.refCat) dejaRef[m.refCat] = true; });

    var liste = CATALOGUE_MATIERES.map(catObjet).filter(function(o){
      if (fam !== "tous" && o.cat !== fam) return false;
      if (q && texteRecherche(o).indexOf(q) === -1) return false;
      return true;
    });
    compte.textContent = liste.length + (liste.length>1 ? " matières" : " matière") +
      (q || fam !== "tous" ? " sur " + CATALOGUE_MATIERES.length : " au catalogue");

    if (!liste.length){
      tb.appendChild(el('<tr><td colspan="7" class="hint">Aucune matière ne correspond. '+
        'Tu peux créer la tienne depuis l\'onglet « Mes matières ».</td></tr>'));
      return;
    }
    var famCourante = null;
    liste.forEach(function(o){
      if (fam === "tous" && o.cat !== famCourante){
        famCourante = o.cat;
        tb.appendChild(el('<tr class="catrow"><td colspan="7">'+esc(famNomMat(o.cat))+'</td></tr>'));
      }
      var pu2 = o.contenance ? o.prix / o.contenance : 0;
      var tr = el('<tr data-cid="'+esc(o.id)+'">'+
        '<td><b>'+esc(o.nom)+'</b>'+
          (o.metrage ? '<div class="hint" style="margin:2px 0 0">environ '+o.metrage+' m '+(o.cat==="fil"?'par pelote':'par unité')+'</div>' : '')+'</td>'+
        '<td data-l="Composition">'+esc(o.composition || o.fibre || "—")+'</td>'+
        '<td data-l="Grosseur">'+esc(o.grosseur || "—")+'</td>'+
        '<td class="n" data-l="Conditionnement">'+esc(qte(o.contenance, o.unite))+'</td>'+
        '<td class="n" data-l="Prix indicatif">'+esc(eur(o.prix))+' <span class="hypo">INDICATIF</span></td>'+
        '<td class="n" data-l="Prix unitaire">'+esc(eurU(pu2, o.unite))+'</td>'+
        '<td data-role="act"></td></tr>');
      var act = tr.querySelector('[data-role=act]');
      if (dejaRef[o.id]){
        act.appendChild(el('<span class="etat e-ok"><span class="pastille"></span>déjà dans mes matières</span>'));
      } else {
        act.appendChild(bouton("Ajouter à mes matières", function(){
          adopterMatiere(o.id); sauverTout(); render();
          toast("« " + o.nom + " » ajoutée");
        }));
      }
      tb.appendChild(tr);
    });
  }
  barre.querySelector("#cm-q").addEventListener("input", function(e){ view.cmQ = e.target.value; peindre(); });
  selFam.addEventListener("change", function(e){ view.cmFam = e.target.value; peindre(); });
  peindre();

  main.appendChild(el('<p class="hint" style="margin-top:16px;max-width:80ch">'+
    '<b>Pourquoi aucune marque ?</b> Une référence fournisseur et son prix changent selon le pays, le revendeur, '+
    'la quantité et la date. Faute de pouvoir les vérifier, le catalogue n\'en affiche aucun plutôt que d\'afficher '+
    'quelque chose de faux. Il te donne les caractéristiques (métrage, grosseur, composition) et tu y ajoutes tes '+
    'propres références et tes propres prix.</p>'));
}


/* ═════ 27. PHOTOS DES MODÈLES ET LEURS DROITS ═════
   La photo et le patron sont deux droits distincts : une photo peut être libre
   alors que le patron ne l'est pas, et l'inverse. Les deux sont donc saisis
   séparément. Tant qu'aucune photo n'est fournie, la carte affiche un
   emplacement vide explicitement signalé — jamais une illustration présentée
   comme une photo. */

function fichePhoto(modeleId){
  if (!state.photosModeles) state.photosModeles = {};
  if (!state.photosModeles[modeleId]){
    state.photosModeles[modeleId] = {
      photo:null, sourceUrl:"", auteur:"", licencePhoto:"", licencePatron:"",
      usageCommercial:"inconnu", verifieLe:null
    };
  }
  return state.photosModeles[modeleId];
}
function aPhotoModele(modeleId){
  var f = state.photosModeles && state.photosModeles[modeleId];
  return !!(f && f.photo);
}

/* Bandeau visuel d'une carte de modèle. */
function bandeauModele(m){
  var f = state.photosModeles && state.photosModeles[m[0]];
  if (f && f.photo){   /* photo d'une réalisation : elle prime toujours */
    /* Le dessin reste dessous tant que la photo n'est pas arrivée sur cet
       appareil (autre appareil, réseau lent) : jamais une case vide. */
    return '<span class="band"><img data-photo="'+esc(f.photo)+'" alt="Photo de '+esc(mNom(m))+'" hidden>'+
      '<span class="band-repli">'+planche(m[0], 0)+'</span></span>';
  }
  /* Si une image en ligne ne se charge pas, la carte retombe sur le dessin.
     Le code est échappé pour tenir dans l'attribut HTML (le dessin contient
     des guillemets). */
  var repli = 'onerror="' + esc('var b=this.closest(".band"); if(b){b.className="band dessin"; b.innerHTML=' +
    JSON.stringify(planche(m[0], 0) + '<span class="credit">dessin d\'après le patron</span>') + ';}') + '"';
  var ep = epoque(m[0]);
  if (ep){   /* photo d'origine du livret : elle montre CE patron-là */
    /* Si le fichier manque, on ne laisse pas une image cassée : la carte
       retombe sur le dessin fait d'après le patron, qui est toujours là. */
    return '<span class="band a-photo">'+
      '<img src="'+esc(ep.photo)+'" alt="Photo d\'origine du modèle '+esc(ep.nom)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" '+
      repli + '>'+
      '<span class="credit">photo d\'origine · '+esc(ep.source.annee)+'</span></span>';
  }
  /* À défaut, une photo d'illustration sous licence libre — d'un ouvrage
     comparable, jamais de CE patron. Le bandeau le dit en toutes lettres,
     pour que personne ne croie que sa fiche donnera cette pièce-là. */
  var ill = illustration(m[0]);
  if (ill){
    return '<span class="band a-photo">'+
      '<img src="'+esc(ill.u)+'" alt="Photo d\'illustration : '+esc(ill.t)+'" loading="lazy" '+
      'decoding="async" referrerpolicy="no-referrer" '+repli+'>'+
      '<span class="credit">illustration · pas ce modèle</span></span>';
  }
  /* Sinon le dessin fait d'après le patron. Jamais la photo de l'ouvrage d'un
     autre présentée comme étant le modèle : elle promettrait un rendu que ce
     patron ne donne pas. */
  return '<span class="band dessin">'+planche(m[0], 0)+
    '<span class="credit">dessin d\'après le patron</span></span>';
}

var LICENCES = ["", "Domaine public", "CC0", "CC BY", "CC BY-SA", "CC BY-NC",
                "Licence Pexels", "Licence Unsplash", "Photo que j'ai prise",
                "Tous droits réservés", "À vérifier"];
var USAGES = [["inconnu","Non vérifié"],["oui","Autorisé"],["non","Interdit"],["conditions","Sous conditions"]];

function blocPhotoModele(m, apres){
  var f = fichePhoto(m[0]);
  var c = el('<div class="card" style="margin-bottom:18px"><header><h2>Photo du modèle et droits</h2>'+
    '<p>Rien ne remplace la photo d\'une pièce réellement réalisée avec ce patron. '+
    'Les droits de la <b>photo</b> et ceux du <b>patron</b> restent deux choses différentes.</p></header>'+
    '<div class="body">'+
      (!f.photo ? '<p class="hint" style="margin:0 0 14px">Tant qu\'aucune photo n\'est ajoutée, '+
        'la fiche montre un dessin fait d\'après le patron, jamais l\'ouvrage de quelqu\'un d\'autre. '+
        'Ta photo prendra sa place partout dans le catalogue.</p>' : '')+
      '<div class="photorow" style="margin-bottom:16px">'+
      '<span class="photoslot grand f-'+esc(m[1])+(f.photo?' a-photo':'')+'">'+
        (f.photo ? '<img data-photo="'+esc(f.photo)+'" alt="Photo du modèle" hidden>' : '')+
        motif(m[0],62)+
        (f.photo ? '' : '<span class="slot-lab">Aucune photo</span>')+
      '</span><div class="photoact"></div></div>'+
      '<div class="grid2">'+
        '<label class="f"><span>Lien vers la source</span><input type="url" data-f="sourceUrl" placeholder="https://…"></label>'+
        '<label class="f"><span>Crédit photo</span><input type="text" data-f="auteur" placeholder="Nom, pseudo…"></label>'+
        '<label class="f"><span>Licence de la photo</span><select data-f="licencePhoto"></select></label>'+
        '<label class="f"><span>Licence du patron</span><select data-f="licencePatron"></select></label>'+
        '<label class="f"><span>Vente des réalisations</span><select data-f="usageCommercial"></select></label>'+
        '<label class="f"><span>Vérifié le</span><input type="date" data-f="verifieLe"></label>'+
      '</div>'+
      '<p class="hint">Laisse vide ce que tu n\'as pas vérifié : mieux vaut un champ vide qu\'une information fausse. '+
      '« Vente des réalisations » concerne le droit de vendre les objets faits d\'après ce patron. C\'est souvent '+
      'autorisé, à condition de citer la personne qui a créé le patron.</p>'+
    '</div></div>');

  var act = c.querySelector(".photoact");
  if (photosDispo){
    var inp = el('<input type="file" accept="image/*,application/pdf,.pdf" id="photomod-input" tabindex="-1" aria-label="Choisir une photo ou un PDF du modèle" style="display:none">');
    var libAdd = f.photo ? "Changer la photo" : "Ajouter une photo";
    var bAdd = bouton(libAdd, function(){ inp.click(); }, !f.photo);
    act.appendChild(bAdd); act.appendChild(inp);
    if (f.photo) act.appendChild(bouton("Supprimer la photo", function(){
      confirmer({titre:"Supprimer la photo ?", texte:"Ta photo de ce modèle sera supprimée.",
                 bouton:"Supprimer la photo", danger:true}, function(){
        effacerPhoto(f.photo); f.photo = null; sauverTout(); if (apres) apres();
      });
    }));
    inp.addEventListener("change", function(){
      var fi = inp.files && inp.files[0]; if (!fi) return;
      inp.value = "";
      if (!estImage(fi) && !estPdf(fi)){ toast("Ce fichier n'est ni une image ni un PDF. Choisis une photo (JPEG, PNG…) ou un PDF."); return; }
      bAdd.disabled = true; bAdd.textContent = estPdf(fi) ? "Lecture du PDF…" : "Traitement…";
      imageDepuisFichier(fi, 900).then(function(blob){
        if (!blob){ toast(estPdf(fi) ? "Ce PDF n'a pas pu être lu. Essaie avec une autre copie." : messageImageIllisible(fi)); bAdd.disabled = false; bAdd.textContent = libAdd; return; }
        var ancienne = f.photo, id = "pm_" + uid();
        return ecrirePhoto(id, blob).then(function(ok){
          bAdd.disabled = false; bAdd.textContent = libAdd;
          if (!ok){ toast("La photo n'a pas pu être enregistrée. Réessaie."); return; }
          f.photo = id;
          if (ancienne && ancienne !== id) effacerPhoto(ancienne);
          if (!f.licencePhoto) f.licencePhoto = "Photo que j'ai prise";
          if (!f.verifieLe) f.verifieLe = aujourdhuiISO();
          sauverTout(); toast("Photo ajoutée"); if (apres) apres();
        });
      }, function(e){ bAdd.disabled = false; bAdd.textContent = libAdd; toast(messageErreurPdf(e)); });
    });
  } else {
    act.appendChild(el('<p class="hint" style="margin:0">Ton navigateur bloque l\'enregistrement des photos (navigation privée ?). Ouvre l\'application dans une fenêtre normale pour en ajouter.</p>'));
  }

  ["licencePhoto","licencePatron"].forEach(function(cle){
    var sel = c.querySelector('[data-f="'+cle+'"]');
    LICENCES.forEach(function(l){
      var o = document.createElement("option");
      o.value = l; o.textContent = l || "Non renseignée"; sel.appendChild(o);
    });
    sel.value = f[cle] || "";
  });
  var su = c.querySelector('[data-f="usageCommercial"]');
  USAGES.forEach(function(u){
    var o = document.createElement("option"); o.value = u[0]; o.textContent = u[1]; su.appendChild(o);
  });
  su.value = f.usageCommercial || "inconnu";
  c.querySelector('[data-f="sourceUrl"]').value = f.sourceUrl || "";
  c.querySelector('[data-f="auteur"]').value = f.auteur || "";
  c.querySelector('[data-f="verifieLe"]').value = f.verifieLe || "";

  c.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-f"); if (!k) return;
    f[k] = e.target.value; sauver();
  });
  c.addEventListener("change", function(e){
    var k = e.target.getAttribute("data-f"); if (!k) return;
    f[k] = e.target.value; sauver();
  });
  return c;
}




/* ═════ 29. CHRONOMÈTRE D'ATELIER ═════
   Le temps est le seul chiffre que personne ne mesure, et c'est le plus gros
   poste de coût. Le principe retenu : on chronomètre une PIÈCE réelle, pas un
   modèle. Le temps s'accumule sur plusieurs séances, il survit à la fermeture
   de la page, et il remonte ensuite dans la fiche pour corriger l'estimation.
   Une seule pièce à la fois : deux chronomètres en parallèle, c'est du temps
   compté deux fois. */

function chrono(){
  if (!state.chrono) state.chrono = {pid:null, poste:"crochet", debut:null};
  return state.chrono;
}
function chronoEnCours(){ var c = chrono(); return c.pid && c.debut ? c : null; }
function chronoSecondes(){
  var c = chronoEnCours(); if (!c) return 0;
  return Math.max(0, Math.floor((Date.now() - c.debut)/1000));
}
function piece(pid){
  for (var i=0;i<state.pieces.length;i++) if (state.pieces[i].id === pid) return state.pieces[i];
  return null;
}
function mesureDe(p){
  if (!p.mesure) p.mesure = {prep:0, crochet:0, assemb:0, finition:0, emball:0};
  return p.mesure;
}
function minutesMesurees(p){
  var m = mesureDe(p), t = 0;
  POSTES.forEach(function(x){ t += Number(m[x.k])||0; });
  return t;
}

function demarrerChrono(pid, poste){
  var c = chrono();
  if (c.pid && c.debut && c.pid !== pid) arreterChrono(true);   /* jamais deux en même temps */
  c.pid = pid; c.poste = poste || c.poste || "crochet"; c.debut = Date.now();
  sauverTout(); majBarreChrono();
}
function arreterChrono(silencieux){
  var c = chrono();
  if (!c.pid || !c.debut) return 0;
  var min = Math.max(0, (Date.now() - c.debut)/60000);
  var p = piece(c.pid);
  /* Plus de 4 heures d'affilée : sans doute un chronomètre oublié allumé.
     On demande avant d'ajouter, sinon le gain à l'heure serait faussé pour
     de bon (les séances ne se corrigent pas après coup). */
  if (!silencieux && p && min > 240){
    var poste = c.poste, debut = c.debut;
    c.debut = null; sauverTout(); majBarreChrono();
    confirmer({titre:"Le chronomètre a tourné " + dureeTexte(Math.round(min)) + ".",
      texte:"S'il est resté allumé par oubli, ce temps fausserait ton gain de l'heure. Faut-il vraiment l'ajouter ?",
      bouton:"Oui, ajouter " + dureeTexte(Math.round(min)), annuler:"Ne pas l'ajouter"}, function(){
      ajouterTemps(p, poste, min, debut); sauverTout(); render();
      toast("Temps ajouté : " + dureeTexte(Math.round(min)));
    });
    return 0;
  }
  if (p) ajouterTemps(p, c.poste, min, c.debut);
  c.debut = null;
  sauverTout();
  if (!silencieux && min >= 0.05) toast("Temps ajouté : " + dureeTexte(Math.round(min)));
  majBarreChrono();
  return min;
}
function ajouterTemps(p, poste, min, debut){
  {
    var m = mesureDe(p);
    m[poste] = (Number(m[poste])||0) + min;
    p.sessions = p.sessions || [];
    p.sessions.unshift({d:debut, poste:poste, min:Math.round(min*10)/10});
    if (p.sessions.length > 40) p.sessions.length = 40;
    p.maj = Date.now();
    if (p.prod === "retouche" && p.retouches && p.retouches.length) p.retouches[p.retouches.length - 1].min = (Number(p.retouches[p.retouches.length - 1].min) || 0) + min;
    if (p.prod === "afaire" && min > 0.5) p.prod = "encours";   /* elle a commencé */
  }
}
/* Pièce ou création supprimée pendant que le chronomètre tourne : on
   l'arrête proprement au lieu de laisser une barre orpheline. */
function verifierChrono(){
  var c = chrono();
  if (c.pid && !piece(c.pid)){ c.pid = null; c.debut = null; majBarreChrono(); }
}

/* Barre flottante : visible depuis n'importe quel écran tant que ça tourne. */
var minuteurTic = null;
function majBarreChrono(){
  var ex = document.getElementById("barre-chrono");
  var c = chronoEnCours();
  if (!c){
    if (ex) ex.remove();
    if (minuteurTic){ clearInterval(minuteurTic); minuteurTic = null; }
    return;
  }
  var p = piece(c.pid), cr = p ? creation(p.cid) : null;
  if (!ex){
    ex = el('<div class="chronobar" id="barre-chrono" role="status" aria-live="off">'+
      '<span class="cb-pt"></span>'+
      '<div class="cb-txt"><b id="cb-nom"></b><span id="cb-poste"></span></div>'+
      '<span class="cb-t num" id="cb-t">0:00</span>'+
      '<select id="cb-sel" aria-label="Étape en cours" '+
      'style="width:auto;background:transparent;color:inherit;border-color:currentColor;padding:5px 8px;font-size:12.5px"></select>'+
      '<button type="button" class="btn sm" id="cb-stop">Arrêter</button>'+
      '</div>');
    document.body.appendChild(ex);
    var sel = ex.querySelector("#cb-sel");
    POSTES.forEach(function(x){
      var o = document.createElement("option");
      o.value = x.k; o.textContent = x.nom; o.style.color = "#111"; sel.appendChild(o);
    });
    sel.value = c.poste;
    /* changer de poste en cours de route : on clôt le temps du poste précédent */
    sel.addEventListener("change", function(){
      var pid = chrono().pid;
      arreterChrono(true);
      demarrerChrono(pid, sel.value);
      toast("Poste : " + sel.options[sel.selectedIndex].text);
    });
    ex.querySelector("#cb-stop").addEventListener("click", function(){
      arreterChrono(); render();
    });
  }
  ex.querySelector("#cb-nom").textContent = cr ? cr.nom + " · pièce N° " + numeroPiece(p) : "Pièce";
  var selP = ex.querySelector("#cb-sel"); if (selP) selP.value = c.poste;
  var lib = ""; POSTES.forEach(function(x){ if (x.k === c.poste) lib = x.nom; });
  ex.querySelector("#cb-poste").textContent = lib.toLowerCase();
  function tic(){
    var s = chronoSecondes();
    var el2 = document.getElementById("cb-t");
    if (!el2) return;
    var h = Math.floor(s/3600), m = Math.floor(s/60)%60, ss = s%60;
    el2.textContent = (h ? h+":"+(m<10?"0":"")+m : m) + ":" + (ss<10?"0":"") + ss;
  }
  tic();
  if (!minuteurTic) minuteurTic = setInterval(tic, 1000);
}

/* Bilan d'une création : ce qu'elle dure vraiment, face à l'estimation. */
/* Pendant que ça tourne on veut voir les secondes défiler ; une fois arrêté,
   on veut une durée lisible — et jamais « 0 min » pour du temps réellement passé. */
function dureeChrono(min){
  var s = Math.floor(min*60);
  var h = Math.floor(s/3600), m = Math.floor(s/60)%60, ss = s%60;
  var d2 = function(x){ return (x<10?"0":"") + x; };
  return h ? (h + ":" + d2(m) + ":" + d2(ss)) : (m + ":" + d2(ss));
}
function dureeLisible(min){
  if (min <= 0) return "0 min";
  if (min < 1) return "moins d'une minute";
  return dureeTexte(min);
}

function bilanTemps(cid){
  var cr = creation(cid); if (!cr) return null;
  var estime = 0;
  for (var k in cr.temps) if (Object.prototype.hasOwnProperty.call(cr.temps,k)) estime += Number(cr.temps[k])||0;
  var mesurees = [], parPoste = {prep:0, crochet:0, assemb:0, finition:0, emball:0},
      nPoste = {prep:0, crochet:0, assemb:0, finition:0, emball:0};
  state.pieces.forEach(function(p){
    /* Seules les pièces terminées disent combien de temps prend une pièce :
       une pièce commencée il y a 30 minutes ferait croire qu'on va 20 fois
       plus vite que prévu. */
    if (p.cid !== cid || p.prod !== "termine") return;
    var t = minutesMesurees(p);
    if (t <= 0) return;
    mesurees.push({p:p, t:t});
    POSTES.forEach(function(x){
      var v = Number(mesureDe(p)[x.k])||0;
      if (v > 0){ parPoste[x.k] += v; nPoste[x.k]++; }
    });
  });
  if (!mesurees.length) return {estime:estime, n:0};
  var total = 0; mesurees.forEach(function(x){ total += x.t; });
  var moyenne = total / mesurees.length;
  var moyPoste = {};
  POSTES.forEach(function(x){ moyPoste[x.k] = nPoste[x.k] ? parPoste[x.k] / nPoste[x.k] : 0; });
  /* On ne compare que ce qui a été mesuré : si seul le crochet est
     chronométré, l'estimation des autres postes n'est ni juste ni fausse. */
  var postesMesures = POSTES.filter(function(x){ return parPoste[x.k] > 0; }).map(function(x){ return x.k; });
  var estimeComparable = 0;
  postesMesures.forEach(function(k){ estimeComparable += Number(cr.temps[k])||0; });
  if (postesMesures.length < POSTES.length) estime = estimeComparable;
  return {estime:estime, n:mesurees.length, total:total, moyenne:moyenne, postesMesures:postesMesures,
          mini:Math.min.apply(null, mesurees.map(function(x){return x.t;})),
          maxi:Math.max.apply(null, mesurees.map(function(x){return x.t;})),
          moyPoste:moyPoste, ecart:estime>0 ? (moyenne-estime)/estime : 0};
}


/* ═════ 30. LE CHRONOMÈTRE DANS LA CRÉATION ═════
   L'artisane raisonne « j'ouvre ma création en cours et je reprends là où je
   me suis arrêtée ». Elle n'a pas à savoir qu'on suit des pièces : si aucune
   n'est ouverte, on en ouvre une pour elle au premier démarrage. */

function pieceEnCours(cid){
  var cands = piecesDe(cid).filter(function(p){
    return p.prod !== "termine";
  });
  if (!cands.length) return null;
  cands.sort(function(a,b){
    var ta = minutesMesurees(a), tb = minutesMesurees(b);
    if ((ta>0) !== (tb>0)) return tb>0 ? 1 : -1;   /* celle déjà entamée d'abord */
    return b.maj - a.maj;
  });
  return cands[0];
}
function ouvrirPieceTravail(cid){
  var p = pieceEnCours(cid);
  if (p) return p;
  ajouterPieces(cid, 1, "encours", "atelier", "");
  return pieceEnCours(cid);
}

/* Taux horaire atteint si la pièce était vendue maintenant, temps réel compris. */
function tauxHoraireReel(cr, minutes){
  var r = calculer(cr);
  var h = minutes/60;
  if (h <= 0) return null;
  var sorties = r.matieres + r.fixePiece + r.fraisFixesVente + r.fraisVar + r.cotisations;
  return (r.prix - sorties) / h;
}

function carteChrono(cr, rafraichir){
  /* Le temps se compte PIÈCE PAR PIÈCE : on choisit la pièce sur laquelle on
     travaille, on voit son temps à elle, jamais un total de la création. */
  var ch = chronoEnCours();
  var pieces = view.ficheId ? piecesDe(cr.id).slice() : [];
  pieces.sort(function(a, b){ return numeroPiece(a) - numeroPiece(b); });
  var p = null;
  if (ch) p = pieces.filter(function(x){ return x.id === ch.pid; })[0] || null;
  if (!p && view.pieceChrono) p = pieces.filter(function(x){ return x.id === view.pieceChrono; })[0] || null;
  if (!p) p = pieceEnCours(cr.id);
  if (p) view.pieceChrono = p.id;
  var actif = !!(ch && p && ch.pid === p.id);
  var cumul = p ? minutesMesurees(p) : 0;
  var num = p ? numeroPiece(p) : 0;

  var c = el('<div class="card chrono-card'+(actif?' actif':'')+'">'+
    '<div class="body">'+
      '<div class="ch-haut">'+
        '<div class="ch-info">'+
          '<div class="ch-lab">'+(!p ? "Ton temps de travail" : actif ? "Travail en cours · pièce N° " + num : (cumul>0 ? "Temps passé · pièce N° " + num : "Pièce N° " + num + " · pas encore de temps"))+'</div>'+
          '<div class="ch-big num" id="ch-t">'+esc(actif ? dureeChrono(cumul) : dureeLisible(cumul))+'</div>'+
          '<div class="ch-sous" id="ch-sous"></div>'+
        '</div>'+
        '<div class="ch-act"></div>'+
      '</div>'+
      '<div class="ch-bas" id="ch-bas"></div>'+
    '</div></div>');

  var act = c.querySelector(".ch-act");
  var sous = c.querySelector("#ch-sous");
  var bas = c.querySelector("#ch-bas");

  if (!view.ficheId){
    sous.textContent = "Enregistre d'abord ta fiche : le chronomètre a besoin d'une création existante.";
    return c;
  }

  /* quelle pièce ? (seulement s'il y en a plusieurs) */
  if (pieces.length > 1){
    var selP = el('<select id="ch-piece" aria-label="Pièce sur laquelle tu travailles" style="width:auto;min-width:160px"></select>');
    pieces.forEach(function(x){
      var o = document.createElement("option"); o.value = x.id;
      var m = minutesMesurees(x);
      o.textContent = "Pièce N° " + numeroPiece(x) + " · " + libProd(x.prod).toLowerCase() + (m > 0.01 ? " · " + dureeLisible(m) : "");
      selP.appendChild(o);
    });
    selP.value = p ? p.id : "";
    selP.addEventListener("change", function(){
      if (chronoEnCours()){ toast("Mets d'abord le chronomètre en pause : il tourne sur la pièce N° " + numeroPiece(piece(chronoEnCours().pid)) + "."); selP.value = p.id; return; }
      view.pieceChrono = selP.value; if (rafraichir) rafraichir();
    });
    act.appendChild(selP);
  }

  if (actif){
    act.appendChild(bouton("⏸ Mettre en pause", function(){
      arreterChrono(); if (rafraichir) rafraichir();
    }, true));
  } else {
    act.appendChild(bouton(!p ? "▶ Démarrer la première pièce" : cumul > 0 ? "▶ Reprendre la pièce N° " + num : "▶ Démarrer la pièce N° " + num, function(){
      var pp = p || ouvrirPieceTravail(cr.id);
      if (!pp){ toast("Impossible de démarrer le chronomètre. Réessaie."); return; }
      view.pieceChrono = pp.id;
      demarrerChrono(pp.id, view.posteChrono || "crochet");
      if (rafraichir) rafraichir();
    }, true));
  }

  /* choix du poste, discret */
  var sel = el('<select aria-label="Étape de travail en cours" style="width:auto;min-width:140px"></select>');
  POSTES.forEach(function(x){
    var o = document.createElement("option"); o.value = x.k; o.textContent = x.nom; sel.appendChild(o);
  });
  sel.value = actif ? ch.poste : (view.posteChrono || "crochet");
  sel.addEventListener("change", function(){
    view.posteChrono = sel.value;
    if (actif){ var pid = chrono().pid; arreterChrono(true); demarrerChrono(pid, sel.value); if (rafraichir) rafraichir(); }
  });
  act.appendChild(sel);

  if (cumul > 0 && !actif && p && p.prod !== "termine"){
    act.appendChild(bouton("Pièce N° " + num + " terminée", function(){
      majProd(p, "termine"); sauverTout();
      toast("Pièce N° " + num + " terminée : " + dureeTexte(minutesMesurees(p)) + " de travail");
      if (rafraichir) rafraichir();
    }));
  }
  /* commencer une autre pièce, sans mélanger son temps avec celui-ci */
  if (!actif && p && (p.prod === "termine" || cumul > 0)){
    act.appendChild(bouton("+ Nouvelle pièce", function(){
      ajouterPieces(cr.id, 1, "encours", "atelier", "");
      var np = piecesDe(cr.id).slice().sort(function(a, b){ return numeroPiece(b) - numeroPiece(a); })[0];
      if (np) view.pieceChrono = np.id;
      sauverTout(); toast("Pièce N° " + (np ? numeroPiece(np) : "") + " créée : son temps commence à zéro.");
      if (rafraichir) rafraichir();
    }));
  }

  /* Ce que ça change sur le prix, en direct : c'est tout l'intérêt. */
  function majSous(){
    var mins = cumul + (actif ? chronoSecondes()/60 : 0);
    var el2 = c.querySelector("#ch-t");
    if (el2) el2.textContent = actif ? dureeChrono(mins) : dureeLisible(mins);
    /* sous 10 minutes, un taux horaire n'a aucun sens : on ne l'affiche pas */
    var th = mins >= 10 ? tauxHoraireReel(cr, mins) : null;
    if (!p){
      sous.textContent = "Lance le chronomètre quand tu t'installes, mets en pause quand tu t'arrêtes. Chaque pièce a son propre temps.";
      return;
    }
    var seances = (p.sessions||[]).length;
    var prov = pieceProvisoire(p);
    sous.innerHTML = seances
      ? esc(seances + (seances>1 ? " séances de travail" : " séance de travail") + " sur cette pièce") +
        (th !== null && Number(cr.prix)>0
          ? ' · au temps <b>passé jusqu\'ici</b>, à ' + esc(eur(cr.prix)) + ' cette pièce te paierait <b style="color:' +
            (th < (state.reglages.tauxHoraire||0)*0.9 ? 'var(--bad)' : 'var(--good)') + '">' +
            esc(eur(th)) + ' / h</b>' + (prov ? ' <span class="hint">(provisoire : la pièce n\'est pas terminée)</span>' : '')
          : "")
      : "Première séance en cours.";
  }
  majSous();
  if (actif){
    var it = setInterval(function(){
      if (!document.body.contains(c)){ clearInterval(it); return; }
      majSous();
    }, 1000);
  }

  /* détail par poste de CETTE pièce */
  if (p && cumul > 0.01){
    var m = mesureDe(p);
    var lignes = POSTES.filter(function(x){ return (Number(m[x.k])||0) > 0.01; })
      .map(function(x){ return '<span class="ch-poste">'+esc(x.nom)+' <b>'+esc(dureeLisible(m[x.k]))+'</b></span>'; });
    if (lignes.length) bas.innerHTML = lignes.join("");
  }
  /* le temps de chaque pièce, séparément */
  if (pieces.length > 1){
    bas.appendChild(el('<div class="ch-pieces"><b>Temps par pièce</b>'+
      pieces.map(function(x){
        var mx = minutesMesurees(x);
        return '<span class="ch-poste'+(p && x.id === p.id ? ' cur' : '')+'">N° '+numeroPiece(x)+' <b>'+esc(mx > 0.01 ? dureeLisible(mx) : "—")+'</b> <em>'+esc(libProd(x.prod).toLowerCase())+'</em></span>';
      }).join("")+'</div>'));
  }
  return c;
}


/* ═════ 32. PATRONS D'ORIGINE ═════
   Textes écrits pour cette application, à partir des constructions de base du
   crochet — cercle magique, augmentations régulières, tube, diminutions. Ce sont
   des techniques du domaine commun, pas des œuvres reprises à quelqu'un.
   Ils appartiennent donc à l'utilisateur, qui peut les imprimer, les modifier et
   vendre ce qu'il en fait, sans rien demander à personne. */

var ABBR = [
  ["ml","maille en l'air"], ["ms","maille serrée"], ["db","demi-bride"], ["br","bride"],
  ["mc","maille coulée"], ["aug","augmentation : 2 ms dans la même maille"],
  ["dim","diminution : 2 ms écoulées ensemble"], ["t.","tour"], ["rg","rang"]
];

var PATRONS = {
/* ---------- la brique de base de tout amigurumi ---------- */
boule: {
  titre:"La boule — tête et corps d'amigurumi",
  pour:"Toute pièce ronde : tête, corps, museau, baie, balle",
  crochet:"2,5 à 3 mm pour un fil coton fin ; serré, pour que le rembourrage ne se voie pas",
  fil:"Coton, environ 20 g pour une boule de 7 cm",
  notes:"On travaille en spirale, sans fermer les tours. Place un marqueur dans la première maille de chaque tour et déplace-le au fur et à mesure.",
  etapes:[
    {titre:"Augmentations", rangs:[
      "T1 — 6 ms dans un cercle magique (6)",
      "T2 — 1 aug dans chaque maille (12)",
      "T3 — (1 ms, 1 aug) × 6 (18)",
      "T4 — (2 ms, 1 aug) × 6 (24)",
      "T5 — (3 ms, 1 aug) × 6 (30)",
      "T6 — (4 ms, 1 aug) × 6 (36)"]},
    {titre:"Partie droite", rangs:[
      "T7 à T12 — 36 ms (36)",
      "Pour une boule plus haute, ajoute des tours droits. Pour une plus petite, arrête les augmentations plus tôt."]},
    {titre:"Diminutions", rangs:[
      "T13 — (4 ms, 1 dim) × 6 (30)",
      "T14 — (3 ms, 1 dim) × 6 (24)",
      "T15 — (2 ms, 1 dim) × 6 (18)",
      "Rembourre fermement maintenant : après, la main ne passe plus.",
      "T16 — (1 ms, 1 dim) × 6 (12)",
      "T17 — 1 dim × 6 (6)",
      "Coupe le fil, passe-le dans les 6 mailles restantes et serre."]}
  ],
  astuces:["Le nombre d'augmentations du dernier tour donne toujours le nombre de mailles par tour : 6 augmentations par tour, 6 mailles de plus.",
           "Si tu vois le rembourrage à travers, descends d'une demi-taille de crochet."]
},
cylindre: {
  titre:"Le cylindre — corps, pattes, bras",
  pour:"Membres, corps allongés, manches",
  crochet:"Le même que la pièce à laquelle il s'attache",
  fil:"Coton",
  notes:"Même principe que la boule, mais on s'arrête après le fond plat et on monte droit.",
  etapes:[
    {titre:"Le fond", rangs:[
      "T1 — 6 ms dans un cercle magique (6)",
      "T2 — 1 aug × 6 (12)",
      "T3 — (1 ms, 1 aug) × 6 (18)",
      "Arrête les augmentations quand le disque atteint le diamètre voulu."]},
    {titre:"Le tube", rangs:[
      "Tours suivants — 1 ms dans chaque maille, autant de tours que nécessaire",
      "Pour une patte fine : 8 à 12 tours. Pour un corps : 15 à 20 tours."]},
    {titre:"Finir", rangs:[
      "Ouvert (à coudre) : mc dans la maille suivante, couper en laissant 20 cm.",
      "Fermé : diminuer comme pour la boule."]}
  ],
  astuces:["Pour une patte qui tient debout, rembourre-la seulement à moitié."]
},
/* ---------- objets plats ---------- */
granny: {
  titre:"Le carré granny classique",
  pour:"Plaids, sacs, coussins, vide-poches — tout ce qui s'assemble",
  crochet:"3,5 à 4 mm",
  fil:"Coton ou acrylique, environ 8 g par carré de 10 cm",
  notes:"Chaque tour se termine par une maille coulée. Change de couleur à chaque tour si tu veux l'effet classique.",
  etapes:[
    {titre:"Le centre", rangs:[
      "Cercle magique, ou 4 ml fermées en rond par 1 mc.",
      "T1 — 3 ml (comptent pour 1 br), 2 br dans le cercle, puis (3 ml, 3 br) × 3, 3 ml, 1 mc dans la 3e ml du départ. Tu as 4 groupes de 3 brides et 4 coins."]},
    {titre:"Les tours suivants", rangs:[
      "T2 — mc jusqu'au premier espace de coin. Dans chaque coin : (3 br, 3 ml, 3 br). Entre deux coins : 1 ml. Fermer par 1 mc.",
      "T3 et suivants — même chose, mais entre les coins on place 3 br dans chaque espace de 1 ml.",
      "Répète jusqu'à la taille voulue : chaque tour ajoute environ 2,5 cm."]},
    {titre:"Assembler", rangs:[
      "Bord à bord en mailles serrées sur l'endroit : la couture devient un relief décoratif.",
      "Ou au point de chaînette pour une jointure invisible."]}
  ],
  astuces:["Fais tous tes carrés avant d'assembler : tu verras mieux l'harmonie des couleurs.",
           "Un plaid bébé courant fait 6 × 7 carrés de 10 cm."]
},
disque: {
  titre:"Le disque plat — dessous de verre, set de table, napperon",
  pour:"Toute pièce ronde et plate",
  crochet:"3 mm en coton n°3",
  fil:"Coton mercerisé pour la tenue",
  notes:"La règle du disque plat : on ajoute à chaque tour autant de mailles qu'au premier tour. Si le bord gondole, c'est qu'il y a trop d'augmentations ; s'il se creuse, pas assez.",
  etapes:[
    {titre:"Construction", rangs:[
      "T1 — 12 br dans un cercle magique, fermer par 1 mc (12)",
      "T2 — 2 br dans chaque maille (24)",
      "T3 — (1 br, 2 br dans la suivante) × 12 (36)",
      "T4 — (2 br, 2 br dans la suivante) × 12 (48)",
      "Continue en décalant : chaque tour ajoute 12 brides."]},
    {titre:"La bordure", rangs:[
      "Dernier tour — (1 ms, sauter 1 maille, 5 br dans la suivante, sauter 1 maille) pour un bord en coquilles.",
      "Ou simplement 1 tour de ms pour un bord net."]}
  ],
  astuces:["Amidonner un napperon le rend plat et rigide : trempe, mise en forme sur une serviette, séchage à plat."]
},
/* ---------- portés ---------- */
bonnet: {
  titre:"Le bonnet, du haut vers le bas",
  pour:"Bonnet adulte, enfant ou bébé — la méthode est la même",
  crochet:"4 mm pour une laine moyenne",
  fil:"Laine ou mélange, 100 à 120 g pour un adulte",
  notes:"Pas de tailles figées : on mesure. Diamètre du disque de départ = tour de tête ÷ 3,14. Pour 56 cm de tour de tête, le disque fait 17,8 cm avant de monter droit.",
  etapes:[
    {titre:"La calotte", rangs:[
      "T1 — 10 db dans un cercle magique (10)",
      "T2 — 1 aug dans chaque (20)",
      "T3 — (1 db, 1 aug) × 10 (30)",
      "T4 — (2 db, 1 aug) × 10 (40)",
      "Continue à augmenter de 10 par tour jusqu'au diamètre calculé."]},
    {titre:"Le corps", rangs:[
      "Tours droits, 1 db dans chaque maille, jusqu'à 20 à 22 cm de hauteur totale pour un adulte.",
      "Mesure sur la tête si tu peux : le bonnet doit couvrir le haut des oreilles."]},
    {titre:"La bordure", rangs:[
      "2 ou 3 tours de ms, ou des côtes en relief (br devant / br derrière en alternance).",
      "Pompon facultatif : 60 tours de fil autour de 4 doigts, lier au centre, couper, égaliser."]}
  ],
  astuces:["Tour de tête courant : bébé 40 cm, enfant 50 cm, adulte 56 cm.",
           "Une laine qui se détend : fais le bonnet 2 cm plus serré que la mesure."]
},
echarpe: {
  titre:"L'écharpe ou le snood",
  pour:"Écharpe droite, snood fermé, étole",
  crochet:"5 mm pour une laine moyenne, ouvert et souple",
  fil:"200 à 250 g pour une écharpe adulte",
  notes:"Le point de brides simple donne un tissu souple qui tombe bien. Éviter les mailles serrées, trop rigides pour un vêtement.",
  etapes:[
    {titre:"Le montage", rangs:[
      "Chaîne de départ = largeur voulue. Pour 20 cm : environ 40 ml au crochet 5 mm.",
      "Snood : fermer la chaîne en rond par 1 mc, en veillant à ne pas la vriller."]},
    {titre:"Le corps", rangs:[
      "Rg 1 — 1 br dans la 4e ml à partir du crochet, puis 1 br dans chaque ml.",
      "Rg 2 et suivants — 3 ml pour tourner, 1 br dans chaque br.",
      "Répète jusqu'à 160 à 180 cm pour une écharpe, ou 60 à 70 cm de circonférence pour un snood."]},
    {titre:"Finition", rangs:[
      "1 tour de ms sur tout le pourtour pour un bord net.",
      "Franges facultatives : brins de 30 cm pliés en deux, passés tous les 2 cm."]}
  ],
  astuces:["Compte tes brides au premier rang et vérifie-les tous les 10 rangs : une écharpe qui s'élargit vient de là."]
},
/* ---------- contenants ---------- */
panier: {
  titre:"Le panier rond en corde",
  pour:"Panier de rangement, corbeille, cache-pot",
  crochet:"6 à 8 mm selon la grosseur de la corde",
  fil:"Corde de coton 5 mm, 400 à 500 g pour un panier de 20 cm",
  notes:"On travaille très serré : c'est ce qui fait tenir les parois debout. Si le panier s'affaisse, le crochet est trop gros.",
  etapes:[
    {titre:"Le fond", rangs:[
      "T1 — 6 ms dans un cercle magique (6)",
      "T2 — 1 aug × 6 (12)",
      "T3 — (1 ms, 1 aug) × 6 (18)",
      "T4 — (2 ms, 1 aug) × 6 (24)",
      "Continue jusqu'au diamètre de fond voulu, en ajoutant 6 mailles par tour."]},
    {titre:"Le relevé", rangs:[
      "Tour de transition — 1 ms dans le brin arrière seulement de chaque maille. C'est ce tour qui crée l'angle droit du fond.",
      "Tours suivants — 1 ms dans chaque maille, sans augmentation, jusqu'à la hauteur voulue."]},
    {titre:"Finition", rangs:[
      "Dernier tour — 1 ms, puis 1 mc, couper et rentrer le fil à l'intérieur.",
      "Anses facultatives : sauter 12 mailles et faire 12 ml par-dessus, au tour suivant crocheter 12 ms sur la chaînette."]}
  ],
  astuces:["Un panier de 20 cm de diamètre demande un fond de 20 cm, soit environ 11 tours."]
},
/* ---------- petites pièces ---------- */
fleur: {
  titre:"La fleur à cinq pétales",
  pour:"Fleur seule, bouquet, broche, décor de bonnet",
  crochet:"2,5 à 3 mm",
  fil:"Coton fin, environ 10 g par fleur",
  notes:"Cinq pétales est le plus courant, mais la construction marche avec six ou huit : il suffit d'adapter le premier tour.",
  etapes:[
    {titre:"Le cœur", rangs:[
      "T1 — 10 ms dans un cercle magique, fermer par 1 mc (10)",
      "T2 — (3 ml, sauter 1 maille, 1 mc dans la suivante) × 5. Tu obtiens 5 arceaux."]},
    {titre:"Les pétales", rangs:[
      "T3 — dans chaque arceau : 1 ms, 1 db, 3 br, 1 db, 1 ms, puis 1 mc dans la mc suivante.",
      "Couper en laissant 15 cm pour la fixation."]},
    {titre:"La tige", rangs:[
      "Chaîne de 25 ml, puis 1 ms dans chaque ml en revenant.",
      "Ou fil de fer gainé passé au centre de la fleur et replié."]}
  ],
  astuces:["Deux fleurs superposées, la petite sur la grande, donnent tout de suite plus de volume."]
},
chouchou: {
  titre:"Le chouchou",
  pour:"Chouchou, bracelet",
  crochet:"3 mm",
  fil:"Coton fin, 10 à 12 g",
  notes:"Il faut un élastique à cheveux nu comme support.",
  etapes:[
    {titre:"Montage", rangs:[
      "T1 — environ 80 ms serrées autour de l'élastique, en le recouvrant entièrement. Fermer par 1 mc.",
      "Serre bien : les mailles doivent se toucher."]},
    {titre:"Le volant", rangs:[
      "T2 — 3 ml, puis 4 br dans chaque maille du tour précédent. C'est ce sur-nombre qui crée le froncé.",
      "Fermer par 1 mc, couper, rentrer les fils."]}
  ],
  astuces:["Moins de brides par maille : chouchou plat. Plus : chouchou très bouffant."]
},
marquepage: {
  titre:"Le marque-page",
  pour:"Marque-page, étiquette cadeau",
  crochet:"2,5 mm",
  fil:"Coton fin, 8 g",
  notes:"Pièce idéale pour tester un point nouveau : elle se fait en une heure.",
  etapes:[
    {titre:"Le corps", rangs:[
      "Chaîne de 60 ml.",
      "Rg 1 — 1 ms dans la 2e ml à partir du crochet, puis 1 ms dans chaque ml (59).",
      "Rg 2 à 8 — 1 ml pour tourner, 1 ms dans chaque ms."]},
    {titre:"Finition", rangs:[
      "1 tour de ms tout autour, avec 3 ms dans chaque coin pour qu'il reste plat.",
      "Gland facultatif : 15 brins de 10 cm liés au centre et fixés en haut."]}
  ],
  astuces:["Repasser le marque-page sous un linge humide le rend parfaitement plat."]
},
/* ---------- formes plates ---------- */
rectangle: {
  titre:"Le rectangle — la forme qui sert le plus",
  pour:"Bavoir, housse de bouillotte, pochette, lingette, dos de coussin",
  crochet:"3,5 mm pour un coton à tricoter, 4 mm pour de l'acrylique",
  fil:"Coton pour tout ce qui se lave souvent, acrylique pour le reste",
  notes:"Tout se joue sur la première chaînette : sa longueur donne la largeur finie de la pièce. Fais-la, pose-la à plat sans tirer, mesure. Si elle est trop courte, recommence maintenant — pas dans dix rangs.",
  etapes:[
    {titre:"Monter", rangs:[
      "Fais une chaînette de la largeur voulue, plus 1 ml de tournage.",
      "Repère : en maille serrée avec un coton à tricoter et un crochet de 3,5 mm, compte environ 18 mailles pour 10 cm.",
      "R1 — 1 ms dans la 2e ml à partir du crochet, puis 1 ms dans chaque ml."]},
    {titre:"Monter droit", rangs:[
      "R2 et suivants — 1 ml de tournage, 1 ms dans chaque maille jusqu'au bout.",
      "La dernière maille du rang est la plus oubliée : compte tes mailles tous les cinq rangs, sinon le rectangle part en trapèze.",
      "Continue jusqu'à la hauteur voulue."]},
    {titre:"Finir", rangs:[
      "Un tour de ms tout autour raidit le bord et rattrape les irrégularités : 1 ms par maille sur les côtés courts, environ 1 ms par rang sur les côtés longs, 3 ms dans chaque angle.",
      "Rentre les fils sur l'envers sur 5 cm, dans deux directions différentes."]}
  ],
  astuces:["Bavoir : rectangle de 20 × 22 cm, puis une encolure en U de 7 cm de large sur 5 cm de profond, et deux cordons en chaînette de 25 cm.",
           "Housse de bouillotte : mesure ta bouillotte pleine, ajoute 2 cm de chaque côté, crochète deux rectangles et assemble sur trois côtés.",
           "Pochette : un seul rectangle de la hauteur double, plié en deux, cousu sur les côtés."]
},
triangle: {
  titre:"Le triangle — bandana, châle, fanion",
  pour:"Bandana, petit châle, fanions de guirlande",
  crochet:"4 mm",
  fil:"Coton fin pour un bandana, mélange laine pour un châle",
  notes:"On part de la pointe et on élargit. C'est le sens le plus simple : tu t'arrêtes quand la taille te plaît, sans avoir rien calculé à l'avance.",
  etapes:[
    {titre:"La pointe", rangs:[
      "4 ml, 1 mc dans la première pour fermer en anneau.",
      "R1 — 3 ml, 4 br dans l'anneau. Tourne."]},
    {titre:"Élargir", rangs:[
      "R2 — 3 ml, 1 br dans la première maille, 1 br dans chaque maille, 2 br dans la dernière. Tourne. (2 mailles de plus)",
      "Répète ce rang. Chaque rang ajoute une maille de chaque côté : le triangle s'ouvre tout seul.",
      "Bandana : arrête vers 55 à 60 cm de large. Châle : vers 130 cm. Fanion : vers 14 cm."]},
    {titre:"Finir", rangs:[
      "Bandana ou châle : sur les deux côtés en biais, fais un tour de ms puis une chaînette de 40 cm à chaque extrémité pour nouer.",
      "Fanion : un tour de ms tout autour, et laisse 10 cm de fil pour le fixer sur la cordelette."]}
  ],
  astuces:["Si les bords ondulent, tu augmentes trop vite : passe à 2 mailles de plus tous les deux rangs.",
           "Pour une guirlande, fais tous les fanions avec la même chaînette de départ — ils seront identiques sans effort."]
},
coeur: {
  titre:"Le cœur plat",
  pour:"Saint-Valentin, décoration, applique cousue sur une autre pièce",
  crochet:"2,5 mm",
  fil:"Coton fin, moins de 10 g",
  notes:"Un cœur, c'est deux demi-cercles qui se rejoignent en pointe. On crochète les deux bosses d'abord, on les relie, puis on descend en diminuant.",
  etapes:[
    {titre:"Les deux bosses", rangs:[
      "Première bosse : cercle magique, 8 br dedans, 1 mc pour fermer. Ne coupe pas le fil.",
      "Deuxième bosse : 8 ml, puis 8 br dans la 8e ml en repartant, 1 mc dans la même maille que la première bosse.",
      "Tu as maintenant deux demi-cercles côte à côte."]},
    {titre:"Le tour", rangs:[
      "Fais le tour des deux bosses en ms, en passant d'une bosse à l'autre sans couper.",
      "Au creux du milieu, saute une maille : c'est ce qui creuse le haut du cœur."]},
    {titre:"La pointe", rangs:[
      "Rang suivant — 1 dim au début et 1 dim à la fin du rang.",
      "Répète jusqu'à ce qu'il ne reste que 3 mailles, puis 1 dim et coupe.",
      "Pour un cœur en volume : fais-en deux, couds-les envers contre envers en ms, rembourre légèrement avant de fermer."]}
  ],
  astuces:["Cousu sur un doudou ou un bonnet, le même cœur devient une signature d'atelier.",
           "En 2,5 mm, il fait environ 7 cm de large. En 4 mm avec un fil plus gros, environ 12 cm."]
},
flocon: {
  titre:"Le flocon en dentelle",
  pour:"Décoration de Noël, suspension, marque-place",
  crochet:"1,5 à 2 mm",
  fil:"Coton à dentelle blanc, 2 g par flocon",
  notes:"Six branches, comme un vrai flocon. Tout se fait en un seul tour après le centre : c'est rapide une fois le rythme pris.",
  etapes:[
    {titre:"Le centre", rangs:[
      "6 ml, 1 mc pour fermer en anneau.",
      "T1 — 12 ms dans l'anneau, 1 mc pour fermer. (12)"]},
    {titre:"Les six branches", rangs:[
      "T2 — (5 ml, sauter 1 maille, 1 mc dans la suivante) × 6. Tu as 6 arceaux. (6)",
      "T3 — dans chaque arceau : 1 mc, 6 ml, 1 ms dans la 4e ml depuis le crochet (cela fait un petit picot latéral), 3 ml, 1 ms dans la 2e ml (deuxième picot), 3 ml, 1 mc à la base de la branche.",
      "Termine par 1 mc dans la maille de départ et coupe."]},
    {titre:"Rigidifier", rangs:[
      "Trempe le flocon dans un mélange d'eau sucrée très concentré, ou dans de l'amidon de repassage.",
      "Épingle-le à plat sur une planche recouverte de film, branche par branche, et laisse sécher 12 h.",
      "C'est l'étape qui fait la différence entre un flocon mou et un flocon qui se vend."]}
  ],
  astuces:["Fais-les par six d'un coup : le blocage prend le même temps pour un ou pour douze.",
           "Un fil légèrement pailleté double la valeur perçue sans changer le temps de travail."]
},

/* ---------- le corps et les mains ---------- */
mitaine: {
  titre:"La mitaine — et les moufles bébé",
  pour:"Mitaines adulte, moufles anti-griffures, poignets",
  crochet:"3,5 mm",
  fil:"Mélange laine, 45 g pour la paire adulte, 15 g pour la paire bébé",
  notes:"Un tube, une ouverture pour le pouce, un tube. Mesure le tour de main à l'endroit le plus large, poing fermé : c'est la seule mesure qui compte.",
  etapes:[
    {titre:"Le poignet", rangs:[
      "Chaînette de la hauteur du poignet voulue (8 cm pour un adulte), plus 1 ml.",
      "Crochète des rangs de ms piquées dans le brin arrière seulement : cela fait des côtes qui s'étirent.",
      "Continue jusqu'à ce que la bande fasse le tour du poignet en tirant un peu, puis couds les deux extrémités bord à bord."]},
    {titre:"La main", rangs:[
      "Relève des ms tout autour du bord de la bande, en spirale.",
      "Adulte : environ 36 mailles. Bébé : environ 24.",
      "Monte droit sur 6 cm (adulte) ou 5 cm (bébé)."]},
    {titre:"Le pouce", rangs:[
      "Mitaines : au tour suivant, fais 6 ml, saute 6 mailles, continue le tour. L'ouverture est faite. Monte encore 3 cm puis un tour de ms serré et coupe.",
      "Moufles bébé : pas de pouce du tout. Ferme le haut par des diminutions comme une boule. Passe un cordon dans le poignet pour qu'elles ne tombent pas."]}
  ],
  astuces:["Fais les deux mitaines l'une après l'autre le même jour : la tension change d'un jour à l'autre, et la paire se voit.",
           "Moufles bébé : aucune perle, aucun bouton, aucun ruban de plus de 15 cm. Rien qui puisse être arraché et avalé."]
},
chausson: {
  titre:"Le chausson bébé",
  pour:"Chaussons naissance à 6 mois",
  crochet:"3 mm",
  fil:"Acrylique layette ou coton doux, 20 g pour la paire",
  notes:"La semelle d'abord, à plat, en ovale. Ensuite on monte les bords tout autour, et on resserre le dessus du pied. Taille naissance : semelle de 9 cm. 3 mois : 10 cm. 6 mois : 11,5 cm.",
  etapes:[
    {titre:"La semelle", rangs:[
      "11 ml (pour 9 cm).",
      "T1 — 1 ms dans la 2e ml, 8 ms, puis 4 ms dans la dernière ml ; reviens de l'autre côté de la chaînette : 8 ms, 3 ms dans la dernière. Ferme par 1 mc.",
      "T2 — 1 aug, 8 ms, (1 aug) × 4, 8 ms, (1 aug) × 3, mc.",
      "T3 — un tour de ms sans augmentation. La semelle est finie."]},
    {titre:"Les bords", rangs:[
      "T4 — ms piquées dans le brin arrière seulement tout autour : cela crée l'arête de la semelle.",
      "T5 à T7 — 1 ms dans chaque maille, tours entiers."]},
    {titre:"Le cou-de-pied", rangs:[
      "Repère le milieu de l'avant. Sur les 10 mailles centrales, fais 5 diminutions.",
      "Tour suivant : 5 diminutions à nouveau sur la partie centrale.",
      "Puis 3 tours droits pour la cheville, et un tour de brides séparées par 1 ml pour passer un ruban.",
      "Fais le deuxième chausson à l'identique : il n'y a ni pied droit ni pied gauche."]}
  ],
  astuces:["Le ruban : 25 cm maximum, et fais un point d'arrêt au milieu du dos pour qu'il ne puisse pas être tiré entièrement.",
           "Si la semelle gondole, c'est qu'il y a une augmentation de trop dans les arrondis : enlève-en une de chaque côté."]
},
cube: {
  titre:"Le cube d'éveil",
  pour:"Cube de jeu, dé, brique à empiler",
  crochet:"3 mm",
  fil:"Coton, 70 g pour un cube de 10 cm",
  notes:"Six carrés identiques, assemblés. C'est plus simple que de crocheter un cube d'un seul tenant, et les arêtes sont plus nettes.",
  etapes:[
    {titre:"Les six faces", rangs:[
      "Chaînette de 19 ml + 1.",
      "R1 — 1 ms dans la 2e ml, puis 1 ms dans chaque ml. (19)",
      "R2 à R21 — 1 ml de tournage, 19 ms.",
      "Le carré doit mesurer 10 cm de côté. Vérifie sur le premier avant d'en faire cinq autres."]},
    {titre:"Assembler", rangs:[
      "Couds quatre carrés bord à bord en ms sur l'endroit : tu obtiens un anneau.",
      "Ajoute le fond, puis trois côtés du couvercle.",
      "Glisse le rembourrage et un grelot dans une petite pochette de tissu cousue fermée, puis referme la dernière arête."]},
    {titre:"Décorer", rangs:[
      "Brode les faces avant l'assemblage, à plat : c'est dix fois plus facile.",
      "Chiffres, textures, couleurs contrastées — c'est ce qui fait qu'un bébé le regarde."]}
  ],
  astuces:["Le grelot doit être dans une pochette cousue, jamais libre dans le rembourrage.",
           "Rembourre fermement : un cube mou ne s'empile pas et ne se vend pas."]
},

/* ---------- anneaux, cordes et filets ---------- */
anneau: {
  titre:"L'anneau recouvert",
  pour:"Hochet, base de mobile, couronne de l'Avent, attache de sac",
  crochet:"2,5 à 3 mm",
  fil:"Coton",
  notes:"On recouvre un anneau existant — bois, plastique de puériculture, ou cercle métallique. Le fil ne doit jamais pouvoir glisser sur l'anneau une fois fini.",
  etapes:[
    {titre:"Recouvrir", rangs:[
      "Fais un nœud coulant autour de l'anneau et crochète des ms directement sur l'anneau : le crochet passe dans le trou central à chaque maille.",
      "Serre les mailles les unes contre les autres, sans laisser voir l'anneau.",
      "Fais tout le tour, puis 1 mc dans la première ms."]},
    {titre:"Fermer", rangs:[
      "Coupe en laissant 20 cm, passe le fil sous les dernières mailles et fais deux nœuds plats invisibles.",
      "Tire fort sur l'anneau fini : rien ne doit bouger."]},
    {titre:"Selon l'usage", rangs:[
      "Hochet : ajoute une boule rembourrée contenant un grelot en pochette, cousue solidement sur l'anneau.",
      "Mobile : suspends 4 ou 5 sujets par des cordelettes de longueurs différentes, équilibre en les déplaçant avant de nouer définitivement.",
      "Couronne de l'Avent : couds fleurs et feuilles sur tout le pourtour, en commençant par les plus grandes."]}
  ],
  astuces:["Anneau de puériculture pour tout ce qui va dans les mains d'un bébé : bois non traité ou plastique alimentaire, jamais un anneau de rideau.",
           "Un mobile se fixe hors de portée du berceau : il se regarde, il ne s'attrape pas."]
},
cordelette: {
  titre:"La cordelette crochetée",
  pour:"Prénom et lettres, guirlande, anse, suspension, cordon de sac",
  crochet:"2,5 mm",
  fil:"Coton fin ; fil de fer gainé de 0,8 mm si la forme doit tenir",
  notes:"Une cordelette, c'est une chaînette parcourue de mailles serrées. Avec un fil de fer à l'intérieur, elle garde la forme qu'on lui donne : c'est ainsi qu'on écrit un prénom.",
  etapes:[
    {titre:"La corde simple", rangs:[
      "Fais une chaînette de la longueur voulue, plus 10 %.",
      "Reviens en faisant 1 ms dans chaque ml, en piquant dans la bosse arrière : la corde reste ronde et ne vrille pas."]},
    {titre:"La corde armée", rangs:[
      "Pose le fil de fer le long de la chaînette et crochète les ms par-dessus, en l'enfermant.",
      "Replie les deux extrémités du fil de fer sur 1 cm avant de commencer : aucune pointe ne doit dépasser.",
      "Pour un prénom, compte 25 cm de corde par lettre, plus 10 cm entre chaque."]},
    {titre:"Mettre en forme", rangs:[
      "Écris le prénom au crayon sur une feuille, en attaché, à la taille finie.",
      "Pose la corde dessus et suis le tracé, lettre après lettre.",
      "Couds les croisements avec du fil à coudre assorti : c'est ce qui empêche le prénom de se déformer."]}
  ],
  astuces:["Guirlande : une cordelette simple de 1,50 m, et les fanions cousus tous les 15 cm.",
           "Suspension murale : une cordelette en haut, un cercle en bas, et ce que tu veux entre les deux.",
           "Un prénom armé n'est pas un jouet : il se suspend au mur, pas dans le lit."]
},
filet: {
  titre:"Le filet à provisions",
  pour:"Filet extensible, sac de marché, sac à vrac",
  crochet:"4 mm pour le fond, 5 mm pour le filet",
  fil:"Coton à tricoter solide, 130 g",
  notes:"Le filet se fait en arceaux de chaînettes. Il paraît minuscule une fois fini : c'est normal, il s'étire jusqu'à quatre fois sa taille au repos.",
  etapes:[
    {titre:"Le fond", rangs:[
      "Cercle magique, 8 ms.",
      "T2 — 1 aug × 8 (16). T3 — (1 ms, 1 aug) × 8 (24). T4 — (2 ms, 1 aug) × 8 (32).",
      "Continue jusqu'à 48 mailles, en ajoutant 8 mailles par tour. Le fond doit faire environ 18 cm."]},
    {titre:"Le filet", rangs:[
      "Passe au crochet de 5 mm.",
      "T1 — (1 ms, 5 ml, sauter 2 mailles) tout le tour. (16 arceaux)",
      "T2 — 1 ms dans le milieu de chaque arceau, 5 ml entre chaque.",
      "Répète ce tour jusqu'à 35 cm de hauteur : environ 18 tours."]},
    {titre:"Les anses", rangs:[
      "Tour de resserrage — 1 ms dans chaque arceau, 2 ml entre chaque.",
      "Deux tours de ms serrées pour le bord.",
      "Anses : sur le bord, repère deux zones opposées de 12 cm. Sur chacune, fais 4 rangs de ms sur 10 mailles, puis replie et couds : une anse repliée et cousue tient dix ans, une anse en chaînette lâche au premier melon."]}
  ],
  astuces:["Le coton uniquement : l'acrylique s'allonge et ne revient jamais.",
           "Fais le fond serré et le filet lâche — c'est le contraste qui fait qu'il porte lourd sans se déformer."]
},
/* ---------- vêtements : construction raglan, avec tableau de tailles ---------- */
gilet: {
  titre:"Le gilet raglan, du haut vers le bas",
  pour:"Gilet bébé, gilet adulte, cardigan ouvert",
  crochet:"4 mm pour un fil DK, 5 mm pour un fil aran",
  fil:"Bébé 3–6 mois : 120 g. Adulte S : 450 g. M : 520 g. L : 600 g.",
  notes:"Un seul morceau, sans couture, commencé par l'encolure. On essaie au fur et à mesure : c'est tout l'intérêt du top-down. Fais un échantillon de 10 × 10 cm avant de commencer — c'est la seule façon d'obtenir la bonne taille.",
  etapes:[
    {titre:"L'échantillon, d'abord", rangs:[
      "Crochète un carré de 15 cm en brides, bloque-le, mesure 10 cm au centre.",
      "Référence : 14 brides et 7 rangs pour 10 cm en 4 mm.",
      "Si tu as plus de mailles, monte d'une demi-taille de crochet. Si tu en as moins, descends."]},
    {titre:"L'encolure et les augmentations raglan", rangs:[
      "Chaînette de départ : bébé 3–6 mois 62 ml · S 88 ml · M 96 ml · L 104 ml.",
      "R1 — 1 br dans la 4e ml, puis 1 br dans chaque ml. Ne ferme pas : un gilet reste ouvert devant.",
      "Répartis 4 marqueurs qui séparent devant / manche / dos / manche. Pour la taille S : 14 / 16 / 28 / 16 mailles, plus 14 pour le second devant.",
      "R2 et suivants — 1 br dans chaque maille, et à chaque marqueur : 2 br dans la même maille, de part et d'autre. Cela fait 8 augmentations par rang.",
      "Répète jusqu'à ce que la ligne raglan mesure : bébé 11 cm · S 20 cm · M 22 cm · L 24 cm."]},
    {titre:"Séparer le corps et les manches", rangs:[
      "Rang suivant : crochète le devant, saute toutes les mailles de la manche en faisant à la place 4 ml (bébé) ou 8 ml (adulte) sous le bras, crochète le dos, saute la seconde manche de la même façon, termine le second devant.",
      "Continue le corps droit jusqu'à la longueur voulue : bébé 22 cm · S 38 cm · M 40 cm · L 42 cm depuis l'aisselle.",
      "Manches : reprends les mailles laissées en attente plus celles des ml sous le bras, et crochète en rond. Diminue 2 mailles tous les 6 rangs jusqu'au poignet."]},
    {titre:"Les bordures", rangs:[
      "Un rang de ms tout autour du gilet : bas, devant droit, encolure, devant gauche.",
      "Deux rangs de plus sur les devants pour qu'ils ne roulent pas.",
      "Boutonnières, si tu en veux : au deuxième rang du devant droit, (2 ml, sauter 2 mailles) tous les 7 cm."]}
  ],
  astuces:["Essaie le gilet à chaque changement d'étape : c'est le seul patron où tu peux corriger sans tout défaire.",
           "Le blocage avant de coudre les boutons gagne une demi-taille et rend le tombé net.",
           "Sur un gilet bébé, les boutons doivent être cousus avec du fil double et contrôlés à chaque lavage."]
},
top: {
  titre:"Le top d'été, du haut vers le bas",
  pour:"Top d'été, débardeur, camisole",
  crochet:"3,5 mm",
  fil:"Coton fin. S : 300 g. M : 350 g. L : 400 g.",
  notes:"Même construction raglan que le gilet, mais fermé et en rond. L'aisance fait tout : mesure ton tour de poitrine et ajoute 5 cm pour un top près du corps, 12 cm pour un top ample.",
  etapes:[
    {titre:"L'échantillon", rangs:[
      "En 3,5 mm avec un coton fin : 18 brides et 9 rangs pour 10 cm.",
      "Bloque l'échantillon avant de mesurer — le coton s'assouplit beaucoup au lavage."]},
    {titre:"L'encolure en rond", rangs:[
      "Chaînette : S 96 ml · M 104 ml · L 112 ml, fermée en rond par 1 mc. Attention à ne pas vriller la chaînette.",
      "T1 — 3 ml, 1 br dans chaque ml, 1 mc pour fermer.",
      "Quatre marqueurs : devant / manche / dos / manche. Taille S : 30 / 18 / 30 / 18.",
      "T2 et suivants — 8 augmentations par tour, de part et d'autre de chaque marqueur.",
      "Continue jusqu'à : S 18 cm · M 20 cm · L 22 cm de ligne raglan."]},
    {titre:"Le corps", rangs:[
      "Sépare comme pour le gilet : mets les manches en attente, fais 6 ml sous chaque bras.",
      "Crochète le corps en rond, droit, jusqu'à 2 cm au-dessus de la taille souhaitée.",
      "Pour un tombé plus souple, passe en brides séparées par 1 ml sur les dix derniers tours."]},
    {titre:"Finir les emmanchures", rangs:[
      "Pas de manches : deux tours de ms autour de chaque emmanchure suffisent.",
      "Encolure : un tour de ms, puis un tour de mc pour un bord net et non extensible.",
      "Bloque le top à plat aux mesures voulues et laisse sécher : c'est là que la forme se fixe."]}
  ],
  astuces:["Le coton s'allonge en portant : fais le corps 3 cm plus court que la longueur voulue.",
           "Un top se vend mieux avec ses mesures finies affichées : tour de poitrine, longueur totale, longueur du raglan."]
},
attache: {
  titre:"L'attache-tétine",
  pour:"Attache-tétine, attache-doudou",
  crochet:"2,5 mm, très serré",
  fil:"Coton, 10 g",
  notes:"IMPORTANT — pièce destinée à un bébé : n'utilise que des perles en bois non traité prévues pour la puériculture, et une longueur totale de 22 cm maximum, attaches comprises. Vérifie la solidité à chaque utilisation.",
  etapes:[
    {titre:"Les perles habillées", rangs:[
      "Pour chaque perle : T1 — 6 ms dans un cercle magique. T2 — 1 aug × 6 (12). T3 à T5 — 12 ms.",
      "Insère la perle, puis T6 — 1 dim × 6 (6). Fermer."]},
    {titre:"Le cordon", rangs:[
      "Chaîne de ml de la longueur voulue, en enfilant les perles habillées au fur et à mesure.",
      "Revenir en mc sur toute la chaînette pour la rendre solide et non extensible."]},
    {titre:"Les embouts", rangs:[
      "Un anneau de bois d'un côté, une pince à tétine de l'autre, fixés par un repli cousu deux fois."]}
  ],
  astuces:["Tire fermement sur le cordon fini : il ne doit pas s'allonger."]
}
};

/* Quel patron sert à quel type d'ouvrage. */
var PATRON_DE = {
  /* amigurumis : tout part de la boule ou du cylindre */
  ami_petit:"boule", ami_moyen:"boule", ami_mini:"boule", ami_grand:"boule",
  pcle:"boule", ami_poulpe:"boule", doudou:"boule", duo:"boule",
  ami_dino:"boule", ami_licorne:"boule", ami_perso:"cylindre", ami_poupee:"cylindre",
  perso_photo:"boule", perso_mariage:"cylindre", perso_doudouprenom:"boule",
  perso_pcleprenom:"boule", naissance:"boule",
  /* carrés et assemblages */
  bebe_granny:"granny", mode_sacgranny:"granny", couverture:"granny", coussin:"granny",
  /* disques */
  dessous:"disque", maison_setdetable:"disque", tawashi:"disque", maison_tapis:"disque",
  /* tête et cou */
  bonnet:"bonnet", bonnet_bebe:"bonnet", mode_bucket:"bonnet",
  snood:"echarpe", mode_chale:"echarpe", bandeau:"echarpe",
  /* contenants */
  panier:"panier", corbeille:"panier", maison_videpoche:"panier", maison_cachepot:"panier",
  sac:"panier", veg_succulente:"fleur",
  /* végétal et fêtes */
  fleur:"fleur", bouquet:"fleur", veg_rose:"fleur", veg_tournesol:"fleur",
  veg_couronnefleurs:"fleur", cactus:"cylindre",
  noel:"boule", paques:"boule", fete_lapinpaques:"boule", fete_citrouille:"boule",
  fete_guirlandenoel:"boule", fete_chaussette:"cylindre",
  coeur:"coeur", fete_flocon:"flocon", couronne:"anneau",
  /* petits objets */
  chouchou:"chouchou", mp:"marquepage", tetine:"attache",
  /* nouveaux */
  bebe_bavoir:"rectangle", maison_bouillotte:"rectangle", pochette_zip:"rectangle",
  mode_bandana:"triangle", maison_guirlande:"triangle",
  mitaines:"mitaine", bebe_moufles:"mitaine",
  chaussons:"chausson", cube:"cube",
  hochet:"anneau", bebe_mobile:"anneau",
  prenom:"cordelette", suspension:"cordelette",
  filet:"filet",
  bebe_gilet:"gilet", mode_gilet:"gilet", mode_top:"top"
};
function patronDe(mid){
  var ep = epoque(mid);
  if (ep) return {titre:ep.nom, pour:ep.objet, crochet:ep.crochet, fil:ep.fil,
                  notes:ep.notes, etapes:ep.etapes, astuces:ep.astuces,
                  echantillon:ep.echantillon, fini:ep.fini, source:ep.source};
  var k = PATRON_DE[mid];
  return k && PATRONS[k] ? PATRONS[k] : null;
}

/* Rendu du patron dans la fiche, et impression. */
function cartePatron(mid){
  var pt = patronDe(mid);
  if (!pt){
    return el('<div class="card" id="patron-print" style="margin-bottom:18px">'+
      '<header><h2>Le patron</h2></header><div class="body">'+
      '<p style="margin:0">Pas de patron ici, et c\'est volontaire. Ce modèle est un vêtement : '+
      'il demande des tailles graduées, des aisances et des essayages. Un patron approximatif te '+
      'ferait perdre du fil et des soirées de travail.</p>'+
      '<p class="hint">Utilise le patron gradué de ton choix et range-le dans « Mes patrons » : il s\'affichera '+
      'à côté du chronomètre. Cette fiche reste valable pour calculer ton prix et chronométrer ton temps.</p></div></div>');
  }
  var h = '<div class="card" id="patron-print" style="margin-bottom:18px">'+
    '<header><h2>Le patron : '+esc(pt.titre)+'</h2>'+
    '<p>'+esc(pt.pour)+'</p></header><div class="body">'+
    '<div class="pat-meta">'+
      '<div><span>Crochet</span><b>'+esc(pt.crochet)+'</b></div>'+
      '<div><span>Fil</span><b>'+esc(pt.fil)+'</b></div>'+
    '</div>'+
    '<p class="pat-note">'+esc(pt.notes)+'</p>';

  pt.etapes.forEach(function(e){
    h += '<h3 class="pat-h">'+esc(e.titre)+'</h3><ol class="pat-rangs">';
    e.rangs.forEach(function(r){ h += '<li>'+esc(r)+'</li>'; });
    h += '</ol>';
  });

  if (pt.astuces && pt.astuces.length){
    h += '<h3 class="pat-h">À savoir</h3><ul class="pat-astuces">';
    pt.astuces.forEach(function(a){ h += '<li>'+esc(a)+'</li>'; });
    h += '</ul>';
  }

  h += '<details class="pat-abbr"><summary>Les abréviations</summary><dl>';
  ABBR.forEach(function(a){ h += '<dt>'+esc(a[0])+'</dt><dd>'+esc(a[1])+'</dd>'; });
  h += '</dl></details>';

  h += '<p class="hint pat-droits">Patron écrit pour cette application à partir des techniques de base '+
    'du crochet. Il est à toi : imprime-le, modifie-le, et vends librement ce que tu en fais.</p>'+
    '</div></div>';

  var c = el(h);
  var bar = el('<div class="savebar" style="margin-top:14px"></div>');
  bar.appendChild(bouton("Imprimer le patron", function(){
    /* Sur téléphone, print() rend la main tout de suite : on attend la fin
       réelle de l'impression (afterprint) pour remettre l'écran normal. Les
       abréviations sont dépliées pour figurer sur le papier. */
    var fermees = [].slice.call(c.querySelectorAll("details:not([open])"));
    fermees.forEach(function(d){ d.open = true; });
    document.body.classList.add("mode-impression");
    var fini = false;
    function remettre(){
      if (fini) return; fini = true;
      document.body.classList.remove("mode-impression");
      fermees.forEach(function(d){ d.open = false; });
      window.removeEventListener("afterprint", remettre);
    }
    window.addEventListener("afterprint", remettre);
    window.print();
    if (!("onafterprint" in window)) setTimeout(remettre, 1500);
  }));
  c.querySelector(".body").appendChild(bar);
  return c;
}

/* ═════ 33. MISE EN ROUTE ═════
   Un outil de coût de revient ne vaut que par ce qu'on lui donne. Cette page
   mesure ce qui est déjà renseigné et dit, dans l'ordre, ce qu'il reste à faire.
   Rien n'est inventé : chaque compteur est calculé sur les données réelles. */

function demarrageTermine(){
  if (!state) return false;
  var b = bilanDemarrage();
  return b.reglagesVus && b.matPerso >= 5 && b.creations >= 3 && b.chrono >= 3
      && (b.photosModeles + b.photosCrea) >= 10 && !!b.sauvegarde;
}

function bilanDemarrage(){
  var r = state.reglages;

  /* Une matière compte comme « à toi » quand son prix n'est plus indicatif :
     saisir un prix met prixIndicatif à faux. Les 32 matières fournies portent
     des prix de repère, pas des factures. */
  var matPerso = state.matieres.filter(function(m){ return m.prix > 0 && !m.prixIndicatif; });
  var matPrix  = state.matieres.filter(function(m){ return m.prix > 0; });

  var creaVraies = state.creations;

  var photosModeles = 0;
  if (state.photosModeles) for (var k in state.photosModeles)
    if (state.photosModeles[k] && state.photosModeles[k].photo) photosModeles++;
  var photosCrea = creaVraies.filter(function(c){ return !!c.photo; }).length;

  var chrono = state.pieces.filter(function(p){
    if (!p.mesure) return false;
    var t = 0; for (var q in p.mesure) t += p.mesure[q] || 0;
    return t > 0;
  }).length;

  var canaux = {};
  creaVraies.forEach(function(c){ if (c.canal) canaux[c.canal] = 1; });

  return {
    reglagesVus: !!r.confirmeLe,
    tauxHoraire: r.tauxHoraire || 0,
    matPerso: matPerso.length, matPrix: matPrix.length, matTotal: state.matieres.length,
    creations: creaVraies.length,
    photosModeles: photosModeles, photosCrea: photosCrea,
    modelesTotal: MODELES.length - 1,
    chrono: chrono,
    canaux: Object.keys(canaux).length,
    sauvegarde: r.sauvegardeLe || null
  };
}

function renderDemarrage(main){
  var b = bilanDemarrage();

  var etapes = [
    {
      fait: b.reglagesVus,
      titre: "Tes chiffres à toi",
      texte: b.reglagesVus
        ? "Tu as confirmé ton taux horaire (" + eur(b.tauxHoraire) + "/h), tes cotisations et tes frais fixes. "
          + "Reviens-y quand ta situation change."
        : "Deux choses seulement. Ton statut : tu le choisis dans une liste et le taux de cotisations "
          + "se remplit automatiquement (les taux 2026 sont déjà intégrés). Et ton taux "
          + "horaire : celui de départ (" + eur(b.tauxHoraire) + "/h) est une valeur par défaut, remplace-la par ce que "
          + "tu veux gagner de l'heure. C'est le seul chiffre que personne ne peut trouver à ta place.",
      bouton: ["Ouvrir mes réglages", function(){ view.regSection = "activite"; aller("reglages"); }]
    },
    {
      fait: b.matPerso >= 5,
      titre: "Tes matières, avec tes prix d'achat réels",
      texte: b.matPerso >= 5
        ? b.matPerso + " matières portent tes propres prix. C'est la base d'un coût juste."
        : "Dans « Mes matières », le bouton « Appliquer les prix relevés en boutique » remplit d'un coup " + PRIX_MARCHE.length + " prix relevés en magasin, "
          + "datés et sourcés : tes calculs partent alors de prix réels et non d'estimations. "
          + "Ensuite, quand tu auras une facture sous les yeux, corrige la ligne concernée : "
          + "c'est le seul moyen d'avoir ton coût exact. Pour l'instant " + b.matPerso + " matière"
          + (b.matPerso > 1 ? "s portent" : " porte") + " ton prix d'achat sur " + b.matTotal + ".",
      jauge: [b.matPerso, 10],
      bouton: ["Ouvrir mes matières", function(){ view.sub = "matieres"; aller("stock"); }]
    },
    {
      fait: b.creations >= 3,
      titre: "Tes créations",
      texte: b.creations >= 3
        ? b.creations + " créations enregistrées."
        : "Pars d'un modèle du catalogue : le patron, les matières et les temps sont déjà remplis, "
          + "tu n'as qu'à corriger ce qui diffère chez toi.",
      jauge: [b.creations, 3],
      bouton: ["Ouvrir le catalogue", function(){ view.modeleVu = null; aller("catalogue"); }]
    },
    {
      fait: b.chrono >= 3,
      titre: "Chronométrer trois pièces",
      texte: b.chrono >= 3
        ? b.chrono + " pièces ont un temps mesuré. Tes prix reposent sur des minutes réelles."
        : "Cette étape, personne ne peut la faire à ta place. Les durées du catalogue "
          + "sont des estimations ; les tiennes seront différentes. Ouvre une création, lance le "
          + "chronomètre, reprends-le demain là où tu en étais. Il n'y a rien à saisir, il tourne "
          + "tout seul. Après trois pièces, tu sauras ce que ton heure de travail te rapporte vraiment.",
      jauge: [b.chrono, 3],
      bouton: ["Voir mes créations", function(){ aller("creations"); }]
    },
    {
      fait: b.photosModeles + b.photosCrea >= 10,
      titre: "Tes photos",
      texte: "Sélectionne toutes tes photos d'un coup : l'outil propose lui-même à quel modèle chacune "
        + "correspond d'après le nom du fichier, tu corriges ce qui est faux, et c'est fini. La licence "
        + "se remplit toute seule, et les photos sont enregistrées dans ton compte. "
        + pluriel(b.photosModeles, "modèle") + " du catalogue et " + pluriel(b.photosCrea, "création") + " " + (b.photosModeles + b.photosCrea > 1 ? "ont" : "a") + " ta photo.",
      jauge: [b.photosModeles + b.photosCrea, 10],
      bouton: ["Importer plusieurs photos", function(){ view.sub = "photos"; render(); }]
    },
    {
      fait: !!b.sauvegarde,
      titre: "Ta sauvegarde",
      texte: b.sauvegarde
        ? "Dernière sauvegarde exportée le " + dateLisible(b.sauvegarde) + ". Refais-en une de temps en temps."
        : ((window.CROCHOMPTE_CONFIG || {}).supabaseUrl
            ? "Ton atelier est déjà enregistré automatiquement dans ton compte. Exporte aussi un fichier de "
              + "temps en temps : c'est une copie supplémentaire, indépendante du compte."
            : "Tes données sont enregistrées uniquement sur cet appareil : effacer les données de navigation les supprime. "
              + "Exporte un fichier de sauvegarde : c'est aussi comme ça que tu passes du téléphone à l'ordinateur."),
      bouton: ["Télécharger ma sauvegarde", function(){ view.regSection = "donnees"; aller("reglages"); }]
    }
  ];

  var faits = etapes.filter(function(e){ return e.fait; }).length;

  main.appendChild(enTete("Mise en route",
    "L'outil fonctionne déjà. Chaque étape ci-dessous remplace une estimation par tes vrais chiffres."));

  var res = el('<div class="card" style="margin-bottom:18px"><div class="body">'+
    '<p style="margin:0 0 4px"><b>'+faits+(faits>1?' étapes sont faites':' étape est faite')+
    ' sur '+etapes.length+'.</b></p>'+
    '<div class="jauge"><i style="width:'+Math.round(faits/etapes.length*100)+'%"></i></div>'+
    '<p class="hint" style="margin:0">'+
    (faits === etapes.length
      ? 'Tout est renseigné. Les prix que tu lis sont calculés sur tes vrais chiffres.'
      : 'Rien n\'est obligatoire : tu peux calculer un prix dès maintenant. '+
        'Mais chaque étape faite rapproche le chiffre affiché de ta réalité, '+
        'et les deux premières se règlent en quelques clics.')+
    '</p></div></div>');
  main.appendChild(res);

  var box = el('<div class="etapes"></div>');
  etapes.forEach(function(e, i){
    var d = el('<div class="etape'+(e.fait?' fait':'')+'">'+
      '<span class="et-n">'+(e.fait?'✓':(i+1))+'</span>'+
      '<div><p class="et-t">'+esc(e.titre)+'</p>'+
      '<p class="et-p">'+esc(e.texte)+'</p>'+
      (e.jauge ? '<div class="jauge"><i style="width:'+
        Math.min(100, Math.round(e.jauge[0]/e.jauge[1]*100))+'%"></i></div>' : '')+
      '<div class="et-act"></div></div></div>');
    d.querySelector(".et-act").appendChild(bouton(e.bouton[0], e.bouton[1], !e.fait && i === faits));
    box.appendChild(d);
  });
  main.appendChild(box);

  if (view.sub === "photos") main.appendChild(carteImportPhotos());
}

function marquerSauvegarde(){
  state.reglages.sauvegardeLe = new Date().toISOString();
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
}

function dateLisible(iso){
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0,10);
  return d.toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"});
}

/* ───── Import groupé : plusieurs photos d'un coup, rattachées aux modèles ─────
   Le rapprochement par nom de fichier n'est qu'une proposition : c'est toujours
   l'artisane qui valide, parce qu'une photo mal rattachée est pire qu'aucune. */

function suggestionModele(nomFichier){
  var n = nomFichier.toLowerCase().replace(/\.[a-z0-9]+$/,"").replace(/[_\-]+/g," ");
  var best = null, score = 0;
  MODELES.forEach(function(m){
    if (m[0] === "vide") return;
    if (n.indexOf(m[0].replace(/_/g," ")) >= 0){ if (score < 3){ score = 3; best = m[0]; } return; }
    var mots = mNom(m).toLowerCase().replace(/\(.*?\)/g,"").split(/[^a-zà-ÿ]+/)
                 .filter(function(w){ return w.length > 3; });
    var t = mots.filter(function(w){ return n.indexOf(w) >= 0; }).length;
    if (t > score){ score = t; best = m[0]; }
  });
  return score >= 1 ? best : "";
}

function carteImportPhotos(){
  var c = el('<div class="card" id="import-photos" style="margin-top:18px"><header>'+
    '<h2>Importer plusieurs photos</h2>'+
    '<p>Choisis autant d\'images que tu veux, puis dis pour chacune de quel modèle il s\'agit. '+
    'L\'application propose un modèle d\'après le nom du fichier : vérifie-le, car une photo mal rattachée '+
    'est pire qu\'une photo absente.</p></header><div class="body">'+
    '<div class="et-act" style="margin-bottom:14px"></div>'+
    '<div class="imp"></div>'+
    '<p class="hint">Les photos sont réduites puis enregistrées dans ton compte. '+
    'Si ce sont tes propres photos, la licence est remplie automatiquement : elles sont à toi.</p>'+
    '</div></div>');

  var act = c.querySelector(".et-act");
  var grille = c.querySelector(".imp");
  var inp = el('<input type="file" accept="image/*,application/pdf,.pdf" multiple style="display:none" '+
               'aria-label="Choisir des photos ou des PDF">');
  var choix = [];

  var bChoisir = bouton("Choisir des photos ou des PDF", function(){ inp.click(); }, true);
  act.appendChild(bChoisir); act.appendChild(inp);

  var bValider = bouton("Enregistrer les photos rattachées", function(){
    var aFaire = choix.filter(function(x){ return x.mid && !x.fait; });
    if (!aFaire.length){ toast("Choisis d'abord un modèle pour au moins une photo"); return; }
    bValider.disabled = true; bValider.textContent = "Enregistrement…";
    var ok = 0;
    /* Une photo après l'autre : sur téléphone, réduire dix photos de 8 Mo en
       même temps sature la mémoire, et deux photos pour le même modèle se
       marcheraient dessus. */
    aFaire.reduce(function(chaine, x){
      return chaine.then(function(){
        return redimensionner(x.image || x.file, 900).then(function(blob){
          if (!blob) return;
          var f = fichePhoto(x.mid);
          var ancienne = f.photo, id = "pm_" + uid();
          return ecrirePhoto(id, blob).then(function(bon){
            if (!bon) return;
            f.photo = id;
            if (ancienne && ancienne !== id) effacerPhoto(ancienne);
            if (!f.licencePhoto) f.licencePhoto = "Photo que j'ai prise";
            if (!f.auteur) f.auteur = "Moi";
            if (!f.verifieLe) f.verifieLe = aujourdhuiISO();
            x.fait = true; ok++;
          });
        }).catch(function(){});
      });
    }, Promise.resolve()).then(fini);
    function fini(){
      choix.forEach(function(x){ if (x.url){ try{ URL.revokeObjectURL(x.url); }catch(e){} } });
      sauverTout();
      var rates = aFaire.length - ok;
      if (rates) toast(rates + (rates > 1 ? " photos n'ont pas pu être enregistrées" : " photo n'a pas pu être enregistrée") + ". Réessaie avec une autre copie.");
      bValider.disabled = false; bValider.textContent = "Enregistrer les photos rattachées";
      if (ok) toast(ok + (ok > 1 ? " photos enregistrées" : " photo enregistrée"));
      view.sub = "photos"; render();
    }
  });
  bValider.disabled = true;
  act.appendChild(bValider);

  function peindre(){
    grille.innerHTML = "";
    if (!choix.length){
      grille.appendChild(el('<p class="hint" style="margin:0">Aucune photo choisie pour l\'instant.</p>'));
      bValider.disabled = true;
      return;
    }
    choix.forEach(function(x){
      var carte = el('<div class="impc">'+
        '<img src="'+x.url+'" alt="'+esc(x.file.name)+'">'+
        '<div class="b"><span class="fn" title="'+esc(x.file.name)+'">'+esc(x.file.name)+'</span>'+
        '<select></select></div></div>');
      var sel = carte.querySelector("select");
      var o0 = document.createElement("option");
      o0.value = ""; o0.textContent = "— ne pas rattacher —"; sel.appendChild(o0);
      MODELES.forEach(function(m){
        if (m[0] === "vide") return;
        var o = document.createElement("option");
        o.value = m[0];
        o.textContent = mNom(m) + (aPhotoModele(m[0]) ? "  (a déjà une photo)" : "");
        sel.appendChild(o);
      });
      sel.value = x.mid || "";
      sel.addEventListener("change", function(){
        x.mid = sel.value;
        bValider.disabled = !choix.some(function(y){ return y.mid && !y.fait; });
      });
      grille.appendChild(carte);
    });
    bValider.disabled = !choix.some(function(y){ return y.mid && !y.fait; });
  }

  inp.addEventListener("change", function(){
    var fichiers = [].slice.call(inp.files || []);
    inp.value = "";
    /* Un PDF donne sa première page, convertie en image pour l'aperçu. */
    var chaine = Promise.resolve(), ignores = 0;
    fichiers.forEach(function(fi){
      if (estImage(fi)){
        choix.push({file:fi, url:URL.createObjectURL(fi), mid:suggestionModele(fi.name), fait:false});
      } else if (!estPdf(fi)){ ignores++;
      } else {
        chaine = chaine.then(function(){
          return imageDepuisFichier(fi, 900).then(function(b){
            if (b) choix.push({file:fi, image:b, url:URL.createObjectURL(b), mid:suggestionModele(fi.name.replace(/\.pdf$/i, "")), fait:false});
          }, function(e){ toast(messageErreurPdf(e)); });
        });
      }
    });
    if (ignores) toast(ignores + (ignores > 1 ? " fichiers ignorés : ce ne sont" : " fichier ignoré : ce n'est") + " ni des images ni des PDF.");
    if (!fichiers.length) return;
    chaine.then(peindre);
  });

  peindre();
  return c;
}


/* ═════ 34. STATUTS ET TAUX DE COTISATIONS ═════
   Taux en vigueur au 1er janvier 2026 (décret 2024-484), relevés le
   16 septembre 2026 sur economie.gouv.fr et portail-autoentrepreneur.fr.
   Le taux affiché additionne les cotisations sociales et la contribution à la
   formation professionnelle, parce que les deux sont prélevées sur le même
   chiffre d'affaires. Rien n'est deviné ici : si ta situation n'est pas dans
   la liste, le champ reste modifiable à la main. */

var STATUTS = [
  {id:"marchandises", nom:"Micro-entreprise — vente de marchandises",
   taux:12.4, detail:"12,3 % de cotisations + 0,1 % de formation professionnelle",
   quand:"Tu fabriques tes pièces avec tes propres matières et tu les vends finies. "+
         "C'est le cas le plus courant quand on vend ses créations au crochet sur un marché, "+
         "une boutique en ligne ou une plateforme."},
  {id:"services_art", nom:"Micro-entreprise — prestation de services artisanale",
   taux:21.5, detail:"21,2 % de cotisations + 0,3 % de formation professionnelle",
   quand:"Tu travailles surtout sur commande et sur mesure, ou on te fournit la matière."},
  {id:"services_com", nom:"Micro-entreprise — prestation de services commerciale",
   taux:21.3, detail:"21,2 % de cotisations + 0,1 % de formation professionnelle",
   quand:"Prestation de services relevant du régime commercial."},
  {id:"bnc", nom:"Profession libérale — régime général (BNC)",
   taux:25.8, detail:"25,6 % de cotisations + 0,2 % de formation professionnelle",
   quand:"Activité libérale non réglementée, affiliée au régime général."},
  {id:"cipav", nom:"Profession libérale affiliée à la CIPAV",
   taux:23.4, detail:"23,2 % de cotisations + 0,2 % de formation professionnelle",
   quand:"Professions libérales réglementées relevant de la CIPAV."},
  {id:"non_declare", nom:"Activité pas encore déclarée",
   taux:0, detail:"Aucune cotisation tant que l'activité n'est pas déclarée",
   quand:"Tu crochètes sans activité déclarée. L'outil calcule alors sans cotisations. "+
         "Garde en tête qu'une fois ton activité déclarée, ton prix devra les intégrer."}
];
function statutCotis(id){
  for (var i=0;i<STATUTS.length;i++) if (STATUTS[i].id === id) return STATUTS[i];
  return null;
}

/* ═════ SEUILS FISCAUX ═════
   Deux plafonds décident du cadre dans lequel une artisane travaille, et on
   ne les voit pas venir : on les franchit en vendant, puis on l'apprend.
     • La FRANCHISE DE TVA. Tant qu'on est dessous, on facture sans TVA et on
       porte la mention « TVA non applicable, art. 293 B ». Au-dessus, il faut
       facturer la TVA — et le prix affiché change du jour au lendemain.
     • Le PLAFOND DU RÉGIME MICRO. Au-dessus, on quitte le régime simplifié.

   Chiffres relevés le 21 septembre 2026 sur service-public.gouv.fr (F23566,
   F23267) et economie.gouv.fr. Ils sont datés et affichés comme tels, parce
   qu'ils bougent : la réforme qui devait ramener la franchise à 25 000 € a
   été annoncée, reportée, puis supprimée par une loi du 3 novembre 2025.
   Ne jamais les traiter comme des constantes définitives.
   ═══════════════════════════════════════════════════════════════════════ */
var SEUILS_DATE = "21 septembre 2026";
var SEUILS = {
  /* Vendre des créations qu'on a fabriquées, c'est de la vente de biens. */
  biens:    {nom:"vente de marchandises", tva:85000, tvaMajore:93500, micro:203100},
  services: {nom:"prestation de services", tva:37500, tvaMajore:41250, micro:83600}
};
/* Quelle famille de seuils s'applique, d'après le statut choisi en réglages. */
function seuilsDuStatut(){
  var id = state.reglages.statut || "";
  if (id.indexOf("services") === 0 || id === "bnc" || id === "cipav") return SEUILS.services;
  return SEUILS.biens;
}
/* Le chiffre d'affaires d'une année civile. On distingue ce qui vient du
   suivi des pièces et ce qui vient des commandes, pour que l'artisane voie
   d'où sort le total — et repère un éventuel double comptage si elle note
   la même vente aux deux endroits. */
function caAnnuel(annee){
  annee = annee || new Date().getFullYear();
  var debut = new Date(annee, 0, 1).getTime();
  var fin   = new Date(annee + 1, 0, 1).getTime();
  var pieces = 0, cmds = 0;
  /* Même source que les Indicateurs : l'argent reçu, à sa date. C'est aussi
     la base légale du chiffre d'affaires en micro-entreprise (les recettes
     encaissées), donc celle sur laquelle les seuils s'apprécient. */
  encaissements().forEach(function(x){
    if (x.t < debut || x.t >= fin) return;
    if (x.source === "atelier") pieces += x.montant; else cmds += x.montant;
  });
  return {annee:annee, pieces:pieces, commandes:cmds, total:pieces + cmds};
}

/* ═════ 35. PRIX MARCHÉ VÉRIFIÉS ═════
   Prix réellement affichés en boutique, relevés le 16 septembre 2026, avec
   leur source. Ce ne sont pas tes prix d'achat : ce sont des prix constatés,
   qui donnent un ordre de grandeur juste tant que tu n'as pas saisi tes
   factures. Chaque ligne porte son vendeur et sa date — rien d'inventé. */

var PRIX_MARCHE = [
  {id:"coton_fin", nom:"Coton fin amigurumi — DMC Natura (50 g, 155 m)",
   prix:3.80, contenance:50, unite:"g",
   src:"craftine.com", url:"https://www.craftine.com/pelote-dmc-coton-natura-bleu-jean-n26.html"},
  {id:"coton_dk", nom:"Coton DK — DROPS Paris (50 g, 75 m)",
   prix:1.55, contenance:50, unite:"g",
   src:"laines-du-monde.com", url:"https://www.laines-du-monde.com/produit/paris/"},
  {id:"ouate", nom:"Ouate de rembourrage polyester (250 g)",
   prix:5.49, contenance:250, unite:"g",
   src:"lilywools", url:"https://lilywools-amigurumisetcrochets.com/en/products/stuffing-amigurumis-250g"},
  {id:"corde", nom:"Corde coton 3 mm, bobine 100 m (350 g)",
   prix:13.50, contenance:350, unite:"g",
   src:"perlerienice.fr", url:"https://perlerienice.fr/corde-macrame-et-crochet/1477-100-m-corde-coton-3mm-peigne-kaki-recycle.html"}
];
var PRIX_MARCHE_DATE = "16 septembre 2026";

function appliquerPrixMarche(){
  var n = 0;
  PRIX_MARCHE.forEach(function(p){
    var m = matiere(p.id); if (!m) return;
    m.nom = p.nom; m.prix = p.prix; m.contenance = p.contenance; m.unite = p.unite;
    m.pmp = p.prix / p.contenance;
    m.prixIndicatif = true;                 /* toujours pas SA facture */
    m.prixSource = {src:p.src, url:p.url, date:PRIX_MARCHE_DATE};
    m.maj = Date.now();
    n++;
  });
  sauverTout();
  return n;
}


/* ═════ 36. PLANCHE DU MODÈLE ═════
   Ce n'est pas une photo et l'application ne le fait jamais croire. C'est un
   dessin construit à partir du patron de la fiche : même forme, même sens de
   travail, dimensions finies annoncées. Une photo d'un ouvrage trouvé ailleurs
   montrerait le travail d'une autre personne, avec d'autres proportions et
   d'autres finitions — exactement ce qu'il ne faut pas mettre sous les yeux de
   quelqu'un qui va réaliser la pièce. */

/* Texture de mailles serrées, dessinée une fois et réutilisée par toutes
   les planches. Les petits V sont ce qu'on voit sur un vrai ouvrage. */
function texteMaille(){
  return '<pattern id="mailles" width="12" height="10" patternUnits="userSpaceOnUse">'+
    '<path d="M1 9 L4 3 L7 9 M7 9 L10 3 L13 9" fill="none" stroke="var(--fc)" '+
    'stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity=".16"/>'+
    '</pattern>';
}

/* Dimensions finies : lues dans le libellé du modèle quand il les porte
   (« Amigurumi moyen (18–22 cm) »), sinon dans le patron. Jamais inventées. */
function tailleFinie(mid){
  var ep = epoque(mid);
  if (ep && ep.fini) return ep.fini;   /* le livret donne la mesure : elle prime */
  var m = modele(mid); if (!m) return "";
  var lib = mNom(m);
  var par = lib.match(/\(([^)]*\d[^)]*)\)/);
  if (par && /cm|g\b|×/.test(par[1])) return par[1].replace(/\s+/g," ").trim();
  var pt = patronDe(mid);
  if (pt){
    var t = JSON.stringify(pt);
    var cm = t.match(/(\d+(?:,\d+)?)\s?cm/);
    if (cm) return "environ " + cm[1] + " cm";
  }
  return "";
}

/* Crochet et fil viennent du patron : ce que la fiche montre est ce que le
   patron demande, sans recopie à la main qui finirait par diverger. */
function reperesPatron(mid){
  var ep = epoque(mid);
  if (ep) return {crochet: ep.crochet, fil: ep.fil};
  var pt = patronDe(mid);
  if (!pt) return null;
  var cr = (pt.crochet || "").match(/[\d,.]+\s?(?:à\s?[\d,.]+\s?)?mm/);
  return {crochet: cr ? cr[0] : "", fil: pt.fil || ""};
}

function planche(mid, h){
  if (!DESSINS) DESSINS = dessins();
  var m = modele(mid); if (!m) return "";
  var fam = m[1] || "perso";
  var cle = MOTIF_DE[mid] || "coeur";
  var hauteur = h || 190;
  var taille = tailleFinie(mid);

  /* le dessin de 48×48 est agrandi et centré dans une scène de 160×100 */
  return '<svg class="planche" viewBox="0 0 160 100" role="img" '+
    'aria-label="Dessin du modèle '+esc(mNom(m))+', réalisé d\'après son patron" '+
    'style="--fc:var(--f-'+fam+');--fcb:var(--f-'+fam+'-b);width:100%;height:'+hauteur+'px;display:block">'+
    '<defs>'+texteMaille()+'</defs>'+
    '<rect width="160" height="100" fill="var(--fcb)"/>'+
    '<rect width="160" height="100" fill="url(#mailles)"/>'+
    '<g transform="translate(38 6) scale(1.8)">'+(DESSINS[cle] || DESSINS.coeur)+'</g>'+
    (taille
      ? '<g><rect x="5" y="81" rx="7" width="'+Math.min(150, 18 + taille.length*5)+'" height="14" '+
        'fill="var(--surface)" stroke="var(--fc)" stroke-width="0.7" opacity=".95"/>'+
        '<text x="11" y="90.5" font-size="8.5" fill="var(--fc)" font-weight="600">'+esc(taille)+'</text></g>'
      : '')+
    '</svg>';
}

/* La fiche technique : tout ce qu'il faut pour se lancer, en un bloc. */
function ficheTechnique(mid){
  var m = modele(mid); if (!m) return null;
  var r = reperesPatron(mid);
  var cr = creationDepuisModele(m[0], mNom(m), 0, "direct");
  var calc = calculer(cr);
  var taille = tailleFinie(mid);

  var lignes = [];
  var ep = epoque(mid);
  if (taille) lignes.push(["Dimensions finies", taille]);
  if (ep && ep.echantillon) lignes.push(["Échantillon", ep.echantillon]);
  if (r && r.crochet) lignes.push(["Crochet", r.crochet]);
  if (r && r.fil) lignes.push(["Fil", r.fil]);
  lignes.push(["Difficulté", DIFF[m[4]-1]]);
  lignes.push(["Temps de travail", dureeTexte(calc.minutes)]);
  lignes.push(["Matières et emballage", eur(calc.matieres)]);
  if (!lignes.length) return null;

  return el('<div class="card" style="margin-bottom:18px"><header><h2>En bref</h2>'+
    '<p>Tout vient du patron de cette fiche : ces valeurs ne peuvent pas diverger de ce que tu vas crocheter.</p>'+
    '</header><div class="body"><dl class="brefs">'+
    lignes.map(function(l){
      return '<div><dt>'+esc(l[0])+'</dt><dd>'+esc(l[1])+'</dd></div>';
    }).join("")+'</dl></div></div>');
}


/* ═════ 37. MODÈLES D'ÉPOQUE (DOMAINE PUBLIC) ═════
   Pourquoi ceux-là et pas d'autres : ce sont des livrets dont les droits ont
   expiré. La photo ET le patron peuvent être reproduits intégralement, sans
   autorisation et sans redevance. C'est la seule source au monde qui donne un
   couple « image + patron » entièrement libre — partout ailleurs, la photo
   appartient au photographe et le texte à sa créatrice, même distribué
   gratuitement.
   Les mesures en pouces ont été converties en centimètres, et les tailles de
   crochet américaines en millimètres. Les marques de fil citées dans le texte
   d'origine n'existent plus sous cette forme : l'équivalent moderne est donné
   par la grosseur du fil, pas par la marque. */

/* ═══════════════════════════════════════════════════════════════════════
   PHOTOS D'ILLUSTRATION — Wikimedia Commons
   Une photo d'illustration n'est PAS l'ouvrage de la fiche : c'est une pièce
   comparable, photographiée par quelqu'un d'autre, qui sert seulement à voir
   de quoi on parle. L'application le dit sur chaque photo, sans exception.
   Toutes sont sous licence libre vérifiée une à une le 19 septembre 2026 via
   l'API de Wikimedia Commons (champ extmetadata : licence et auteur).
   Les licences CC BY et CC BY-SA imposent de citer l'auteur et la licence :
   c'est fait sous chaque image, avec le lien vers la page d'origine.
   « fid » dit la franchise de la ressemblance : exacte, proche, ou générique.
   ═══════════════════════════════════════════════════════════════════════ */
var ILLUSTRATIONS = [
{m:"ami_petit",u:"https://upload.wikimedia.org/wikipedia/commons/6/64/Crocheted_little_bunny.jpg",p:"https://commons.wikimedia.org/wiki/File:Crocheted_little_bunny.jpg",t:"Crocheted little bunny",a:"רחל1",l:"CC BY-SA 4.0",fid:"proche"},
{m:"ami_moyen",u:"https://upload.wikimedia.org/wikipedia/commons/e/ec/Conejita_Amigurumi.jpg",p:"https://commons.wikimedia.org/wiki/File:Conejita_Amigurumi.jpg",t:"Conejita Amigurumi",a:"Creativa Atelier",l:"CC BY-SA 4.0",fid:"proche"},
{m:"ami_grand",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Amigurumi-bear.jpg/960px-Amigurumi-bear.jpg",p:"https://commons.wikimedia.org/wiki/File:Amigurumi-bear.jpg",t:"Amigurumi bear",a:"Thesunandtheturtle",l:"CC BY-SA 4.0",fid:"generique"},
{m:"ami_poulpe",u:"https://upload.wikimedia.org/wikipedia/commons/5/52/O%C5%9Bmiorniczka_dla_wcze%C5%9Bniak%C3%B3w.jpg",p:"https://commons.wikimedia.org/wiki/File:O%C5%9Bmiorniczka_dla_wcze%C5%9Bniak%C3%B3w.jpg",t:"Pieuvre au crochet",a:"Valki77",l:"CC BY-SA 4.0",fid:"exacte"},
{m:"pcle",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Szyde%C5%82kowy_brelok.jpg/960px-Szyde%C5%82kowy_brelok.jpg",p:"https://commons.wikimedia.org/wiki/File:Szyde%C5%82kowy_brelok.jpg",t:"Porte-clés au crochet",a:"Valki77",l:"CC BY-SA 4.0",fid:"exacte"},
{m:"perso_pcleprenom",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Szyde%C5%82kowy_brelok_granny_sguare.jpg/960px-Szyde%C5%82kowy_brelok_granny_sguare.jpg",p:"https://commons.wikimedia.org/wiki/File:Szyde%C5%82kowy_brelok_granny_sguare.jpg",t:"Porte-clés granny square",a:"Valki77",l:"CC BY-SA 4.0",fid:"proche"},
{m:"bonnet_bebe",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Bonnet%2C_baby%27s_%28two%29_%28AM_1970.236-7%29.jpg/960px-Bonnet%2C_baby%27s_%28two%29_%28AM_1970.236-7%29.jpg",p:"https://commons.wikimedia.org/wiki/File:Bonnet,_baby's_(two)_(AM_1970.236-7).jpg",t:"Bonnet de bébé au crochet",a:"Auckland Museum",l:"CC BY 4.0",fid:"proche"},
{m:"couverture",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Baby_blanket_from_flower_loom_motifs_shows_detail_of_flowers.jpg/960px-Baby_blanket_from_flower_loom_motifs_shows_detail_of_flowers.jpg",p:"https://commons.wikimedia.org/wiki/File:Baby_blanket_from_flower_loom_motifs_shows_detail_of_flowers.jpg",t:"Couverture de bébé à motifs fleurs",a:"Teachalakazi",l:"CC BY-SA 3.0",fid:"proche"},
{m:"bebe_granny",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Blanket_of_natural_dyed_yarn.jpg/960px-Blanket_of_natural_dyed_yarn.jpg",p:"https://commons.wikimedia.org/wiki/File:Blanket_of_natural_dyed_yarn.jpg",t:"Plaid en laine teinte naturellement",a:"HRoued",l:"CC BY-SA 2.0",fid:"proche"},
{m:"snood",u:"https://upload.wikimedia.org/wikipedia/commons/c/c7/Mohair_infinity_scarf_blue_turquoise.jpg",p:"https://commons.wikimedia.org/wiki/File:Mohair_infinity_scarf_blue_turquoise.jpg",t:"Snood en mohair",a:"smittenkittenorig",l:"CC BY 2.0",fid:"exacte"},
{m:"mode_chale",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Crochet_scarf_in_two_shades_of_blue.jpg/960px-Crochet_scarf_in_two_shades_of_blue.jpg",p:"https://commons.wikimedia.org/wiki/File:Crochet_scarf_in_two_shades_of_blue.jpg",t:"Écharpe au crochet, deux bleus",a:"999real",l:"CC0",fid:"proche"},
{m:"bandeau",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Head_band.jpg/960px-Head_band.jpg",p:"https://commons.wikimedia.org/wiki/File:Head_band.jpg",t:"Bandeau au crochet",a:"Brindhashanmugam312",l:"CC BY-SA 4.0",fid:"exacte"},
{m:"sac",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Silling_bag.jpg/960px-Silling_bag.jpg",p:"https://commons.wikimedia.org/wiki/File:Silling_bag.jpg",t:"Sac au crochet",a:"Brindhashanmugam312",l:"CC BY-SA 4.0",fid:"proche"},
{m:"panier",u:"https://upload.wikimedia.org/wikipedia/commons/d/db/Plarn_basket.jpg",p:"https://commons.wikimedia.org/wiki/File:Plarn_basket.jpg",t:"Panier au crochet",a:"Catsimmons",l:"CC BY-SA 3.0",fid:"exacte"},
{m:"corbeille",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Granny_square_basket.jpg/960px-Granny_square_basket.jpg",p:"https://commons.wikimedia.org/wiki/File:Granny_square_basket.jpg",t:"Corbeille en granny squares",a:"Valki77",l:"CC BY-SA 4.0",fid:"proche"},
{m:"dessous",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Crochet_doily.JPG/960px-Crochet_doily.JPG",p:"https://commons.wikimedia.org/wiki/File:Crochet_doily.JPG",t:"Napperon au crochet",a:"רחל1",l:"CC BY-SA 4.0",fid:"proche"},
{m:"maison_setdetable",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Crochet_doilies_1925-1940_Germany.jpg/960px-Crochet_doilies_1925-1940_Germany.jpg",p:"https://commons.wikimedia.org/wiki/File:Crochet_doilies_1925-1940_Germany.jpg",t:"Napperons au crochet, 1925-1940",a:"Vitavia",l:"CC BY-SA 4.0",fid:"proche"},
{m:"fleur",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Rafflesia_flower_crochet.jpg/960px-Rafflesia_flower_crochet.jpg",p:"https://commons.wikimedia.org/wiki/File:Rafflesia_flower_crochet.jpg",t:"Fleur au crochet",a:"Enziee",l:"CC BY-SA 4.0",fid:"proche"},
{m:"cactus",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Amigurumi_Cactus.jpg/960px-Amigurumi_Cactus.jpg",p:"https://commons.wikimedia.org/wiki/File:Amigurumi_Cactus.jpg",t:"Cactus amigurumi",a:"Lskbrown",l:"CC BY 3.0",fid:"exacte"},
{m:"veg_tournesol",u:"https://upload.wikimedia.org/wikipedia/commons/d/dc/Kwadrat_babuni_1.jpg",p:"https://commons.wikimedia.org/wiki/File:Kwadrat_babuni_1.jpg",t:"Granny square tournesol",a:"Valki77",l:"CC BY-SA 4.0",fid:"proche"},
{m:"noel",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Crochet_Xmas_ornaments.jpg/960px-Crochet_Xmas_ornaments.jpg",p:"https://commons.wikimedia.org/wiki/File:Crochet_Xmas_ornaments.jpg",t:"Décorations de Noël au crochet",a:"Saintfevrier",l:"CC BY-SA 4.0",fid:"exacte"},
{m:"couronne",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Szyde%C5%82kowane_bombki.jpg/960px-Szyde%C5%82kowane_bombki.jpg",p:"https://commons.wikimedia.org/wiki/File:Szyde%C5%82kowane_bombki.jpg",t:"Boules de Noël au crochet",a:"Valki77",l:"CC BY-SA 4.0",fid:"generique"},
{m:"fete_flocon",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Szyde%C5%82kowa_%C5%9Bnie%C5%BCynka_1.jpg/960px-Szyde%C5%82kowa_%C5%9Bnie%C5%BCynka_1.jpg",p:"https://commons.wikimedia.org/wiki/File:Szyde%C5%82kowa_%C5%9Bnie%C5%BCynka_1.jpg",t:"Flocon au crochet",a:"Valki77",l:"CC BY-SA 4.0",fid:"exacte"},
{m:"fete_citrouille",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Pumpkin_Granny_Square_Progress_Photo.jpg/960px-Pumpkin_Granny_Square_Progress_Photo.jpg",p:"https://commons.wikimedia.org/wiki/File:Pumpkin_Granny_Square_Progress_Photo.jpg",t:"Citrouille en granny square",a:"Savvy227",l:"CC BY 4.0",fid:"proche"},
{m:"coeur",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Two_white_potholders_with_hearts.jpg/960px-Two_white_potholders_with_hearts.jpg",p:"https://commons.wikimedia.org/wiki/File:Two_white_potholders_with_hearts.jpg",t:"Ouvrages au crochet à motif cœur",a:"Elin B",l:"CC BY 2.0",fid:"generique"},
{m:"paques",u:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/0679_Beskidische_Ostereier.JPG/960px-0679_Beskidische_Ostereier.JPG",p:"https://commons.wikimedia.org/wiki/File:0679_Beskidische_Ostereier.JPG",t:"Œufs de Pâques habillés au crochet",a:"Silar",l:"CC BY-SA 3.0",fid:"exacte"}
];
function illustration(id){
  for (var i=0;i<ILLUSTRATIONS.length;i++) if (ILLUSTRATIONS[i].m === id) return ILLUSTRATIONS[i];
  return null;
}
var FID_TXT = {
  exacte:    "C'est bien ce type d'ouvrage",
  proche:    "Ouvrage très proche, pas identique",
  generique: "Donne seulement une idée du genre"
};
/* La carte d'illustration porte toujours son avertissement et son crédit :
   la photo montre le travail d'une autre personne, et le patron de la fiche
   ne produira pas exactement cette pièce-là. */
function carteIllustration(id){
  var ill = illustration(id); if (!ill) return null;
  return el('<div class="card" style="margin-bottom:18px;overflow:hidden">'+
    '<img src="'+esc(ill.u)+'" alt="Photo d\'illustration : '+esc(ill.t)+'" '+
      'style="width:100%;max-height:340px;object-fit:cover;display:block;background:var(--surface-2)" '+
      'loading="lazy" referrerpolicy="no-referrer" '+
      'onerror="this.closest(\'.card\').hidden=true">'+
    '<div class="body">'+
      '<p class="dessinlab" style="margin:0"><b>Photo d\'illustration : ce n\'est pas l\'ouvrage de cette fiche.</b> '+
      esc(FID_TXT[ill.fid] || "")+'. Elle est là pour te montrer de quoi il s\'agit ; '+
      'le patron ci-dessous ne donne pas exactement cette pièce.</p>'+
      '<p class="hint" style="margin-top:8px">'+esc(ill.t)+' — photo de '+esc(ill.a)+', '+
      esc(ill.l)+', via <a href="'+esc(ill.p)+'" target="_blank" rel="noopener">Wikimedia Commons</a>.</p>'+
    '</div></div>');
}

var EPOQUE = [
{
  id:"dp_echarpe_beret",
  nom:"Écharpe et béret assortis",
  fam:"mode", objet:"Cou et tête", difficulte:1,
  photo:"https://www.gutenberg.org/files/62882/62882-h/images/p04.jpg",
  source:{livre:"Knitted and Crocheted Boutique", editeur:"American Thread Company",
          annee:"vers 1970", pg:62882, plate:"planche p. 8"},
  crochet:"6 mm (taille J américaine)",
  fil:"Fil worsted / aran, environ 230 g — 2 écheveaux de 113 g",
  echantillon:"7 mailles pour 5 cm",
  fini:"Écharpe d'environ 120 cm · Béret taille adulte",
  notes:"Le point est un aller-retour très simple : une maille serrée, une bride, "+
        "alternées. Ce qui fait tout le rendu, c'est de toujours piquer la ms dans le "+
        "brin avant de la bride du rang précédent, et la bride dans le brin arrière de "+
        "la ms. C'est ce décalage qui crée le relief moelleux de la photo.",
  etapes:[
    {titre:"L'écharpe", rangs:[
      "17 ml. R1 — 1 ms dans la 2e ml, puis 1 br dans la ml suivante, 1 ms dans la suivante, "+
      "en alternant jusqu'au bout ; terminer par 1 br dans la dernière ml. 1 ml pour tourner, à chaque rang.",
      "R2 — 1 ms dans le brin AVANT de chaque bride, 1 br dans le brin ARRIÈRE de chaque ms. "+
      "C'est le rang de base, à répéter.",
      "Répéter R2 sur 23 cm.",
      "Deux rangs de diminution : sauter la première bride, 1 br dans la ms suivante, finir le rang normalement.",
      "Continuer droit sur 25 cm.",
      "Deux rangs de diminution identiques. Poser un marqueur.",
      "Continuer droit sur 33 cm depuis le marqueur.",
      "Deux rangs d'augmentation : 2 mailles dans la dernière maille de chaque rang.",
      "Continuer jusqu'à 120 cm de long en tout. Ne pas couper le fil."]},
    {titre:"La bordure de l'écharpe", rangs:[
      "Tout autour : 5 ml, 1 ms dans la maille suivante, répéter jusqu'à l'angle.",
      "Sur les côtés longs, faire une arceau de 5 ml par rang.",
      "Fermer par 1 mc et couper."]},
    {titre:"Le béret", rangs:[
      "79 ml fermées en rond, sans vriller la chaînette.",
      "Travailler 9 tours au même point que l'écharpe, en tournant à chaque tour.",
      "T10 — diminuer 2 mailles à 5 endroits répartis dans le tour (une diminution = sauter 1 br et 1 ms).",
      "T11 — un tour droit.",
      "Répéter ces deux tours une fois.",
      "T14 — sauter toutes les 3e ms et 3e br du tour.",
      "Deux tours droits.",
      "Tour suivant — sauter 2 mailles sur 2 tout autour. Couper en laissant 30 cm, "+
      "passer le fil dans les mailles restantes et serrer."]},
    {titre:"Le bandeau du béret", rangs:[
      "Reprendre le fil sur l'envers du premier rang : 1 ms, puis (1 ml, 1 ms dans la ms suivante) tout autour.",
      "Deuxième tour : resserrer en sautant régulièrement, pour que le bandeau tienne sur la tête sans élastique."]}
  ],
  astuces:["La photo montre un rose pâle ; le point rend mieux sur une couleur unie que sur un fil chiné.",
           "Si le béret baille, refais le bandeau avec un crochet d'une demi-taille plus petit."]
},
{
  id:"dp_etole_coquille",
  nom:"Étole au point de coquille",
  fam:"mode", objet:"Cou", difficulte:1,
  photo:"https://www.gutenberg.org/files/62882/62882-h/images/p10a.jpg",
  source:{livre:"Knitted and Crocheted Boutique", editeur:"American Thread Company",
          annee:"vers 1970", pg:62882, plate:"planche p. 20"},
  crochet:"6 mm (taille J américaine)",
  fil:"Fil sport / DK : environ 170 g beige, 57 g corail, 57 g doré",
  echantillon:"7 coquilles pour 12,5 cm",
  fini:"Environ 45 × 180 cm, franges comprises",
  notes:"Une seule ligne de patron, répétée. Toute la pièce tient dans un geste : "+
        "1 ms et 2 br dans la même maille, c'est la coquille. La difficulté n'est pas "+
        "technique, elle est de compter la chaînette de départ sans se tromper.",
  etapes:[
    {titre:"Le corps", rangs:[
      "En corail : 251 ml.",
      "R1 — 1 ms dans la 2e ml, 2 br dans la même maille. Puis : sauter 2 ml, "+
      "(1 ms + 2 br) dans la ml suivante. Répéter tout le long. Terminer par 1 ms dans la dernière ml. 1 ml, tourner.",
      "R2 — (1 ms + 2 br) dans la ms de chaque coquille du rang précédent. Terminer par 1 ms dans la dernière ms. 1 ml, tourner.",
      "Répéter R2 : c'est le seul rang du patron.",
      "Rayures : 2 rangs doré, 2 rangs corail, puis 17 rangs beige. Couper.",
      "Reprendre le corail de l'autre côté de la chaînette de départ et faire un rang de coquilles, "+
      "piqué dans les mêmes mailles que le premier rang. La pièce est alors symétrique."]},
    {titre:"Les franges", rangs:[
      "Enrouler le fil autour d'un carton de 18 cm, couper un côté.",
      "Plier chaque brin en deux et le nouer un rang sur deux, sur les deux petits côtés.",
      "Faire correspondre la couleur de la frange à celle de la rayure qu'elle prolonge."]}
  ],
  astuces:["251 ml, c'est long : place un marqueur toutes les 50 mailles en montant la chaînette.",
           "Le modèle d'origine est en trois couleurs, mais l'étole tient aussi très bien en uni."]
},
{
  id:"dp_ceinture_pompons",
  nom:"Ceinture à pompons",
  fam:"mode", objet:"Taille", difficulte:1,
  photo:"https://www.gutenberg.org/files/62882/62882-h/images/p09.jpg",
  source:{livre:"Knitted and Crocheted Boutique", editeur:"American Thread Company",
          annee:"vers 1970", pg:62882, plate:"planche p. 18"},
  crochet:"5 mm (taille H américaine)",
  fil:"Fil worsted / aran, 1 écheveau de 113 g",
  echantillon:"2 carrés de filet pour 2,5 cm · 2 rangs pour 2,5 cm",
  fini:"Taille unique, du 38 au 44 · 27 pompons",
  notes:"Un filet de brides séparées par une maille en l'air, et des pompons noués "+
        "dedans. C'est le modèle le plus rapide du fonds : une soirée suffit.",
  etapes:[
    {titre:"Le filet", rangs:[
      "106 ml. R1 — 1 br dans la 4e ml, puis (1 ml, sauter 1 ml, 1 br dans la ml suivante) tout le long. 4 ml, tourner.",
      "R2 — 1 br dans la première br, puis (1 ml, 1 br dans la br suivante) tout le rang. "+
      "Terminer par 1 ml, 1 br dans la 3e ml du tournage, 1 ml, 1 br dans la même maille. 4 ml, tourner.",
      "R3 et R4 — comme R2.",
      "R5 — comme R2 mais terminer par 1 br dans la 3e ml du tournage. 2 ml, tourner.",
      "R6 — sauter les 2 premières brides, 1 br dans la br suivante, puis (1 ml, 1 br dans la br suivante) "+
      "jusqu'aux deux dernières mailles, 1 br dans la br suivante. Tourner.",
      "R7 et R8 — comme R6. Couper."]},
    {titre:"Les 27 pompons", rangs:[
      "Couper 6 brins de 30 cm par pompon.",
      "Plier en deux, nouer dans un carré du 3e rang depuis le bas, et passer les extrémités "+
      "dans la boucle du premier rang.",
      "Sauter un carré, placer le pompon suivant. Travailler du centre vers les côtés pour rester symétrique.",
      "Égaliser les pompons à 11 cm."]},
    {titre:"Les liens", rangs:[
      "Couper un brin de 15 m, le plier en deux quatre fois de suite, et passer une extrémité "+
      "dans le rang du milieu, au bout de la ceinture.",
      "Nouer quatre fois à intervalles réguliers, en laissant une frange courte au bout.",
      "Faire le second lien de l'autre côté, à l'identique."]}
  ],
  astuces:["Compte les carrés, pas les mailles : c'est la seule façon de placer les 27 pompons régulièrement.",
           "Sur une taille plus large, ajoute des carrés par multiples de 2 et un pompon tous les deux carrés."]
},
{
  id:"dp_bas_resille",
  nom:"Bas et chaussettes au point résille",
  fam:"mode", objet:"Jambes", difficulte:3,
  photo:"https://www.gutenberg.org/files/62882/62882-h/images/p03.jpg",
  source:{livre:"Knitted and Crocheted Boutique", editeur:"American Thread Company",
          annee:"vers 1970", pg:62882, plate:"planche p. 12"},
  crochet:"5 mm (taille H américaine)",
  fil:"Fil worsted / aran : 340 g pour les bas longs, 226 g pour les mi-bas",
  echantillon:"2 carrés de filet pour 2,5 cm · 2 rangs pour 2,5 cm",
  fini:"Deux tailles : 36–38 et 39–41",
  notes:"On commence par la pointe du pied et on remonte. Le talon se forme en "+
        "laissant des mailles en attente, puis en les reprenant : c'est la seule "+
        "partie délicate du modèle. Les indications entre parenthèses sont pour la grande taille.",
  etapes:[
    {titre:"La pointe", rangs:[
      "4 ml fermées en rond. 4 ml, 1 br dans le rond, puis (1 ml, 1 br dans le rond) × 7, 1 ml, "+
      "fermer dans la 3e ml. 4 ml pour tourner — à chaque tour.",
      "T2 — 1 br dans la maille de jonction, puis (1 ml, 1 br dans la br suivante, 1 ml, 1 br dans la br suivante, "+
      "1 ml, 1 br dans la MÊME br) tout le tour. Fermer. (15 br)",
      "T3 — (1 ml, 1 br dans la br suivante) tout le tour.",
      "T4 — augmenter comme au T2, une fois toutes les 3 brides. (20 br)"]},
    {titre:"Le pied", rangs:[
      "T5 à T8 (T5 à T10 en grande taille) — tours droits, sans augmentation.",
      "T9 (T11) — 1 br dans la br suivante, puis (1 ml, 1 br dans la br suivante) × 13, "+
      "4 ml, tourner. Cinq brides restent libres : c'est le cou-de-pied.",
      "T10 à T16 (T12 à T18) — travailler à plat sur 15 brides : c'est le dessous du talon."]},
    {titre:"Le talon", rangs:[
      "T17 et T18 (T19 et T20) — continuer en filet en crochetant ensemble les 3 brides centrales, "+
      "puis plier le talon en deux et fermer par 1 mc dans la 3e ml.",
      "T19 (T21) — reprendre tout le tour de la jambe : 1 br dans chaque rang du talon (8 ou 10 fois), "+
      "puis 1 br dans chaque bride du cou-de-pied, et finir le second côté à l'identique. "+
      "26 (30) carrés de filet."]},
    {titre:"La jambe", rangs:[
      "Continuer en filet, tours droits, jusqu'à la hauteur voulue : 40 cm pour un mi-bas, 65 cm pour un bas.",
      "Terminer par 2 tours de ms serrées.",
      "Pour que le bas tienne : passer un cordon élastique dans le dernier tour, ou faire les 5 derniers "+
      "tours avec un crochet d'une demi-taille plus petit."]}
  ],
  astuces:["Fais les deux bas l'un après l'autre : la tension change d'un jour à l'autre et la paire se voit.",
           "Le filet s'étire beaucoup : ne tire pas pour mesurer, pose l'ouvrage à plat."]
},
{
  id:"dp_damier",
  nom:"Écharpe et bonnet en damier tissé",
  fam:"mode", objet:"Cou et tête", difficulte:2,
  photo:"https://www.gutenberg.org/files/62882/62882-h/images/p06.jpg",
  source:{livre:"Knitted and Crocheted Boutique", editeur:"American Thread Company",
          annee:"vers 1970", pg:62882, plate:"planche p. 15"},
  crochet:"6 mm (taille J américaine)",
  fil:"Fil worsted / aran : 226 g de noir et 226 g de blanc pour l'écharpe, "+
      "113 g de chaque pour le bonnet",
  echantillon:"7 mailles pour 5 cm",
  fini:"Écharpe d'environ 150 cm",
  notes:"Un simple filet de brides en rayures, puis on TISSE des brins de la couleur "+
        "opposée dans les trous, verticalement. C'est le tissage qui fait le damier : "+
        "le crochet seul ne donne que des rayures. Effet garanti pour un travail très simple.",
  etapes:[
    {titre:"Le filet", rangs:[
      "En noir : 31 ml. R1 — 1 br dans la 5e ml, puis (1 ml, sauter 1 ml, 1 br dans la ml suivante) "+
      "tout le long. 14 carrés.",
      "Rang suivant — 3 ml, tourner, puis (1 br dans la br suivante, 1 ml) tout le rang, "+
      "terminer par 1 br dans la 2e ml du tournage.",
      "Répéter ce rang en alternant 2 rangs blancs et 2 rangs noirs, sur 150 cm.",
      "Au changement de couleur, termine toujours la dernière moitié de la maille avec la couleur suivante : "+
      "le changement devient invisible."]},
    {titre:"Le tissage", rangs:[
      "Couper des brins de la longueur de l'écharpe plus 20 cm.",
      "Avec une grosse aiguille à laine, passer un brin verticalement dans une colonne de trous : "+
      "dessus, dessous, dessus, dessous.",
      "Colonne suivante : commencer par dessous, pour décaler d'un cran. C'est ce décalage qui fait le damier.",
      "Alterner les brins noirs et blancs d'une colonne à l'autre."]},
    {titre:"Le bonnet", rangs:[
      "Même filet, monté en rond sur 60 ml, sur 20 cm de haut.",
      "Tisser de la même façon, puis fermer le haut en crochetant les mailles deux par deux "+
      "sur deux tours, et serrer.",
      "Nouer les extrémités des brins tissés à l'intérieur, jamais à l'extérieur."]}
  ],
  astuces:["Tends les brins sans serrer : un tissage trop tendu fait gondoler l'écharpe.",
           "Deux couleurs franches valent mieux que deux tons proches — c'est le contraste qui fait le motif."]
},
{
  id:"dp_plaid_fleurs",
  nom:"Plaid Jardin fleuri, 266 motifs",
  fam:"maison", objet:"Textile", difficulte:2,
  photo:"https://www.gutenberg.org/files/66111/66111-h/images/p05g.jpg",
  source:{livre:"Afghans, Book No. 289", editeur:"The Spool Cotton Company",
          annee:"vers 1952", pg:66111, plate:"planche p. 14"},
  crochet:"5 mm",
  fil:"Fil worsted / aran : environ 960 g de gris perle, 280 g de jaune, "+
      "340 g de couleurs assorties",
  echantillon:"Chaque motif fait 8 cm de côté",
  fini:"Environ 152 × 112 cm — 19 motifs sur 14 rangées",
  notes:"C'est le modèle qui occupe un hiver, et celui qui vide un panier de restes : "+
        "chaque fleur peut être d'une couleur différente. Le motif est un granny rond "+
        "converti en carré au dernier tour. 266 motifs, c'est beaucoup — mais chacun "+
        "prend une quinzaine de minutes et se fait devant la télévision.",
  etapes:[
    {titre:"Le motif — à faire 266 fois", rangs:[
      "En jaune : 4 ml. T1 — 15 br dans la 4e ml depuis le crochet. Fermer par 1 mc en haut des 3 ml.",
      "T2 — changer de couleur. 3 ml, puis 2 br non terminées dans la même maille, "+
      "les fermer ensemble (c'est une bride groupée). Puis (3 ml, sauter 1 br, "+
      "bride groupée de 3 br dans la br suivante) tout le tour. Fermer en haut de la première groupée. Couper.",
      "T3 — en gris : 3 ml, 4 br dans le même espace, puis 5 br dans chaque espace du tour. Fermer.",
      "T4 — 5 ml, 1 br dans la même maille. Puis : (1 ml, sauter 1 br, 1 demi-br dans la br suivante, "+
      "[1 ml, sauter 1 br, 1 ms dans la br suivante] × 2, 1 ml, sauter 1 br, 1 demi-br dans la br suivante, "+
      "1 ml, sauter 1 br, et dans la br suivante : 1 br + 3 ml + 1 br). Répéter tout le tour. "+
      "Les quatre groupes (br, 3 ml, br) forment les quatre coins. Fermer et couper."]},
    {titre:"L'assemblage", rangs:[
      "Coudre les motifs sur l'envers, bord à bord, en 14 rangées de 19 motifs.",
      "Coudre d'abord les rangées entre elles, puis les rangées ensemble : c'est plus rapide "+
      "et plus régulier que de coudre motif par motif."]},
    {titre:"La bordure", rangs:[
      "T1 — en jaune, dans un angle : 3 ml, 4 br dans le même angle, puis des brides serrées "+
      "tout autour, avec 5 br dans chaque angle. Fermer, couper.",
      "T2 — en gris : 3 ml, 1 br dans chaque br, avec 5 br dans la bride centrale de chaque angle. "+
      "Fermer, couper.",
      "Bloquer aux mesures : c'est le blocage qui rend le plaid carré."]}
  ],
  astuces:["Fais tous les centres jaunes d'abord, puis tous les deuxièmes tours : "+
           "le travail à la chaîne va deux fois plus vite que motif par motif.",
           "Garde le gris pour la fin de chaque motif : c'est lui qui unifie l'ensemble, "+
           "quelles que soient les couleurs des fleurs."]
},
{
  id:"dp_etole_etoile",
  nom:"Étole au point d'étoile",
  fam:"mode", objet:"Cou", difficulte:2,
  photo:"https://www.gutenberg.org/files/67839/67839-h/images/021.jpg",
  source:{livre:"Stoles : Knitted, Crocheted, Hairpin Lace", editeur:"American Thread Company",
          annee:"vers 1955", pg:67839, plate:"modèle « Fantasy »"},
  crochet:"4,5 mm (taille G ou H américaine)",
  fil:"Fil fingering haute densité, 200 g",
  echantillon:"Le point d'étoile se mesure sur 10 cm une fois bloqué",
  fini:"46 × 152 cm, sans les franges",
  notes:"Le point d'étoile se fait en relevant cinq boucles d'affilée sur le crochet, "+
        "puis en les fermant toutes ensemble. La maille en l'air qui suit s'appelle l'œil "+
        "de l'étoile : c'est dans cet œil qu'on pique la boucle suivante. Un rang d'étoiles, "+
        "un rang de filet, en alternance. Rien de plus, et le rendu est spectaculaire.",
  etapes:[
    {titre:"Le rang de filet", rangs:[
      "256 ml, soit environ 155 cm.",
      "R1 — 1 br dans la 6e ml, puis (1 ml, sauter 1 ml, 1 br dans la ml suivante) tout le long. "+
      "126 carrés. 2 ml, tourner."]},
    {titre:"Le rang d'étoiles", rangs:[
      "R2 — relever une boucle dans la 2e maille, une dans la première bride, une dans l'espace "+
      "de 1 ml suivant, une dans la bride suivante : 5 boucles sur le crochet. "+
      "Jeté, tirer à travers les 5 boucles d'un coup. 1 ml : c'est l'œil de l'étoile.",
      "Étoile suivante — relever une boucle dans l'œil qu'on vient de faire, une dans la même "+
      "maille que la dernière fois, une dans l'espace de 1 ml suivant, une dans la bride suivante. "+
      "Fermer les 5 ensemble, 1 ml.",
      "Répéter jusqu'au bout du rang. Terminer la dernière étoile en piquant dans la 3e maille "+
      "de la chaînette de tournage. 4 ml, tourner."]},
    {titre:"Alterner", rangs:[
      "R3 — 1 br dans l'œil de chaque étoile, séparées par 1 ml. Terminer par 1 br dans la "+
      "chaînette de tournage. 2 ml, tourner.",
      "Répéter R2 et R3 jusqu'à 46 cm de hauteur, en finissant par un rang de filet. Couper."]},
    {titre:"Les franges", rangs:[
      "Enrouler le fil autour d'un carton de 8 cm, couper un côté.",
      "Prendre 4 brins à la fois, plier en deux, et nouer dans chaque rang des deux petits côtés."]}
  ],
  astuces:["Si les étoiles se referment mal, c'est que l'œil est trop serré : fais la maille en l'air un peu lâche.",
           "Le bloquage change tout sur ce point : épingle l'étole à plat et humidifie-la avant de sécher."]
},
{
  id:"dp_etole_popcorn",
  nom:"Étole aux coquilles et popcorns",
  fam:"mode", objet:"Cou", difficulte:3,
  photo:"https://www.gutenberg.org/files/67839/67839-h/images/017.jpg",
  source:{livre:"Stoles : Knitted, Crocheted, Hairpin Lace", editeur:"American Thread Company",
          annee:"vers 1955", pg:67839, plate:"modèle « Concerto »"},
  crochet:"3,5 mm (taille E américaine)",
  fil:"Fil layette ou fil à chaussettes, 370 g",
  echantillon:"3 popcorns pour 2,5 cm",
  fini:"46 × 167 cm, sans les franges",
  notes:"Deux reliefs alternés : la coquille (3 brides séparées par 1 ml dans la même maille) "+
        "et le popcorn (6 brides dans la même maille, puis on lâche la boucle et on la reprend "+
        "par la première bride pour faire bomber le groupe). C'est le modèle le plus travaillé "+
        "du fonds — et celui qui se vend le plus cher, parce que ça se voit.",
  etapes:[
    {titre:"La base", rangs:[
      "113 ml. R1 — 1 br dans la 8e ml, puis (2 ml, sauter 2 ml, 1 br dans la ml suivante) "+
      "tout le rang. 16 carrés. 4 ml, tourner."]},
    {titre:"Le rang de motifs", rangs:[
      "R2 — 1 br dans la bride suivante, puis 1 ml, 1 br, 1 ml, 1 br dans le même espace, "+
      "1 ml, 1 br dans la bride suivante.",
      "Puis : (1 ml, une coquille dans la bride suivante — une coquille = 3 br séparées par "+
      "1 ml, toutes dans la même maille — 1 ml, 1 br dans la bride suivante) × 2.",
      "Puis : 1 ml, un popcorn dans la bride suivante. Le popcorn : 6 br dans la même maille, "+
      "retirer le crochet de la boucle, le repiquer dans la première des 6 brides, "+
      "reprendre la boucle et la tirer à travers. 2 ml, un popcorn dans la bride suivante, "+
      "2 ml, un popcorn dans la bride suivante, 1 ml, 1 br dans la bride suivante.",
      "Puis trois coquilles séparées par 1 br, et on recommence la séquence trois fois de plus.",
      "Terminer par 1 ml, sauter 1 maille de la chaînette, 1 br dans la suivante. 4 ml, tourner."]},
    {titre:"Le rang de retour", rangs:[
      "R3 — 1 br dans la bride centrale de chaque coquille, 1 ml, sauter la dernière bride "+
      "de la coquille, une nouvelle coquille dans la bride suivante, 1 ml. Répéter deux fois.",
      "Sur les popcorns : 1 br dans le popcorn, (2 ml, 1 br dans le popcorn suivant) × 2, 1 ml.",
      "Répéter R2 et R3 jusqu'à 46 cm de hauteur."]},
    {titre:"Finir", rangs:[
      "Un tour de ms tout autour pour raidir les bords.",
      "Franges de 20 cm, 4 brins pliés en deux, nouées un rang sur deux sur les petits côtés."]}
  ],
  astuces:["Fais ton popcorn toujours dans le même sens : sur l'endroit, ils doivent tous bomber du même côté.",
           "Compte tes coquilles à chaque rang. Un rang faux se voit à trois mètres sur ce modèle."]
},
{
  id:"dp_etole_festons",
  nom:"Étole en bandes festonnées",
  fam:"mode", objet:"Cou", difficulte:3,
  photo:"https://www.gutenberg.org/files/67839/67839-h/images/025.jpg",
  source:{livre:"Stoles : Knitted, Crocheted, Hairpin Lace", editeur:"American Thread Company",
          annee:"vers 1955", pg:67839, plate:"modèle « Lyric »"},
  crochet:"3 mm (crochet acier n° 0)",
  fil:"Fil layette ou pompadour, 340 g",
  echantillon:"Chaque bande fait 6,5 cm de large",
  fini:"48 × 162 cm, sans les franges",
  notes:"L'étole est faite de bandes séparées, assemblées à la fin. C'est un avantage énorme : "+
        "une bande se transporte, se fait dans le train, et si une rate, on la refait sans "+
        "toucher au reste. Chaque bande porte 32 festons.",
  etapes:[
    {titre:"Le départ d'une bande", rangs:[
      "10 ml fermées en rond. 3 ml, 17 br dans le rond, fermer, tourner.",
      "R2 — 4 ml, 1 br dans la br suivante, puis (1 ml, 1 br dans la br suivante) × 8, "+
      "5 ml, 1 br dans le même espace. 1 ml, tourner."]},
    {titre:"Le feston", rangs:[
      "R3 — 1 ms, 5 ml, 4 ms dans la grande boucle. Puis (1 ms, 4 ml, 1 ms dans l'espace de "+
      "1 ml suivant, 2 ms dans l'espace suivant) × 2. Puis 1 ms, 4 ml, 1 ms dans l'espace suivant, "+
      "1 ms dans l'espace suivant.",
      "7 ml, tourner. Sauter 2 ms, l'arceau de 4 ml et 2 ms, 1 mc dans la ms suivante. "+
      "3 ml, tourner. 8 br sur l'arceau, 3 ml, 1 mc dans le même arceau.",
      "1 ms dans l'espace déjà travaillé, 4 ml, 1 ms dans l'espace suivant, 2 ms dans le suivant. "+
      "5 ml, tourner.",
      "R4 — sauter 3 ms, l'arceau de 4 ml et 2 ms, 1 br dans l'arceau de 3 ml, puis "+
      "(1 ml, 1 br dans la maille suivante) × 9, 5 ml, sauter 1 ms, l'arceau de 4 ml et 2 ms, "+
      "1 mc dans la ms suivante. 1 ml, tourner.",
      "Répéter R3 et R4 jusqu'à 32 festons."]},
    {titre:"Assembler", rangs:[
      "Faire 7 bandes de 32 festons.",
      "Les coudre côte à côte sur l'envers, feston contre feston, en alignant bien les hauteurs.",
      "Bloquer l'ensemble à plat avant de poser les franges : c'est le blocage qui aligne les festons."]},
    {titre:"Les franges", rangs:[
      "Franges de 18 cm, 4 brins pliés en deux, à chaque feston des deux extrémités."]}
  ],
  astuces:["Fais la première bande en entier avant de lancer les six autres : tu ajusteras ta tension dessus.",
           "Numérote tes bandes au fur et à mesure : elles ne sont jamais parfaitement identiques, "+
           "et les coudre dans l'ordre de fabrication donne un dégradé régulier."]
}
];
function epoque(id){
  for (var i=0;i<EPOQUE.length;i++) if (EPOQUE[i].id === id) return EPOQUE[i];
  return null;
}


/* ═════ 38. MES PATRONS ═════
   Une bibliothèque personnelle. L'application ne fournit pas ces patrons et
   ne les rediffuse jamais : ils restent dans le navigateur de l'artisane,
   comme ses photos. Elle les a achetés ou reçus, ils sont à elle, et l'outil
   se contente de les rendre utilisables pendant qu'elle crochète. */

/* ═════ COMMANDES CLIENTES ═════
   Ce module répond à une défaillance documentée du métier : la commande
   personnalisée acceptée sur un message, fabriquée, et jamais payée. Trois
   principes le structurent.

   1. UNE COMMANDE EST UN ACCORD DATÉ, pas une note. Ce qui a été convenu —
      la pièce, les variantes, le prix, la date promise — est figé à une date,
      pour qu'il reste quelque chose à opposer en cas de désaccord.

   2. ARRHES OU ACOMPTE, JAMAIS « un petit versement ». Les deux mots ont des
      effets opposés en droit français (articles L214-1 et suivants du code de
      la consommation) : avec des ARRHES, la cliente peut se dédire en les
      perdant, mais si c'est l'artisane qui renonce, elle doit rendre LE
      DOUBLE. Avec un ACOMPTE, la vente est ferme des deux côtés. Et à défaut
      de précision, la loi considère que ce sont des arrhes — c'est-à-dire
      l'option la plus risquée pour l'artisane, par défaut. L'outil force donc
      le choix, et l'écrit sur la facture.

   3. LA CHARGE SE COMPTE EN HEURES, pas en nombre de commandes. « J'ai
      14 commandes » ne veut rien dire ; « il me reste 96 h de travail pour
      31 jours » se décide. C'est la seule chose que Crochompte peut calculer
      et que personne d'autre ne peut, parce que lui seul mesure le temps réel.
   ═════════════════════════════════════════════════════════════════════════ */

var STATUTS_CMD = [
  {id:"devis",    nom:"Devis envoyé",   aide:"proposée, pas encore acceptée"},
  {id:"acceptee", nom:"À fabriquer",    aide:"accord donné, fabrication à lancer"},
  {id:"encours",  nom:"En fabrication", aide:"le travail a commencé"},
  {id:"terminee", nom:"Prête",          aide:"terminée, pas encore remise"},
  {id:"livree",   nom:"Livrée",         aide:"remise ou envoyée"},
  {id:"annulee",  nom:"Annulée",        aide:""}
];
function statutCmd(id){
  for (var i=0;i<STATUTS_CMD.length;i++) if (STATUTS_CMD[i].id === id) return STATUTS_CMD[i];
  return STATUTS_CMD[0];
}
/* L'ÉTAPE d'une commande, en un seul mot, et ce qu'il reste à faire.
   Une commande passe par : devis → à fabriquer → en fabrication → prête →
   livrée → facturée → soldée. Le statut, la facture et l'argent reçu étaient
   trois informations séparées : la cliente, elle, veut savoir « où j'en suis
   et quoi faire maintenant ». */
function etapeCommande(c){
  var j = joursRestants(c);
  var retard = j !== null && j < 0;
  var livrer = j === null ? "Fixer une date de livraison"
             : retard ? "Livraison en retard de " + pluriel(Math.abs(j), "jour")
             : j === 0 ? "À livrer aujourd'hui" : j === 1 ? "À livrer demain" : "À livrer dans " + j + " jours";
  var sd = soldeDu(c);
  switch (c.statut){
    case "annulee":  return {rang:9, k:"annulee", nom:"Annulée", action:"", urgent:false, fini:true};
    case "devis":    return {rang:0, k:"devis", nom:"Devis", action: j !== null && j < 0 ? "À relancer : pas de réponse" : "Attendre l'accord", urgent:false, relancer: j !== null && j < 0};
    case "acceptee": return {rang:1, k:"acceptee", nom:"À fabriquer", action:livrer, urgent:retard};
    case "encours":  return {rang:2, k:"encours", nom:"En fabrication", action:livrer, urgent:retard};
    case "terminee": return {rang:3, k:"terminee", nom:"Prête", action:"À remettre ou à envoyer", urgent:retard};
    case "livree":
      if (!c.factureNum) return {rang:4, k:"afacturer", nom:"À facturer", action:"Émettre la facture", urgent:true};
      if (sd > 0.004)    return {rang:5, k:"aencaisser", nom:"Paiement à recevoir", action:"Réclamer " + eur(sd), urgent:true};
      return {rang:6, k:"soldee", nom:"Payée en entier", action:"", urgent:false, fini:true};
  }
  return {rang:0, k:"devis", nom:statutCmd(c.statut).nom, action:"", urgent:false};
}
function commandes(){ if (!state.commandes) state.commandes = []; return state.commandes; }
function commande(id){
  var l = commandes();
  for (var i=0;i<l.length;i++) if (l[i].id === id) return l[i];
  return null;
}
function nouvelleCommande(){
  var c = {
    id:"cmd_"+uid(), num:numeroCommandeSuivant(), qte:1, articles:[], refClient:"",
    client:{nom:"", contact:"", note:""},
    cid:null, libelle:"", variantes:"", personnalisee:false, clientePro:false,
    prixConvenu:0, fraisLivraison:0,
    versement:{montant:0, date:null, type:"acompte"},
    paiements:[],
    dateCommande:new Date().toISOString(), datePromise:"",
    statut:"devis", canal:"direct", note:"",
    accordLe:null, heuresEstimees:0, pieceId:null,
    factureNum:null, factureLe:null, brouillon:true
  };
  commandes().unshift(c); sauverTout();
  return c;
}
/* Une nouvelle commande en quatre questions : qui, quoi, combien, pour
   quand. Le reste (adresse, facture, versement) attend dans la fiche. */
function dialogueNouvelleCommande(){
  var actives = creationsActives();
  var box = el('<div><div class="grid2">'+
    '<label class="f"><span>Quoi</span><select id="nc-cid"><option value="">— pièce libre —</option>'+actives.map(function(c){ return '<option value="'+esc(c.id)+'">'+esc(c.nom)+'</option>'; }).join("")+'</select></label>'+
    '<label class="f"><span>Combien de pièces</span><input id="nc-qte" type="number" min="1" step="1" inputmode="numeric" value="1"></label>'+
    '<label class="f"><span>Prix convenu, une pièce (€)</span><input id="nc-prix" type="number" min="0" step="0.5" inputmode="decimal"></label>'+
    '<label class="f"><span>Pour quand</span><input id="nc-date" type="date"></label></div>'+
    '<label style="display:flex;gap:10px;align-items:center;margin-top:12px;cursor:pointer"><input type="checkbox" id="nc-ok" checked style="width:18px;height:18px"> <span>C\'est déjà accepté (sinon, c\'est un devis à confirmer)</span></label></div>');
  var sel = box.querySelector("#nc-cid"), inPrix = box.querySelector("#nc-prix");
  if (actives.length){ sel.value = actives[0].id; inPrix.value = Number(actives[0].prix) || ""; }
  sel.addEventListener("change", function(){ var c = creation(sel.value); if (c) inPrix.value = Number(c.prix) || ""; });
  dialogueChamps({titre:"Nouvelle commande", texte:"Quatre questions. Tu compléteras le reste dans la fiche si besoin.",
    champs:[{id:"nom", lib:"Commandé par", requis:true, max:80, placeholder:"Prénom, pseudo, boutique…"}],
    contenu: box, bouton:"Créer la commande",
    verifier:function(v){ if (inPrix.value === "" || !(Number(lireNombre(inPrix.value)) >= 0)) return "Indique le prix convenu."; return ""; }
  }, function(v){
    var c = nouvelleCommande();
    c.client = {nom:v.nom, contact:"", note:""};
    c.cid = sel.value || null;
    var cr = c.cid ? creation(c.cid) : null;
    c.qte = Math.max(1, Math.round(Number(box.querySelector("#nc-qte").value) || 1));
    c.prixConvenu = Number(lireNombre(inPrix.value)) || 0;
    c.datePromise = box.querySelector("#nc-date").value || "";
    if (cr) c.canal = cr.canal || c.canal;
    if (box.querySelector("#nc-ok").checked){ c.statut = "acceptee"; c.accordLe = Date.now(); journaliser(c, "Accord conclu"); }
    delete c.brouillon;
    sauverTout();
    view.cmdVue = c.id; aller("commandes", {garderVue:true});
    toast("Commande " + (c.num || "") + " créée");
  });
}
function supprimerCommande(id){
  state.commandes = commandes().filter(function(c){ return c.id !== id; });
  sauverTout();
}
/* Total encaissé : le versement initial plus les règlements suivants. Les
   paiements ne se modifient pas, ils s'ajoutent — une correction est une
   ligne de plus, jamais une réécriture. C'est ce qui rend le compte opposable. */
/* Les montants d'argent se calculent au centime près : 10,10 + 20,20 ne
   doit jamais laisser un « reste dû 0,00 € » fantôme. */
function cts(n){ n = Number(n) || 0; return Math.round((n + (n >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
function ceilCts(n){ return Math.ceil(((Number(n) || 0) * 100) - 1e-7) / 100; }
function encaisse(c){
  var t = Number(c.versement && c.versement.montant) || 0;
  (c.paiements||[]).forEach(function(p){ t += Number(p.montant)||0; });
  return cts(t);
}
function totalDu(c){
  return cts(montantArticles(c) + (Number(c.fraisLivraison)||0));
}
/* ═════ COMMANDES : NUMÉRO ET ARTICLES ═════
   Une commande porte un numéro à elle (C-2026-0001), dans une série
   distincte des factures : il se retrouve sur la facture, et la facture sur
   la commande. Une commande peut contenir plusieurs articles (trois bonnets
   et un snood) : le premier est l'article « principal » (champs historiques
   cid, libelle, variantes, qte, prixConvenu), les suivants sont dans
   c.articles. Le prix convenu de chaque article est un prix UNITAIRE. */
function dernierNumeroCommande(an){
  var max = Number(state.reglages.compteurCommandes && state.reglages.compteurCommandes[an]) || 0;
  commandes().forEach(function(c){
    var m = String(c.num || "").match(/^C-(\d{4})-(\d+)$/);
    if (m && Number(m[1]) === an) max = Math.max(max, Number(m[2]));
  });
  return max;
}
function numeroCommandeSuivant(an){
  an = an || new Date().getFullYear();
  var n = dernierNumeroCommande(an) + 1;
  var r = state.reglages;
  if (!r.compteurCommandes || typeof r.compteurCommandes !== "object") r.compteurCommandes = {};
  r.compteurCommandes[an] = n;   /* ne recule jamais, même si la commande est supprimée */
  return "C-" + an + "-" + String(n).padStart(4, "0");
}
function articlesCommande(c){
  var l = [{principal:true, cid:c.cid || null, d:c.libelle || "", s:c.variantes || "",
            q:Math.max(1, Number(c.qte) || 1), pu:Number(c.prixConvenu) || 0}];
  (c.articles || []).forEach(function(a){
    l.push({id:a.id, cid:a.cid || null, d:a.d || "", s:a.s || "", q:Math.max(0, Number(a.q) || 0), pu:Number(a.pu) || 0});
  });
  l.forEach(function(a){
    var cr = a.cid ? creation(a.cid) : null;
    a.nom = a.d || (cr ? cr.nom : (a.principal ? "Création au crochet" : "Article"));
    a.montant = cts(a.q * a.pu);
  });
  return l;
}
function montantArticles(c){
  var t = 0; articlesCommande(c).forEach(function(a){ t += a.montant; }); return cts(t);
}
function quantiteCreation(c, cid){
  var q = 0; articlesCommande(c).forEach(function(a){ if (a.cid === cid) q += a.q; }); return q;
}
function commandeContient(c, cid){ return !!cid && quantiteCreation(c, cid) > 0; }
/* Encore une pièce de cette création à relier à la commande ? */
function attendPiece(c, cid){
  if (c.statut === "annulee" || c.statut === "devis") return false;
  var q = quantiteCreation(c, cid); if (!q) return false;
  var liees = state.pieces.filter(function(p){ return p.cmdId === c.id && p.cid === cid; }).length;
  return liees < q;
}
/* Part de chaque création dans le montant de la commande (pour répartir
   l'argent reçu entre créations dans les Indicateurs). */
function partsCommande(c){
  var arts = articlesCommande(c), tot = 0, parts = {};
  arts.forEach(function(a){ tot += a.montant; });
  arts.forEach(function(a){ if (!a.cid) return; parts[a.cid] = (parts[a.cid] || 0) + (tot > 0 ? a.montant / tot : 1 / arts.length); });
  return parts;
}
/* Ce qu'il faut de chaque matière pour fabriquer toute la commande. */
function besoinsCommande(c){
  var b = {};
  articlesCommande(c).forEach(function(a){
    var cr = a.cid ? creation(a.cid) : null; if (!cr || !(a.q > 0)) return;
    var dejaFaites = state.pieces.filter(function(p){ return p.cmdId === c.id && p.cid === a.cid && p.sortie; }).length;
    var reste = Math.max(0, a.q - dejaFaites); if (!reste) return;
    var cp = consommationPrevue(cr);
    Object.keys(cp).forEach(function(mid){ b[mid] = (b[mid] || 0) + cp[mid] * reste; });
  });
  return b;
}
function soldeDu(c){ return Math.max(0, cts(totalDu(c) - encaisse(c))); }
function tropPercu(c){ return Math.max(0, cts(encaisse(c) - totalDu(c))); }
/* L'argent qu'on attend vraiment : commandes acceptées, en cours, terminées
   ou livrées. Un devis n'est pas encore une dette ; une commande annulée non
   plus. Une seule définition, pour que l'Accueil, les Commandes et les
   Indicateurs affichent le même chiffre. */
function doitEtreEncaissee(c){ return c.statut !== "devis" && c.statut !== "annulee"; }
function resteAEncaisser(){
  var total = 0, n = 0;
  commandes().forEach(function(c){
    if (!doitEtreEncaissee(c)) return;
    var sd = soldeDu(c); if (sd > 0.004){ total += sd; n++; }
  });
  return {total: total, n: n};
}

/* Le temps que cette commande va demander. On préfère toujours une mesure à
   une estimation : si la pièce a déjà été chronométrée, c'est ce chiffre-là
   qui compte ; sinon on retombe sur le temps du modèle. */
/* Temps de fabrication « réel » d'une pièce : poste par poste, le temps
   chronométré s'il existe, sinon l'estimation de la fiche. Mesurer le seul
   crochet ne fait plus disparaître l'assemblage ou la finition. */
function pieceProvisoire(p){
  return !!p && p.com !== "vendu" && p.com !== "jete" && (p.prod === "afaire" || p.prod === "encours");
}
function minutesReellesPiece(p, cr){
  var m = mesureDe(p), t = 0, prov = pieceProvisoire(p);
  POSTES.forEach(function(x){
    var mes = Number(m[x.k]) || 0, est = cr ? Number(cr.temps[x.k]) || 0 : 0;
    /* Pièce pas terminée : le chronomètre n'a compté que le début. Tant
       qu'elle n'est pas finie, un poste vaut au moins l'estimation de la
       fiche, sinon 19 min chronométrées effaceraient 6 h prévues. */
    t += prov ? Math.max(mes, est) : (mes > 0 ? mes : est);
  });
  return t;
}
function heuresCommande(c){
  /* Une seule pièce chronométrée : c'est son temps mesuré qui compte. */
  var arts = articlesCommande(c), nPieces = 0;
  arts.forEach(function(a){ if (a.cid) nPieces += a.q; });
  var pc = c.pieceId ? piece(c.pieceId) : null;
  var crc = c.cid ? creation(c.cid) : null;
  if (nPieces <= 1 && pc && minutesMesurees(pc) > 0) return minutesReellesPiece(pc, crc) / 60;
  if (Number(c.heuresEstimees) > 0) return Number(c.heuresEstimees);
  /* Plusieurs pièces : le temps mesuré de celles qui sont faites, l'estimation
     de la fiche pour les autres. */
  var min = 0;
  arts.forEach(function(a){
    var cr = a.cid ? creation(a.cid) : null; if (!cr) return;
    var faites = state.pieces.filter(function(p){ return p.cmdId === c.id && p.cid === a.cid; });
    var est = calculer(cr).minutes;
    for (var i = 0; i < a.q; i++){
      var p = faites[i];
      min += p && minutesMesurees(p) > 0 ? minutesReellesPiece(p, cr) : est;
    }
  });
  return min / 60;
}
/* En jours de calendrier : aujourd'hui = 0, demain = 1, hier = -1 (en
   retard). Math.round absorbe le changement d'heure. */
function joursRestants(c){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(c.datePromise || ""));
  if (!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(d.getTime())) return null;
  var auj = new Date(); auj.setHours(0,0,0,0);
  return Math.round((d.getTime() - auj.getTime()) / 86400000);
}
function commandesOuvertes(){
  return commandes().filter(function(c){
    return c.statut !== "livree" && c.statut !== "annulee";
  });
}
/* Le plan de charge : des heures promises face à des jours disponibles.
   C'est la réponse à la panique de décembre — et elle doit être brutale,
   parce qu'une alerte qui ménage ne sert à rien en novembre. */
function echeanceTexte(j){
  if (j === null || j === undefined) return "sans date";
  if (j < 0) return "en retard de " + Math.abs(j) + " jour" + (Math.abs(j) > 1 ? "s" : "");
  if (j === 0) return "à livrer aujourd'hui";
  if (j === 1) return "à livrer demain";
  return "dans " + j + " jours";
}
/* Phrase qui dit précisément quelle échéance ne tient pas, et pourquoi. */
function texteSurcharge(plan){
  var c = plan.bloquante, j = joursRestants(c);
  var qui = (c.client && c.client.nom) || "ta commande";
  if (!(plan.parJour > 0)) return "Tu as indiqué 0 h de crochet par jour : avec " + dureeTexte(plan.heures * 60) +
    " de travail promis, aucune échéance ne peut être tenue. Change tes heures par jour dans Réglages si tu reprends.";
  if (j < 0) return "La commande de " + qui + " est en retard de " + pluriel(-j, "jour") + " : il reste " +
    dureeTexte(plan.heuresBloquante * 60) + " de travail (avec les commandes plus urgentes), soit au moins " +
    pluriel(Math.ceil(plan.heuresBloquante / plan.parJour), "jour") + " à " + nb(plan.parJour) + " h par jour.";
  var dispo = (j + 1) * plan.parJour;
  return "Pour livrer " + qui + " " +
    (j === 0 ? "aujourd'hui" : j === 1 ? "demain" : "dans " + j + " jours") + ", il faut encore " +
    dureeTexte(plan.heuresBloquante * 60) + " de travail (avec les commandes à livrer avant), alors que tu disposes de " +
    dureeTexte(dispo * 60) + " à " + nb(plan.parJour) + " h par jour.";
}

/* Le travail qui reste à faire : commandes acceptées ou en fabrication.
   Un devis n'est pas promis ; une commande terminée est déjà faite.
   « Tenable » se vérifie échéance par échéance : pour chacune, le travail
   dû jusque-là doit tenir dans les jours disponibles jusque-là. */
function aFabriquer(c){ return c.statut === "acceptee" || c.statut === "encours"; }
/* Ce qui reste à faire sur une commande : l'estimation, moins le temps
   déjà chronométré sur sa pièce. */
function heuresRestantes(c){
  var prevu = 0;
  if (Number(c.heuresEstimees) > 0) prevu = Number(c.heuresEstimees);
  else articlesCommande(c).forEach(function(a){ var cr = a.cid ? creation(a.cid) : null; if (cr) prevu += a.q * calculer(cr).minutes / 60; });
  var fait = 0;
  state.pieces.forEach(function(p){ if (p.cmdId === c.id) fait += minutesMesurees(p) / 60; });
  if (!fait && c.pieceId && piece(c.pieceId)) fait = minutesMesurees(piece(c.pieceId)) / 60;
  return Math.max(0, prevu - fait);
}
function planDeCharge(){
  var aFaire = commandes().filter(aFabriquer);
  var heures = 0, enRetard = 0, sansDate = 0, prochaine = null;
  /* 0 h par jour est une vraie réponse (pause, vacances), pas « 3 h ». */
  var hpj = state.reglages.heuresParJour;
  var parJour = (hpj === undefined || hpj === null || hpj === "") ? 3 : Math.max(0, Number(hpj) || 0);
  aFaire.forEach(function(c){
    heures += heuresRestantes(c);
    var j = joursRestants(c);
    if (j === null) { sansDate++; return; }
    if (j < 0) enRetard++;
    else if (prochaine === null || j < prochaine) prochaine = j;
  });
  /* Les commandes en retard passent en premier : elles sont dues
     aujourd'hui, et le travail qu'elles demandent pèse sur les suivantes. */
  var datees = aFaire.filter(function(c){ return joursRestants(c) !== null; })
    .sort(function(a,b){ return joursRestants(a) - joursRestants(b); });
  var cumul = 0, tenable = true, bloquante = null, cumulBloquante = 0;
  datees.forEach(function(c){
    cumul += heuresRestantes(c);
    /* Jours disponibles jusqu'à l'échéance, aujourd'hui compris. */
    if (tenable && cumul > (Math.max(0, joursRestants(c)) + 1) * parJour){ tenable = false; bloquante = c; cumulBloquante = cumul; }
  });
  var joursNecessaires = parJour > 0 ? heures / parJour : 0;
  return {
    n: aFaire.length, heures: heures, enRetard: enRetard, sansDate: sansDate,
    prochaine: prochaine, parJour: parJour, joursNecessaires: joursNecessaires,
    tenable: tenable, bloquante: bloquante,
    heuresBloquante: bloquante ? cumulBloquante : 0
  };
}
/* Bilan d'une commande livrée : ce qu'elle a réellement rapporté à l'heure.
   Le coût vient du moteur de prix de revient, au prix effectivement pratiqué. */
/* Bilan d'une commande. Une commande livrée est figée au jour de la
   livraison : ce qu'elle a rapporté ne bouge plus quand les prix changent. */
function bilanCommande(c, recalculer){
  if (c.bilanFige && !recalculer && c.statut === "livree") return c.bilanFige;
  var arts = articlesCommande(c).filter(function(a){ return a.cid && creation(a.cid) && a.q > 0; });
  if (!arts.length) return c.bilanFige || null;
  var reg = state.reglages;
  /* Même règles que la fiche, sommées sur tous les articles : matières et
     part des frais fixes par pièce ; frais de vente et cotisations sur ce
     que la cliente paie ; la livraison facturée REMPLACE l'expédition
     estimée des fiches (compter les deux la déduisait deux fois). */
  var matieres = 0, fixe = 0, expeFiches = 0, nPieces = 0, minInd = 0;
  arts.forEach(function(a){
    var r0 = calculer(creation(a.cid));
    matieres += a.q * r0.matieres; fixe += a.q * r0.fixePiece; minInd += a.q * (r0.minutesIndirectes || 0);
    expeFiches += a.q * (Number(creation(a.cid).expedition) || 0); nPieces += a.q;
  });
  matieres = cts(matieres); fixe = cts(fixe);
  var prix = totalDu(c);
  var expedition = Number(c.fraisLivraison) > 0 ? Number(c.fraisLivraison) : expeFiches;
  var cn = canal(c.canal || creation(arts[0].cid).canal), f = fraisCanal(cn);
  var tauxCotis = (Number(reg.cotisations) || 0) / 100;
  var cotisations = cts(prix * tauxCotis), fraisVar = cts(prix * f.pct), fraisFixesVente = cts(f.fixe + expedition);
  var h = heuresCommande(c);
  var heures = h + minInd / 60;
  var mainOeuvre = cts(heures * (Number(reg.tauxHoraire) || 0));
  var reste = cts(prix - (matieres + fixe + fraisFixesVente + fraisVar + cotisations));
  var denom = 1 - tauxCotis - f.pct;
  var r = {prix: prix, matieres: matieres, fixePiece: fixe, fraisVar: fraisVar, fraisFixesVente: fraisFixesVente,
           cotisations: cotisations, reste: reste, heures: heures, mainOeuvre: mainOeuvre, nPieces: nPieces,
           coutRevient: cts(matieres + fixe + fraisFixesVente + fraisVar + cotisations + mainOeuvre),
           prixObjectif: denom > 0 ? ceilCts((matieres + fixe + fraisFixesVente + mainOeuvre) / denom) : 0,
           gainHoraire: heures > 0 ? reste / heures : 0};
  return {r:r, heures:heures, marge: cts(reste - mainOeuvre), gainHoraire: r.gainHoraire,
          tauxHoraire: Number(reg.tauxHoraire) || 0,
          base: {prix: prix, canal: cn.id, cid: arts.map(function(a){ return a.cid + "×" + a.q; }).join(","), expedition: expedition, heures: h},
          tempsMesure: state.pieces.some(function(p){ return p.cmdId === c.id && minutesMesurees(p) > 0; }) ||
                       !!(c.pieceId && piece(c.pieceId) && minutesMesurees(piece(c.pieceId)) > 0), le: Date.now()};
}
/* Date du jour à l'heure locale (AAAA-MM-JJ) : toISOString() donne l'heure
   de Londres, et une vente notée à 00 h 30 le 1er janvier tombait l'année
   d'avant. */
function aujourdhuiISO(){
  var d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
/* Numérotation des factures : continue et sans trou, comme l'exige
   l'article 242 nonies A de l'annexe II du code général des impôts. */
/* Un compteur qui ne recule jamais : même si une commande facturée venait à
   disparaître, son numéro ne serait jamais réattribué. */
/* Numéro de facture : CODE-ANNÉE-NUMÉRO (ex. K7R2M-2026-0001).
   Le CODE appartient à un seul compte : deux créatrices n'ont jamais le même
   numéro. Le numéro suit, sans trou, les factures de ce compte dans l'année,
   y compris celles émises avant cette version (« 2026-0003 » → la suivante
   est « CODE-2026-0004 »). Avec un compte, c'est le serveur qui le donne
   (unique même entre deux appareils) ; sans compte, l'appareil. */
function dernierNumeroFacture(an){
  var r = state.reglages;
  var max = Number(r.compteurFactures && r.compteurFactures[an]) || 0;
  function voir(num){
    var m = String(num || "").match(/(?:^|-)(\d{4})-(\d+)$/);
    if (m && Number(m[1]) === an) max = Math.max(max, Number(m[2]));
  }
  commandes().forEach(function(c){ voir(c.factureNum); voir(c.avoirNum);
    (c.anciennesFactures || []).forEach(function(x){ voir(x.num); voir(x.avoir); }); });
  registre().forEach(function(x){ voir(x.num); });
  return max;
}
/* ═════ FACTURES ET AVOIRS ═════
   Règles (voir REGLES-METIER.md) :
   - une facture ne s'émet que sur une commande acceptée, avec vendeur et
     cliente identifiés ; on confirme avant, car c'est définitif ;
   - le numéro suit, sans trou, toutes les factures ET avoirs du compte ;
   - avec un compte, le serveur donne le numéro et garde la facture figée
     (registre en ligne, ni modifiable ni supprimable) ; sans compte, le
     registre vit dans les données de l'appareil ;
   - une facture émise ne se modifie plus : on l'annule par un avoir. */
function registre(){ if (!Array.isArray(state.registreFactures)) state.registreFactures = []; return state.registreFactures; }
function factureActive(c){ return !!c.factureNum && !c.avoirNum; }
function journaliser(c, txt){
  if (!Array.isArray(c.journal)) c.journal = [];
  c.journal.push({t: Date.now(), txt: txt});
  if (c.journal.length > 300) c.journal.splice(0, c.journal.length - 300);
}
function comptesActives(){ var cfg = window.CROCHOMPTE_CONFIG || {}; return !!(cfg.supabaseUrl && cfg.supabaseAnonKey); }
/* Ce qui manque pour pouvoir facturer, avec le geste qui le corrige. */
function manquesFacture(c){
  var l = [], r = state.reglages;
  function versReglages(){ view.regSection = "facturation"; aller("reglages"); }
  if (!String(r.raisonSociale || "").trim()) l.push({t:"ton nom (ou le nom de ton entreprise)", a:versReglages, lib:"Compléter mes informations"});
  if (!String(r.adresse || "").trim()) l.push({t:"ton adresse", a:versReglages, lib:"Compléter mes informations"});
  if (r.statut && r.statut !== "non_declare" && !String(r.siret || "").trim()) l.push({t:"ton numéro SIRET", a:versReglages, lib:"Compléter mes informations"});
  if (!c.client || !String(c.client.nom || "").trim()) l.push({t:"le nom de la personne qui commande", champ:'[data-c="nom"]'});
  if (c.clientePro && !String((c.client && c.client.adresse) || "").trim()) l.push({t:"l'adresse de facturation (obligatoire pour un achat professionnel)", champ:'[data-c="adresse"]'});
  if (!(totalDu(c) > 0)) l.push({t:"le prix convenu", champ:'[data-c="prixConvenu"]'});
  if (c.statut === "devis") l.push({t:"l'accord sur le devis (la commande est encore un devis)", champ:'[data-c="statut"]'});
  if (c.statut === "annulee") l.push({t:"une commande active (celle-ci est annulée)", champ:'[data-c="statut"]'});
  return l;
}
/* Annuler une facture émise : c'est un avoir, avec son propre numéro. */
function lancerAvoir(c, bAv){
  function occupe(b, t){ b.disabled = true; b.textContent = t; }
      var F0 = c.facture || instantaneFacture(c);
      confirmer({titre:"Établir un avoir pour la facture " + c.factureNum + " ?",
        texte:"L'avoir annule la facture pour tout son montant (" + eur(F0.total) + "). C'est la façon légale d'annuler une facture émise : "+
              "il porte son propre numéro, à la suite de tes factures, et ne pourra plus être modifié. Tu pourras ensuite établir une nouvelle facture corrigée.",
        bouton:"Établir l'avoir", annuler:"Retour"}, function(){
        var A = {vendeur: F0.vendeur, client: F0.client,
                 lignes: F0.lignes.map(function(l){ return {d:l.d, s:l.s, q:l.q, pu:-(l.pu !== undefined ? l.pu : l.m), m:-l.m}; }),
                 total: -F0.total, versements: [], solde: 0, franchise: F0.franchise, clientePro: F0.clientePro,
                 nature: F0.nature, ref: c.factureNum, refLe: c.factureLe, commandeNum: F0.commandeNum || c.num || "", refClient: F0.refClient || ""};
        var fen = window.open("", "_blank");
        if (fen){ try{ fen.document.write('<p style="font:16px sans-serif;margin:40px">Préparation de l\'avoir…</p>'); }catch(e){} }
        if (bAv) occupe(bAv, "Émission…");
        var id = c.id;
        emettreDocument("avoir", id, A).then(function(r){
          if (!r.numero){ if (fen) try{ fen.close(); }catch(e){} toast(r.erreur); render(); return; }
          var cc = commande(id);
          if (cc){ cc.avoirNum = r.numero; cc.avoirLe = r.doc.emiseLe; cc.avoir = r.doc;
                   journaliser(cc, "Avoir " + r.numero + " établi, annulant la facture " + cc.factureNum); }
          sauverTout(); ouvrirDocument(r.doc, fen); render();
          toast("Avoir " + r.numero + " établi.");
        });
      });
    }
function factureActiveAuRegistre(cmdId){
  var reg = registre();
  var avoirs = {}; reg.forEach(function(x){ if (x.type === "avoir" && x.donnees && x.donnees.ref) avoirs[x.donnees.ref] = true; });
  var f = reg.filter(function(x){ return x.type === "facture" && x.cmd === cmdId && !avoirs[x.num]; })[0];
  return f ? f.num : null;
}
function emettreDocument(type, cmdId, donnees){
  if (type === "facture" && cmdId){
    var dejaF = factureActiveAuRegistre(cmdId);
    if (dejaF) return Promise.resolve({erreur:"Cette commande a déjà une facture active (n° " + dejaF + "), par exemple émise depuis un autre onglet ou avant une restauration. Annule-la par un avoir avant d'en établir une nouvelle."});
  }
  var an = new Date().getFullYear(), min = dernierNumeroFacture(an);
  var S = window.CrochompteSync, p;
  if (comptesActives()){
    if (!(S && S.emettreFacture && S.connecte && S.connecte()))
      return Promise.resolve({erreur:"Le numéro est attribué par ton compte en ligne, pour qu'il ne soit jamais donné deux fois. Connecte-toi à internet, puis réessaie."});
    p = S.emettreFacture(an, min, type, cmdId, donnees).then(function(r){
      if (r.numero) return r;
      return {erreur: r.erreur === "reseau"
        ? "Pas de connexion internet : le numéro est attribué par ton compte en ligne. Réessaie dès que la connexion revient."
        : "Le document n'a pas pu être émis. Réessaie dans un instant ; si ça continue, écris-nous à bonjour@crochompte.com."};
    });
  } else {
    p = Promise.resolve({numero: codeFactureLocal() + "-" + an + "-" + String(min + 1).padStart(4, "0")});
  }
  return p.then(function(r){
    if (!r.numero) return r;
    noterNumeroFacture(an, r.numero);
    var d = JSON.parse(JSON.stringify(donnees));
    d.numero = r.numero; d.emiseLe = new Date().toISOString(); d.type = type;
    registre().unshift({num: r.numero, type: type, le: d.emiseLe, cmd: cmdId, donnees: d});
    sauverTout();
    return {numero: r.numero, doc: d};
  });
}
function codeFactureLocal(){
  var r = state.reglages;
  if (!/^[A-HJ-NP-Z2-9]{5}$/.test(r.codeFacture || "")){
    var L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", c = "", t = new Uint8Array(5);
    try{ crypto.getRandomValues(t); }catch(e){ for (var k = 0; k < 5; k++) t[k] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < 5; i++) c += L.charAt(t[i] % 32);
    r.codeFacture = c;
  }
  return r.codeFacture;
}
function noterNumeroFacture(an, numero){
  var r = state.reglages;
  if (!r.compteurFactures || typeof r.compteurFactures !== "object") r.compteurFactures = {};
  var m = String(numero).match(/^([A-Z0-9]{5})-(\d{4})-(\d+)$/);
  if (m){ r.codeFacture = m[1]; r.compteurFactures[an] = Math.max(Number(r.compteurFactures[an]) || 0, Number(m[3])); }
}
/* Rend une promesse : {numero} ou {erreur: message pour l'artisane}. */
/* (L'ancienne fonction prochainNumeroFacture, qui retombait sur une
   numérotation locale, est retirée : toute émission passe par
   emettreDocument, qui ne numérote localement que sans compte.) */
/* La franchise de TVA s'apprécie sur l'année en cours ET la précédente. */
function enFranchiseTVA(){
  var sl = seuilsDuStatut(), an = new Date().getFullYear();
  return caAnnuel(an).total <= sl.tvaMajore && caAnnuel(an - 1).total <= sl.tva;
}

function patrons(){ if (!state.patrons) state.patrons = []; return state.patrons; }
function patronPerso(id){
  var l = patrons();
  for (var i=0;i<l.length;i++) if (l[i].id === id) return l[i];
  return null;
}
function nouveauPatron(){
  var p = {id:"pp_"+uid(), titre:"", auteur:"", origine:"", notes:"", texte:"",
           pages:[], rang:0, cree:Date.now(), brouillon:true};
  patrons().unshift(p); sauverTout();
  return p;
}
function supprimerPatron(id){
  var p = patronPerso(id); if (!p) return;
  (p.pages||[]).forEach(function(pg){ effacerPhoto(pg.photo); });
  state.patrons = patrons().filter(function(x){ return x.id !== id; });
  state.creations.forEach(function(c){ if (c.patron === id) c.patron = null; });
  sauverTout();
}

/* Le patron relié, posé à côté du chronomètre : c'est là qu'on en a besoin,
   pas dans un autre onglet qu'il faut aller chercher les mains prises. */
function cartePatronPerso(cr){
  if (!cr || !cr.patron) return null;
  var p = patronPerso(cr.patron); if (!p) return null;
  var c = el('<div class="card"><header><h2>Ton patron</h2>'+
    '<p>'+esc(p.titre || "Patron sans titre")+
    (p.auteur ? ' · '+esc(p.auteur) : '')+'</p></header><div class="body">'+
    '<div class="cptr" style="margin-bottom:14px"></div>'+
    '<div class="pages"></div></div></div>');
  var z = c.querySelector(".cptr");
  z.style.display = "block";
  z.appendChild(compteurMainsLibres(p));
  var ouvre = el('<div class="mlbar"></div>');
  ouvre.appendChild(bouton("Ouvrir le patron en entier", function(){
    view.patronVu = p.id; aller("patrons"); }));
  z.appendChild(ouvre);
  var g = c.querySelector(".pages");
  (p.pages||[]).slice(0,4).forEach(function(pg, i){
    g.appendChild(el('<figure><img data-photo="'+esc(pg.photo)+'" alt="Page '+(i+1)+'" hidden>'+
      '<figcaption><span>Page '+(i+1)+'</span></figcaption></figure>'));
  });
  if (!(p.pages||[]).length && p.texte){
    g.appendChild(el('<p class="lecture" style="grid-column:1/-1">'+esc(p.texte.slice(0,600))+
      (p.texte.length>600 ? '…' : '')+'</p>'));
  }
  return c;
}

/* Les commandes ouvertes qui portent sur cette création. Affiché en tête de
   sa fiche : savoir que trois clientes attendent cette pièce change la façon
   de lire son prix de revient. */
function carteCommandesLiees(cid){
  if (!cid) return null;
  var liees = commandesOuvertes().filter(function(c){ return commandeContient(c, cid); });
  if (!liees.length) return null;
  var h = 0, du = 0;
  liees.forEach(function(c){ h += heuresCommande(c); du += soldeDu(c); });
  var carte = el('<div class="card" style="margin-bottom:16px"><header>'+
    '<h2>'+liees.length+' commande'+(liees.length>1?'s':'')+' en cours sur cette création</h2>'+
    '<p>'+esc(dureeTexte(h*60))+' de travail promis'+
    (du > 0 ? ' · '+esc(eur(du))+' encore à recevoir' : '')+'</p></header>'+
    '<div class="body"></div></div>');
  var b = carte.querySelector(".body");
  liees.forEach(function(c){
    var j = joursRestants(c);
    var ligne = el('<button type="button" class="trow" style="margin-bottom:8px">'+
      '<span class="mot f-mode"></span>'+
      '<span><h3>'+esc((c.client && c.client.nom) || "Sans nom")+'</h3>'+
      '<p class="m">'+esc(statutCmd(c.statut).nom)+
        (j !== null ? ' · ' + echeanceTexte(j) : ' · sans date')+
      '</p></span>'+
      '<span class="c"><b>'+esc(eur(totalDu(c)))+'</b><span>convenu</span></span></button>');
    ligne.addEventListener("click", function(){
      view.cmdVue = c.id; aller("commandes", {garderVue:true});
    });
    b.appendChild(ligne);
  });
  return carte;
}

function renderCommandes(main){
  if (view.cmdVue){
    var c0 = commande(view.cmdVue);
    if (c0) return renderCommandeDetail(main, c0);
    view.cmdVue = null;
  }

  main.appendChild(enTete("Commandes",
    "Ton suivi administratif : ce que tu as promis, à qui, pour quand, et ce qui reste à recevoir. "+
    "Tu échanges avec ta clientèle comme d'habitude ; ici, tu gardes une trace de tout.",
    [bouton("+ Nouvelle commande", function(){ dialogueNouvelleCommande(); }, true)]));

  var pc = planDeCharge();

  /* Le plan de charge passe avant la liste : savoir si on tiendra les délais
     est plus urgent que savoir ce qu'il y a dedans. */
  var tiles = el('<div class="tiles"></div>');
  var nFab = commandes().filter(function(c){ return c.statut === "acceptee" || c.statut === "encours" || c.statut === "terminee"; }).length;
  tiles.appendChild(el('<div class="tile"><div class="k">À fabriquer</div><div class="v">'+nFab+'</div><div class="s">'+
    (!nFab ? 'aucune commande en attente'
      : esc(dureeTexte(pc.heures*60)) + ' de travail' + (pc.parJour > 0 ? ' · ' + esc(pluriel(Math.ceil(pc.joursNecessaires), "jour")) + ' à ' + nb(pc.parJour) + ' h' : ' · indique tes heures par jour (Réglages)') +
        (pc.sansDate ? ' · ' + pc.sansDate + ' sans date' : ''))+'</div></div>'));
  tiles.appendChild(el('<div class="tile acc '+(pc.enRetard||!pc.tenable?"acc-warn":"acc-good")+'">'+
    '<div class="k">Prochaine livraison</div><div class="v '+(pc.enRetard||!pc.tenable?"warn":"good")+'">'+
    (pc.prochaine === null ? '—' : pc.prochaine === 0 ? 'aujourd\'hui' : pc.prochaine+' j')+'</div>'+
    '<div class="s">'+(pc.enRetard ? pc.enRetard+' en retard' : 'rien en retard')+'</div></div>'));
  var nFact = commandes().filter(function(c){ return c.statut === "livree" && !c.factureNum; }).length;
  tiles.appendChild(el('<div class="tile"><div class="k">À facturer</div><div class="v '+(nFact ? "warn" : "")+'">'+nFact+'</div><div class="s">'+
    (nFact ? 'livrée'+(nFact>1?'s':'')+', facture à émettre' : 'rien à facturer')+'</div></div>'));
  var rae = resteAEncaisser();
  tiles.appendChild(el('<div class="tile"><div class="k">Reste à recevoir</div><div class="v">'+
    esc(eur(rae.total))+'</div><div class="s">'+(rae.n ? 'sur '+rae.n+' commande'+(rae.n>1?'s':'')+' (devis exclus)' : 'rien en attente')+'</div></div>'));
  main.appendChild(tiles);

  if (!pc.tenable && pc.bloquante){
    main.appendChild(el('<div class="banner" style="background:var(--warn-soft);border-color:var(--warn)"><p>'+
      '<b>Tes délais ne sont pas tenables.</b> '+esc(texteSurcharge(pc))+' '+
      'Mieux vaut prévenir maintenant que livrer en retard sans l\'avoir dit : '+
      'propose un nouveau délai, ou un remboursement, et garde une trace écrite de sa réponse.</p>'+
      '<p class="hint" style="margin-top:8px">Tu crochètes plus que '+nb(pc.parJour)+' h par jour ? '+
      'Corrige-le dans Réglages, le calcul suivra.</p></div>'));
  }

  var liste = commandes();
  if (!liste.length){
    main.appendChild(etatVide("Aucune commande pour l'instant",
      "Dès qu'on te commande quelque chose (par message, sur un marché, en boutique), "+
      "note-le ici : ce qui est convenu, pour quand, et ce qui a déjà été versé. "+
      "C'est ce qui évite de fabriquer pour quelqu'un qui ne paiera pas.",
      [bouton("+ Nouvelle commande", function(){ dialogueNouvelleCommande(); }, true)]));
    return;
  }

  /* Suivi : filtrer par étape, retrouver une cliente ou un numéro, trier
     comme on veut (par défaut : ce qui presse le plus en premier). */
  var FCMD = [
    {k:"tous",      nom:"Toutes"},
    {k:"encours",   nom:"En cours",             f:function(c){ return c.statut === "acceptee" || c.statut === "encours" || c.statut === "terminee"; }},
    {k:"devis",     nom:"Devis",                f:function(c){ return c.statut === "devis"; }},
    {k:"afacturer", nom:"Livrées à facturer",   f:function(c){ return c.statut === "livree" && !c.factureNum; }},
    {k:"facturees", nom:"Livrées et facturées", f:function(c){ return c.statut === "livree" && !!c.factureNum; }},
    {k:"impayees",  nom:"Reste à recevoir",     f:function(c){ return doitEtreEncaissee(c) && soldeDu(c) > 0; }},
    {k:"annulees",  nom:"Annulées",             f:function(c){ return c.statut === "annulee"; }}
  ];
  var TRI_CMD = {
    urgence: function(c){ var fini = (c.statut === "livree" || c.statut === "annulee") ? 1 : 0, j = joursRestants(c); if (c.statut === "devis") return 4e5 + (j === null ? 1e5 : Math.max(j, 0)); return fini * 1e6 + (j === null ? 5e5 : j); },
    num:     function(c){ return c.num || ""; },
    client:  function(c){ return (c.client && c.client.nom) || ""; },
    pour:    function(c){ return c.datePromise || ""; },
    etape:   function(c){ return etapeCommande(c).rang; },
    convenu: function(c){ return totalDu(c); },
    verse:   function(c){ return encaisse(c); },
    reste:   function(c){ return soldeDu(c); }
  };
  var fck = view.fCmd || (liste.some(FCMD[1].f) ? "encours" : "tous");
  var fc = FCMD.filter(function(x){ return x.k === fck; })[0] || FCMD[0];
  etatTri("cmd", "urgence");
  var outils = el('<div class="cmd-outils"><div class="filters" style="margin:0"></div>'+
    '<div class="cmd-outils-d"><label class="f"><span class="sr-only">Rechercher une commande</span><input type="search" id="cmd-q" placeholder="Nom, n° de commande, article…"></label></div></div>');
  outils.querySelector(".cmd-outils-d").appendChild(barreTri({cle:"cmd", defaut:"urgence", quand:function(){ peindreCmd(); majEntetes(); }, options:[
    ["urgence","Le plus urgent"],["num","N° de commande"],["client","Commandé par"],["pour","Date de livraison"],["etape","Étape"],
    ["convenu","Prix convenu"],["verse","Reçu"],["reste","Reste à recevoir"]]}));
  var fz = outils.querySelector(".filters");
  FCMD.forEach(function(x){
    var n = x.f ? liste.filter(x.f).length : liste.length;
    if (x.k !== "tous" && !n) return;
    var b = el('<button type="button" class="fchip">'+esc(x.nom)+' <span class="n">'+n+'</span></button>');
    b.setAttribute("aria-pressed", fck === x.k ? "true" : "false");
    b.addEventListener("click", function(){ view.fCmd = x.k; render(); });
    fz.appendChild(b);
  });
  outils.querySelector("#cmd-q").value = view.cmdQ || "";
  outils.querySelector("#cmd-q").addEventListener("input", function(e){ view.cmdQ = e.target.value; peindreCmd(); });
  main.appendChild(outils);

  var wrap = el('<div class="tablewrap resp" style="margin-top:8px"></div>');
  var t = el('<table class="t-cmd" style="min-width:1000px"><thead><tr><th data-tri="num" style="width:110px">N°</th><th data-tri="client">Commandé par</th><th>Articles</th>'+
    '<th data-tri="pour" style="width:118px">Pour le</th><th data-tri="etape" style="width:190px">Étape et suite</th>'+
    '<th class="n" data-tri="convenu" style="width:105px">Prix convenu</th><th class="n" data-tri="verse" style="width:95px">Reçu</th><th class="n" data-tri="reste" style="width:105px">Reste à recevoir</th>'+
    '<th style="width:70px"><span class="sr-only">Actions</span></th></tr></thead><tbody></tbody></table>');
  var tb = t.querySelector("tbody");
  var videCmd = el('<p class="hint" hidden>Aucune commande dans ce filtre.</p>');
  function majEntetes(){
    var tt = etatTri("cmd", "urgence");
    [].forEach.call(t.querySelectorAll("th[data-tri]"), function(th){
      var k = th.getAttribute("data-tri"), on = tt.k === k, b = th.querySelector(".th-tri");
      if (b) b.textContent = b.textContent.replace(/ [↑↓]$/, "") + (on ? (tt.sens < 0 ? " ↓" : " ↑") : "");
      th.setAttribute("aria-sort", on ? (tt.sens < 0 ? "descending" : "ascending") : "none");
    });
  }
  function peindreCmd(){
  tb.innerHTML = "";
  var q = String(view.cmdQ || "").trim().toLowerCase();
  var triees = trierListe(liste, etatTri("cmd", "urgence"), TRI_CMD);
  var affichees = triees.filter(function(c){
    if (fc.f && !fc.f(c)) return false;
    if (q){
      var txt = [(c.num || ""), (c.client && c.client.nom) || "", c.refClient || ""].concat(articlesCommande(c).map(function(a){ return a.nom; })).join(" ").toLowerCase();
      if (txt.indexOf(q) === -1) return false;
    }
    return true;
  });
  videCmd.hidden = affichees.length > 0;
  affichees.forEach(function(c){
    var j = joursRestants(c);
    var et = etapeCommande(c);
    var fini = !!et.fini;
    var urgence = "";
    if (!fini && c.statut !== "livree" && j !== null){
      if (c.statut === "devis") urgence = j < 0 ? '<span class="chip warn">à relancer</span>' : '';
      else if (j < 0) urgence = '<span class="chip bad">'+esc(echeanceTexte(j))+'</span>';
      else if (j <= 7) urgence = '<span class="chip warn">'+esc(echeanceTexte(j))+'</span>';
    }
    var solde = soldeDu(c);
    var artsL = articlesCommande(c).filter(function(a){ return a.q > 0; });
    var tr = el('<tr'+(fini?' style="color:var(--muted)"':'')+'>'+
      '<td data-l="N°" class="num" style="white-space:nowrap">'+esc(c.num || "—")+(c.factureNum ? '<div class="hint" style="font-size:11px;margin-top:2px">fact. '+esc(c.factureNum.replace(/^[A-Z0-9]{5}-/, ""))+'</div>' : '')+'</td>'+
      '<td data-l="Commandé par"><b>'+esc(c.client && c.client.nom ? c.client.nom : "Sans nom")+'</b>'+
        (c.personnalisee ? '<div class="hint" style="font-size:11px;margin-top:2px">personnalisée</div>' : '')+'</td>'+
      '<td data-l="Articles">'+(artsL.length ? esc((artsL[0].q > 1 ? artsL[0].q + " × " : "") + artsL[0].nom) : '—')+
        (artsL.length > 1 ? '<div class="hint" style="font-size:11px;margin-top:2px">+ '+esc(pluriel(artsL.length - 1, "autre article", "autres articles"))+'</div>'
          : c.variantes ? '<div class="hint" style="font-size:11px;margin-top:2px">'+esc(c.variantes)+'</div>' : '')+'</td>'+
      '<td data-l="Pour le">'+(c.datePromise ? esc(new Date(dateVersTs(c.datePromise)).toLocaleDateString("fr-FR")) : '<span class="hint">non fixée</span>')+
        (urgence ? '<div style="margin-top:2px">'+urgence+'</div>' : '')+'</td>'+
      '<td data-l="Étape"><div class="cel"><span class="chip st-'+esc(et.k)+'">'+esc(et.nom)+'</span>'+
        (et.action ? '<div class="hint etape-suite'+(et.urgent ? ' urgent' : '')+'">'+esc(et.action)+'</div>' : '')+'</div></td>'+
      '<td class="n num" data-l="Prix convenu">'+esc(eur(totalDu(c)))+'</td>'+
      '<td class="n num" data-l="Reçu">'+(encaisse(c) > 0 ? esc(eur(encaisse(c))) : '<span class="hint">—</span>')+'</td>'+
      '<td class="n num" data-l="Reste à recevoir">'+(solde > 0 ? '<b>'+esc(eur(solde))+'</b>'
          : tropPercu(c) > 0 ? '<span class="warn">trop-perçu '+esc(eur(tropPercu(c)))+'</span>'
          : totalDu(c) > 0 ? '<span class="good">payée en entier</span>' : '<span class="hint">—</span>')+'</td>'+
      '<td><button type="button" class="btn sm">Ouvrir</button></td></tr>');
    tr.querySelector("td:last-child button").setAttribute("aria-label", "Ouvrir la commande " + (c.num || "") + (c.client && c.client.nom ? " de " + c.client.nom : ""));
    tr.querySelector("td:last-child button").addEventListener("click", function(){ view.cmdVue = c.id; render(); });
    tb.appendChild(tr);
  });
  }
  entetesTriables(t.querySelector("thead"), "cmd", function(){ peindreCmd(); });
  peindreCmd();
  wrap.appendChild(t);
  main.appendChild(wrap);
  main.appendChild(videCmd);
  main.appendChild(carteRegistre());
}
/* Registre des factures et avoirs : tous les documents émis, même si la
   commande a été supprimée, modifiée ou remplacée par une sauvegarde. Avec
   un compte, il est complété par la copie gardée sur le serveur. */
function carteRegistre(){
  var c = el('<details class="card registre" style="margin-top:20px"><summary><h2>Registre des factures et avoirs <span class="n" id="reg-n"></span></h2>'+
    '<p>La liste de toutes tes factures et de tes avoirs (les factures d\'annulation). À conserver 10 ans.</p></summary><div class="body"></div></details>');
  var body = c.querySelector(".body");
  c.open = !!view.regOuvert;
  c.addEventListener("toggle", function(){ view.regOuvert = c.open; });
  var TRI_REG = {
    date:    function(x){ return String(x.le || ""); },
    num:     function(x){ return x.num || ""; },
    type:    function(x){ return x.type === "avoir" ? "Avoir" : "Facture"; },
    cliente: function(x){ return ((x.donnees || {}).client || {}).nom || ""; },
    montant: function(x){ return Number((x.donnees || {}).total) || 0; }
  };
  etatTri("reg", "date", -1);
  function peindre(){
    body.innerHTML = "";
    var l = trierListe(registre(), etatTri("reg", "date", -1), TRI_REG);
    var nReg = c.querySelector("#reg-n"); if (nReg) nReg.textContent = l.length ? "(" + l.length + ")" : "";
    if (!l.length){ body.appendChild(el('<p class="hint" style="margin:0">Aucune facture émise pour l\'instant.</p>')); }
    else {
      if (l.length > 1){
        var bt = barreTri({cle:"reg", defaut:"date", sens:-1, quand:function(){ peindre(); }, options:[
          ["date","Date d'émission"],["num","Numéro"],["type","Type"],["cliente","Destinataire"],["montant","Montant"]]});
        bt.style.marginBottom = "10px"; body.appendChild(bt);
      }
      var w = el('<div class="tablewrap resp"><table><thead><tr><th data-tri="num">Numéro</th><th data-tri="date">Date</th><th data-tri="type">Type</th><th>Commande</th><th data-tri="cliente">Destinataire</th><th class="n" data-tri="montant">Montant</th><th><span class="sr-only">Action</span></th></tr></thead><tbody></tbody></table></div>');
      var tb = w.querySelector("tbody");
      entetesTriables(w.querySelector("thead"), "reg", function(){ peindre(); });
      l.forEach(function(x){
        var d = x.donnees || {};
        var tr = el('<tr><td data-l="Numéro"><b>'+esc(x.num)+'</b></td><td data-l="Date">'+esc(new Date(x.le).toLocaleDateString("fr-FR"))+'</td>'+
          '<td data-l="Type">'+(x.type === "avoir" ? "Avoir" : "Facture")+'</td>'+
          '<td data-l="Commande">'+(d.commandeNum ? (commande(x.cmd) ? '<button type="button" class="lien-mini" data-cmd="'+esc(x.cmd)+'">'+esc(d.commandeNum)+'</button>' : esc(d.commandeNum)) : '<span class="hint">—</span>')+'</td>'+
          '<td data-l="Destinataire">'+esc((d.client && d.client.nom) || "—")+'</td>'+
          '<td class="n" data-l="Montant">'+esc(eur(Number(d.total)||0))+'</td>'+
          '<td><button type="button" class="btn sm">Ouvrir</button></td></tr>');
        var bO = tr.querySelector("td:last-child button");
        bO.setAttribute("aria-label", "Ouvrir " + (x.type === "avoir" ? "l'avoir " : "la facture ") + x.num);
        bO.addEventListener("click", function(){ ouvrirDocument(d); });
        var bC = tr.querySelector("[data-cmd]");
        if (bC){ bC.setAttribute("aria-label", "Aller à la commande " + d.commandeNum); bC.addEventListener("click", function(){ view.cmdVue = x.cmd; render(); }); }
        tb.appendChild(tr);
      });
      body.appendChild(w);
    }
    var bar = el('<div class="savebar" style="margin-top:12px"></div>');
    if (l.length){
      bar.appendChild(bouton("Télécharger le registre (tableur)", function(){
        var lignes = [["Numéro","Type","Date d'émission","Commande","Destinataire","Montant (€)","Facture annulée"]];
        l.slice().reverse().forEach(function(x){
          var d = x.donnees || {};
          lignes.push([x.num, x.type === "avoir" ? "Avoir" : "Facture", new Date(x.le).toLocaleDateString("fr-FR"), d.commandeNum || "",
                       (d.client && d.client.nom) || "", cts(d.total).toFixed(2).replace(".", ","), d.ref || ""]);
        });
        /* Une cellule qui commence par = + - @ serait exécutée comme une formule
           par le tableur : on la neutralise (sauf les montants). */
        var cellule = function(v, i){ v = String(v); if (i !== 5 && /^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
        var csv = "\ufeff" + lignes.map(function(r){ return r.map(cellule).join(";"); }).join("\r\n");
        var url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
        var a = document.createElement("a"); a.href = url; a.download = "crochompte-registre-factures.csv";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
      }));
    }
    body.appendChild(bar);
  }
  peindre();
  /* Avec un compte : on complète avec la copie du serveur (factures émises
     sur un autre appareil, ou effacées d'ici par une restauration). */
  var S = window.CrochompteSync;
  if (S && S.listerFactures && S.connecte && S.connecte()){
    S.listerFactures().then(function(r){
      if (!r.liste) return;
      var connus = {}; registre().forEach(function(x){ connus[x.num] = true; });
      var ajout = 0;
      r.liste.forEach(function(x){
        if (connus[x.numero]) return;
        var d = x.donnees || {}; d.numero = x.numero; d.type = x.type; d.emiseLe = d.emiseLe || x.emise_le;
        registre().push({num:x.numero, type:x.type, le:x.emise_le, cmd:x.commande, donnees:d});
        ajout++;
      });
      if (ajout){ sauverTout(); if (c.isConnected) peindre(); }
    });
  }
  return c;
}

/* Un temps se saisit en heures et minutes, comme dans la fiche : « 2 h 30 »,
   jamais « 2,5 ». La valeur gardée reste un nombre d'heures. */
function champsHeuresMinutes(id, heures, defautHeures){
  var h = Math.floor(Number(heures) || 0), m = Math.round(((Number(heures) || 0) - h) * 60);
  var dh = Math.floor(Number(defautHeures) || 0), dm = Math.round(((Number(defautHeures) || 0) - dh) * 60);
  return '<div class="hm"><label class="f"><span class="sr-only">Heures</span><input id="'+id+'" type="number" min="0" step="1" inputmode="numeric" value="'+(heures > 0 ? h : "")+'" placeholder="'+dh+'" aria-label="Heures"></label><span>h</span>'+
    '<label class="f"><span class="sr-only">Minutes</span><input id="'+id+'-min" type="number" min="0" max="59" step="5" inputmode="numeric" value="'+(heures > 0 && m > 0 ? m : "")+'" placeholder="'+(heures > 0 ? "00" : (dm < 10 ? "0" : "") + dm)+'" aria-label="Minutes"></label><span>min</span></div>';
}
function brancherHeuresMinutes(racine, id, surValeur, surChange){
  var iH = racine.querySelector("#" + id), iM = racine.querySelector("#" + id + "-min");
  function lire(){
    var h = Number(lireNombre(iH.value)) || 0, m = Math.min(59, Math.max(0, Number(lireNombre(iM.value)) || 0));
    surValeur(iH.value === "" && iM.value === "" ? 0 : Math.max(0, h + m / 60));
  }
  iH.addEventListener("input", lire); iM.addEventListener("input", lire);
  if (surChange){ iH.addEventListener("change", surChange); iM.addEventListener("change", surChange); }
}
function friseCommande(c){
  var et = etapeCommande(c);
  var ETAPES = [["devis","Devis"],["acceptee","À fabriquer"],["encours","En fabrication"],["terminee","Prête"],["livree","Livrée"],["afacturer","Facturée"],["soldee","Payée"]];
  var rang = {devis:0, acceptee:1, encours:2, terminee:3, afacturer:4, aencaisser:5, soldee:6, livree:4}[et.k];
  if (et.k === "aencaisser") rang = 5;
  var z = el('<div class="card frise-card"><div class="body"><ol class="frise" aria-label="Étapes de la commande"></ol><div class="frise-act"></div></div></div>');
  var ol = z.querySelector(".frise");
  if (c.statut === "annulee"){ z.querySelector(".body").innerHTML = '<p style="margin:0"><b>Commande annulée.</b> Elle reste dans ta liste, pour mémoire.</p>'; return z; }
  ETAPES.forEach(function(e, i){
    var k = i < rang ? "faite" : i === rang ? "cur" : "";
    ol.appendChild(el('<li class="'+k+'"><span class="pt" aria-hidden="true">'+(i < rang ? "✓" : i + 1)+'</span><span class="lb">'+esc(e[1])+'</span></li>'));
  });
  var act = z.querySelector(".frise-act");
  function passer(st, lib){
    var sel = document.querySelector('[data-c="statut"]');
    if (sel){ sel.value = st; sel.dispatchEvent(new Event("change", {bubbles:true})); }
    else { c.statut = st; sauverTout(); render(); }
    if (lib) toast(lib);
  }
  var b = null;
  if (c.statut === "devis") b = bouton(et.relancer ? "Accord reçu : à fabriquer" : "Accord reçu : à fabriquer", function(){ c.accordLe = c.accordLe || Date.now(); passer("acceptee", "Commande acceptée : à fabriquer"); }, true);
  else if (c.statut === "acceptee") b = bouton("Je commence la fabrication", function(){ passer("encours", "En fabrication"); }, true);
  else if (c.statut === "encours") b = bouton("C'est prêt", function(){ passer("terminee", "Prête à remettre ou à envoyer"); }, true);
  else if (c.statut === "terminee") b = bouton("C'est livré", function(){ passer("livree", "Livrée"); }, true);
  else if (c.statut === "livree" && !c.factureNum) b = bouton("Passer à la facture", function(){ var x = document.getElementById("cmd-facture"); if (x){ x.scrollIntoView({behavior:"smooth", block:"start"}); var bx = x.querySelector("button.primary, button"); if (bx) bx.focus(); } }, true);
  else if (c.statut === "livree" && soldeDu(c) > 0.004) b = bouton("Noter un règlement de " + eur(soldeDu(c)), function(){ var x = document.getElementById("cmd-p-m"); if (x){ x.scrollIntoView({behavior:"smooth", block:"center"}); x.focus(); } }, true);
  if (b) act.appendChild(b);
  act.appendChild(el('<span class="hint">'+esc(et.action ? (et.k === "soldee" ? "Tout est réglé." : "Prochaine étape : " + et.action.charAt(0).toLowerCase() + et.action.slice(1) + ".") : "")+'</span>'));
  if (c.statut === "devis") { var bA = bouton("Annuler la commande", function(){ passer("annulee", "Commande annulée"); }); bA.classList.add("sm"); act.appendChild(bA); }
  return z;
}
function renderCommandeDetail(main, c){
  var back = bouton("← Retour aux commandes", function(){ retourParent(function(){ view.cmdVue = null; }); });
  back.classList.add("sm"); back.style.marginBottom = "16px";
  main.appendChild(back);
  main.appendChild(el('<div class="cmd-tete"><h1>Commande '+esc(c.num || "")+'</h1>'+
    '<p>'+esc(statutCmd(c.statut).nom)+(c.client && c.client.nom ? ' · '+esc(c.client.nom) : '')+
    (c.factureNum ? ' · facture <b>'+esc(c.factureNum)+'</b>'+(c.avoirNum ? ' (annulée par l\'avoir '+esc(c.avoirNum)+')' : '') : '')+'</p></div>'));

  function maj(){ delete c.brouillon; sauverTout(); }

  /* --- la frise : où en est la commande, et le seul bouton qui compte --- */
  main.appendChild(friseCommande(c));

  /* --- la cliente et ce qui est convenu --- */
  var cId = el('<div class="card" style="margin-bottom:16px"><header><h2>Ce qui est convenu</h2>'+
    '<p>L\'accord est conclu (par message, sur un marché, en boutique) ? '+
    'Note-le ici dès que c\'est décidé : ce sera ta trace écrite en cas de changement d\'avis.</p></header>'+
    '<div class="body"><div class="grid2">'+
      '<label class="f"><span>Commandé par</span><input data-c="nom" type="text" placeholder="Prénom et nom"></label>'+
      '<label class="f"><span>Contact</span><input data-c="contact" type="text" placeholder="téléphone, e-mail, Instagram…"></label>'+
    '</div>'+
    '<div class="articles-cmd" style="margin-top:14px">'+
      '<p style="margin:0 0 8px"><b>Ce qui est commandé</b> <span class="hint">— une ligne par article ; le prix est celui d\'une pièce</span></p>'+
      '<div class="art-l">'+
        '<label class="f art-cr"><span>Création</span><select data-c="cid"></select></label>'+
        '<label class="f art-d"><span>Nom de l\'article sur la facture</span><input data-c="libelle" type="text" placeholder="Lapin Céleste, 25 cm"></label>'+
        '<label class="f art-s"><span>Ce qui a été demandé en plus</span><input data-c="variantes" type="text" placeholder="coton bleu, prénom Léa brodé"></label>'+
        '<label class="f art-q"><span>Quantité</span><input data-c="qte" type="number" inputmode="numeric" min="1" step="1"></label>'+
        '<label class="f art-pu"><span>Prix convenu (€)</span><input data-c="prixConvenu" type="number" min="0" step="0.5"></label>'+
      '</div>'+
      '<div id="cmd-articles"></div>'+
      '<div class="art-pied"><button type="button" class="btn sm" id="cmd-art-add">+ Ajouter un article</button>'+
      '<p class="art-total" id="cmd-art-tot" aria-live="polite"></p></div>'+
    '</div>'+
    '<details class="cmd-plus" style="margin-top:14px"><summary>Adresse, facture pour une entreprise, pièce personnalisée</summary>'+
    '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;cursor:pointer">'+
      '<input type="checkbox" data-c="clientePro" style="margin-top:3px;width:18px;height:18px;flex:none">'+
      '<span><b>Achat professionnel</b> : une boutique, une entreprise, une association, '+
      'et non un achat personnel. Les mentions obligatoires de la facture sont adaptées.</span></label>'+
    '<label class="f" id="cmd-adr" style="margin-top:10px"><span>Adresse de facturation <span class="hint" id="cmd-adr-aide">(facultative pour un achat personnel)</span></span>'+
      '<input data-c="adresse" type="text" placeholder="rue, code postal, ville"></label>'+
    '<div class="grid2" style="margin-top:10px">'+
      '<label class="f" id="cmd-siren"><span>SIREN de la structure qui achète (9 chiffres, sur ses factures)</span><input data-c="siren" type="text" inputmode="numeric" placeholder="9 chiffres"></label>'+
      '<label class="f"><span>Adresse de livraison, si différente</span><input data-c="adresseLivraison" type="text" placeholder="rue, code postal, ville"></label>'+
      '<label class="f" id="cmd-ref"><span>N° de bon de commande, s\'il y en a un</span><input data-c="refClient" type="text" maxlength="60" placeholder="obligatoire sur la facture s\'il existe"></label>'+
    '</div>'+
    '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;cursor:pointer">'+
      '<input type="checkbox" data-c="personnalisee" style="margin-top:3px;width:18px;height:18px;flex:none">'+
      '<span><b>Pièce personnalisée</b> : faite sur demande '+
      '(prénom, couleurs choisies, mesures).</span></label>'+
    '<p class="hint" id="cmd-retract" style="margin-top:6px"></p></details>'+
    '<div class="grid3" style="margin-top:12px">'+
      '<label class="f"><span>Livraison facturée (€)</span><input data-c="fraisLivraison" type="number" min="0" step="0.5"></label>'+
      '<label class="f"><span>Promise pour le</span><input data-c="datePromise" type="date"></label>'+
    '</div>'+
    '<div class="grid2" style="margin-top:10px">'+
      '<label class="f"><span>Statut</span><select data-c="statut"></select></label>'+
      '<label class="f"><span>Où elle est vendue</span><select data-c="canal"></select></label>'+
    '</div>'+
    '<label class="f" style="margin-top:10px"><span>Note</span><input data-c="note" type="text" placeholder="livrée au marché de Noël, cadeau d\'anniversaire…"></label>'+
    '<div class="savebar" style="margin-top:14px"></div>'+
    '</div></div>');

  var selCr = cId.querySelector('[data-c="cid"]');
  selCr.appendChild(el('<option value="">— aucune, pièce libre —</option>'));
  state.creations.forEach(function(cr){
    if (cr.archive && c.cid !== cr.id) return;
    selCr.appendChild(el('<option value="'+esc(cr.id)+'"'+(c.cid===cr.id?' selected':'')+'>'+esc(cr.nom)+'</option>'));
  });
  var selSt = cId.querySelector('[data-c="statut"]');
  STATUTS_CMD.forEach(function(s){
    /* Une commande facturée a été acceptée : elle ne redevient pas un devis. */
    var interdit = s.id === "devis" && factureActive(c) && c.statut !== "devis";
    selSt.appendChild(el('<option value="'+esc(s.id)+'"'+(c.statut===s.id?' selected':'')+(interdit?' disabled':'')+'>'+esc(s.nom)+'</option>'));
  });
  var selCa = cId.querySelector('[data-c="canal"]');
  state.canaux.forEach(function(k){
    selCa.appendChild(el('<option value="'+esc(k.id)+'"'+(c.canal===k.id?' selected':'')+'>'+esc(k.nom)+'</option>'));
  });
  cId.querySelector('[data-c="nom"]').value      = (c.client && c.client.nom) || "";
  cId.querySelector('[data-c="contact"]').value  = (c.client && c.client.contact) || "";
  cId.querySelector('[data-c="libelle"]').value  = c.libelle || "";
  cId.querySelector('[data-c="variantes"]').value= c.variantes || "";
  cId.querySelector('[data-c="prixConvenu"]').value = c.prixConvenu || 0;
  cId.querySelector('[data-c="qte"]').value = Math.max(1, Number(c.qte) || 1);
  cId.querySelector('[data-c="refClient"]').value = c.refClient || "";
  cId.querySelector('[data-c="fraisLivraison"]').value = c.fraisLivraison || 0;
  cId.querySelector('[data-c="datePromise"]').value = c.datePromise || "";
  cId.querySelector('[data-c="note"]').value     = c.note || "";
  cId.querySelector('[data-c="personnalisee"]').checked = !!c.personnalisee;
  cId.querySelector('[data-c="clientePro"]').checked = !!c.clientePro;
  if (c.clientePro || c.personnalisee || (c.client && (c.client.adresse || c.client.adresseLivraison))) cId.querySelector(".cmd-plus").open = true;
  cId.querySelector('[data-c="adresse"]').value = (c.client && c.client.adresse) || "";
  cId.querySelector('[data-c="siren"]').value = (c.client && c.client.siren) || "";
  cId.querySelector('[data-c="adresseLivraison"]').value = (c.client && c.client.adresseLivraison) || "";
  function majPro(){
    cId.querySelector("#cmd-siren").hidden = !c.clientePro;
    cId.querySelector("#cmd-ref").hidden = !c.clientePro;
    cId.querySelector("#cmd-adr-aide").textContent = c.clientePro ? "(obligatoire pour un achat professionnel)" : "(facultative pour un achat personnel)";
  }
  majPro();
  /* Facture émise : ce qu'elle dit ne doit plus pouvoir diverger de la
     commande. On verrouille, et on explique comment corriger (un avoir). */
  if (factureActive(c)){
    ["nom","contact","adresse","siren","adresseLivraison","libelle","variantes","prixConvenu","qte","refClient","fraisLivraison","clientePro","personnalisee","cid","canal"].forEach(function(k){
      var ch = cId.querySelector('[data-c="'+k+'"]'); if (ch){ ch.disabled = true; ch.title = "Verrouillé : une facture a été émise."; }
    });
  }

  /* --- articles supplémentaires --- */
  var zArt = cId.querySelector("#cmd-articles"), totArt = cId.querySelector("#cmd-art-tot");
  var verrou = factureActive(c);
  function majTotalArticles(){
    var n = 0; articlesCommande(c).forEach(function(a){ n += a.q; });
    totArt.innerHTML = 'Total des articles : <b>'+esc(eur(montantArticles(c)))+'</b>'+(n > 1 ? ' · '+esc(pluriel(n, "pièce", "pièces")) : '')+
      (Number(c.fraisLivraison) > 0 ? ' · avec la livraison : <b>'+esc(eur(totalDu(c)))+'</b>' : '');
  }
  function optionsCreations(sel){
    return '<option value="">— pièce libre —</option>' + state.creations.filter(function(cr){ return !cr.archive || cr.id === sel; })
      .map(function(cr){ return '<option value="'+esc(cr.id)+'"'+(cr.id === sel ? ' selected' : '')+'>'+esc(cr.nom)+'</option>'; }).join("");
  }
  function peindreArticles(){
    zArt.innerHTML = "";
    (c.articles || []).forEach(function(a, i){
      var row = el('<div class="art-l art-sup" data-i="'+i+'">'+
        '<label class="f art-cr"><span>Création</span><select data-a="cid">'+optionsCreations(a.cid)+'</select></label>'+
        '<label class="f art-d"><span>Désignation</span><input data-a="d" type="text" value="'+esc(a.d || "")+'" placeholder="'+esc(a.cid && creation(a.cid) ? creation(a.cid).nom : "Snood assorti")+'"></label>'+
        '<label class="f art-s"><span>Précisions</span><input data-a="s" type="text" value="'+esc(a.s || "")+'"></label>'+
        '<label class="f art-q"><span>Quantité</span><input data-a="q" type="number" inputmode="numeric" min="0" step="1" value="'+(Number(a.q)||0)+'"></label>'+
        '<label class="f art-pu"><span>Prix convenu (€)</span><input data-a="pu" type="number" min="0" step="0.5" value="'+(Number(a.pu)||0)+'"></label>'+
        '<button type="button" class="btn ghost art-x" data-a="del" aria-label="Retirer l\'article '+esc(a.d || (a.cid && creation(a.cid) ? creation(a.cid).nom : String(i + 2)))+'">✕</button></div>');
      if (verrou) [].forEach.call(row.querySelectorAll("input,select,button"), function(x){ x.disabled = true; x.title = "Verrouillé : une facture a été émise."; });
      zArt.appendChild(row);
    });
    majTotalArticles();
  }
  peindreArticles();
  zArt.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-a"), row = e.target.closest("[data-i]"); if (!k || !row || verrou) return;
    var a = c.articles[Number(row.getAttribute("data-i"))]; if (!a) return;
    if (k === "q") a.q = Math.max(0, Math.round(Number(e.target.value) || 0));
    else if (k === "pu") a.pu = Math.max(0, Number(e.target.value) || 0);
    else if (k === "d" || k === "s") a[k] = e.target.value;
    majTotalArticles(); maj();
  });
  zArt.addEventListener("change", function(e){
    var k = e.target.getAttribute("data-a"), row = e.target.closest("[data-i]"); if (!k || !row || verrou) return;
    var a = c.articles[Number(row.getAttribute("data-i"))]; if (!a) return;
    if (k === "cid"){
      a.cid = e.target.value || null;
      var crA = a.cid ? creation(a.cid) : null;
      if (crA && !(Number(a.pu) > 0)) a.pu = Number(crA.prix) || 0;
      maj(); render();
    } else if ((k === "q" || k === "pu") && c.accordLe){
      journaliser(c, "Article « " + (a.d || (a.cid && creation(a.cid) ? creation(a.cid).nom : "sans nom")) + " » : " + a.q + " × " + eur(a.pu) + " (après l'accord)");
      maj();
    }
  });
  zArt.addEventListener("click", function(e){
    if (e.target.getAttribute("data-a") !== "del" || verrou) return;
    var i = Number(e.target.closest("[data-i]").getAttribute("data-i"));
    var a = c.articles[i]; if (!a) return;
    c.articles.splice(i, 1);
    if (c.accordLe) journaliser(c, "Article retiré : « " + (a.d || (a.cid && creation(a.cid) ? creation(a.cid).nom : "sans nom")) + " » (" + a.q + " × " + eur(a.pu) + ")");
    maj(); render();
  });
  var bArt = cId.querySelector("#cmd-art-add");
  if (verrou) bArt.hidden = true;
  bArt.addEventListener("click", function(){
    c.articles = c.articles || [];
    c.articles.push({id:"art_" + uid(), cid:null, d:"", s:"", q:1, pu:0});
    if (c.accordLe) journaliser(c, "Article ajouté (après l'accord)");
    maj(); render();
    setTimeout(function(){ var rs = document.querySelectorAll("#cmd-articles [data-a=\"cid\"]"); if (rs.length) rs[rs.length - 1].focus(); }, 0);
  });

  /* Le droit de rétractation est le piège le plus coûteux de la vente à
     distance : 14 jours pendant lesquels la cliente peut rendre la pièce sans
     motif — sauf si elle est personnalisée. L'outil le dit au moment où la
     case est cochée, pas dans des conditions générales que personne ne lit. */
  function majRetract(){
    var z = cId.querySelector("#cmd-retract");
    if (c.clientePro){
      z.innerHTML = 'Vente professionnelle : le droit de rétractation du code de la '+
        'consommation ne s\'applique pas, car il ne protège que les achats faits à titre personnel. C\'est ce que '+
        'vous avez convenu ensemble qui fait foi.';
      return;
    }
    z.innerHTML = c.personnalisee
      ? 'Une pièce faite sur demande <b>n\'ouvre pas de droit de '+
        'rétractation</b> (article L221-28 du code de la consommation). La mention sera '+
        'portée sur la facture, à condition de l\'avoir annoncé <b>avant</b> de commencer.'
      : 'Vente à distance : la personne qui achète dispose de <b>14 jours pour se rétracter</b> après '+
        'réception, sans avoir à se justifier (article L221-18). En vente en main propre '+
        'sur un marché, ce délai ne s\'applique pas.';
  }
  majRetract();

  cId.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-c"); if (!k) return;
    if (factureActive(c) && k !== "note" && k !== "datePromise" && k !== "statut") return;
    if (k === "nom" || k === "contact" || k === "adresse" || k === "siren" || k === "adresseLivraison"){
      if (!c.client) c.client = {nom:"",contact:"",note:""};
      c.client[k] = e.target.value;
    } else if (k === "prixConvenu" || k === "fraisLivraison"){
      c[k] = Math.max(0, Number(e.target.value)||0);
      majTotalArticles();
    } else if (k === "qte"){
      c.qte = Math.max(1, Math.round(Number(e.target.value)||1));
      majTotalArticles();
    } else if (k === "personnalisee"){
      c.personnalisee = e.target.checked; majRetract();
    } else if (k === "clientePro"){
      c.clientePro = e.target.checked; majRetract(); majPro();
    } else {
      c[k] = e.target.value;
    }
    maj();
  });
  /* Après l'accord de la cliente, changer son nom, le prix convenu ou la
     livraison facturée laisse une trace datée dans l'historique : en cas de
     désaccord, on sait ce qui a été convenu et quand cela a changé. */
  var SUIVIS_ACCORD = {nom: "Commandé par", prixConvenu: "Prix convenu", fraisLivraison: "Livraison facturée", qte: "Quantité"};
  function valeurSuivie(k){ return k === "nom" ? ((c.client && c.client.nom) || "") : k === "qte" ? String(Math.max(1, Number(c.qte)||1)) : String(cts(Number(c[k])||0)); }
  cId.addEventListener("focusin", function(e){
    var k = e.target.getAttribute("data-c");
    if (SUIVIS_ACCORD[k]) e.target.setAttribute("data-avant", valeurSuivie(k));
  });
  cId.addEventListener("change", function(e){
    var k = e.target.getAttribute("data-c");
    if (!SUIVIS_ACCORD[k] || (c.statut === "devis" && !c.accordLe)) return;
    var av = e.target.getAttribute("data-avant"), ap = valeurSuivie(k);
    if (av === null || av === ap) return;
    var lire = function(v){ return k === "nom" ? "« " + (v || "sans nom") + " »" : k === "qte" ? v : eur(Number(v)); };
    journaliser(c, SUIVIS_ACCORD[k] + " : " + lire(av) + " → " + lire(ap) + " (après l'accord)");
    e.target.setAttribute("data-avant", ap);
    maj();
  });
  /* Seuls ces trois choix changent ce que l'écran doit afficher (le bilan
     dépend de la création et du canal, la liste dépend du statut) : eux seuls
     justifient de redessiner. Redessiner sur n'importe quel champ, comme on
     le faisait, reconstruisait la page dès qu'on passait au champ suivant —
     et pouvait emporter une saisie en cours. */
  cId.addEventListener("change", function(e){
    var k = e.target.getAttribute("data-c"); if (!k) return;
    if (k !== "cid" && k !== "statut" && k !== "canal") return;
    var avantSt = c.statut;
    if (k === "cid"){
      c.cid = e.target.value || null;
      /* Le prix de la fiche est proposé comme prix convenu, s'il n'y en a pas encore. */
      if (c.cid && creation(c.cid) && !(Number(c.prixConvenu) > 0)) c.prixConvenu = Number(creation(c.cid).prix) || 0;
    }
    else c[k] = e.target.value;
    if (k === "statut" && c.statut === "livree" && !c.livreeLe) c.livreeLe = aujourdhuiISO();
    /* Le bilan se fige à la livraison. Repasser par un autre statut puis
       revenir à « Livrée » garde le bilan d'origine si rien de ce qui le
       fonde n'a changé (prix, lieu de vente, création, livraison, heures). */
    if (k === "statut" && c.statut === "livree"){
      var bf = bilanCommande(c, true);
      var ancien = c.bilanFige, b0 = ancien && ancien.base, b1 = bf && bf.base;
      var inchange = ancien && (!b0 || (b1 && b0.prix === b1.prix && b0.canal === b1.canal && b0.cid === b1.cid &&
                                        b0.expedition === b1.expedition && Math.abs((b0.heures||0) - (b1.heures||0)) < 1e-9));
      if (bf && !inchange) c.bilanFige = bf;
    }
    if (k === "statut" && avantSt !== c.statut) journaliser(c, "Statut : " + statutCmd(avantSt).nom + " → " + statutCmd(c.statut).nom);
    /* Annuler une vente facturée, c'est aussi annuler sa facture (un avoir). */
    if (k === "statut" && c.statut === "annulee" && factureActive(c)){
      setTimeout(function(){
        confirmer({titre:"Cette commande a une facture active",
          texte:"La facture n° " + c.factureNum + " reste valable tant qu'elle n'est pas annulée par un avoir. Si la vente n'a pas lieu, établis l'avoir.",
          bouton:"Établir l'avoir maintenant", annuler:"Plus tard"}, function(){ lancerAvoir(c); });
      }, 60);
    }
    maj(); render();
  });

  /* Un lien vers la fiche de la création : c'est là que se trouvent les
     matières, le temps et le prix de revient de cette pièce. Sans ce
     passage, il fallait retraverser l'application à la main. */
  if (c.cid && creation(c.cid)){
    var lienCr = bouton("Ouvrir la fiche de « " + creation(c.cid).nom + " »", function(){
      ouvrirFiche(c.cid);
    });
    lienCr.classList.add("sm");
    lienCr.style.marginTop = "10px";
    cId.querySelector(".body").insertBefore(lienCr, cId.querySelector(".savebar"));
  }

  /* Vérification des saisies + bouton Enregistrer. */
  var verifCmd = attacherVerif(cId, [
    {sel:'[data-c="nom"]', type:"texte", requis:true, min:2, max:80, msgRequis:"Indique pour qui est la commande."},
    {sel:'[data-c="contact"]', type:"contact"},
    {sel:'[data-c="qte"]', type:"entier", requis:true, min:1, max:9999},
    {sel:'[data-c="prixConvenu"]', type:"prix", requis:true, max:100000},
    {sel:'[data-c="fraisLivraison"]', type:"prix", max:100000},
    {sel:'[data-c="datePromise"]', type:"date"},
    {sel:'[data-c="siren"]', type:"siren", requis:true, quand:function(){ return !!c.clientePro; }},
    {sel:'[data-c="adresse"]', type:"texte", requis:true, min:5, max:200, quand:function(){ return !!c.clientePro; }, msgRequis:"L'adresse est obligatoire pour un achat professionnel."},
    {sel:'[data-c="refClient"]', type:"texte", max:60},
    {sel:'[data-a="q"]', type:"entier", requis:true, min:0, max:9999},
    {sel:'[data-a="pu"]', type:"prix", requis:true, max:100000}
  ]);
  /* Figer l'accord : un horodatage, et le rappel de ce qui a été convenu. */
  var barAccord = cId.querySelector(".savebar");
  barAccord.classList.add("savebar-enreg");
  barAccord.appendChild(barreEnregistrer({verif: verifCmd, message: "Commande enregistrée ✓", surOk: function(){ delete c.brouillon; }}));
  if (!c.accordLe){
    barAccord.appendChild(bouton("Valider l'accord à la date du jour", function(){
      var errs = verifCmd.valider();
      if (errs.length){ toast(errs[0].lib + " : " + errs[0].msg); try{ errs[0].champ.focus(); }catch(e){} return; }
      if (!c.client || !c.client.nom){ toast("Note d'abord pour qui est la commande"); return; }
      if (!totalDu(c)){ toast("Note d'abord le prix convenu"); return; }
      c.accordLe = new Date().toISOString();
      if (c.statut === "devis") c.statut = "acceptee";
      journaliser(c, "Accord validé : " + eur(totalDu(c)) + " avec " + c.client.nom);
      sauverTout(); render(); toast("Accord validé");
    }, true));
  } else {
    barAccord.appendChild(el('<p class="hint" style="margin:0">Accord validé le <b>'+
      esc(dateLisible(c.accordLe))+'</b>.</p>'));
  }
  main.appendChild(cId);

  /* --- l'argent --- */
  var enc = encaisse(c), solde = soldeDu(c);
  var cArgent = el('<div class="card" style="margin-bottom:16px"><header><h2>L\'argent</h2>'+
    '<p>Ce qui a déjà été reçu, ce qui reste à recevoir.</p></header><div class="body">'+
    '<div class="tiles" style="margin-bottom:14px">'+
      '<div class="tile"><div class="k">Total de la commande</div><div class="v">'+esc(eur(totalDu(c)))+'</div></div>'+
      '<div class="tile"><div class="k">Déjà reçu</div><div class="v">'+esc(eur(enc))+'</div></div>'+
      (tropPercu(c) > 0
        ? '<div class="tile acc acc-warn"><div class="k">Trop-perçu</div><div class="v warn">'+esc(eur(tropPercu(c)))+'</div><div class="s">à rembourser ou à déduire</div></div>'
        : '<div class="tile acc '+(solde>0?"acc-warn":"acc-good")+'"><div class="k">Reste à recevoir</div>'+
          '<div class="v '+(solde>0?"warn":"good")+'">'+esc(eur(solde))+'</div></div>')+
    '</div>'+
    '<div class="grid3" style="align-items:end">'+
      '<label class="f"><span>Versement à la commande (€)</span><input id="cmd-ac-m" type="number" min="0" step="0.5"></label>'+
      '<label class="f"><span>Type de versement</span><select id="cmd-ac-t">'+
        '<option value="acompte">Un acompte</option><option value="arrhes">Des arrhes</option></select></label>'+
      '<label class="f"><span>Reçu le</span><input id="cmd-ac-d" type="date"></label>'+
    '</div>'+
    '<p class="hint" id="cmd-ac-aide" style="margin-top:6px"></p>'+
    '<div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--rule)">'+
      '<p style="margin:0 0 10px"><b>Règlements suivants</b></p>'+
      '<div id="cmd-paie"></div>'+
      '<div class="grid3" style="align-items:end;margin-top:10px">'+
        '<label class="f"><span>Montant (€)</span><input id="cmd-p-m" type="number" min="0" step="0.5" value="'+(solde||0)+'"></label>'+
        '<label class="f"><span>Moyen de paiement</span><select id="cmd-p-moy">'+optionsMoyens("virement")+'</select></label>'+
        '<label class="f"><span>Date</span><input id="cmd-p-d" type="date"></label>'+
      '</div>'+
      '<div class="savebar" style="margin-top:10px"><button type="button" class="btn" id="cmd-p-add">Enregistrer ce règlement</button></div>'+
    '</div></div></div>');

  var inM = cArgent.querySelector("#cmd-ac-m"), inT = cArgent.querySelector("#cmd-ac-t"),
      inD = cArgent.querySelector("#cmd-ac-d");
  inM.value = (c.versement && c.versement.montant) || 0;
  inT.value = (c.versement && c.versement.type) || "acompte";
  inD.value = (c.versement && c.versement.date) || "";
  function majAideVersement(){
    cArgent.querySelector("#cmd-ac-aide").innerHTML = inT.value === "arrhes"
      ? '<b>Arrhes</b> : la personne qui commande peut renoncer en les perdant, mais si c\'est toi qui '+
        'renonces, tu dois lui rendre <b>le double</b> (article L214-1 du code de la consommation). '+
        'Attention : si rien n\'est précisé sur la facture, la loi considère que les sommes '+
        'versées sont des arrhes.'
      : '<b>Acompte</b> : la vente est ferme des deux côtés. En cas de désistement de l\'autre partie, '+
        'le prix reste dû ; si tu renonces, tu rembourses ce qui a été versé. C\'est ce qui protège '+
        'le mieux le travail déjà engagé : annonce-le clairement avant de commencer.';
  }
  majAideVersement();
  if (factureActive(c)){ [inM, inT, inD].forEach(function(x){ x.disabled = true; x.title = "Verrouillé : une facture a été émise."; }); }
  cArgent.addEventListener("input", function(e){
    if (factureActive(c) && (e.target === inM || e.target === inD)) return;
    if (!c.versement) c.versement = {montant:0, date:null, type:"acompte"};
    /* Redessiner pendant la frappe effaçait la virgule : « 12,5 » devenait 125. */
    if (e.target === inM){ c.versement.montant = Math.max(0, Number(e.target.value)||0); maj(); }
    if (e.target === inD){ c.versement.date = e.target.value; maj(); }
  });
  inM.addEventListener("change", function(){
    journaliser(c, (inT.value === "arrhes" ? "Arrhes" : "Acompte") + " à la commande : " + eur(Number(inM.value)||0));
    sauverTout();
    /* Après le déplacement du focus : le champ suivant le garde. */
    setTimeout(render, 0);
  });
  inT.addEventListener("change", function(){
    if (!c.versement) c.versement = {montant:0, date:null, type:"acompte"};
    c.versement.type = inT.value; majAideVersement(); maj();
  });

  var zp = cArgent.querySelector("#cmd-paie");
  if (!(c.paiements||[]).length){
    zp.appendChild(el('<p class="hint" style="margin:0">Aucun règlement enregistré après le versement initial.</p>'));
  } else {
    c.paiements.forEach(function(p, i){
      var m = Number(p.montant) || 0;
      var ts = dateVersTs(p.date);
      var ligne = el('<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;'+
        'padding:6px 0;border-bottom:1px solid var(--rule)">'+
        '<span>'+esc(ts ? new Date(ts).toLocaleDateString("fr-FR") : "sans date")+
        (p.moyen ? ' · '+esc(libelleMoyen(p.moyen)) : '')+(p.annule ? ' · <i>annulé</i>' : '')+'</span>'+
        '<span style="display:flex;align-items:center;gap:10px"><b'+(m < 0 ? ' style="color:var(--bad)"' : '')+'>'+esc(eur(m))+'</b></span></div>');
      /* Une erreur de saisie se corrige par une ligne d'annulation datée,
         jamais en effaçant : le compte reste vérifiable. */
      if (m > 0 && !p.annule){
        var bA = el('<button type="button" class="btn sm ghost">Annuler ce règlement</button>');
        bA.addEventListener("click", function(){
          confirmer({titre:"Annuler ce règlement de " + eur(m) + " ?",
            texte:"Une ligne d'annulation datée d'aujourd'hui sera ajoutée : ton encaissé baisse de " + eur(m) + ". Utilise-le pour une erreur de saisie ou un paiement refusé.",
            bouton:"Annuler le règlement", annuler:"Garder le règlement", danger:true}, function(){
            p.annule = true;
            c.paiements.push({montant:-m, moyen:"annulation du règlement" + (ts ? " du " + new Date(ts).toLocaleDateString("fr-FR") : ""),
                              date:aujourdhuiISO(), saisiLe:Date.now()});
            journaliser(c, "Règlement de " + eur(m) + " annulé");
            sauverTout(); render(); toast("Règlement annulé");
          });
        });
        ligne.lastChild.appendChild(bA);
      }
      zp.appendChild(ligne);
    });
  }
  cArgent.querySelector("#cmd-p-add").addEventListener("click", function(){
    var m = cts(Number(cArgent.querySelector("#cmd-p-m").value)||0);
    if (!(m > 0)){ toast("Indique un montant supérieur à 0."); return; }
    var dP = cArgent.querySelector("#cmd-p-d").value || aujourdhuiISO();
    var suite = function(){
      c.paiements = c.paiements || [];
      c.paiements.push({montant:m, moyen:cArgent.querySelector("#cmd-p-moy").value, date:dP, saisiLe:Date.now()});
      journaliser(c, "Règlement reçu : " + eur(m));
      sauverTout(); render(); toast("Règlement de " + eur(m) + " enregistré.");
    };
    /* Garde-fou : un règlement bien plus élevé que ce qui reste dû est
       presque toujours une erreur de frappe. */
    var reste = soldeDu(c);
    if (m > reste + 0.009) confirmer({titre:"Ce règlement dépasse ce qui reste à recevoir",
      texte:"Il reste " + eur(reste) + " à payer et tu notes " + eur(m) + ". Vérifie le montant, virgule comprise.",
      bouton:"Enregistrer quand même", annuler:"Corriger"}, suite);
    else suite();
  });
  /* Commande annulée avec de l'argent déjà reçu : soit tu le gardes (arrhes
     perdues par la cliente), soit tu le rends. Le remboursement retire la
     somme de ton chiffre d'affaires à la date où tu le fais. */
  if (c.statut === "annulee" && enc > 0){
    var zR = el('<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--rule)">'+
      '<p style="margin:0 0 6px"><b>Commande annulée : ' + esc(eur(enc)) + ' déjà reçus</b></p>'+
      '<p class="hint" style="margin:0 0 10px">Si tu gardes cette somme (arrhes gardées après un désistement, travail déjà engagé), il n\'y a rien à faire : '+
      'elle reste dans ton chiffre d\'affaires. Si tu la rends, note-le ici.</p></div>');
    function rembourser(montant, lib){
      confirmer({titre:"Noter un remboursement de " + eur(montant) + " ?",
        texte:"Une ligne de remboursement datée d'aujourd'hui sera ajoutée, et ton argent reçu baissera d'autant.",
        bouton:"Noter le remboursement"}, function(){
        c.paiements = c.paiements || [];
        c.paiements.push({montant:-montant, moyen:lib, date:aujourdhuiISO(), saisiLe:Date.now()});
        journaliser(c, "Remboursement de " + eur(montant) + " (" + lib + ")");
        sauverTout(); render(); toast("Remboursement noté");
      });
    }
    zR.appendChild(bouton("J'ai remboursé " + eur(enc), function(){ rembourser(enc, "remboursement"); }));
    /* Arrhes et c'est l'artisane qui renonce : la loi impose de rendre le
       double (article L214-1 du code de la consommation). */
    if (c.versement && c.versement.type === "arrhes" && Number(c.versement.montant) > 0){
      var arr = cts(c.versement.montant);
      var bD = bouton("J'ai renoncé : j'ai rendu le double des arrhes (" + eur(enc + arr) + ")", function(){ rembourser(cts(enc + arr), "arrhes rendues au double"); });
      bD.style.marginLeft = "8px";
      zR.appendChild(bD);
    }
    cArgent.querySelector(".body").appendChild(zR);
  }
  main.appendChild(cArgent);

  /* --- ce que cette commande te rapporte vraiment --- */
  var b = bilanCommande(c);
  if (b){
    var cB = el('<div class="card" style="margin-bottom:16px"><header><h2>Ce qu\'elle te rapporte</h2>'+
      '<p>Au prix convenu, une fois les matières, le temps et les frais comptés.</p></header>'+
      '<div class="body"><div class="tiles">'+
        '<div class="tile"><div class="k">Tes frais + ton temps</div><div class="v">'+esc(eur(b.r.coutRevient))+
          '</div><div class="s">matières, frais, cotisations et ton temps payé à ton objectif</div></div>'+
        '<div class="tile"><div class="k">Temps prévu</div><div class="v">'+esc(dureeTexte(b.heures*60))+
          '</div><div class="s">'+(Number(c.heuresEstimees)>0?'saisi à la main':'d\'après la fiche')+'</div></div>'+
        '<div class="tile acc '+(b.gainHoraire >= (b.tauxHoraire !== undefined ? b.tauxHoraire : (state.reglages.tauxHoraire||0)) - 0.005 ? "acc-good":"acc-warn")+'">'+
          '<div class="k">Gain de l\'heure</div>'+
          '<div class="v '+(b.gainHoraire >= (state.reglages.tauxHoraire||0) ? "good":"warn")+'">'+
          esc(eur(b.gainHoraire))+'</div><div class="s">tu vises '+esc(eur(state.reglages.tauxHoraire))+' / h</div></div>'+
        '<div class="tile"><div class="k">Prix conseillé</div><div class="v">'+
          esc(eur(b.r.prixObjectif))+'</div><div class="s">sur le canal de vente choisi</div></div>'+
      '</div>'+
      '<div class="f" style="max-width:340px;margin-top:14px"><span>Temps de travail pour cette commande</span>'+champsHeuresMinutes("cmd-h", c.heuresEstimees, b.heures)+'</div>'+
      '<p class="hint">Laisse vide pour utiliser le temps de la fiche. Mets le temps total que demande '+
      'cette pièce (mesuré ou estimé) : il sert au calcul de ton gain à l\'heure et à ton plan de travail.</p>'+
      '</div></div>');
    brancherHeuresMinutes(cB, "cmd-h", function(h){ c.heuresEstimees = h; maj(); }, function(){ setTimeout(render, 0); });
    main.appendChild(cB);
    if (b.r.prixObjectif > 0 && totalDu(c) > 10 * b.r.prixObjectif)
      main.appendChild(el('<div class="banner" role="status" style="background:var(--warn-soft);border-color:var(--warn);margin-bottom:16px">'+
        '<p><b>Vérifie le prix convenu.</b> Il est plus de dix fois le prix conseillé pour cette création ('+esc(eur(b.r.prixObjectif))+') : une virgule oubliée ?</p></div>'));
    if (b.gainHoraire < (state.reglages.tauxHoraire||0) && totalDu(c) > 0){
      main.appendChild(el('<div class="banner" style="background:var(--warn-soft);border-color:var(--warn);margin-bottom:16px">'+
        '<p><b>À ce prix, tu te paies '+esc(eur(b.gainHoraire))+' de l\'heure</b> au lieu des '+
        esc(eur(state.reglages.tauxHoraire))+' que tu vises. Ce n\'est pas forcément une erreur, '+
        'mais assure-toi que c\'est un choix. Prix conseillé : '+
        '<b>'+esc(eur(b.r.prixObjectif))+'</b>.</p></div>'));
    }
  } else {
    /* Pièce libre, sans fiche : le temps reste indispensable au plan de
       travail, sinon cette commande ne pèserait rien. */
    var cH = el('<div class="card" style="margin-bottom:16px"><header><h2>Temps de travail</h2>'+
      '<p>Relie cette commande à une de tes créations (plus haut) pour voir ce qu\'elle te rapporte à l\'heure. '+
      'Sinon, indique au moins le temps qu\'elle demande : il compte dans ton plan de travail.</p></header>'+
      '<div class="body"><div class="f" style="max-width:340px"><span>Temps de travail pour cette commande</span>'+champsHeuresMinutes("cmd-h", c.heuresEstimees, 0)+'</div></div></div>');
    brancherHeuresMinutes(cH, "cmd-h", function(h){ c.heuresEstimees = h; maj(); }, null);
    main.appendChild(cH);
  }

  /* --- ce qu'il faut pour la fabriquer --- */
  if (c.statut !== "livree" && c.statut !== "annulee"){
    var bes = besoinsCommande(c), midsB = Object.keys(bes);
    if (midsB.length){
      var cBes = el('<div class="card" style="margin-bottom:16px"><header><h2>Ce qu\'il faut pour la fabriquer</h2>'+
        '<p>Les matières de toutes les pièces encore à faire, pertes comprises, face à ton stock.</p></header>'+
        '<div class="body"><div class="tablewrap"><table><thead><tr><th>Matière</th><th class="n">Besoin</th><th class="n">En stock</th><th class="n">À acheter</th></tr></thead><tbody></tbody></table></div></div></div>');
      var aAcheter = 0;
      midsB.forEach(function(mid){
        var m = matiere(mid); if (!m) return;
        var manque = Math.max(0, bes[mid] - Math.max(0, Number(m.stock) || 0));
        var lots = manque > 0 && m.contenance > 0 ? Math.ceil(manque / m.contenance - 1e-9) : 0;
        if (lots) aAcheter += lots * (Number(m.prix) || 0);
        var mo = meilleureOffre(m);
        cBes.querySelector("tbody").appendChild(el('<tr><td>'+esc(m.nom)+'</td><td class="n">'+esc(qte(Math.round(bes[mid] * 10) / 10, m.unite))+'</td>'+
          '<td class="n">'+esc(qte(Math.max(0, Number(m.stock) || 0), m.unite))+'</td>'+
          '<td class="n">'+(lots ? '<b>'+esc(pluriel(lots, "lot", "lots"))+'</b> de '+esc(qte(m.contenance, m.unite))+
            (mo ? '<div class="hint" style="margin:2px 0 0;font-size:11px">moins cher : '+esc(fournisseur(mo.fid).nom)+'</div>' : '') : '<span class="good">en stock</span>')+'</td></tr>'));
      });
      if (aAcheter > 0) cBes.querySelector(".body").appendChild(el('<p class="hint" style="margin:10px 0 0">À acheter : environ <b>'+esc(eur(aAcheter))+'</b> au dernier prix payé. '+
        'Ton stock sert aussi à tes autres commandes : vérifie-le si plusieurs sont en cours.</p>'));
      main.appendChild(cBes);
    }
  }

  /* --- la facture --- */
  var manques = manquesFacture(c);
  var cF = el('<div class="card" id="cmd-facture" style="margin-bottom:16px"><header><h2>Facture</h2>'+
    '<p>Numérotée à la suite de tes factures, avec les mentions obligatoires. Le numéro commence par un code '+
    'qui n\'appartient qu\'à toi.</p></header><div class="body"></div></div>');
  var bodyF = cF.querySelector(".body");
  (c.anciennesFactures || []).forEach(function(x){
    bodyF.appendChild(el('<p class="hint" style="margin:0 0 6px">Facture <b>'+esc(x.num)+'</b> du '+esc(dateLisible(x.le))+
      ', annulée par l\'avoir <b>'+esc(x.avoir)+'</b>.</p>'));
  });
  if (c.factureNum){
    bodyF.appendChild(el('<p style="margin:0">Facture <b>'+esc(c.factureNum)+'</b>, émise le '+esc(dateLisible(c.factureLe))+'.'+
      (c.avoirNum ? ' Annulée par l\'avoir <b>'+esc(c.avoirNum)+'</b> du '+esc(dateLisible(c.avoirLe))+'.' : '')+'</p>'));
    if (factureActive(c)) bodyF.appendChild(el('<p class="hint" style="margin:6px 0 0">Une facture émise ne se modifie plus : '+
      'le nom, les prix et l\'acompte sont verrouillés. Pour corriger ou annuler, établis un avoir, puis une nouvelle facture si besoin.</p>'));
  } else if (manques.length){
    /* Ce qui manque est dit tout de suite, avec le moyen de le compléter. */
    var zM = el('<div class="manques"><p style="margin:0 0 6px"><b>Pour établir la facture, il manque :</b></p><ul></ul></div>');
    var ulM = zM.querySelector("ul");
    manques.forEach(function(x){
      var li = el('<li><span>'+esc(x.t)+'</span></li>');
      if (x.a){ var b = bouton(x.lib, x.a); b.classList.add("sm"); li.appendChild(b); }
      else if (x.champ){
        var b2 = bouton("Compléter", function(){ var ch = document.querySelector(x.champ); if (ch){ ch.scrollIntoView({block:"center"}); ch.focus(); } });
        b2.classList.add("sm"); li.appendChild(b2);
      }
      ulM.appendChild(li);
    });
    bodyF.appendChild(zM);
  } else {
    bodyF.appendChild(el('<p style="margin:0" class="hint">Aucune facture émise pour cette commande.</p>'));
  }
  var barF = el('<div class="savebar" style="margin-top:12px"></div>');
  bodyF.appendChild(barF);
  function occupe(b, t){ b.disabled = true; b.textContent = t; }
  if (c.factureNum){
    barF.appendChild(bouton("Revoir la facture", function(){ ouvrirFacture(c); }));
    if (c.avoir) barF.appendChild(bouton("Revoir l'avoir", function(){ ouvrirDocument(c.avoir); }));
  }
  if (factureActive(c)){
    var bAv = bouton("Annuler la facture par un avoir", function(){ lancerAvoir(c, bAv); });
    bAv.classList.add("ghost");
    barF.appendChild(bAv);
  }
  if (c.avoirNum && c.statut !== "annulee"){
    barF.appendChild(bouton("Établir une nouvelle facture", function(){
      (c.anciennesFactures = c.anciennesFactures || []).push({num:c.factureNum, le:c.factureLe, avoir:c.avoirNum, avoirLe:c.avoirLe});
      c.factureNum = null; c.factureLe = null; c.facture = null; c.avoirNum = null; c.avoirLe = null; c.avoir = null;
      journaliser(c, "Commande rouverte pour une nouvelle facture");
      sauverTout(); render(); toast("Tu peux corriger la commande puis établir la nouvelle facture.");
    }));
  }
  if (!c.factureNum){
    var bF = bouton("Établir la facture", function(){
      var m2 = manquesFacture(c);
      if (m2.length){ toast("Il manque encore : " + m2.map(function(x){ return x.t; }).join(", ") + "."); return; }
      if (!enFranchiseTVA()){
        confirmer({titre:"Tu as dépassé le seuil de franchise de TVA",
          texte:"Au-delà de ce seuil, tes factures doivent porter la TVA, et la mention « TVA non applicable » devient fausse. "+
                "Crochompte ne calcule pas encore la TVA : établis cette facture avec un logiciel de facturation, "+
                "et rapproche-toi de ton service des impôts des entreprises.", bouton:"Compris"}, function(){});
        return;
      }
      var F = instantaneFacture(c);
      var det = ["Destinataire : " + F.client.nom];
      F.lignes.forEach(function(l){ det.push(l.d + " : " + eur(l.m)); });
      det.push("Total : " + eur(F.total));
      if ((F.versements || []).length) det.push("Déjà payé : " + eur(F.total - F.solde) + " · reste à régler : " + eur(F.solde));
      det.push("Date de la vente : " + new Date(dateVersTs(F.dateVente)).toLocaleDateString("fr-FR"));
      confirmer({titre:"Émettre la facture ?",
        texte:"Une facture émise ne peut plus être modifiée ni supprimée. Pour la corriger, tu établiras un avoir. Vérifie :",
        details: det, bouton:"Émettre la facture", annuler:"Vérifier encore"}, function(){
        /* La fenêtre s'ouvre tout de suite (sinon le navigateur la bloque),
           puis se remplit quand le numéro est arrivé. */
        var fen = window.open("", "_blank");
        if (fen){ try{ fen.document.write('<p style="font:16px sans-serif;margin:40px">Préparation de la facture…</p>'); }catch(e){} }
        occupe(bF, "Numérotation…");
        var id = c.id;
        emettreDocument("facture", id, F).then(function(r){
          if (!r.numero){ if (fen) try{ fen.close(); }catch(e){} toast(r.erreur); render(); return; }
          /* La commande est relue ici : pendant la numérotation, un autre
             onglet ou la synchronisation a pu remplacer les données. La
             facture, elle, est déjà gardée dans le registre. */
          var cc = commande(id);
          if (cc && !cc.factureNum){
            cc.factureNum = r.numero; cc.factureLe = r.doc.emiseLe; cc.facture = r.doc;
            journaliser(cc, "Facture " + r.numero + " émise (" + eur(r.doc.total) + ")");
          }
          sauverTout(); ouvrirDocument(r.doc, fen); render();
          toast(cc ? "Facture " + r.numero + " émise." : "Facture " + r.numero + " émise et gardée dans le registre des factures (la commande a été modifiée ailleurs entre-temps).");
        });
      });
    }, !manques.length);
    if (manques.length) bF.disabled = true;
    barF.appendChild(bF);
  }
  bodyF.appendChild(el('<p class="hint" style="margin-top:10px">La numérotation doit être continue, sans numéro manquant. '+
    'Conserve tes factures et avoirs 10 ans : tu les retrouves dans le registre, en bas de la liste des commandes.</p>'));
  main.appendChild(cF);

  /* --- historique de la commande --- */
  if ((c.journal || []).length){
    var cJ = el('<details class="card journal-cmd" style="margin-bottom:16px"><summary>Historique de la commande ('+c.journal.length+')</summary>'+
      '<ol class="journal"></ol></details>');
    var olJ = cJ.querySelector("ol");
    c.journal.slice().reverse().forEach(function(x){
      olJ.appendChild(el('<li><time>'+esc(new Date(x.t).toLocaleString("fr-FR", {day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"}))+'</time> '+esc(x.txt)+'</li>'));
    });
    main.appendChild(cJ);
  }

  var sup = el('<div class="savebar"></div>');
  var bSup = el('<button type="button" class="btn ghost danger-texte">Supprimer cette commande</button>');
  bSup.addEventListener("click", function(){
    if (factureActive(c)){
      /* Une facture émise ne disparaît pas : la loi impose de la conserver
         10 ans et interdit les trous de numérotation. */
      confirmer({titre:"Cette commande a une facture",
        texte:"La facture n° " + c.factureNum + " a été émise : la commande ne peut pas être supprimée "+
              "(une facture se conserve 10 ans et la numérotation ne doit pas avoir de trou). "+
              "Si la vente n'a pas eu lieu, passe la commande en « Annulée » puis établis un avoir.",
        bouton: c.statut === "annulee" ? "Compris" : "Passer en « Annulée »"}, function(){
        /* Même chemin que le choix « Annulée » dans la liste : trace dans
           l'historique, puis proposition d'avoir. */
        if (c.statut !== "annulee"){
          selSt.value = "annulee";
          selSt.dispatchEvent(new Event("change", {bubbles: true}));
          toast("Commande annulée");
        }
      });
      return;
    }
    var details = [];
    if (encaisse(c) > 0) details.push("les " + eur(encaisse(c)) + " encaissés sur cette commande disparaîtront de tes indicateurs et de ton chiffre d'affaires");
    confirmer({
      titre: "Supprimer la commande de " + ((c.client && c.client.nom) || "sans nom") + " ?",
      texte: details.length ? "Attention :" : "La commande et tout son historique seront supprimés.",
      details: details,
      bouton: "Supprimer la commande", danger: true
    }, function(){
      supprimerCommande(c.id);
      retourParent(function(){ view.cmdVue = null; });
      toast("Commande supprimée");
    });
  });
  sup.appendChild(bSup);
  main.appendChild(sup);
}

/* La facture s'ouvre dans une fenêtre imprimable : pas de dépendance, pas de
   bibliothèque PDF, et « Imprimer → Enregistrer en PDF » fait le reste. */
/* La facture est le seul document de l'application qui sorte de l'atelier :
   c'est elle que la cliente garde, et elle dit le sérieux de l'artisane.
   Elle s'ouvre dans une fenêtre imprimable — « Imprimer » puis « Enregistrer
   en PDF » suffit, sans bibliothèque ni dépendance. La mise en page est
   pensée pour le papier : une page A4, des marges franches, et les mentions
   obligatoires lisibles sans être envahissantes. */
/* Ce que dit la facture est figé au moment où elle est émise : modifier
   ensuite la commande (prix, cliente, règlements) ne change pas un document
   déjà remis. */
function instantaneFacture(c){
  var r = state.reglages;
  var nom = String(r.raisonSociale || "").trim();
  /* Une entreprise individuelle doit se présenter comme telle (« EI »). */
  var ei = r.statut && r.statut !== "non_declare" && nom && !/\b(EI|entrepreneur individuel|entrepreneuse individuelle)\b/i.test(nom);
  var versements = [];
  if (c.versement && Number(c.versement.montant) > 0){
    versements.push({lib: c.versement.type === "arrhes" ? "Arrhes versées" : "Acompte versé",
                     date: c.versement.date || null, m: Number(c.versement.montant)});
  }
  (c.paiements || []).forEach(function(p){
    var m = Number(p.montant) || 0; if (!m) return;
    versements.push({lib: m < 0 ? (p.moyen && p.moyen !== "remboursement" ? "Remboursement (" + libelleMoyen(p.moyen) + ")" : p.moyen === "remboursement" ? "Remboursement" : "Correction")
                                : "Règlement" + (p.moyen ? " (" + libelleMoyen(p.moyen) + ")" : ""), date: p.date || null, m: m});
  });
  var total = totalDu(c), verse = 0;
  versements.forEach(function(v){ v.m = cts(v.m); verse += v.m; });
  verse = cts(verse);
  var lignes = articlesCommande(c).filter(function(a){ return a.q > 0; })
    .map(function(a){ return {d:a.nom, s:a.s || "", q:a.q, pu:cts(a.pu), m:a.montant}; });
  if (Number(c.fraisLivraison) > 0) lignes.push({d:"Livraison", s:"", q:1, pu:Number(c.fraisLivraison), m:Number(c.fraisLivraison)});
  return {
    vendeur: {nom: nom ? nom + (ei ? " EI" : "") : "", adresse: r.adresse || "", siret: r.siret || "", contact: r.contact || ""},
    client: {nom: (c.client && c.client.nom) || "", contact: (c.client && c.client.contact) || "", adresse: (c.client && c.client.adresse) || "",
             siren: (c.clientePro && c.client && c.client.siren) || ""},
    lignes: lignes, total: total, versements: versements, solde: Math.max(0, cts(total - verse)),
    arrhes: !!(c.versement && c.versement.type === "arrhes" && Number(c.versement.montant) > 0),
    acompte: !!(c.versement && c.versement.type !== "arrhes" && Number(c.versement.montant) > 0),
    franchise: enFranchiseTVA(),
    personnalisee: !!c.personnalisee, clientePro: !!c.clientePro,
    /* La date de la vente est une mention obligatoire : la livraison si elle
       a eu lieu, sinon le jour de la facture. */
    dateVente: c.livreeLe || aujourdhuiISO(),
    nature: "Vente de biens (créations faites main)",
    livraison: (c.client && c.client.adresseLivraison) || "",
    /* La facture renvoie à sa commande ; la référence de commande de la
       cliente professionnelle (son bon de commande) est une mention
       obligatoire quand elle existe (article L441-9 du code de commerce). */
    commandeNum: c.num || "", refClient: (c.clientePro && c.refClient) || ""
  };
}

function ouvrirFacture(c, fenetre){
  var F = JSON.parse(JSON.stringify(c.facture || instantaneFacture(c)));
  F.numero = F.numero || c.factureNum; F.emiseLe = F.emiseLe || c.factureLe; F.type = "facture";
  ouvrirDocument(F, fenetre);
}
function ouvrirDocument(F, fenetre){
  var avoir = F.type === "avoir";
  var dateFr = function(d){ if (!d) return ""; var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : new Date(d).toLocaleDateString("fr-FR"); };
  var lignes = F.lignes;
  var solde = F.solde;
  /* Un vendeur non identifiable rend la facture invalide : tant que les
     réglages ne sont pas remplis, on le signale au lieu de l'imprimer en
     silence avec des crochets. */
  var manque = !F.vendeur.nom || !F.vendeur.adresse;

  var h = '<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>'+(avoir ? 'Avoir ' : 'Facture ')+esc(F.numero)+'</title><style>'+
  '*{box-sizing:border-box}'+
  'body{font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;'+
    'color:#15181a;background:#f4f6f3;margin:0;padding:28px 16px 60px}'+
  '.page{max-width:780px;margin:0 auto;background:#fff;padding:44px 48px 40px;'+
    'border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.09)}'+
  '.alerte{max-width:780px;margin:0 auto 14px;background:#fbf1dc;border:1px solid #e0c188;'+
    'border-radius:8px;padding:12px 16px;font-size:13.5px;color:#7a4e00}'+
  '.ent{display:flex;justify-content:space-between;gap:36px;flex-wrap:wrap;'+
    'padding-bottom:26px;border-bottom:2px solid #15181a}'+
  '.ent h1{font-size:15px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px;'+
    'font-weight:600;color:#5b6560}'+
  '.num{font-size:27px;font-weight:700;letter-spacing:-.01em;margin:0 0 10px;'+
    'font-variant-numeric:tabular-nums}'+
  '.dates{font-size:13px;color:#5b6560;margin:0;line-height:1.75}'+
  '.moi{text-align:right;font-size:13.5px;line-height:1.7;max-width:280px}'+
  '.moi .nom{font-size:16px;font-weight:700;display:block;margin-bottom:3px}'+
  '.moi .vide{color:#b23}'+
  '.parties{display:flex;gap:36px;flex-wrap:wrap;margin:26px 0 6px}'+
  '.bloc{flex:1;min-width:210px}'+
  '.bloc .lab{font-size:11px;letter-spacing:.1em;text-transform:uppercase;'+
    'color:#5b6560;font-weight:600;margin:0 0 5px}'+
  '.bloc .val{font-size:15px;font-weight:600;margin:0}'+
  '.bloc .sec{font-size:13.5px;color:#5b6560;margin:2px 0 0}'+
  'table{width:100%;border-collapse:collapse;margin:26px 0 0}'+
  'th{text-align:left;font-size:11px;letter-spacing:.09em;text-transform:uppercase;'+
    'color:#5b6560;font-weight:600;padding:0 0 9px;border-bottom:1px solid #15181a}'+
  'th.n,td.n{text-align:right;font-variant-numeric:tabular-nums}'+
  'td{padding:13px 0;border-bottom:1px solid #e4e8e2;vertical-align:top}'+
  'td .det{display:block;font-size:13px;color:#5b6560;margin-top:3px}'+
  'tr.sous td{border-bottom:none;padding:9px 0 3px;color:#5b6560}'+
  'tr.total td{border-top:2px solid #15181a;border-bottom:none;padding-top:13px;'+
    'font-size:17px;font-weight:700}'+
  'tr.du td{border-bottom:none;padding-top:4px;font-size:19px;font-weight:700;color:#0f5132}'+
  '.ment{margin-top:34px;padding-top:20px;border-top:1px solid #e4e8e2;'+
    'font-size:12px;line-height:1.7;color:#4d5651}'+
  '.ment p{margin:0 0 7px}'+
  '.ment .cle{font-weight:600;color:#15181a}'+
  '.pied{margin-top:26px;font-size:11.5px;color:#8a938d;text-align:center}'+
  '.barre{max-width:780px;margin:18px auto 0;text-align:center}'+
  '.barre button{font:inherit;font-size:15px;font-weight:600;padding:12px 26px;'+
    'border:0;border-radius:8px;background:#0f5132;color:#fff;cursor:pointer}'+
  '@media print{'+
    'body{background:#fff;padding:0;font-size:12.5px}'+
    '.page{box-shadow:none;max-width:none;padding:0;border-radius:0}'+
    '.noprint{display:none!important}'+
    '@page{margin:18mm 16mm}'+
  '}'+
  '@media (max-width:560px){'+
    '.page{padding:26px 20px}.ent{gap:18px}.moi{text-align:left}'+
  '}'+
  '</style></head><body>';

  if (manque){
    h += '<div class="alerte noprint"><b>Cette facture n\'est pas encore valable.</b> '+
      'Une facture doit dire clairement qui vend. Complète ton nom et ton '+
      'adresse dans Réglages → Tes mentions de facture, puis rouvre-la.</div>';
  }

  h += '<div class="page">'+
    '<div class="ent">'+
      '<div>'+
        '<h1>'+(avoir ? 'Avoir' : 'Facture')+'</h1>'+
        '<p class="num">'+esc(F.numero)+'</p>'+
        '<p class="dates">Émis'+(avoir?'':'e')+' le '+esc(dateFr(F.emiseLe))+
          (avoir && F.ref ? '<br>Annule la facture n° '+esc(F.ref)+(F.refLe ? ' du '+esc(dateFr(F.refLe)) : '') : '')+
          (!avoir && F.dateVente ? '<br>Date de la vente : '+esc(dateFr(F.dateVente)) : '')+
          (F.commandeNum ? '<br>Commande n° '+esc(F.commandeNum) : '')+
          (F.refClient ? '<br>Votre bon de commande : '+esc(F.refClient) : '')+'</p>'+
      '</div>'+
      '<div class="moi">'+
        '<span class="nom'+(F.vendeur.nom?'':' vide')+'">'+
          esc(F.vendeur.nom || "[ Ton nom ou ta raison sociale ]")+'</span>'+
        (F.vendeur.adresse ? esc(F.vendeur.adresse) : '<span class="vide">[ Ton adresse ]</span>')+'<br>'+
        (F.vendeur.siret ? 'SIRET '+esc(F.vendeur.siret) : '')+
        (F.vendeur.siret && F.vendeur.contact ? '<br>' : '')+
        esc(F.vendeur.contact || "")+
      '</div>'+
    '</div>'+

    '<div class="parties">'+
      '<div class="bloc">'+
        '<p class="lab">'+(avoir ? 'Établi pour' : 'Facturé à')+'</p>'+
        '<p class="val">'+esc(F.client.nom || "—")+'</p>'+
        (F.client.adresse ? '<p class="sec">'+esc(F.client.adresse)+'</p>' : '')+
        (F.client.siren ? '<p class="sec">SIREN '+esc(F.client.siren)+'</p>' : '')+
        (F.livraison ? '<p class="sec">Livraison : '+esc(F.livraison)+'</p>' : '')+
        (F.client.contact ? '<p class="sec">'+esc(F.client.contact)+'</p>' : '')+
      '</div>'+
      (avoir ? '' : '<div class="bloc">'+
        '<p class="lab">Règlement</p>'+
        '<p class="val">'+(solde > 0 ? esc(eur(solde))+' à régler' : 'Réglée')+'</p>'+
        '<p class="sec">'+(solde > 0
          ? 'à réception de la facture'
          : 'Merci, tout est réglé.')+'</p>'+
      '</div>')+
    '</div>'+

    '<table><thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Montant</th></tr></thead><tbody>';

  lignes.forEach(function(l){
    h += '<tr><td>'+esc(l.d)+
      (l.s ? '<span class="det">'+esc(l.s)+'</span>' : '')+
      '</td><td class="n">'+(l.q || 1)+'</td><td class="n">'+esc(eur(l.pu !== undefined ? l.pu : l.m))+'</td>'+
      '<td class="n">'+esc(eur(l.m))+'</td></tr>';
  });
  h += '<tr class="total"><td colspan="3">Total'+(F.franchise ? '' : ' TTC')+'</td><td class="n">'+esc(eur(F.total))+'</td></tr>';
  (F.versements || []).forEach(function(v){
    /* Un remboursement (montant négatif) augmente ce qui reste à régler. */
    h += '<tr class="sous"><td colspan="3">'+esc(v.lib)+(v.date ? ' le '+esc(dateFr(v.date)) : '')+
      '</td><td class="n">'+(v.m < 0 ? '+ ' : '− ')+esc(eur(Math.abs(v.m)))+'</td></tr>';
  });
  if (!avoir && (F.versements || []).length){
    h += '<tr class="du"><td colspan="3">Reste à régler</td><td class="n">'+esc(eur(solde))+'</td></tr>';
  }
  h += '</tbody></table>'+

    '<div class="ment">'+
      (F.nature ? '<p><span class="cle">Nature de l\'opération :</span> '+esc(F.nature)+'.</p>' : '')+
      (F.franchise ? '<p><span class="cle">TVA non applicable</span>, article 293 B du code général des impôts.</p>' : '')+
      (avoir ? '<p><span class="cle">Avoir</span> annulant la facture n° '+esc(F.ref || '')+' pour la totalité de son montant.</p>' : '')+
      ((F.personnalisee && !F.clientePro)
        ? '<p><span class="cle">Pas de droit de rétractation.</span> Article confectionné selon '+
          'les spécifications demandées : conformément à l\'article L221-28 du code de la '+
          'consommation, il n\'ouvre pas de droit de rétractation.</p>'
        : '')+
      (!avoir && F.arrhes
        ? '<p><span class="cle">Arrhes.</span> Les sommes versées à la commande ont la nature '+
          'd\'arrhes au sens de l\'article L214-1 du code de la consommation : la partie qui achète peut '+
          'se dédire en les perdant, la partie qui vend en restituant le double.</p>'
        : (!avoir && F.acompte
          ? '<p><span class="cle">Acompte.</span> Les sommes versées à la commande ont la nature '+
            'd\'acompte : la vente est ferme et définitive pour les deux parties.</p>'
          : ''))+
      (!avoir && F.clientePro
        ? '<p><span class="cle">Retard de paiement.</span> Pénalités au taux de trois fois '+
          'l\'intérêt légal en vigueur. Indemnité forfaitaire pour frais de recouvrement : 40 €. '+
          'Pas d\'escompte pour paiement anticipé.</p>'
        : '')+
    '</div>'+
    '<p class="pied">'+(F.vendeur && F.vendeur.nom ? esc(F.vendeur.nom) + ' · ' : '')+(avoir ? 'Avoir n° ' : 'Facture n° ')+esc(F.numero)+'</p>'+
  '</div>'+
  '<div class="barre noprint"><button onclick="window.print()">'+
    'Imprimer ou enregistrer en PDF</button></div>'+
  '</body></html>';

  var w = fenetre && !fenetre.closed ? fenetre : window.open("", "_blank");
  if (!w){ toast((avoir ? "Avoir " : "Facture ") + F.numero + " enregistré" + (avoir ? "" : "e") + ", mais ton navigateur a bloqué son affichage. Autorise les fenêtres pop-up pour ce site, puis rouvre-la depuis le registre des factures."); return; }
  w.document.open(); w.document.write(h); w.document.close();
}

function renderPatrons(main){
  if (view.patronVu){
    var p = patronPerso(view.patronVu);
    if (p) return renderPatronDetail(main, p);
    view.patronVu = null;
  }
  if (view.sousPatrons === "biblio" && bibliothequePartagee) return renderBibliotheque(main);
  var liste = patrons();

  /* Importer un PDF crée le patron d'un geste : titre tiré du nom du
     fichier, pages et texte remplis. */
  var inPdf = el('<input type="file" accept="application/pdf,.pdf,image/*" multiple style="display:none" aria-label="Importer un patron en PDF">');
  var bPdf = bouton("Charger un fichier", function(){ inPdf.click(); });
  function patronAjoute(np){
    render();
    toast("Patron « " + np.titre + " » ajouté à tes patrons.", {fn:function(){ view.patronVu = np.id; render(); }, libelle:"Ouvrir"});
  }
  inPdf.addEventListener("change", function(){
    var fichiers = [].slice.call(inPdf.files||[]);
    inPdf.value = "";
    if (!fichiers.length) return;
    dialoguePatronAjout({fichiers: fichiers, siAjoute: patronAjoute});
  });
  var tete = enTete("Mes patrons",
    "Tes patrons à toi : ceux que tu as achetés, reçus ou écrits. Ils sont privés : personne d\'autre ne les voit. "+
    "L'outil les garde lisibles à côté de ton ouvrage, avec le compteur de rangs et le chronomètre.",
    [bouton("+ Ajouter un patron", function(){
      dialoguePatronAjout({siAjoute: patronAjoute});
    }, true)]);
  tete.appendChild(inPdf);
  main.appendChild(tete);

  if (bibliothequePartagee){
    var ong = el('<div class="tabs" style="margin-bottom:16px"></div>');
    ong.appendChild(bouton("Mes patrons", function(){ view.sousPatrons = null; render(); }, true));
    ong.appendChild(bouton("Bibliothèque partagée", function(){ view.sousPatrons = "biblio"; render(); }));
    main.appendChild(ong);
  }

  main.appendChild(el('<div class="banner"><p><b>Ces patrons sont privés.</b> '+
    'Ils sont enregistrés dans ton compte et personne d\'autre n\'y a accès'+
    (bibliothequePartagee ? ', sauf si tu choisis toi-même d\'en partager un, patron par patron' : '')+'. '+
    'Un patron acheté est réservé à ton usage personnel : ne le partage pas. '+
    'Derrière chaque patron, il y a le travail de quelqu\'un, comme le tien.</p></div>'));

  if (!liste.length){
    main.appendChild(etatVide("Aucun patron pour l'instant",
      "Ajoute celui que tu es en train de faire : importe son PDF, colle son texte ou photographie ses pages. "+
      "Tu l'auras sous les yeux avec le compteur de rangs pendant que tu crochètes, et tu pourras "+
      "le relier à ta fiche de coût.",
      [bouton("+ Ajouter un patron", function(){
        dialoguePatronAjout({siAjoute: patronAjoute});
      }, true)]));
    return;
  }

  var barrePat = barreTri({cle:"pat", defaut:"recent", sens:-1, quand:function(){ render(); }, options:[
    ["recent","Ajouté récemment"],["titre","Titre"],["auteur","Créé par"],["pages","Nombre de pages"]]});
  barrePat.style.marginBottom = "12px";
  if (liste.length > 1) main.appendChild(barrePat);
  liste = trierListe(liste, etatTri("pat", "recent", -1), {
    recent: function(p){ return Number(p.cree) || 0; },
    titre:  function(p){ return p.titre || ""; },
    auteur: function(p){ return p.auteur || ""; },
    pages:  function(p){ return (p.pages || []).length; }
  });
  var box = el('<div class="pat-lib"></div>');
  liste.forEach(function(p){
    var n = (p.pages||[]).length;
    var vig = n ? '<span class="vig"><img data-photo="'+esc(p.pages[0].photo)+'" alt="" hidden></span>'
                : '<span class="vig"><span>'+(p.texte ? 'texte' : 'vide')+'</span></span>';
    var c = el('<button type="button" class="pcard" style="text-align:left;font:inherit;color:inherit;cursor:pointer">'+
      vig+
      '<span><h3>'+esc(p.titre || "Patron sans titre")+'</h3>'+
      '<p class="m">'+esc(p.auteur ? p.auteur+" · " : "")+
        (n ? n+(n>1?" pages":" page") : (p.texte ? "texte collé" : "à compléter"))+
        (p.rang ? " · rang "+p.rang : "")+'</p></span>'+
      '<span class="m">ouvrir →</span></button>');
    c.addEventListener("click", function(){ view.patronVu = p.id; render(); });
    if (!bibliothequePartagee){ box.appendChild(c); return; }
    var w = el('<div class="pcard-wrap"></div>');
    w.appendChild(c);
    var pied = el('<div class="pcard-pied"><span>'+(p.publie ? '<span class="chip good">partagé</span> visible par les autres membres' : '<span class="chip neutre">privé</span> visible par toi uniquement')+'</span></div>');
    if (!p.publie){
      var bS = bouton("Partager…", function(){ dialoguePartage(p); }); bS.classList.add("sm"); bS.setAttribute("data-role", "partager");
      bS.setAttribute("aria-label", "Partager le patron " + (p.titre || "sans titre") + " dans la bibliothèque");
      pied.appendChild(bS);
    }
    w.appendChild(pied);
    box.appendChild(w);
  });
  main.appendChild(box);
}

/* ─────────────────────────────────────────────────────────────────────────
   La bibliothèque partagée
   Elle ne contient que ce que des utilisatrices ont explicitement choisi d'y
   mettre, en déclarant en être les autrices. Rien n'y arrive automatiquement.
   ───────────────────────────────────────────────────────────────────────── */
var LICENCES_BIBLIO = [
  {id:"CC BY-NC-SA 4.0", nom:"Partage non commercial, à l'identique",
   aide:"Les autres peuvent l'utiliser et l'adapter sans en faire commerce, en te citant, et doivent partager leurs versions sous la même licence. Le choix le plus courant."},
  {id:"CC BY-NC 4.0", nom:"Partage non commercial",
   aide:"Utilisation et adaptation libres hors commerce, en te citant."},
  {id:"CC BY-SA 4.0", nom:"Partage libre, à l'identique",
   aide:"Tout usage permis, y compris commercial, en te citant, à condition de partager sous la même licence."},
  {id:"CC BY 4.0", nom:"Partage libre",
   aide:"Tout usage permis, y compris commercial, en te citant."},
  {id:"CC0", nom:"Je renonce à mes droits",
   aide:"Tout le monde peut en faire ce que bon lui semble, sans même te citer. Irréversible."}
];

function renderBibliotheque(main){
  main.appendChild(enTete("Bibliothèque partagée",
    "Un espace d'échange entre membres de Crochompte. "+
    "Chaque personne publie ce qu'elle a écrit, et en est responsable. Tes patrons à toi restent privés : "+
    "seuls ceux que tu choisis de partager, un par un, apparaissent ici."));
  if (view.lierPatronFiche && view.draft){
    var bLien = el('<div class="banner" style="background:var(--good-soft,#e5f1ea);border-color:var(--good)"><p><b>Choisis un patron pour « '+
      esc(view.draft.nom || "ta création")+' ».</b> Il sera copié dans tes patrons (privés) et relié à ta fiche.</p></div>');
    bLien.appendChild(bouton("Revenir à la fiche sans choisir", function(){ view.lierPatronFiche = false; view.sousPatrons = null; aller("fiche"); }));
    main.appendChild(bLien);
  }

  /* Dire les choses une fois, clairement, plutôt que de laisser croire que
     l'outil aurait relu et validé ces patrons. Il ne les a pas vus. */
  main.appendChild(el('<div class="banner"><p><b>C\'est un partage entre membres, pas un catalogue de l\'application.</b> '+
    'Crochompte met l\'espace à disposition : il ne relit pas, ne vérifie pas et ne valide pas ce qui est publié ici. '+
    'Chaque patron reste le travail et la responsabilité de la personne qui l\'a mis en ligne, '+
    'y compris pour les droits, la justesse des explications et le résultat obtenu.</p>'+
    '<p class="hint" style="margin-top:8px">Tu reconnais un patron protégé publié sans droit, ou un contenu déplacé ? '+
    'Utilise le bouton <b>Signaler</b> présent sur chaque patron, en expliquant le problème. Chaque signalement est examiné par une personne, '+
    'qui décide de maintenir ou de retirer le patron et en donne la raison à la personne qui l\'a publié.</p></div>'));

  var ong = el('<div class="tabs" style="margin-bottom:16px"></div>');
  ong.appendChild(bouton("Mes patrons", function(){ view.sousPatrons = null; render(); }));
  ong.appendChild(bouton("Bibliothèque partagée", function(){}, true));
  main.appendChild(ong);

  /* Le champ de recherche reste en place pendant qu'on tape : seule la
     liste des résultats est redessinée (avant, toute la page l'était, et le
     clavier du téléphone se fermait après chaque lettre). */
  var rech = el('<label class="f" style="max-width:420px;margin-bottom:16px"><span>Chercher</span>'+
    '<input type="search" id="bib-q" placeholder="bonnet, pieuvre, châle…" value="'+esc(view.biblioQ||"")+'"></label>');
  rech.querySelector("input").addEventListener("input", function(e){
    view.biblioQ = e.target.value;
    clearTimeout(window.__bibT);
    window.__bibT = setTimeout(chargerListe, 350);
  });
  main.appendChild(rech);
  var zone = el('<div></div>');
  main.appendChild(zone);
  chargerListe();

  function chargerListe(){
  zone.innerHTML = "";
  zone.appendChild(el('<p class="hint">Chargement…</p>'));
  var q = view.biblioQ;
  bibliothequePartagee.lister(q).then(function(r){
    if (q !== view.biblioQ) return;   /* une recherche plus récente est partie */
    zone.innerHTML = "";
    if (r.erreur){
      zone.appendChild(el('<div class="banner" style="background:var(--warn-soft);border-color:var(--warn)">'+
        '<p>'+esc(r.erreur)+'</p></div>'));
      return;
    }

    if (!r.liste.length){
      zone.appendChild(etatVide(
        view.biblioQ ? "Rien ne correspond à cette recherche" : "La bibliothèque est encore vide",
        view.biblioQ ? "Essaie un autre mot."
          : "Elle se remplira des patrons que les membres choisiront de partager. "+
            "Lance le mouvement : ouvre un de tes patrons et publie-le.",
        [bouton("Voir mes patrons", function(){ view.sousPatrons = null; render(); })]));
      return;
    }

    zone.appendChild(el('<p class="hint" style="margin-bottom:12px">'+r.liste.length+
      ' patron'+(r.liste.length>1?'s':'')+' partagé'+(r.liste.length>1?'s':'')+'.</p>'));
    var box = el('<div class="pat-lib"></div>');
    r.liste.forEach(function(p){
      var aMoi = p.user_id === r.moi;
      var c = el('<button type="button" class="pcard" style="text-align:left;font:inherit;color:inherit;cursor:pointer">'+
        '<span class="vig"><span>'+esc(p.licence.replace(" 4.0",""))+'</span></span>'+
        '<span><h3>'+esc(p.titre)+(aMoi?' <span class="chip good">le tien</span>':'')+'</h3>'+
        '<p class="m">'+esc(p.auteur_affiche)+
          (p.niveau ? ' · '+esc(DIFF[p.niveau-1]) : '')+
          ' · '+new Date(p.cree).toLocaleDateString("fr-FR")+'</p></span>'+
        '<span class="m">lire →</span></button>');
      c.addEventListener("click", function(){ view.biblioVu = p; render(); });
      box.appendChild(c);
    });
    zone.appendChild(box);

    if (view.biblioVu){
      var p2 = view.biblioVu;
      var det = el('<div class="card" style="margin-top:20px"><header><h2>'+esc(p2.titre)+'</h2>'+
        '<p>Par '+esc(p2.auteur_affiche)+' · '+esc(p2.licence)+
        (p2.niveau ? ' · '+esc(DIFF[p2.niveau-1]) : '')+'</p></header><div class="body">'+
        (p2.materiel ? '<p><b>Matériel :</b> '+esc(p2.materiel)+'</p>' : '')+
        '<p class="lecture" style="white-space:pre-wrap">'+esc(p2.texte)+'</p>'+
        (p2.notes ? '<p class="hint" style="white-space:pre-wrap;margin-top:12px">'+esc(p2.notes)+'</p>' : '')+
        '<div class="savebar" style="margin-top:16px"></div>'+
        '<p class="hint" style="margin-top:12px">Ce patron est partagé, par la personne qui l\'a écrit, sous licence '+
        esc(p2.licence)+'. Respecte-la si tu le republies ou si tu vends ce que tu en fais. '+
        'Il est publié tel quel par un autre membre : Crochompte ne l\'a ni relu ni vérifié.</p>'+
        '</div></div>');
      var bar = det.querySelector(".savebar");
      var pourFiche = !!(view.lierPatronFiche && view.draft);
      bar.appendChild(bouton(pourFiche ? "Copier et relier à « " + (view.draft.nom || "ma création") + " »" : "Copier dans mes patrons", function(){
        /* Déjà copié une fois : on réutilise la copie plutôt que d'en faire une deuxième. */
        var np = patrons().filter(function(x){ return x.source && x.source.biblioId === p2.id; })[0];
        if (!np){
          np = nouveauPatron();
          np.titre = p2.titre; np.auteur = p2.auteur_affiche;
          np.origine = "Bibliothèque partagée Crochompte · " + p2.licence;
          np.texte = p2.texte + (p2.materiel ? "\n\nMatériel : " + p2.materiel : "");
          np.notes = p2.notes || "";
          np.source = {biblioId: p2.id, licence: p2.licence, le: Date.now()};
          delete np.brouillon;
        }
        sauverTout(); view.biblioVu = null; view.sousPatrons = null;
        if (pourFiche){
          view.draft.patron = np.id; view.lierPatronFiche = false;
          aller("fiche");
          toast("Patron copié dans tes patrons et relié à la fiche. Enregistre la fiche pour garder ce lien.");
        } else {
          view.patronVu = np.id; render();
          toast("Copié dans tes patrons");
        }
      }, true));
      bar.appendChild(bouton("Fermer", function(){ view.biblioVu = null; render(); }));
      if (p2.user_id === r.moi){
        /* L'autrice voit où en est son patron, et peut contester. */
        var etatP = p2.retire && p2.decision === "retire"
          ? "Retiré de la bibliothèque le " + new Date(p2.decision_le).toLocaleDateString("fr-FR") + " après examen. Motif : " + (p2.decision_motif || "non précisé") + "."
          : p2.masque ? "Masqué provisoirement : des signalements graves sont en cours d'examen. Les autres membres ne le voient plus pour l'instant."
          : p2.en_revue ? "Des signalements sont en cours d'examen. Ton patron reste visible en attendant."
          : p2.decision === "maintenu" ? "Examiné après des signalements et maintenu." : "";
        if (etatP) det.querySelector(".body").insertBefore(el('<div class="manques" style="margin-bottom:12px"><p style="margin:0">'+esc(etatP)+'</p></div>'), det.querySelector(".body").firstChild);
        if (p2.masque || (p2.retire && p2.decision === "retire")){
          bar.appendChild(bouton("Contester", function(){
            dialogueTexte({titre:"Contester la décision", texte:"Explique pourquoi ton patron devrait rester en ligne (patron original, brouillons datés, autorisation de la personne qui l'a créé…). Ta demande sera examinée par une personne.",
                           champ:"Ton explication", min:10, bouton:"Envoyer ma contestation"}, function(txt){
              bibliothequePartagee.contester(p2.id, txt).then(function(x){ toast(x.erreur || "Ta contestation a été envoyée. Elle sera examinée."); });
            });
          }));
        }
        if (!p2.masque && !p2.retire && !p2.en_revue) bar.appendChild(bouton("Retirer de la bibliothèque", function(){
          confirmer({titre:"Retirer « "+p2.titre+" » de la bibliothèque partagée ?",
                     texte:"Les autres membres ne le verront plus. Ta copie personnelle, dans « Mes patrons », n'est pas touchée.",
                     bouton:"Retirer de la bibliothèque", danger:true}, function(){
            bibliothequePartagee.retirer(p2.id).then(function(x){
              if (x.erreur){ toast(x.erreur); return; }
              view.biblioVu = null; render(); toast("Patron retiré de la bibliothèque");
            });
          });
        }));
      } else {
        bar.appendChild(bouton("Signaler", function(){
          dialogueTexte({titre:"Signaler ce patron",
            texte:"Ton signalement est examiné par une personne. Un signalement abusif ne fait rien retirer.",
            choix:{lib:"Ce qui pose problème", options:[["droits","Il reproduit le patron de quelqu'un d'autre sans son accord"],
                   ["illicite","Contenu illégal ou haineux"],["dangereux","Instructions dangereuses (jouet pour bébé, par exemple)"],
                   ["trompeur","Titre ou contenu trompeur"],["autre","Autre raison"]]},
            champ:"Explique en quelques mots (où, quoi)", min:10, bouton:"Envoyer le signalement"}, function(txt, motif){
            bibliothequePartagee.signaler(p2.id, motif, txt).then(function(x){
              toast(x.erreur ? x.erreur : "Merci. Ton signalement a été reçu et sera examiné.");
              view.biblioVu = null; render();
            });
          });
        }));
      }
      zone.appendChild(det);
      det.scrollIntoView({behavior:"smooth", block:"start"});
    }
  });
  }
}

/* Partager un patron se fait en deux temps, et jamais pendant la saisie :
   1. un formulaire (nom d'autrice, niveau, matériel, licence, déclaration
      de droits) ; 2. un rappel clair que le patron devient visible par
      toutes, avec « Confirmer le partage » ou « Annuler ». La déclaration
      de droits n'est pas une formalité : sans elle, rien ne part — et le
      serveur refuserait. */
function dialoguePartage(p){
  if (!bibliothequePartagee) return;
  var texte = String(p.texte || "").trim();
  if (texte.length < 80){
    toast("Pour partager un patron, colle d'abord son texte (80 caractères minimum) : seul le texte est publié, jamais les pages photographiées.",
          {important:true, libelle:"Ouvrir le patron", fn:function(){ view.patronVu = p.id; render(); }});
    return;
  }
  var box = el('<div>'+
    '<p style="margin:0 0 12px">Seul <b>le texte</b> du patron est publié. Tes pages photographiées restent privées : une page scannée est presque toujours '+
    'la reproduction d\'un patron acheté, qui ne peut pas être partagé.</p>'+
    '<div class="grid2">'+
      '<label class="f"><span>Signature affichée</span><input id="pb-auteur" type="text" maxlength="60" value="'+esc(p.auteur||"")+'" placeholder="le nom que les autres verront"></label>'+
      '<label class="f"><span>Niveau</span><select id="pb-niv"><option value="">—</option><option value="1">Facile</option><option value="2">Intermédiaire</option><option value="3">Exigeant</option></select></label>'+
    '</div>'+
    '<label class="f" style="margin-top:10px"><span>Matériel (fil, crochet, dimensions finies)</span><input id="pb-mat" type="text" maxlength="200" placeholder="coton DK, crochet 3 mm, 18 cm de haut"></label>'+
    '<label class="f" style="margin-top:10px"><span>Licence : ce que les autres ont le droit d\'en faire</span><select id="pb-lic"></select></label>'+
    '<p class="hint" id="pb-lic-aide" style="margin-top:4px"></p>'+
    '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:14px;cursor:pointer">'+
      '<input type="checkbox" id="pb-droits" style="margin-top:3px;width:18px;height:18px;flex:none">'+
      '<span>Je certifie avoir écrit ce patron moi-même, ou détenir les droits qui me permettent de le partager. Je sais que publier le patron '+
      'de quelqu\'un d\'autre sans son accord est une contrefaçon, et que <b>la responsabilité m\'en revient entièrement</b> : Crochompte met l\'espace de partage à '+
      'disposition des membres, il ne relit ni ne valide ce qui y est publié.</span></label></div>');
  var selLic = box.querySelector("#pb-lic"), aide = box.querySelector("#pb-lic-aide");
  LICENCES_BIBLIO.forEach(function(l){ selLic.appendChild(el('<option value="'+esc(l.id)+'">'+esc(l.nom)+'</option>')); });
  function majAide(){ var l = LICENCES_BIBLIO.filter(function(x){ return x.id === selLic.value; })[0]; aide.textContent = l ? l.aide : ""; }
  selLic.addEventListener("change", majAide); majAide();
  dialogueChamps({titre:"Partager « " + (p.titre || "Patron sans titre") + " »", large:true, contenu: box, champs: [],
    bouton:"Valider", annuler:"Annuler",
    verifier:function(){
      if (!box.querySelector("#pb-auteur").value.trim()){ box.querySelector("#pb-auteur").focus(); return "Indique la signature à afficher : les autres membres la verront."; }
      if (!box.querySelector("#pb-droits").checked) return "Coche la déclaration de droits pour continuer.";
      return null;
    }}, function(){
    var auteur = box.querySelector("#pb-auteur").value.trim(), lic = selLic.value;
    var licNom = (LICENCES_BIBLIO.filter(function(x){ return x.id === lic; })[0] || {}).nom || lic;
    var recap = el('<div class="partage-recap"><b>'+esc(p.titre || "Patron sans titre")+'</b>par '+esc(auteur)+' · licence : '+esc(licNom)+'</div>');
    confirmer({titre:"Ce patron va devenir visible par tous les membres",
      texte:"Relis-le une dernière fois : une fois partagé, d'autres pourront le lire, le copier et le relier à leurs créations, selon la licence choisie.\n"+
            "Tu confirmes en avoir les droits : ce n'est pas un patron acheté, reçu ou recopié.",
      contenu: recap, bouton:"Confirmer le partage", annuler:"Annuler"}, function(){
      bibliothequePartagee.publier({
        titre: p.titre || "Patron sans titre", auteur: auteur, famille: null,
        niveau: Number(box.querySelector("#pb-niv").value) || null,
        materiel: box.querySelector("#pb-mat").value.trim(),
        texte: texte, notes: p.notes || "", licence: lic, droits: true
      }).then(function(r){
        if (r.erreur){ toast(r.erreur); return; }
        p.publie = true; p.auteur = p.auteur || auteur; sauverTout(); render();
        toast("Patron partagé. Merci, les autres membres pourront s'en servir.");
      });
    });
  });
}

/* Ajoute des fichiers (PDF ou images) à un patron, dans l'ordre choisi.
   Un PDF : toutes ses pages (jusqu'à PDF_PAGES_MAX) et son texte, qui remplit
   « Le texte du patron » s'il est encore vide. */
/* AJOUTER UN PATRON, SANS CHANGER DE PAGE
   Une seule fenêtre, depuis la fiche comme depuis « Mes patrons » : on choisit
   un fichier (PDF ou photos) et/ou on colle le texte, on vérifie le titre et la
   créatrice, on valide. Rien n'est gardé tant qu'on n'a pas validé ; si on
   annule, les pages déjà lues sont effacées. o = {fichiers (déjà choisis, facultatif),
   siAjoute(patron)}. */
var PATRON_TAILLE_MAX = 40 * 1024 * 1024;   /* 40 Mo par fichier */
function dialoguePatronAjout(o){
  o = o || {};
  var np = {id:"pp_" + uid(), titre:"", auteur:"", origine:"", notes:"", texte:"", pages:[], rang:0, cree:Date.now()};
  var etat = {charge:false, enCours:false, fichiers:0};
  var box = el('<div class="pat-ajout"></div>');
  var inFic = el('<input type="file" accept="application/pdf,.pdf,image/*" multiple style="display:none" aria-label="Choisir un patron en PDF ou en photos">');
  var bFic = bouton("Choisir un fichier (PDF ou photos)", function(){ inFic.click(); });
  var zoneEtat = el('<p class="hint pat-etat" role="status" style="margin:6px 0 0">Aucun fichier choisi pour l\'instant.</p>');
  var taTexte = el('<label class="f" style="margin-top:12px"><span>Ou colle le texte du patron (facultatif)</span>'+
    '<textarea id="pa-texte" rows="4" maxlength="60000" placeholder="Rang 1 : 6 ms dans un cercle magique…" style="min-height:84px;font-family:inherit;font-size:14px"></textarea></label>');
  box.appendChild(bFic); box.appendChild(inFic); box.appendChild(zoneEtat); box.appendChild(taTexte);
  box.appendChild(el('<p class="hint" style="margin:10px 0 0">Ce patron reste <b>privé</b> : personne d\'autre ne le voit. Ajoute uniquement un patron que tu as le droit d\'utiliser '+
    '(acheté, offert, ou écrit par toi). Un patron acheté ne se partage pas.</p>'));

  function messageFichiers(fichiers){
    var bons = [], refus = [];
    fichiers.forEach(function(f){
      if (!(estImage(f) || estPdf(f))) refus.push("« " + f.name + " » n'est ni un PDF ni une image");
      else if (f.size > PATRON_TAILLE_MAX) refus.push("« " + f.name + " » pèse plus de 40 Mo");
      else bons.push(f);
    });
    return {bons: bons, refus: refus};
  }
  function charger(fichiers){
    var v = messageFichiers(fichiers);
    if (!v.bons.length){
      zoneEtat.textContent = (v.refus.length ? v.refus.join(" ; ") + ". " : "") + "Choisis un PDF ou des photos (JPEG, PNG…).";
      zoneEtat.classList.add("err"); return;
    }
    zoneEtat.classList.remove("err");
    etat.enCours = true; majBouton();
    bFic.disabled = true;
    importerDansPatron(np, v.bons, null, zoneEtat, function(){
      etat.enCours = false; bFic.disabled = false; zoneEtat.hidden = false;
      var n = (np.pages || []).length;
      etat.charge = n > 0 || !!String(np.texte || "").trim();
      etat.fichiers = v.bons.length;
      zoneEtat.textContent = (n ? "✓ " + pluriel(n, "page lue", "pages lues") : "Aucune page lisible") +
        (np.texte && String(np.texte).trim() ? (n ? ", texte récupéré" : "") : "") +
        (v.refus.length ? ". Ignoré : " + v.refus.join(" ; ") : "") + ".";
      zoneEtat.classList.toggle("err", !etat.charge);
      var ti = document.getElementById("dlgc-titre-p");
      if (ti && !ti.value.trim() && np.titre) ti.value = np.titre;
      majBouton();
    });
  }
  inFic.addEventListener("change", function(){
    var fs = [].slice.call(inFic.files || []); inFic.value = "";
    if (fs.length) charger(fs);
  });
  function majBouton(){
    var ok = document.querySelector(".dlg [data-oui]");
    if (ok){ ok.disabled = etat.enCours; ok.textContent = etat.enCours ? "Lecture en cours…" : (o.bouton || "Ajouter ce patron"); }
  }
  function nettoyer(){ (np.pages || []).forEach(function(pg){ effacerPhoto(pg.photo); }); np.pages = []; }
  dialogueChamps({titre: o.titre || "Ajouter un patron", texte: o.texte || "", contenu: box, large: true,
    champs: [
      {id:"titre-p", lib:"Titre du patron", requis:true, max:120, placeholder:"Lapin Pompon, bonnet torsadé…"},
      {id:"auteur", lib:"Créé par", max:120, placeholder:"Le nom qui figure sur le patron"},
      {id:"origine", lib:"Provenance (facultatif)", max:200, placeholder:"Acheté sur…, offert par…, magazine…"}
    ],
    bouton: o.bouton || "Ajouter ce patron", annuler: "Annuler",
    ouvert: function(){ majBouton(); },
    verifier: function(v){
      if (etat.enCours) return "Attends la fin de la lecture du fichier.";
      var texte = taTexte.querySelector("textarea").value.trim();
      if (!etat.charge && !texte) return "Choisis un fichier (PDF ou photos) ou colle le texte du patron.";
      if (v["titre-p"].length < 2) return "Donne un titre au patron (2 lettres au moins).";
      return "";
    },
    siAnnule: function(){ nettoyer(); }
  }, function(v){
    np.titre = v["titre-p"]; np.auteur = v.auteur; np.origine = v.origine;
    var t = taTexte.querySelector("textarea").value.trim();
    if (t) np.texte = (np.texte ? np.texte + "\n\n" : "") + t;
    patrons().unshift(np); sauverTout();
    if (o.siAjoute) o.siAjoute(np);
  });
  if (o.fichiers && o.fichiers.length) setTimeout(function(){ charger(o.fichiers); }, 60);
}

function importerDansPatron(p, fichiers, bouton, zoneEtat, fin){
  var libelle = bouton ? bouton.textContent : "";
  if (bouton){ bouton.disabled = true; bouton.textContent = "Import en cours…"; }
  function etat(t){ if (zoneEtat){ zoneEtat.hidden = !t; zoneEtat.textContent = t || ""; } }
  var ajoutees = 0, texteAjoute = false, tronque = null, erreur = null;
  function garder(blob, nom){
    var id = "pg_" + uid();
    return ecrirePhoto(id, blob).then(function(ok){
      if (ok){ (p.pages = p.pages || []).push({photo:id, nom:nom}); ajoutees++; }
    });
  }
  var chaine = Promise.resolve();
  fichiers.forEach(function(f){
    chaine = chaine.then(function(){
      if (estPdf(f)){
        etat("Lecture de « " + f.name + " »…");
        return lirePdf(f, {cote:1400, surPage:function(n, t){ etat("« " + f.name + " » : page " + n + " sur " + t + "…"); }})
          .then(function(r){
            if (r.tronque) tronque = {nom:f.name, total:r.total};
            if (r.texte && r.texte.length > 30 && !String(p.texte || "").trim()){ p.texte = r.texte; texteAjoute = true; }
            if (!p.titre) p.titre = f.name.replace(/\.pdf$/i, "");
            var c2 = Promise.resolve();
            r.pages.forEach(function(b, k){ c2 = c2.then(function(){ return garder(b, f.name + " — page " + (k+1)); }); });
            return c2;
          }, function(e){ erreur = messageErreurPdf(e); });
      }
      etat("Ajout de « " + f.name + " »…");
      return redimensionner(f, 1400).then(function(b){ if (b) return garder(b, f.name); });
    });
  });
  return chaine.then(function(){
    etat("");
    if (bouton){ bouton.disabled = false; bouton.textContent = libelle; }
    sauverTout();
    if (erreur && !ajoutees){ toast(erreur); if (fin) fin(); return; }
    var msg = ajoutees + (ajoutees > 1 ? " pages ajoutées" : " page ajoutée");
    if (texteAjoute) msg += ", texte récupéré";
    if (tronque) msg += ". Seules les " + PDF_PAGES_MAX + " premières pages sur " + tronque.total + " ont été importées";
    if (erreur) msg += ". " + erreur;
    toast(msg);
    if (fin) fin();
  });
}

function renderPatronDetail(main, p){
  var back = bouton("← Retour à mes patrons", function(){ retourParent(function(){ view.patronVu = null; }); });
  back.classList.add("sm"); back.style.marginBottom = "16px";
  main.appendChild(back);

  /* --- identité --- */
  var cId = el('<div class="card" style="margin-bottom:16px"><div class="body">'+
    '<div class="grid2">'+
      '<label class="f"><span>Titre du patron</span><input data-p="titre" type="text" placeholder="Lapin Pompon, bonnet torsadé…"></label>'+
      '<label class="f"><span>Créé par</span><input data-p="auteur" type="text" placeholder="Le nom qui figure sur le patron"></label>'+
      '<label class="f"><span>Provenance</span><input data-p="origine" type="text" placeholder="Acheté sur…, offert par…, magazine…"></label>'+
      '<label class="f"><span>Notes</span><input data-p="notes" type="text" placeholder="Crochet 3 mm, j\'ai changé les oreilles…"></label>'+
    '</div>'+
    '<p class="hint">Note toujours qui l\'a créé : c\'est son travail, et tu en auras '+
    'besoin le jour où tu voudras savoir si tu as le droit de vendre ce que tu fabriques avec.</p>'+
    '</div></div>');
  ["titre","auteur","origine","notes"].forEach(function(k){
    cId.querySelector('[data-p="'+k+'"]').value = p[k] || "";
  });
  cId.addEventListener("input", function(e){
    var k = e.target.getAttribute("data-p"); if (!k) return;
    p[k] = e.target.value; sauver();
  });
  var verifPat = attacherVerif(cId, [
    {sel:'[data-p="titre"]', type:"texte", requis:true, min:2, max:120, msgRequis:"Donne un titre au patron pour le retrouver."},
    {sel:'[data-p="auteur"]', type:"texte", min:2, max:120},
    {sel:'[data-p="origine"]', type:"texte", max:200},
    {sel:'[data-p="notes"]', type:"texte", max:400}
  ]);
  cId.querySelector(".body").appendChild(el('<div style="margin-top:12px"></div>')).appendChild(
    barreEnregistrer({verif: verifPat, libelle: "Enregistrer le patron", message: "Patron enregistré ✓", surOk: function(){ delete p.brouillon; }}));
  main.appendChild(cId);

  /* --- compteur de rangs --- */
  var cC = el('<div class="card" style="margin-bottom:16px"><header><h2>Compteur de rangs</h2>'+
    '<p>Il reste où tu l\'as laissé, même si tu fermes l\'application.</p></header>'+
    '<div class="body"></div></div>');
  cC.querySelector(".body").appendChild(compteurMainsLibres(p));
  main.appendChild(cC);

  /* --- pages : photos, images ou PDF --- */
  var cP = el('<div class="card" style="margin-bottom:16px"><header><h2>Les pages du patron</h2>'+
    '<p>Ajoute ton patron en PDF, ou des photos et des captures de ses pages. '+
    'Un PDF est découpé en pages et son texte est récupéré : tu l\'auras sous les yeux sans chercher la feuille.</p></header>'+
    '<div class="body"><div class="et-act"></div><p class="hint" id="pp-etat" aria-live="polite" hidden></p><div class="pages"></div></div></div>');
  var act = cP.querySelector(".et-act");
  var grille = cP.querySelector(".pages");
  var etatImport = cP.querySelector("#pp-etat");
  var inp = el('<input type="file" accept="image/*,application/pdf,.pdf" multiple style="display:none" aria-label="Ajouter des pages : photos, images ou PDF">');
  var bAdd = bouton("Ajouter un PDF ou des photos", function(){ inp.click(); }, true);
  act.appendChild(bAdd); act.appendChild(inp);
  inp.addEventListener("change", function(){
    var fichiers = [].slice.call(inp.files||[]).filter(function(f){ return estImage(f) || estPdf(f); });
    inp.value = "";
    if (!fichiers.length){ toast("Choisis un PDF ou des images (JPEG, PNG…)."); return; }
    importerDansPatron(p, fichiers, bAdd, etatImport, function(){ render(); });
  });
  (p.pages||[]).forEach(function(pg, i){
    var f = el('<figure><img data-photo="'+esc(pg.photo)+'" alt="Page '+(i+1)+' du patron" hidden>'+
      '<figcaption><span>Page '+(i+1)+'</span></figcaption></figure>');
    var sup = el('<button type="button" class="btn sm">Supprimer</button>');
    sup.addEventListener("click", function(){
      confirmer({titre:"Supprimer la page " + (i+1) + " ?", texte:"La photo de cette page sera supprimée.",
                 bouton:"Supprimer la page", danger:true}, function(){
        effacerPhoto(pg.photo);
        p.pages = p.pages.filter(function(x){ return x.photo !== pg.photo; });
        sauverTout(); render();
      });
    });
    f.querySelector("figcaption").appendChild(sup);
    grille.appendChild(f);
  });
  if (!(p.pages||[]).length){
    grille.appendChild(el('<p class="hint" style="margin:0">Aucune page pour l\'instant.</p>'));
  }
  main.appendChild(cP);

  /* --- texte --- */
  var cT = el('<div class="card" style="margin-bottom:16px"><header><h2>Le texte du patron</h2>'+
    '<p>Colle-le ici si tu l\'as sous forme de texte : tu pourras y faire une recherche et le lire '+
    'en grand sur le téléphone.</p></header><div class="body"></div></div>');
  var ta = document.createElement("textarea");
  ta.placeholder = "T1 — 6 ms dans un cercle magique…";
  ta.style.minHeight = "160px";
  ta.value = p.texte || "";
  cT.querySelector(".body").appendChild(ta);
  /* La relecture se met à jour en direct : c'est elle qu'on lira en crochetant,
     pas la zone de saisie. */
  var lect = el('<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--rule)"'+
    (p.texte ? '' : ' hidden')+'>'+
    '<p class="hint" style="margin:0 0 8px">Aperçu</p>'+
    '<p class="lecture"></p></div>');
  lect.querySelector(".lecture").textContent = p.texte || "";
  cT.querySelector(".body").appendChild(lect);
  ta.addEventListener("input", function(){
    p.texte = ta.value;
    lect.querySelector(".lecture").textContent = ta.value;
    lect.hidden = !ta.value.trim();
    sauver();
  });
  main.appendChild(cT);

  /* --- partage : il ne se décide plus ici, en pleine saisie, mais depuis
     la liste « Mes patrons », en deux temps (formulaire puis confirmation) --- */
  if (bibliothequePartagee){
    main.appendChild(el('<p class="hint" style="margin:-4px 0 16px">'+
      (p.publie ? '<b>Ce patron est partagé dans la bibliothèque.</b> Pour le retirer : onglet « Bibliothèque partagée », ouvre-le, puis « Retirer de la bibliothèque ».'
                : '<b>Ce patron est privé</b> : personne d\'autre ne le voit. Pour le partager avec les autres membres, reviens à « Mes patrons » et touche « Partager… » sous ce patron.')+'</p>'));
  }

  /* --- rattachement à une création --- */
  var cR = el('<div class="card" style="margin-bottom:16px"><header><h2>Relier à une création</h2>'+
    '<p>La fiche de coût de cette création affichera ce patron, et le chronomètre comptera '+
    'le temps passé dessus.</p></header><div class="body">'+
    '<label class="f" style="max-width:480px"><span>Création</span><select id="pp-crea"></select></label>'+
    '</div></div>');
  var sel = cR.querySelector("#pp-crea");
  var o0 = document.createElement("option"); o0.value=""; o0.textContent="— aucune —"; sel.appendChild(o0);
  state.creations.forEach(function(c){
    var o = document.createElement("option"); o.value = c.id; o.textContent = c.nom; sel.appendChild(o);
  });
  var actuelle = state.creations.filter(function(c){ return c.patron === p.id; })[0];
  sel.value = actuelle ? actuelle.id : "";
  sel.addEventListener("change", function(){
    state.creations.forEach(function(c){ if (c.patron === p.id) c.patron = null; });
    if (sel.value){ var c = creation(sel.value); if (c) c.patron = p.id; }
    sauverTout(); toast(sel.value ? "Patron relié" : "Lien retiré");
  });
  main.appendChild(cR);

  var sup = el('<div class="savebar"></div>');
  var bSupP = bouton("Supprimer ce patron", function(){
    var nbPages = (p.pages||[]).length;
    var liees = state.creations.filter(function(c){ return c.patron === p.id; }).length;
    var details = [];
    if (nbPages) details.push(nbPages + " page" + (nbPages>1?"s":"") + " photographiée" + (nbPages>1?"s":""));
    if (liees) details.push("le lien avec " + liees + " création" + (liees>1?"s":"") + " (les créations sont conservées)");
    confirmer({titre:"Supprimer « "+(p.titre||"ce patron")+" » ?",
               texte: details.length ? "Seront aussi supprimés :" : "Le patron et ses notes seront supprimés.",
               details: details, bouton:"Supprimer le patron", danger:true}, function(){
      supprimerPatron(p.id);
      retourParent(function(){ view.patronVu = null; });
      toast("Patron supprimé");
    });
  });
  bSupP.classList.add("ghost", "danger-texte");
  sup.appendChild(bSupP);
  main.appendChild(sup);
}


/* ═════ 39. COMPTEUR MAINS LIBRES ═════
   En crochetant, on n'a pas de main pour le téléphone. Trois façons d'avancer
   d'un rang sans lâcher l'ouvrage, de la plus fiable à la plus pratique. */

var vocal = {rec:null, cible:null, actif:false};

function voixDisponible(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* L'écran qui s'éteint au milieu d'un rang est la première cause d'abandon
   du compteur. On le garde allumé tant qu'on compte, et on relâche dès
   qu'on quitte. */
var veille = {lock:null};
function garderEcranAllume(){
  if (!navigator.wakeLock || veille.lock) return;
  navigator.wakeLock.request("screen").then(function(l){
    veille.lock = l;
    l.addEventListener("release", function(){ veille.lock = null; });
  }).catch(function(){});
}
function laisserEcranSeteindre(){
  if (veille.lock){ try{ veille.lock.release(); }catch(e){} veille.lock = null; }
}
document.addEventListener("visibilitychange", function(){
  if (document.hidden) laisserEcranSeteindre();
  else if (vocal.actif) garderEcranAllume();
});

function arreterVoix(){
  vocal.actif = false; vocal.cible = null;
  if (vocal.rec){ try{ vocal.rec.stop(); }catch(e){} vocal.rec = null; }
  laisserEcranSeteindre();
  var t = document.querySelectorAll(".ecoute");
  for (var i=0;i<t.length;i++) t[i].classList.remove("on");
}

/* Les mots sont ceux qu'on dit naturellement, pas un vocabulaire à apprendre.
   On accepte aussi bien « plus » que « suivant » ou « un ». */
var MOTS_PLUS  = /\b(plus|suivant|suivante|un|rang|top|ok|oui|next)\b/;
var MOTS_MOINS = /\b(moins|retour|annule|annuler|erreur|pardon|back)\b/;

function demarrerVoix(onPlus, onMoins, badge){
  if (!voixDisponible()) return false;
  arreterVoix();
  var R = window.SpeechRecognition || window.webkitSpeechRecognition;
  var r = new R();
  r.lang = "fr-FR"; r.continuous = true; r.interimResults = false;
  var echecsReseau = 0;
  r.onresult = function(e){
    if (vocal.rec !== r) return;   /* une ancienne écoute qui finit de parler */
    echecsReseau = 0;
    for (var i = e.resultIndex; i < e.results.length; i++){
      if (!e.results[i].isFinal) continue;
      var m = (e.results[i][0].transcript || "").toLowerCase();
      if (MOTS_MOINS.test(m)) onMoins();
      else if (MOTS_PLUS.test(m)) onPlus();
    }
  };
  r.onerror = function(ev){
    if (vocal.rec !== r) return;
    if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")){
      arreterVoix(); toast("Accès au micro refusé. Autorise-le dans les réglages de ton navigateur, puis réessaie.");
    } else if (ev && (ev.error === "network" || ev.error === "audio-capture")){
      /* Chrome envoie la voix à un serveur : sans réseau, inutile de relancer
         en boucle (le micro s'allumerait et s'éteindrait sans fin). */
      if (++echecsReseau >= 3){
        arreterVoix();
        toast(ev.error === "network" ? "Le comptage à la voix a besoin d'internet sur ce navigateur. Compte en touchant l'écran, ou réessaie dès que la connexion revient."
                                     : "Le micro ne répond pas. Vérifie qu'aucune autre application ne l'utilise, puis réessaie.");
      }
    }
  };
  /* Les navigateurs coupent la reconnaissance toutes les quelques dizaines de
     secondes : on la relance tant que l'artisane compte — et seulement si
     cette écoute-ci est toujours celle en cours. */
  r.onend = function(){
    if (!vocal.actif || vocal.rec !== r) return;
    setTimeout(function(){ if (vocal.actif && vocal.rec === r){ try{ r.start(); }catch(e){} } }, echecsReseau ? 800 : 0);
  };
  try{ r.start(); }catch(e){ return false; }
  vocal.rec = r; vocal.actif = true;
  if (badge) badge.classList.add("on");
  garderEcranAllume();
  return true;
}

/* Le bloc complet, réutilisé dans « Mes patrons » et dans la fiche création :
   une seule implémentation, donc un seul comportement. */
function compteurMainsLibres(obj, apresChangement){
  var box = el('<div></div>');
  var zone = el('<button type="button" class="zoneTap" aria-live="polite">'+
    '<span class="gros">'+(obj.rang||0)+'</span>'+
    '<span class="sous">Touche ici pour compter un rang</span></button>');
  var gros = zone.querySelector(".gros");

  function peindre(){
    gros.textContent = obj.rang || 0;
    zone.setAttribute("aria-label", "Rang " + (obj.rang||0) + ", toucher pour ajouter un rang");
    sauverTout();
    if (apresChangement) apresChangement();
  }
  function plus(){
    obj.rang = (obj.rang||0) + 1; peindre();
    if (navigator.vibrate) { try{ navigator.vibrate(12); }catch(e){} }
  }
  function moins(){
    obj.rang = Math.max(0, (obj.rang||0) - 1); peindre();
    if (navigator.vibrate) { try{ navigator.vibrate([8,40,8]); }catch(e){} }
  }
  zone.addEventListener("click", plus);
  box.appendChild(zone);

  var bar = el('<div class="mlbar"></div>');
  bar.appendChild(bouton("− un rang", moins));
  bar.appendChild(bouton("Remettre à zéro", function(){
    confirmer({titre:"Remettre le compteur à zéro ?", texte:"Tu es au rang " + (obj.rang||0) + ". Le compteur repartira de 0.",
               bouton:"Remettre à zéro"}, function(){ obj.rang = 0; peindre(); });
  }));

  if (voixDisponible()){
    var badge = el('<span class="ecoute"><span class="pt"></span><span class="lab">micro éteint</span></span>');
    var bVoix = bouton("Compter à la voix", function(){
      if (vocal.actif && vocal.cible === obj){
        arreterVoix();
        bVoix.textContent = "Compter à la voix";
        badge.querySelector(".lab").textContent = "micro éteint";
        return;
      }
      if (demarrerVoix(plus, moins, badge)){
        vocal.cible = obj;
        bVoix.textContent = "Arrêter le micro";
        badge.querySelector(".lab").textContent = "dis « plus » ou « moins »";
      } else {
        toast("Le comptage à la voix ne fonctionne pas sur cet appareil. Touche la grande zone pour compter.");
      }
    });
    bar.appendChild(bVoix);
    bar.appendChild(badge);
  }
  box.appendChild(bar);

  var aide = el('<p class="hint" style="margin-top:10px">'+
    (voixDisponible()
      ? 'Trois façons d\'avancer sans lâcher ton crochet : toucher la grande zone du '+
        'bout du doigt, dire <b>« plus »</b> ou <b>« suivant »</b>, ou <b>« moins »</b> en cas d\'erreur. '+
        'Tant que le micro est allumé, l\'écran ne s\'éteint pas.'
      : 'Touche la grande zone pour compter un rang. La commande vocale n\'est pas '+
        'disponible sur cet appareil : touche la grande zone pour compter.')+
    '</p>');
  box.appendChild(aide);
  return box;
}


/* ═════ 14. DÉMARRAGE ═════ */

state = charger();
document.documentElement.lang = "fr";
/* Un réglage modifié juste avant de fermer l'onglet ne doit pas être perdu :
   on force l'écriture au moment où la page part ou passe en arrière-plan. */
window.addEventListener("beforeunload", ecrireEnAttente);
window.addEventListener("pagehide", ecrireEnAttente);
document.addEventListener("visibilitychange", function(){ if (document.hidden) ecrireEnAttente(); });
var avertiOnglets = false;
/* Deux onglets ouverts sur le même appareil : quand l'un enregistre, l'autre
   reprend cet état au lieu de garder en mémoire une version dépassée (qu'il
   aurait fini par réécrire par-dessus). */
window.addEventListener("storage", function(e){
  if (e.key !== KEY || !e.newValue) return;
  try{
    var p = JSON.parse(e.newValue);
    if (!p || !p.matieres || !p.creations) return;
    /* Une frappe de CET onglet attendait son écriture (250 ms) : elle est
       la plus récente. On l'écrit au lieu de la perdre ; l'autre onglet
       reprendra cet état à son tour. */
    if (tSauve){
      ecrireLocal();
      if (!avertiOnglets){ avertiOnglets = true;
        toast("Crochompte est ouvert dans un autre onglet : ferme-le pour ne pas mélanger tes saisies.", {important:true}); }
      return;
    }
    state = migrer(p);
    if (etatAcces.exige && !etatAcces.connecte) return;
    if (view.tab === "fiche" && view.draft && ficheModifiee()) return;   /* ne pas casser une saisie en cours */
    render();
  }catch(err){}
});
document.getElementById("brand").addEventListener("click", function(){
  view.modeleVu = null; view.cmdVue = null; view.patronVu = null;
  view.sousPatrons = null; view.biblioVu = null;
  aller("accueil");
});
view.tab = "accueil";   /* toujours le tableau de bord en premier */

/* Copie de l'application sur l'appareil, pour qu'elle s'ouvre même sans
   réseau (voir sw.js). Sans effet sur les navigateurs qui ne le permettent pas. */
if ("serviceWorker" in navigator && (location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))){
  window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
}

/* Avec une installation « comptes » (config.js rempli), rien ne s'affiche
   tant que sync.js n'a pas dit s'il existe déjà une session : ça évite de
   montrer l'atelier une fraction de seconde avant de le refermer derrière un
   écran de connexion. Sans config.js, rien ne change : l'outil démarre
   comme avant. */
(function(){
  var cfg = window.CROCHOMPTE_CONFIG || {};
  if (cfg.supabaseUrl && cfg.supabaseAnonKey){
    renderChargement();
    minuteurChargement = setTimeout(function(){
      if (!etatAcces.recu) renderErreurChargement();
    }, 7000);
  } else {
    render();
  }
})();

})();
