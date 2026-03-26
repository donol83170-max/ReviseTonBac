# Zombie Waves — Roblox Game Design Document

> Note globale : **96 / 100**
> Critères : Fun (20/20) · Jouabilité (18/20) · Rejouabilité (15/15) · Originalité (13/15) · Progression (15/15) · Social (15/15)

---

## Vue d'ensemble

Jeu de survie par vagues de zombies sur Roblox, jouable en solo, duo, trio ou quatuor.
Le joueur doit survivre le plus de manches possible tout en gérant une économie en temps réel.

---

## Prompts prêts à coder

---

### 1. Système de vagues (Wave Manager)

```
Crée un script Roblox Lua appelé WaveManager qui :
- Démarre à la manche 1 et incrémente à chaque vague terminée
- Spawn un nombre croissant de zombies à chaque manche (formule : 5 + (manche * 3))
- Attend que tous les zombies soient morts avant de lancer la manche suivante
- Affiche le numéro de manche actuel sur un GUI à l'écran
- Déclenche un événement RemoteEvent "WaveCompleted" à la fin de chaque manche
```

---

### 2. Système d'argent (Economy System)

```
Crée un script Roblox Lua appelé EconomyManager qui :
- Attribue 10 $ au joueur à chaque fois qu'une de ses balles touche un zombie
- Stocke l'argent dans un IntValue dans le joueur (leaderstats)
- Affiche le solde en temps réel sur un GUI HUD en bas à gauche de l'écran
- Empêche l'argent de descendre en dessous de 0
- Envoie un événement RemoteEvent "MoneyUpdated" à chaque changement de solde
```

---

### 3. Armes sur les murs (Wall Buys)

```
Crée un système Roblox Lua appelé WallBuySystem qui :
- Place des panneaux d'armes sur les murs de la map avec un BillboardGui affichant le nom et le prix
- Permet au joueur d'acheter une arme en s'approchant (ProximityPrompt) et en ayant assez d'argent
- Déduit le prix du solde du joueur via EconomyManager
- Donne l'arme correspondante au joueur dans son inventaire
- Liste d'armes de base : Pistolet (500$), Shotgun (1500$), AK-47 (2500$), Sniper (4000$)
- Affiche "Fonds insuffisants" si le joueur n'a pas assez d'argent
```

---

### 4. Zombies de base (Basic Zombie AI)

```
Crée un NPC Roblox Lua appelé BasicZombie qui :
- Se déplace vers le joueur le plus proche en utilisant PathfindingService
- Inflige 10 dégâts par seconde au contact du joueur
- A 100 PV de base, augmentés de 10 PV à chaque manche
- Meurt avec une animation et un son quand ses PV atteignent 0
- Déclenche un événement "ZombieDied" à sa mort pour que EconomyManager récompense le joueur
- Drop un effet de particules rouge à sa mort
```

---

### 5. Zombies spéciaux

```
Crée 3 types de zombies spéciaux en Roblox Lua :

ZombieRapide :
- 2x plus rapide que le zombie de base
- 50 PV seulement
- Récompense : 20$ à la mort

ZombieTank :
- 3x plus lent que le zombie de base
- 500 PV, taille augmentée (Scale x2)
- Inflige 30 dégâts par seconde
- Récompense : 100$ à la mort

ZombieExplosif :
- Se précipite vers le joueur et explose à 5 studs de distance
- 80 PV, explosion de rayon 10 studs infligeant 50 dégâts
- Récompense : 50$ à la mort

Chaque type apparaît aléatoirement à partir de la manche 5.
```

---

### 6. Boss toutes les 5 manches (Boss System)

```
Crée un script Roblox Lua appelé BossManager qui :
- Spawn un boss unique à chaque manche multiple de 5 (manche 5, 10, 15...)
- Le boss a 2000 PV + (manche * 200)
- Le boss a 3 phases :
    Phase 1 (100% - 60% PV) : comportement normal
    Phase 2 (60% - 30% PV) : vitesse x1.5
    Phase 3 (30% - 0% PV) : invoque 5 zombies basiques toutes les 10 secondes
- Affiche une barre de vie dédiée en haut de l'écran pendant le combat
- Récompense tous les joueurs de 500$ à sa mort
- Joue une musique de boss spéciale pendant le combat
```

---

### 7. Bonus aléatoires entre les manches (Bonus System)

```
Crée un script Roblox Lua appelé BonusManager qui :
- Se déclenche via l'événement "WaveCompleted"
- Choisit aléatoirement 1 bonus parmi la liste suivante et l'applique :
    * "Double Money" : le prochain round rapporte 2x l'argent (30% de chance)
    * "Heal All" : tous les joueurs sont soignés à 100 PV (25% de chance)
    * "Ammo Drop" : recharge complète de toutes les armes des joueurs (20% de chance)
    * "Speed Boost" : vitesse x1.5 pendant 30 secondes (15% de chance)
    * "Nuke" : tous les zombies encore présents meurent instantanément (10% de chance)
- Affiche le nom du bonus avec une animation GUI pendant 3 secondes
```

---

### 8. Classes / Rôles des joueurs (Class System)

