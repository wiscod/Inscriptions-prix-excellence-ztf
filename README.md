# Inscriptions — Prix d'Excellence ZTF

Site de candidature au **Prix d'Excellence Zacharias Tanee Fomum (Prix ZTF)**, réservé pour l'instant aux candidats du **Cameroun**, ouvert aux **élèves du secondaire** et aux **étudiants du supérieur**, en **français et en anglais**. Hébergé sur **Vercel**. Date limite affichée : 28 novembre 2026 ; les envois restent ouverts tant que la Fondation ne les ferme pas (variable `DEADLINE`).

- **Formulaire** : `/` (maquette « Affiche et formulaire » : l'affiche de la 6e édition à gauche, le formulaire sur fond clair à droite)
- **Administration** : `/admin/` (un compte par personne, voir « Administration » plus bas)
- **Pages par école** : `/enspy`, `/fmsb`, `/enset`, `/polytech-douala` (ENSPD), `/udm` (Université des Montagnes). Même page que `/`, mais l'en-tête de droite montre le logo de l'école et celui du prix, « Candidature ENSPY », la date limite, l'audition et le lieu, sur une photo de l'école. Audition et lieu : « À préciser » tant que la Fondation ne les a pas fixés (textes dans `site/js/ecole.js`). Sur ces pages, la catégorie et l'école sont remplies d'office (champs masqués) et la liste des domaines d'études est limitée à ceux de l'école (`scripts/pages-ecoles.mjs`, avec la source de chaque liste).

## Ce qu'est le Prix ZTF (synthèse de excellenceawardsztf.com)

- **Organisateur** : la Fondation Zacharias Tanee Fomum. Le prix porte le nom du Pr Zacharias Tanee Fomum, chimiste (DSc en chimie organique), qui a montré qu'on peut exceller à la fois « dans le faire et dans l'être ».
- **Objectif** : « un instrument d'incitation mentale pour stimuler les intellectuels à travailler dur dans l'intérêt de la nation et du monde ». Il récompense l'excellence académique ; une **bourse financière** est remise aux lauréats.
- **Historique** : 5 éditions depuis 2021 (277 postulants la première année, près de 6 300 participants en 2025, venus des 10 régions du Cameroun et d'une dizaine de pays).
- **Déroulement** : appel à candidatures → collecte des dossiers → classement par catégorie → auditions → jury scientifique → publication des lauréats → cérémonie de remise des prix (Yaoundé).
- **Identité visuelle** : vert `#33a15a`, jaune `#f8da49`, bleu nuit `#030842`.

## Sources des champs

- Formulaire de référence : [africaexcellenceawards.org/candidature](https://africaexcellenceawards.org/candidature) (structure de départ).
- Formulaire officiel actuel du prix : [apply.excellenceawardsztf.com](https://apply.excellenceawardsztf.com/). On en reprend les listes (niveaux, séries, domaines d'études, catégories d'établissements, 594 écoles du Cameroun), le genre, l'e-mail facultatif, la motivation (2 000 caractères), la limite de 4 Mo par fichier, l'identifiant et la fiche PDF à imprimer pour l'audition, et le support WhatsApp.

Retirés à la demande de la Fondation : pièce d'identité, rang et effectif, parent ou tuteur, résultats GCE, case CGU (en attendant les textes).

## Champs du formulaire

| Section | Champ | Obligatoire |
|---|---|---|
| Informations personnelles | Genre (Homme / Femme), Nom, Prénom, Nationalité, Date de naissance, Numéro de téléphone | oui |
| | Adresse électronique | non |
| Informations académiques | Catégorie d'établissement (9 catégories officielles) | oui |
| | École durant l'année 2025/2026 : liste officielle filtrée par catégorie, ou « Mon établissement n'est pas dans la liste » | oui |
| | Classe (6ème … Terminale, Form 1 … Upper Sixth) **ou** Niveau d'éducation (BAC +1 … > BAC +5 / PhD) | oui |
| | Série (second cycle du secondaire), « Non applicable » (6ème-3ème, Form 1-4) **ou** Domaine d'études (supérieur ; sur une page d'école, seulement les domaines de ses filières, plus « Autre » à préciser en texte libre) | oui |
| | Moyenne générale (+ « Je n'ai pas de notes / moyenne » pour > BAC +5) | oui, sauf case cochée |
| Pièces jointes et motivation | Relevés de notes et bulletins 2025/2026 (images ou PDF, 4 Mo par fichier ; les photos sont réduites dans le navigateur avant l'envoi) | oui |
| | Diplômes et relevés d'examens officiels | non |
| | Tout document utile complémentaire | non |
| | Motivation (2 000 caractères) | non |

Le champ « Ville / Village » a été retiré (novembre 2026) : les dossiers reçus avant gardent leur ville, visible dans l'administration, l'export CSV et la fiche PDF.

Les listes officielles sont dans [`maquettes/shared/ztf-lists.js`](maquettes/shared/ztf-lists.js), utilisé à la fois par le navigateur et par le serveur.

## Après l'envoi

Le candidat reçoit un **numéro de dossier** et un **identifiant** (ex. `BU9G3-JG42A`). Il télécharge sa **fiche de candidature en PDF**, à imprimer et apporter à l'audition. Plus tard, « Déjà inscrit ? » en haut du formulaire lui permet de retélécharger sa fiche avec son identifiant. Si le candidat a donné un e-mail et que le service d'envoi est configuré, il reçoit aussi un accusé de réception avec son identifiant.

## Fonctionnement de l'envoi

1. `POST /api/dossiers` : la fiche et la liste des fichiers. Le serveur refait tous les contrôles (dont la cohérence catégorie / niveau / série), enregistre la fiche (état « en cours ») et renvoie le numéro de dossier et un jeton d'envoi.
2. Avec Cloudflare R2 : le navigateur envoie chaque fichier directement dans le stockage, à une adresse signée valable 2 heures reçue à l'étape 1 (les fichiers ne passent pas par Vercel). Sans R2 : `PUT /api/dossiers/:id/files/...`, en morceaux de 3 Mo (une fonction Vercel n'accepte que 4,5 Mo par requête). Chaque envoi est réessayé trois fois en cas de coupure.
3. `POST /api/dossiers/:id/finalize` : vérifie que chaque fichier est arrivé en entier, à la taille annoncée, passe le dossier à l'état « soumis » et renvoie l'identifiant.
4. `POST /api/lookup` : « Déjà inscrit ? », renvoie la fiche correspondant à un identifiant.
5. Chaque nuit à 03 h 17 UTC, une tâche planifiée (`vercel.json`) supprime les envois restés inachevés plus de 48 heures.

Photos : au moment du choix, toute image de plus de 600 Ko est réduite dans le navigateur (2 000 pixels au plus sur le grand côté, JPEG), ce qui ramène une photo de téléphone à quelques centaines de Ko. Les PDF ne sont pas modifiés : au-delà de 4 Mo, ils sont refusés.

## Connexions lentes et instables

Le site est surtout utilisé au Cameroun, en 3G ou Edge, avec des coupures et des forfaits limités.

- **Poids de la page** : l'affiche et les photos des écoles sont servies en AVIF ou WebP, à la largeur dont l'écran a besoin (`scripts/images-web.py` crée les variantes, le build pose les `<picture>`). Les polices sont hébergées sur le site (`site/fonts/`, `site/css/polices.css`) ; Great Vibes est réduite aux lettres du titre. jsPDF est servi par le site (`site/vendor/`, cdnjs en secours) et se charge pendant l'envoi, pour que la fiche PDF soit prête à la fin.
- **Cache** : au build, chaque CSS, JS, image et police est appelé avec `?v=<empreinte>` et mis en cache un an (`vercel.json`) ; à la visite suivante, seule la page HTML est redemandée. Un service worker (`site/sw.js`) garde la page pour qu'elle s'ouvre même sans réseau ; la page reste toujours demandée au réseau d'abord.
- **Brouillon** : les réponses (localStorage) et les pièces jointes (IndexedDB) restent sur l'appareil 7 jours au plus, si la page se recharge ou se ferme. Elles sont effacées après l'envoi ou avec « Tout effacer ». Rien ne part au serveur avant l'envoi. Un bandeau signale quand l'appareil est hors connexion.
- **Envoi** : chaque requête a un délai d'attente et est relancée jusqu'à 6 fois (pause de 2 s à 30 s) ; si le téléphone est hors connexion, l'envoi attend le retour du réseau. Un envoi interrompu est gardé : en appuyant de nouveau sur « Envoyer ma candidature », même après un rechargement, seuls les fichiers qui ne sont pas encore arrivés repartent (même dossier, tant que la fiche et les fichiers n'ont pas changé et que les adresses d'envoi sont valables). Si la réponse de `/finalize` se perd, la nouvelle demande renvoie le même identifiant (gardé chiffré avec le jeton d'envoi, que seul le navigateur du candidat connaît).
- **Administration** : délai d'attente de 30 s ; les lectures sont relancées 3 fois avant d'afficher une erreur, avec un message de connexion lente ou coupée. Les modifications ne sont jamais relancées automatiquement.
- **Tests** : `npm run build && node tests/reseau.cjs` lance un serveur local (`tests/serveur-local.mjs` : `dist/` avec les en-têtes de Vercel, les vraies fonctions `api/`, un faux R2 en mémoire) et rejoue le formulaire en 3G lente, avec coupures pendant l'envoi, réponse finale perdue, erreurs serveur, passage hors ligne, rechargement en cours d'envoi, page rouverte sans réseau, en français et en anglais.

Stockage : **Cloudflare R2** (bucket privé) dès que les quatre variables `R2_…` sont posées, sinon le store **Vercel Blob privé** d'origine. Rien n'y est lisible sans passer par les fonctions ; l'administration ouvre les pièces jointes par un lien signé valable 5 minutes. Fonctions dans la région de Paris (`cdg1`), la plus proche du Cameroun.

Pourquoi R2 : l'offre gratuite de Vercel Blob s'arrête à 1 Go et 2 000 écritures par mois (environ 250 dossiers), et bloque le stockage 30 jours en cas de dépassement. R2 offre 10 Go et 1 million d'écritures par mois, puis 0,015 $ par Go et par mois ; les téléchargements sont gratuits.

### Passer de Vercel Blob à R2

1. Créer le bucket R2 et lui donner cette règle CORS (bucket → *Settings* → *CORS policy*) :
   `[{"AllowedOrigins":["https://prix-ztf-candidature.vercel.app"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]`
2. Créer une clé d'API R2 « Object Read & Write » limitée à ce bucket.
3. Poser `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` dans Vercel, puis redéployer.
4. Recopier l'existant (comptes, journal, dossiers, pièces jointes recollées en un seul fichier), à relancer jusqu'à `"remaining": 0` :
   `curl -X POST https://prix-ztf-candidature.vercel.app/api/admin/migrate -H "x-migrate-secret: $ADMIN_PASSWORD"`
   Garder `BLOB_READ_WRITE_TOKEN` tant que la recopie n'est pas terminée.

## Administration

Chaque personne a son propre compte. Trois rôles :

| Rôle | Peut |
|---|---|
| Lecteur | consulter les dossiers, ouvrir les pièces jointes, exporter en CSV |
| Gestionnaire | en plus, supprimer un dossier |
| Administrateur | en plus, créer et désactiver des comptes, changer les rôles, réinitialiser un mot de passe, lire le journal |

- **Premier accès** : tant qu'aucun compte n'existe, se connecter avec l'identifiant `admin` et le mot de passe `ADMIN_PASSWORD`. L'écran qui s'ouvre sert uniquement à créer le premier compte administrateur, avec son propre mot de passe. Dès qu'un compte existe, ce premier accès est refusé.
- **Nouveaux comptes** : un administrateur choisit l'identifiant, le nom et le rôle. Le site affiche une seule fois un mot de passe provisoire, à transmettre à la personne ; elle doit le remplacer à sa première connexion (10 caractères au moins).
- **Sessions** : 12 heures. Désactiver un compte, changer son rôle ou son mot de passe ferme ses sessions ouvertes. Il reste toujours au moins un administrateur actif, et personne ne peut désactiver son propre compte.
- **Journal** : chaque connexion (réussie ou refusée), dossier consulté, pièce jointe ouverte, suppression, export CSV et changement de compte est noté avec la date, la personne et le dossier concerné. Les administrateurs le lisent dans l'onglet « Journal ».

Comptes et journal sont rangés dans le même store Blob privé (`comptes/`, `journal/`). Les mots de passe y sont stockés hachés (scrypt).

## Variables d'environnement (Vercel)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | stockage Cloudflare R2 ; les quatre ensemble | recommandé |
| `BLOB_READ_WRITE_TOKEN` | accès au store Vercel Blob (stockage sans R2, et source de la recopie vers R2) | sans R2 |
| `ADMIN_PASSWORD` | mot de passe du premier accès à `/admin/` (identifiant `admin`), utilisable seulement tant qu'aucun compte n'existe | oui |
| `SESSION_SECRET` | clé de signature des sessions de l'administration ; à défaut, dérivée de `BLOB_READ_WRITE_TOKEN` | non |
| `CRON_SECRET` | protège la tâche de nettoyage quotidienne | oui |
| `RESEND_API_KEY` | clé de l'API Resend pour l'accusé de réception ; sans elle, aucun e-mail ne part | non |
| `EMAIL_FROM` | expéditeur, ex. `Prix d'Excellence ZTF <candidatures@excellenceawardsztf.com>` (domaine vérifié chez Resend) | avec `RESEND_API_KEY` |
| `DEADLINE` | date limite (ISO 8601, ex. `2027-03-31T23:59:59+01:00`) ; après elle, les nouveaux dossiers sont refusés | non |

Une variable modifiée ne s'applique qu'au déploiement suivant.

## Structure

```
site/
  index.html                  formulaire réel (maquette « Affiche et formulaire » + envoi au serveur)
  css/affiche.css, js/affiche.js, img/   identité des affiches, textes de l'événement, affiche
                              (affiche-gala.jpg et affiche-gala-2x.jpg : l'affiche de la Fondation agrandie ×2 avec Real-ESRGAN x4plus, puis réduite ; textes vérifiés à l'œil, aucun caractère modifié)
  enspy/index.html            page de l'ENSPY (générée par scripts/pages-ecoles.mjs, ne pas modifier à la main)
  css/ecole.css, js/ecole.js, img/ecoles/   en-tête des pages par école
  js/submit.js                envoi du dossier et recherche « Déjà inscrit ? »
  admin/index.html            connexion, dossiers, comptes, journal
api/                          fonctions Vercel (routage par fichiers)
  dossiers/index.js           création du dossier
  dossiers/[id]/files/…       réception des morceaux de fichiers
  dossiers/[id]/finalize.js   validation finale, identifiant
  lookup.js                   « Déjà inscrit ? »
  admin.js                    toute l'administration (/api/admin/… y est redirigé par vercel.json)
  cron/cleanup.js             nettoyage quotidien
lib/                          stockage Blob, contrôles des champs, comptes et journal (auth.js), e-mail
maquettes/
  shared/ztf-lists.js         listes officielles (générées depuis apply.excellenceawardsztf.com)
  shared/form-data.js         paramètres (date limite, contact, WhatsApp, 4 Mo par fichier)
  shared/form-i18n.js         textes de l'interface en français et en anglais
  shared/form-markup.js       champs du formulaire
  shared/form-engine.js       langue, champs dépendants, validation, pièces jointes, fiche PDF
docs/sources-images.md        sources et licences des photos et logos des écoles
flyer/                        flyers (général et par école, flyer/ecoles/), images dans flyer/img/
scripts/build.mjs             régénère les pages par école puis assemble dist/ (site + shared)
scripts/optimise-dist.mjs     dernière étape du build : <picture> AVIF/WebP, adresses ?v=<empreinte>, version du service worker
scripts/images-web.py         variantes AVIF/WebP des images (à relancer après l'ajout d'une image, ex. une nouvelle école)
site/sw.js                    service worker (page disponible hors connexion)
site/fonts/, site/css/polices.css, site/vendor/   polices et jsPDF servis par le site
tests/serveur-local.mjs, tests/reseau.cjs          tests de bout en bout sur réseau lent ou coupé
scripts/pages-ecoles.mjs      site/<école>/index.html à partir de site/index.html (une entrée par école)
scripts/controle-ecrans.cjs   `npm run controle` : ouvre / et chaque page d'école à 5 largeurs (iPhone, iPad, 1280, 1440, 1920 px), fait les captures (.controle-ecrans/) et signale défilement horizontal, bandeau qui n'atteint pas le bord, image cassée ou déformée, champs sous 16 px et cibles tactiles sous 24 px sur écran tactile
vercel.json                   build, région, tâche planifiée
```

## Flyer avec QR code

`flyer/flyer-prix-ztf-A4.pdf` (impression A4) et `flyer/flyer-prix-ztf.jpg` (partage WhatsApp et réseaux). Le QR code mène au formulaire. Pour le régénérer, par exemple après un changement d'adresse :

```
node flyer/build-flyer.cjs https://nouvelle-adresse.example
```

Le script a besoin des paquets `qrcode`, `jsqr`, `pngjs` et `playwright` ; il vérifie à la fin que le QR code se lit et mène à la bonne adresse.

