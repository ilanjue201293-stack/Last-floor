# NIGHT TRAIN

NIGHT TRAIN est un jeu narratif de survie dans un train de nuit.

Tu ne contrôles pas le déplacement. Le train avance tout seul et, à chaque arrêt, une situation t'oblige à choisir.

Le cœur du jeu est la séparation entre :

1. l'action immédiate : ce que tu viens de décider se produit maintenant et modifie immédiatement la scène ;
2. la narration : un texte progressif raconte ce qui vient réellement de se passer ;
3. la conséquence retardée : une décision peut provoquer quelque chose plusieurs arrêts plus tard.

Le but est d'atteindre le terminus **MAISON**.

## Système de partie

Chaque session possède un code de partie, un nom de voyageur et un mode de trajet. La session est sauvegardée localement dans le navigateur. Le lobby permet de créer une nouvelle partie ou de reprendre le trajet en cours.

Modes :
- COURT : 12 arrêts
- CLASSIQUE : 24 arrêts

Le jeu est volontairement sans backend : il est prêt à être importé directement dans Vercel.

## Stack

Next.js 16 + React 19 + TypeScript, sans dépendance de gameplay externe.

