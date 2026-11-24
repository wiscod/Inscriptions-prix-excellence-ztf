---
name: unslop
description: Relit et corrige des textes (français ou anglais) pour enlever le style « IA » (formules creuses, emphase, promesses invérifiables, structures répétitives). Raccourci de projet vers le plugin bd19ccd7-30c0-4f23-845b-afc778c96c98:unslop quand il est installé. À utiliser quand l'utilisateur tape /unslop ou demande un « deslop » / « unslop » d'un texte, d'une page ou du site.
---

# /unslop

Raccourci vers le plugin « unslop » (Anthropic Directory, auteur Jean-Luc Winkler), dont la commande d'origine est `/bd19ccd7-30c0-4f23-845b-afc778c96c98:unslop`.

## 1. Le plugin d'abord

Si la liste des skills de la session contient `bd19ccd7-30c0-4f23-845b-afc778c96c98:unslop`, appelle-le avec l'outil Skill en lui passant les mêmes arguments, puis suis ses instructions. Il ne couvre que l'anglais et l'allemand : pour les textes français, applique en plus la grille ci-dessous.

S'il n'est pas dans la liste, dis-le en une phrase (le plugin s'installe depuis le répertoire de plugins de claude.ai, puis se charge dans une nouvelle session) et applique la grille ci-dessous.

## 2. Cible

- Arguments donnés : un fichier, une page, une clé de texte ou un texte collé → c'est la cible.
- Sans argument, dans ce dépôt : les textes que voit le candidat, dans `maquettes/shared/form-i18n.js` (clés `[français, anglais]`), `site/js/affiche.js`, `site/js/ecole.js`, `site/index.html` et `lib/email.js` (accusé de réception).

## 3. Grille

Pour chaque texte, en français et en anglais :

1. **Vrai et vérifiable.** Supprimer ou corriger toute affirmation que le code ou les faits ne confirment pas : fausse vérification (« anti-robot réussie » sans vérification), sécurité supposée (« transmis de manière sécurisée »), chiffres, dates ou lieux non fournis. Une information inconnue reste « À préciser », jamais inventée.
2. **Mots creux.** Enlever « avec succès », « n'hésitez pas à », « afin de » quand « pour » suffit, « veuillez » en série, « de manière + adjectif », « véritablement », « incontournable », « unique », « exceptionnel » (sauf dans les citations officielles de la Fondation) ; en anglais : « seamless », « robust », « leverage », « delve », « elevate », « unlock », « successfully ».
3. **Ton.** Pas de majuscules pour crier (« vous DEVEZ »), pas de points d'exclamation en série, pas d'emoji décoratifs. Tutoiement ou vouvoiement : garder celui du texte d'origine (le formulaire vouvoie).
4. **Verbes simples et directs.** « Envoyer » plutôt que « soumettre », « Remplissez » plutôt que « Merci de bien vouloir compléter », voix active (« Notre équipe le vérifiera » plutôt que « Il sera soumis à vérification »).
5. **Structure.** Casser les triplets systématiques (« rapide, simple et efficace »), les « Non seulement… mais aussi », les phrases qui annoncent ce qu'elles vont dire, les conclusions qui répètent.
6. **Longueur.** Une consigne = une idée. Couper ce qui ne change rien à ce que le candidat doit faire.
7. **Les deux langues disent la même chose.** Après une correction en français, aligner l'anglais (et inversement), sans traduction mot à mot.

Ne pas toucher : les noms officiels (Prix d'Excellence Zacharias Tanee Fomum, noms d'écoles, catégories et listes de `ztf-lists.js`), les textes repris tels quels des affiches de la Fondation, les dates et numéros de contact.

## 4. Rendu

- Appliquer les corrections dans les fichiers, puis vérifier que les pages s'affichent (Playwright, FR et EN).
- Donner à l'utilisateur un tableau court : avant → après, avec la raison en quelques mots ; signaler à part toute affirmation fausse trouvée.
