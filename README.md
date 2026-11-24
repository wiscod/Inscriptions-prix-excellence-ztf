# Inscriptions — Prix d'Excellence ZTF

Site de candidature au **Prix d'Excellence Zacharias Tanee Fomum (Prix ZTF)**, réservé pour l'instant aux candidats du **Cameroun**, ouvert aux **élèves du secondaire** et aux **étudiants du supérieur**, en **français et en anglais**. Hébergé sur **Vercel**. Date limite affichée : 28 novembre 2026 ; les envois restent ouverts tant que la Fondation ne les ferme pas (variable `DEADLINE`).

- **Formulaire** : `/` (maquette « Affiche et formulaire » : l'affiche de la 6e édition à gauche, le formulaire sur fond clair à droite)
- **Administration** : `/admin/` (un compte par personne, voir « Administration » plus bas)
- **Maquettes** : `/maquettes/`
- **Pages par école** (en préparation, ENSPY d'abord) : `/maquettes/ecoles/`, 5 maquettes de la colonne de gauche ; le formulaire de droite reste celui du site

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
| Informations personnelles | Genre (Homme / Femme), Nom, Prénom, Nationalité, Date de naissance, Ville / Village, Numéro de téléphone | oui |
| | Adresse électronique | non |
| Informations académiques | Catégorie d'établissement (9 catégories officielles) | oui |
| | École durant l'année 2025/2026 : liste officielle filtrée par catégorie, ou « Mon établissement n'est pas dans la liste » | oui |
| | Classe (6ème … Terminale, Form 1 … Upper Sixth) **ou** Niveau d'éducation (BAC +1 … > BAC +5 / PhD) | oui |
| | Série (second cycle du secondaire), « Non applicable » (6ème-3ème, Form 1-4) **ou** Domaine d'études (supérieur) | oui |
| | Moyenne générale (+ « Je n'ai pas de notes / moyenne » pour > BAC +5) | oui, sauf case cochée |
| Pièces jointes et motivation | Relevés de notes et bulletins 2025/2026 (images ou PDF, 4 Mo par fichier ; les photos sont réduites dans le navigateur avant l'envoi) | oui |
| | Diplômes et relevés d'examens officiels | non |
| | Tout document utile complémentaire | non |
| | Motivation (2 000 caractères) | non |

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
  css/affiche.css, js/affiche.js, img/   identité des affiches, compte à rebours, affiche
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
  index.html                  galerie des 5 propositions
  1-classique.html … 5-prestige.html
  shared/ztf-lists.js         listes officielles (générées depuis apply.excellenceawardsztf.com)
  shared/form-data.js         paramètres (date limite, contact, WhatsApp, 4 Mo par fichier)
  shared/form-i18n.js         textes de l'interface en français et en anglais
  shared/form-markup.js       champs du formulaire
  shared/form-engine.js       langue, champs dépendants, validation, pièces jointes, fiche PDF
  ecoles/                     pages par école : galerie, enspy/1-…5-….html, ecoles.css, ecoles.js, img/ (+ SOURCES.md)
scripts/build.mjs             assemble dist/ (site + shared + maquettes)
scripts/maquettes-ecoles.mjs  régénère maquettes/ecoles/enspy/ à partir du formulaire de site/index.html
vercel.json                   build, région, tâche planifiée
```

## Flyer avec QR code

`flyer/flyer-prix-ztf-A4.pdf` (impression A4) et `flyer/flyer-prix-ztf.jpg` (partage WhatsApp et réseaux). Le QR code mène au formulaire. Pour le régénérer, par exemple après un changement d'adresse :

```
node flyer/build-flyer.cjs https://nouvelle-adresse.example
```

Le script a besoin des paquets `qrcode`, `jsqr`, `pngjs` et `playwright` ; il vérifie à la fin que le QR code se lit et mène à la bonne adresse.