```
Crée un système de classes Roblox Lua appelé ClassManager avec 4 rôles :

Soldier :
- 100 PV, vitesse normale
- Bonus : +20% de dégâts avec toutes les armes

Medic :
- 80 PV, vitesse normale
- Bonus : soigne les alliés proches de 5 PV/s dans un rayon de 15 studs

Tank :
- 200 PV, vitesse -20%
- Bonus : réduit les dégâts reçus de 30%

Scout :
- 70 PV, vitesse +40%
- Bonus : gagne 2x plus d'argent par hit

Le joueur choisit sa classe au lobby avant le début de la partie via un GUI de sélection.
```

---

### 9. Portes verrouillées (Door System)

```
Crée un système Roblox Lua appelé DoorManager qui :
- Place des portes sur la map bloquant l'accès à de nouvelles zones
- Chaque porte a un prix affiché (ex : 750$, 2000$, 5000$)
- Un joueur s'approche et interagit (ProximityPrompt) pour payer et ouvrir la porte
- La porte s'ouvre avec une animation (disparaît avec un Tween)
- L'ouverture est permanente pour toute la partie, même pour les autres joueurs
- Chaque zone débloquée contient de nouveaux wall buys et des spawns de zombies supplémentaires
```

---

### 10. Mode Hardcore

```
Crée un mode de jeu Roblox Lua appelé HardcoreMode qui :
- Peut être activé au lobby par vote (si tous les joueurs acceptent)
- Chaque joueur n'a qu'une seule vie (pas de respawn)
- Quand un joueur meurt, il passe en mode spectateur (caméra suivant les survivants)
- Si tous les joueurs meurent, la partie se termine immédiatement
- Les récompenses en argent sont multipliées par 3
- Un badge exclusif "Hardcore Survivor" est attribué si le joueur atteint la manche 20
```

---

### 11. Leaderboard & Classement

```
Crée un système Roblox Lua appelé LeaderboardManager qui :
- Sauvegarde via DataStoreService : manche maximale atteinte, total de zombies tués, argent total gagné
- Affiche un leaderboard en jeu (top 10 joueurs par manche max) accessible via un panneau sur la map
- Met à jour les stats du joueur à chaque fin de partie
- Affiche les stats personnelles du joueur dans son profil (GUI accessible depuis le lobby)
```

---

### 12. Shop principal (Main Shop)

```
Crée un shop Roblox Lua appelé ShopManager avec trois onglets :

Onglet Armes :
- Pistolet de base (gratuit)
- SMG (800$), Shotgun (1500$), AK-47 (2500$), Sniper (4000$), Lance-flammes (6000$)

Onglet Skins :
- Skins de personnage achetables avec une monnaie premium (Robux) ou une monnaie longue durée
- Skins d'armes changeant l'apparence visuelle sans modifier les stats

Onglet Consommables (utilisables en partie) :
- Bouclier temporaire 30s (300$)
- Vitesse x2 pendant 20s (200$)
- Grenade (150$ l'unité)

Le shop est accessible depuis le lobby et depuis un panneau en jeu entre les manches.
```

---

### 13. Map avec zones multiples

```
Crée une map Roblox avec les zones suivantes, chacune débloquable via le DoorSystem :

Zone 1 — Rue abandonnée (zone de départ) :
- 2 wall buys : Pistolet, Shotgun
- Spawn initial des zombies

Zone 2 — Laboratoire :
- 2 wall buys : AK-47, SMG
- Spawn de zombies spéciaux dès la manche 5

Zone 3 — Usine :
- 2 wall buys : Sniper, Lance-flammes
- Zone de spawn des boss

Chaque zone a une ambiance lumineuse et sonore distincte.
Ajouter des obstacles (voitures, barricades) pour créer des couloirs tactiques.
```

---

### 14. HUD & Interface joueur

```
Crée un HUD Roblox Lua appelé HUDManager avec les éléments suivants :
- Barre de vie en bas à gauche avec couleur changeante (vert > orange > rouge selon les PV)
- Solde d'argent affiché sous la barre de vie
- Numéro de manche actuel en haut au centre
- Munitions restantes en bas à droite (format : balles_chargeur / balles_totales)
- Icône de classe du joueur en haut à gauche
- Minimap simplifiée en haut à droite montrant la position des joueurs alliés
- Notification animée (slide depuis le haut) pour chaque bonus reçu
```

---

## Récapitulatif des systèmes à coder

| # | Système | Priorité |
|---|---|---|
| 1 | Wave Manager | Critique |
| 2 | Economy System | Critique |
| 3 | Wall Buys | Critique |
| 4 | Basic Zombie AI | Critique |
| 5 | Zombies Spéciaux | Haute |
| 6 | Boss System | Haute |
| 7 | Bonus Aléatoires | Haute |
| 8 | Classes / Rôles | Haute |
| 9 | Portes Verrouillées | Moyenne |
| 10 | Mode Hardcore | Moyenne |
| 11 | Leaderboard | Moyenne |
| 12 | Shop Principal | Haute |
| 13 | Map multi-zones | Haute |
| 14 | HUD Interface | Critique |

---

## Ordre de développement recommandé

1. Wave Manager + Basic Zombie AI
2. Economy System + HUD
3. Wall Buys
4. Shop Principal
5. Zombies Spéciaux + Boss System
6. Bonus Aléatoires
7. Classes / Rôles
8. Door System + Map multi-zones
9. Leaderboard
10. Mode Hardcore
