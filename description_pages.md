# Description exhaustive des wireframes

---

## Wireframe 1 — Page Liste `/list`

### Dimensions et structure générale
Pleine largeur, hauteur libre. Trois zones empilées verticalement : header global, barre de contrôles, tableau.

---

### Zone 1 — Header global
Barre horizontale pleine largeur, hauteur fixe.

- **Gauche** : titre de l'application (texte, ex. "Alternance Tracker")
- **Droite** : trois boutons alignés horizontalement
    - `[+ Entreprise]`
    - `[⬇ Export JSON]`
    - `[⬇ Export CSV]`

---

### Zone 2 — Barre de contrôles
Pleine largeur, deux lignes empilées.

**Ligne 1 — Recherche + Tri**
- Champ texte pleine largeur (moins le sélecteur de tri) : `[ 🔍 Rechercher une entreprise... ]`
- Sélecteur de tri collé à droite du champ : `[ Trier par : Priorité ▾ ]`

**Ligne 2 — Filtres statut**
Série de boutons/cases à cocher alignés horizontalement, de gauche à droite :
```
[★ Favoris] [● Positif] [● Ambigu] [● Relance] [● À contacter] [● Pas répondu] [● Négatif]
```
Chaque filtre est cumulable (comportement checkbox). Un filtre actif est visuellement distinct (fond coloré ou bordure marquée).

---

### Zone 3 — Tableau
Pleine largeur, lignes cliquables.

**En-tête de colonne (de gauche à droite) :**
```
★ | Nom | Commune | Priorité | Statut
```

- Colonne ★ : largeur fixe étroite (~40px)
- Colonne Nom : largeur flexible, la plus large
- Colonne Commune : largeur moyenne fixe
- Colonne Priorité : largeur fixe étroite, centré
- Colonne Statut : largeur fixe, badge coloré

**Ligne type :**
```
★ | Schneider Electric | Grenoble | 9 | [● Positif]
☆ | CEA               | Grenoble | 8 | [● Relance]
☆ | Sopra Steria      | Meylan   | 7 | [● À contacter]
```

- ★ rempli = favori actif, cliquable pour toggle
- Clic sur la ligne → navigation vers `/company/:id`
- La ligne survolée est mise en évidence (hover)

**Pied de tableau**
Texte aligné à gauche, petite taille :
```
2000 entreprises affichées · 12 positives · 8 relances
```

---
---

## Wireframe 2 — Page Détail `/company/:id`

### Dimensions cibles
960px de large, 1080px de haut. Tout le contenu doit tenir sans scroll.

### Structure générale
Quatre zones empilées verticalement :
1. Header de page
2. Bloc infos (deux colonnes côte à côte)
3. Bloc contacts (deux colonnes côte à côte)
4. Pied de page

---

### Zone 1 — Header de page
Barre horizontale pleine largeur.

**Gauche vers droite :**
```
[← Liste]   Schneider Electric   [● Positif]   ★ Favori
```
- `[← Liste]` : bouton retour
- Nom de l'entreprise : texte grand, gras
- Badge `best_status` coloré
- Bouton `[★ Favori]` ou `[☆ Favori]` selon état, toggle au clic

**Extrême droite :**
```
🌐 schneider.com
```
Lien cliquable vers le site, affiché uniquement si renseigné.

---

### Zone 2 — Bloc infos
Deux colonnes côte à côte, séparées par une ligne verticale ou un espace.

**Colonne gauche — Infos lecture seule**
Largeur ~40% de la zone. Fond légèrement différencié (gris clair).

Contenu vertical :
```
Secteur     : Énergie / Industrie
Effectifs   : 4 500 (global) · 120 (local)
Commune     : Grenoble (38)
Catégories  : [Ingénierie] [Énergie] [Grand groupe]
Description : Acteur mondial de la gestion de l'énergie...
              [voir plus]
```
- Catégories affichées sous forme de tags
- Description tronquée avec lien `[voir plus]`

**Colonne droite — Accueil**
Largeur ~60%. Formulaire avec sauvegarde indépendante.

