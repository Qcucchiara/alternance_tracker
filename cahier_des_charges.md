# Cahier des charges — Alternance Tracker

## 1. Contexte

Application desktop locale pour organiser une campagne de recherche d'alternance. L'utilisateur dispose d'une liste d'environ 2000 entreprises importée depuis un fichier CSV/JSON, et doit pouvoir gérer ses appels téléphoniques, prises de notes et suivi des contacts depuis une interface unique.

---

## 2. Stack technique

```
Electron
└── React + Vite
      ├── TailwindCSS
      ├── @uiw/react-md-editor
      ├── better-sqlite3
      └── papaparse
```

---

## 3. Schéma de données

### Table `companies`

| Colonne | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| nom | TEXT NOT NULL | |
| description | TEXT | |
| adresse | TEXT | |
| code_postal | TEXT | |
| commune | TEXT | |
| categorie | TEXT | (Obsolète) Ne pas utiliser |
| secteur_1 | TEXT | (Obsolète) Ne pas utiliser |
| secteur_2 | TEXT | (Obsolète) Ne pas utiliser |
| secteur_3 | TEXT | (Obsolète) Ne pas utiliser |
| activite_principale | TEXT | (Obsolète) Ne pas utiliser |
| secteurs | TEXT | (Obsolète) Ne pas utiliser |
| telephone | TEXT | Téléphone accueil, importé du CSV |
| email_accueil | TEXT | Saisi manuellement |
| contact_accueil | TEXT | Saisi manuellement |
| source | TEXT | |
| site_internet | TEXT | |
| effectifs_inovallee | INTEGER | |
| effectifs_global | INTEGER | |
| responsable | TEXT | |
| siren | TEXT | |
| url_fiche | TEXT | |
| categories | TEXT | Liste séparée par des tirets `-` (Unique source de catégories) |
| priority | INTEGER | 0–10 |
| favori | INTEGER | 0 ou 1, défaut 0 |
| source_ajout | TEXT | `import` ou `manuel` |
| best_status | TEXT | Dénormalisé, recalculé à chaque save |

### Table `contacts`

| Colonne | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| company_id | INTEGER FK | ON DELETE CASCADE |
| contact_nom | TEXT | |
| contact_poste | TEXT | |
| contact_email | TEXT | |
| contact_telephone | TEXT | |
| status | TEXT | Voir hiérarchie §4 |
| date_contact | TEXT | |
| next_action_date | TEXT | Visible si statut = relance |
| notes | TEXT | Markdown |
| updated_at | TEXT | datetime('now') |

### Table `global_categories`

| Colonne | Type | Notes |
|---|---|---|
| name | TEXT PK | Nom de la catégorie en MAJUSCULES |

### Hiérarchie des statuts

```
positif            → 8
entretien          → 7
en_cours           → 6
relance            → 5
pas_reponse        → 4
a_contacter        → 3
negatif            → 2
neutre             → 1
```

Le `best_status` d'une entreprise est le statut de rang le plus élevé parmi tous ses contacts. Il est recalculé et persisté à chaque création, modification ou suppression d'un contact.

---

## 4. Pages

### 4.1 Header global (persistant)

- Bouton **[+ Entreprise]** → `/company/new`
- Bouton **[⬇ Export JSON]**
- Bouton **[⬇ Export CSV]**

---

### 4.2 Page Liste `/list`

**Barre de recherche**
- Recherche textuelle sur : nom, commune, catégories

