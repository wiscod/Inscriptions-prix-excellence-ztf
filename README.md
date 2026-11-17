# Inscriptions — Prix d'Excellence ZTF

Site de candidature au **Prix d'Excellence Zacharias Tanee Fomum (Prix ZTF)**, réservé pour l'instant aux candidats du **Cameroun**, ouvert aux **élèves du secondaire** et aux **étudiants du supérieur**, en **français et en anglais**.

- **Formulaire** : https://prix-ztf-candidature.netlify.app (basé sur la maquette 1)
- **Administration** : https://prix-ztf-candidature.netlify.app/admin/ (mot de passe `ADMIN_PASSWORD`)
- **Maquettes** : https://prix-ztf-candidature.netlify.app/maquettes/

## Ce qu'est le Prix ZTF (synthèse de excellenceawardsztf.com)

- **Organisateur** : la Fondation Zacharias Tanee Fomum. Le prix porte le nom du Pr Zacharias Tanee Fomum, chimiste (DSc en chimie organique), qui a montré qu'on peut exceller à la fois « dans le faire et dans l'être ».
- **Objectif** : « un instrument d'incitation mentale pour stimuler les intellectuels à travailler dur dans l'intérêt de la nation et du monde ». Il récompense l'excellence académique ; une **bourse financière** est remise aux lauréats.
- **Historique** : 5 éditions depuis 2021 (277 postulants la première année, près de 6 300 participants en 2025, venus des 10 régions du Cameroun et d'une dizaine de pays). Comité d'organisation présidé par le Pr Dieudonné Njamen (Université de Ngaoundéré).
- **Déroulement** : appel à candidatures → collecte des dossiers → classement par catégorie → auditions → jury scientifique → publication des lauréats → cérémonie de remise des prix (Yaoundé).
- **Identité visuelle** : vert `#33a15a`, jaune `#f8da49`, bleu nuit `#030842`.

## Décisions prises

| Question | Décision |
|---|---|
| Listes d'établissements de la référence (système français : CPGE, BUT, INSP…) | Adaptées au Cameroun ; mêmes champs, même ordre |
| Public | Secondaire (6e → Terminale, Form 1 → Upper Sixth) **et** supérieur |
| Langue | Français + anglais |
| Mineurs | Âge minimum 9 ans ; sous 18 ans, parent ou tuteur obligatoire |
| Résultats | Francophone : moyenne /20, rang, effectif. Anglophone : moyenne et rang du bulletin, plus grades GCE si examen passé |
| Relevés de notes | Champ de dépôt séparé et obligatoire ; diplômes dans un champ facultatif |

## Champs du formulaire

Les champs 1-8, 13-20, 23 et 26-28 suivent la référence [africaexcellenceawards.org/candidature](https://africaexcellenceawards.org/candidature) ; les autres viennent des décisions ci-dessus. La référence n'a qu'un champ « Diplômes et relevés de notes » : il est ici coupé en deux (24 et 25).

| # | Section | Champ | Obligatoire |
|---|---|---|---|
| 1-8 | Informations générales | Civilité, Nom, Prénom, Nationalité, Date de naissance, Ville de résidence, Téléphone (indicatif + numéro), Adresse électronique | oui |
| 9 | ↳ si moins de 18 ans | Lien avec le candidat (Père, Mère, Tuteur légal, Autre membre de la famille) | oui |
| 10 | | Nom et prénom, Téléphone du parent ou tuteur (+ e-mail facultatif) | oui |
| 11 | | Autorisation du parent ou tuteur | oui |
| 12 | Parcours scolaire et académique | Sous-système éducatif (francophone / anglophone) | oui |
| 13 | | Établissement (catégorie) : 2 catégories du secondaire, 8 du supérieur | oui |
| 14 | | Établissement (sous-catégorie) : liste dépendante | oui |
| 15 | | Établissement (nom) : recherche + « Mon établissement n'est pas dans la liste » | oui |
| 16 | | Domaine d'études (supérieur, 93 domaines) **ou** Série / filière (secondaire) | oui |
| 17 | | Niveau (BAC+1 … Post-BAC+5, Autre) **ou** Classe (6e … Terminale / Form 1 … Upper Sixth) | oui |
| 18 | | Moyenne (+ « Je n'ai pas de notes / moyenne » si Post-BAC+5) | oui, sauf case cochée |
| 19 | | Classement dans la promotion **ou** Rang dans la classe (+ « Non communiqué ») | valeur ou case |
| 20 | | Taille de la promotion **ou** Effectif de la classe (+ « Non communiqué ») | valeur ou case |
| 21 | ↳ si secondaire anglophone | Dernier examen GCE passé (aucun / O Level / A Level) | oui |
| 22 | ↳ si examen GCE passé | Matières et grades obtenus | oui |
| 23 | Pièces jointes | Pièce d'identité (Passeport ou CNI ; acte de naissance pour un mineur) : PDF, PNG, JPG | oui |
| 24 | | Relevés de notes et bulletins (2025-2026), plusieurs fichiers | oui |
| 25 | | Diplômes et relevés d'examens officiels (CEP, BEPC, Probatoire, Bac, GCE, BTS, Licence…) | non |
| 26 | | Tout document utile complémentaire | non |
| 27 | | Informations complémentaires | non |
| 28 | Validation | Acceptation des CGU et de la Politique de Confidentialité | oui |

Les listes complètes (en français et en anglais) sont dans [`maquettes/shared/form-data.js`](maquettes/shared/form-data.js).

## Fonctionnement de l'envoi

1. Le navigateur envoie la fiche et la liste des fichiers à `POST /api/dossiers`. Le serveur refait tous les contrôles du formulaire, enregistre la fiche (état « en cours ») et renvoie le numéro de dossier et un jeton d'envoi.
2. Chaque fichier part en morceaux de 3 Mo (`PUT /api/dossiers/:id/files/...`) : une fonction Netlify n'accepte qu'environ 4,5 Mo par requête, et un fichier peut faire jusqu'à 10 Mo. En cas de coupure, chaque morceau est réessayé trois fois.
3. `POST /api/dossiers/:id/finalize` vérifie que tous les morceaux sont arrivés, passe le dossier à l'état « envoyé » et envoie l'accusé de réception au candidat.
4. Chaque nuit à 03 h 17 UTC, une tâche planifiée supprime les envois restés inachevés plus de 48 heures.

Les fiches et les fichiers sont stockés dans Netlify Blobs (stores `candidatures`, `candidature-fichiers`, `candidatures-en-cours`). Ces stores sont partagés entre la production et les prévisualisations de déploiement : ne pas faire de tests d'envoi sur une prévisualisation.

## Variables d'environnement (Netlify)

| Variable | Rôle | Obligatoire |
|---|---|---|
| `ADMIN_PASSWORD` | mot de passe de la page `/admin/` | oui |
| `RESEND_API_KEY` | clé de l'API Resend pour l'accusé de réception ; sans elle, aucun e-mail ne part | non |
| `EMAIL_FROM` | expéditeur, ex. `Prix d'Excellence ZTF <candidatures@excellenceawardsztf.com>` (domaine vérifié chez Resend) | avec `RESEND_API_KEY` |
| `DEADLINE` | date limite (ISO 8601, ex. `2027-03-31T23:59:59+01:00`) ; après elle, les nouveaux dossiers sont refusés | non |

Une variable modifiée ne s'applique qu'au déploiement suivant.

## Structure

```
site/
  index.html                  formulaire réel (maquette 1 + envoi au serveur)
  js/submit.js                envoi du dossier : fiche, fichiers en morceaux, validation finale
  admin/index.html            liste des dossiers, fiche détaillée, pièces jointes, export CSV
netlify/
  functions/                  API : dossier-create, dossier-upload, dossier-finalize,
                              admin-dossiers, admin-file, cleanup-abandoned (tâche planifiée)
  lib/                        stockage, contrôles des champs, e-mail
maquettes/
  index.html                  galerie des 5 propositions
  1-classique.html … 5-prestige.html
  shared/form-data.js         listes et paramètres (date limite, contact, âges, 10 Mo par fichier)
  shared/form-i18n.js         textes de l'interface en français et en anglais
  shared/form-markup.js       champs du formulaire
  shared/form-engine.js       langue, champs dépendants, validation, pièces jointes
scripts/build.mjs             assemble dist/ (site + shared + maquettes)
```

## Développement local

```
npm install
npm run build
netlify dev          # formulaire sur http://localhost:8888, Blobs simulés en local
```

Mettre `ADMIN_PASSWORD=...` dans un fichier `.env` (ignoré par git) pour tester `/admin/`.
