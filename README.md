# Patch vidéo · Auditorium des Grandes Serres

Pour chaque image (ordi au plateau, caméra PTZ…), le site dit où brancher, quel routage faire
dans le Videohub, quels cordons poser aux patchs BNC de la régie (U28 / U27) et quels
convertisseurs prévoir.

Site statique HTML + JS (pas de build), même principe que patch-auditorium et Salle 3D.
Accès par mot de passe (`middleware.js`, variable `SITE_PASSWORD` dans Vercel).

## Fichiers

| Fichier | Rôle |
|---|---|
| `js/data.js` | l'installation : boîtiers, ports du Videohub, numéros de câbles, patchs U27 / U28, synchro, PTZ, parc |
| `js/route.js` | le calcul des chemins (fonction pure, testée) |
| `js/app.js` | l'interface : Liaisons, Videohub, Patch régie, Plan, Caméra PTZ, Fiche, Comprendre |
| `boitiers/` | tableaux de circuits des boîtiers, repris de patch-auditorium |
| `tests/` | `npm test` |

## Données à vérifier sur place

Source : synoptique LGS2-INE-EXE-22-SCH-AUD-TN-8002, indice 0 (02/10/2025).

- Le mélangeur vidéo prévu n'est pas installé : sorties 23–26 et entrées 30–31 de la matrice.
- L'entrée du vidéoprojecteur (HDMI ou SDI) : dans Réglages.
- La source du patch synchro.

Vérifié : le pupitre AW-RP60GJ pilote bien la caméra PTZ.

## Déployer

1. Vercel : Add New → Project → importer `patch_vid-o`, Framework « Other ».
2. Settings → Environment Variables : `SITE_PASSWORD`, puis redéployer.