**Filtres actifs**
- Par statut (sélecteur de tags) : Neutre, À contacter, Pas de réponse, Relance, En cours, Entretien, Positif, Négatif.
- Par catégorie (sélecteur de tags).
- Les filtres de statut et de catégorie sont cumulables (ET logique entre les deux groupes, OU logique à l'intérieur de chaque groupe).
- Tri : Priorité (défaut), Nom, Commune, Statut
- Favoris : Bouton de bascule ★

**Tableau**

| Colonne | Contenu |
|---|---|
| ★ | Icône favori cliquable |
| Nom | Lien vers `/company/:id` |
| Commune | Texte |
| Priorité | Valeur numérique |
| Statut | Badge coloré |

**Pied de liste**
- Compteurs : total affiché, dont X positives, X relances

**Comportement**
- Les filtres actifs sont conservés en mémoire de session pour la navigation Suivant/Précédent depuis la page détail
- Clic sur une ligne → `/company/:id`

---

### 4.3 Page Détail `/company/:id`

**En-tête de page**
- Bouton [← Liste]
- Nom de l'entreprise
- Priorité (affichage dans le header)
- `best_status` (badge coloré)
- Bouton [★ Favori] (toggle)

**Zone 2 — Bloc Infos** *(toujours visible)*
- **Infos statiques** (gauche) : Secteurs, effectifs, commune, description (tronquée)
- **Infos éditables** (droite) : Tél accueil (lecture seule), Email accueil, Contact accueil, Site web (cliquable), Priorité.
- **Catégories** : Affichage des tags.
- **Bouton [✎ MODIFIER]** : Bascule toute la zone en mode édition (permet de modifier Email, Contact, Site web, Priorité et de gérer les Catégories).

**Zone 3 — Bloc Contacts**
- Liste des contacts existants : `Nom · Poste · Badge statut · 🗑`
- Clic sur un contact → charge ce contact dans le formulaire ci-dessous
- Bouton [+ Ajouter un contact] → vide le formulaire pour saisie neuve
- Sauvegarde automatique (`onChange` debounced) de tous les champs

**Formulaire contact actif**
- Champs : Nom, Poste, Email, Téléphone
- Statut : Liste déroulante (select) : Neutre, À contacter, Pas de réponse, Relance, En cours, Entretien, Positif, Négatif.
- Champ date de relance : visible uniquement si statut = Relance
- Zone notes en markdown (`@uiw/react-md-editor`)

**Pied de page**
- Bouton [⏭ Suivant →] et [← Précédent] — ordre selon les filtres actifs de la liste

**Contrainte d'affichage**
- Le formulaire doit être entièrement visible sur une fenêtre de 960×1080 (demi-écran) sans scroll

---

### 4.4 Page Nouvelle Entreprise `/company/new`

**Champs du formulaire**

| Champ | Obligatoire |
|---|---|
| Nom | ✅ |
| Site web | |
| Adresse | |
| Code postal | |
| Commune | |
| Téléphone accueil | |
| Email accueil | |
| Contact accueil | |
| Catégories | tags libres |
| Priorité | slider 0–10 |
| Favori | checkbox |
| Description | |

- `source_ajout` = `manuel` automatiquement
- Bouton [Annuler] → retour liste
- Bouton [💾 Créer entreprise] → sauvegarde + redirect vers `/company/:id` de la nouvelle entrée

---

## 5. Export

### JSON — base complète
```
[
  {
    ...tous les champs companies,
    contacts: [ ...tous les contacts liés ]
  },
  ...
]
```

### CSV — base complète, max 2 contacts par entreprise

Sélection des 2 contacts les plus positifs (rang `best_status` le plus élevé, puis `updated_at` DESC en cas d'égalité).

Colonnes exportées :

```
nom, commune, telephone, email_accueil, contact_accueil,
site_internet, categories, priority, favori, best_status,
c1_nom, c1_poste, c1_email, c1_tel, c1_status, c1_date, c1_notes,
c2_nom, c2_poste, c2_email, c2_tel, c2_status, c2_date, c2_notes
```

Les deux exports portent sur **toute la base**, indépendamment des filtres actifs.

---

## 6. Import initial

- Formats acceptés : CSV ou JSON
- Champs du fichier source mappés vers la table `companies`
- Les champs absents ou vides sont insérés à `NULL`
- `source_ajout` = `import`
- `best_status` = `neutre` par défaut
- Import effectué au premier lancement si la table `companies` est vide
- Le fichier source est déposé à la racine du projet sous le nom `data.csv` ou `data.json`

---

## 7. Comportement global

- **Pas de backend distant.** Tout est local, SQLite embarqué.
- **Pas d'authentification.**
- **Persistance des filtres** en mémoire de session (pas en DB).
- **Navigation Suivant/Précédent** respecte l'ordre et les filtres de la liste au moment où l'utilisateur a cliqué sur une entreprise.
- **Recalcul du `best_status`** à chaque create/update/delete d'un contact, via une fonction utilitaire centralisée `refreshBestStatus(db, companyId)`.
- **Suppression d'un contact** : confirmation simple (window.confirm ou modale légère).
- **Suppression d'une entreprise** : non prévue dans cette version.

---

## 8. Contraintes UI

- Formulaire page détail entièrement visible en **960×1080** sans scroll vertical
- Support markdown dans la zone notes (rendu + édition)
- Badges statut colorés de manière cohérente sur toutes les pages :

| Statut | Couleur suggérée |
|---|---|
| positif | vert (green-500) |
| entretien | violet (purple-500) |
| en_cours | orange (orange-400) |
| relance | bleu (blue-500) |
| pas_reponse | gris (gray-600) |
| a_contacter | blanc (white) |
| neutre | ardoise (slate-400) |
| negatif | rouge (red-500) |

---

## 9. Hors périmètre (v1)

- Suppression d'entreprise
- Édition des champs infos d'une entreprise importée (hors accueil)
- Notifications / rappels automatiques de relance
- Synchronisation ou export vers un service externe
- Historique des modifications