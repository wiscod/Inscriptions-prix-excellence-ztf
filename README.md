# Inscriptions — Prix d'Excellence ZTF

Site de candidature au **Prix d'Excellence Zacharias Tanee Fomum (Prix ZTF)**, réservé pour l'instant aux candidats du **Cameroun**.

Cette première étape propose **5 maquettes** du formulaire : ouvrir [`maquettes/index.html`](maquettes/index.html) dans un navigateur.

## Ce qu'est le Prix ZTF (synthèse de excellenceawardsztf.com)

- **Organisateur** : la Fondation Zacharias Tanee Fomum. Le prix porte le nom du Pr Zacharias Tanee Fomum, chimiste (DSc en chimie organique), qui a montré qu'on peut exceller à la fois « dans le faire et dans l'être ».
- **Objectif** : « un instrument d'incitation mentale pour stimuler les intellectuels à travailler dur dans l'intérêt de la nation et du monde ». Il récompense l'excellence académique et une **bourse financière** est remise aux lauréats.
- **Historique** : 5 éditions depuis 2021 (277 postulants la première année, près de 6 300 participants en 2025, venus des 10 régions du Cameroun et d'une dizaine de pays). Comité d'organisation présidé par le Pr Dieudonné Njamen (Université de Ngaoundéré).
- **Déroulement** : appel à candidatures → collecte des dossiers (physiques et numériques) → classement des dossiers par catégorie → auditions/entretiens → jury scientifique → publication des lauréats → cérémonie de remise des prix (Yaoundé).
- **Identité visuelle** : vert `#33a15a`, jaune `#f8da49`, bleu nuit `#030842`, police Inter.

## Champs du formulaire (identiques à africaexcellenceawards.org/candidature)

| # | Section | Champ | Type | Obligatoire |
|---|---|---|---|---|
| 1 | Informations générales du candidat | Civilité (M. / Mme / Mlle) | liste | oui |
| 2 | | Nom | texte | oui |
| 3 | | Prénom | texte | oui |
| 4 | | Nationalité | liste de pays | oui |
| 5 | | Date de naissance | date (15 ans minimum) | oui |
| 6 | | Ville de résidence | recherche | oui |
| 7 | | Téléphone | indicatif + numéro | oui |
| 8 | | Adresse électronique | e-mail | oui |
| 9 | Parcours académique | Établissement (catégorie) | liste (10 catégories) | oui |
| 10 | | Établissement (sous-catégorie) | liste dépendante | oui |
| 11 | | Établissement (nom) | recherche + « Mon établissement n'est pas dans la liste » | oui |
| 12 | | Domaine d'études | liste (93 domaines) | oui |
| 13 | | Niveau (BAC+1 … Post-BAC+5, Autre) | liste | oui |
| 14 | | Moyenne (+ « Je n'ai pas de notes / moyenne » si Post-BAC+5) | texte | oui, sauf case cochée |
| 15 | | Classement dans la promotion (+ « Non communiqué sur le relevé de notes ») | texte | valeur ou case |
| 16 | | Taille de la promotion (+ « Non communiqué ») | nombre | valeur ou case |
| 17 | Pièces jointes (PJs) | Pièce d'identité (Passeport ou CNI) : PDF, PNG, JPG | fichier | oui |
| 18 | | Diplômes et relevés de notes (2025-2026) | fichiers multiples | oui |
| 19 | | Tout document utile complémentaire (CV, lettre de motivation…) | fichiers multiples | non |
| 20 | | Informations complémentaires | texte long | non |
| 21 | — | Acceptation des CGU et de la Politique de Confidentialité | case | oui |

Les listes complètes sont dans [`maquettes/shared/form-data.js`](maquettes/shared/form-data.js).

## Structure

```
maquettes/
  index.html                 galerie des 5 propositions
  1-classique.html           … 5-prestige.html
  shared/form-data.js        listes (reprises de la référence) et paramètres (date limite, contact)
  shared/form-markup.js      champs du formulaire, communs aux 5 maquettes
  shared/form-engine.js      comportements : listes dépendantes, validation, pièces jointes, récapitulatif
  apercus/                   captures d'écran pour la galerie
```