```
Téléphone accueil : 04 76 57 60 00      (lecture seule)
Email accueil     : [accueil@schneider.com      ]
Contact accueil   : [M. Dupont - standardiste   ]

                               [💾 Sauver accueil]
```
- Téléphone : affiché en lecture seule, importé du CSV
- Email et contact accueil : champs éditables
- Bouton de sauvegarde aligné à droite

---

### Zone 3 — Bloc contacts
Deux colonnes côte à côte.

**Colonne gauche — Liste des contacts**
Largeur ~35%. Liste verticale des contacts existants.

```
┌─────────────────────────────┐
│ Bruno M. · RH  [● Positif] 🗑│  ← contact sélectionné (surligné)
│ Sarah K. · Tech [● Ambigu] 🗑│
│ ─────────────────────────── │
│ [+ Ajouter un contact]      │
└─────────────────────────────┘
```
- Chaque ligne : Nom · Poste · Badge statut · Icône 🗑 (suppression avec confirmation)
- Contact sélectionné : fond coloré ou bordure gauche accentuée
- `[+ Ajouter un contact]` en bas de liste, vide le formulaire

**Colonne droite — Formulaire contact actif**
Largeur ~65%. Formulaire lié au contact sélectionné ou vierge si ajout.

```
Nom     : [Bruno Martin                ]
Poste   : [Responsable RH             ]
Email   : [b.martin@schneider.com     ]
Tél     : [06 12 34 56 78             ]

Statut  : ○ À contacter  ○ Pas répondu  ● Positif
          ○ Négatif  ○ Ambigu  ○ Relance

Date contact  : [15/01/2025]

[ Zone notes markdown — pleine largeur de la colonne ]
[ Barre d'outils : **B** _I_ # titre ···             ]
[ __________________________________________________ ]
[ Contenu libre, environ 5–6 lignes visibles          ]
[ __________________________________________________ ]
```
- Champ "Date de relance" : apparaît uniquement si statut = Relance, sous les radio buttons
- Zone notes : éditeur markdown avec barre d'outils minimale, hauteur fixe (~5–6 lignes)

---

### Zone 4 — Pied de page
Barre horizontale pleine largeur, hauteur fixe.

```
[← Précédent]                    [💾 Sauvegarder contact]    [Suivant →]
```
- `[← Précédent]` aligné à gauche
- `[💾 Sauvegarder contact]` centré
- `[Suivant →]` aligné à droite
- Précédent/Suivant respectent l'ordre et les filtres actifs de la liste

---
---

## Wireframe 3 — Page Nouvelle Entreprise `/company/new`

### Dimensions et structure générale
Largeur centrée (~700px max), hauteur libre avec scroll accepté (formulaire de saisie unique, pas de contrainte 960×1080 ici).

### Zone 1 — Header de page
```
[← Annuler]     Ajouter une entreprise
```
- Bouton annuler à gauche → retour liste sans sauvegarde
- Titre centré ou à gauche selon l'alignement général

---

### Zone 2 — Formulaire
Deux colonnes sur la moitié supérieure, pleine largeur sur la partie basse.

**Colonne gauche**
```
Nom *         : [                              ]
Site web      : [                              ]
Adresse       : [                              ]
Code postal   : [       ]
Commune       : [                              ]
```

**Colonne droite**
```
Téléphone accueil : [                          ]
Email accueil     : [                          ]
Contact accueil   : [                          ]
Priorité          : [━━━━━●━━━━] 7
Favori            : ☐ Marquer comme favori
```

**Pleine largeur**
```
Catégories    : [tag1 ×] [tag2 ×] [Ajouter...  ]
Description   : [                               ]
               [                               ]
               [                               ]
```

- Champs marqués `*` obligatoires, validation avant soumission
- `source_ajout` = `manuel` positionné automatiquement, non visible
- Priorité : slider de 0 à 10 avec valeur numérique affichée à droite

---

### Zone 3 — Pied de formulaire
```
                    [Annuler]   [💾 Créer l'entreprise]
```
- Deux boutons alignés à droite
- `[Annuler]` → retour liste sans sauvegarde
- `[💾 Créer l'entreprise]` → validation + insertion DB + redirect vers `/company/:id`