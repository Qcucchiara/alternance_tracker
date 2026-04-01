# Alternance Tracker

Application desktop locale pour organiser une campagne de recherche d'alternance. Elle permet de gérer une liste d'entreprises, de suivre les contacts et les relances, le tout avec une base de données locale SQLite.

## 🚀 Stack Technique

- **Runtime** : Electron
- **Frontend** : React + Vite
- **Style** : TailwindCSS
- **Base de données** : SQLite (via `better-sqlite3`)
- **Éditeur Markdown** : `@uiw/react-md-editor`
- **Parsing CSV** : `papaparse`

## 🛠 Installation et Lancement

1. **Installer les dépendances** :
   ```bash
   pnpm install
   ```

2. **Lancer en mode développement** :
   ```bash
   pnpm dev
   ```

3. **Générer le build de production** :
   ```bash
   pnpm build
   ```

## 📦 Packaging et Installation (Linux)

L'application utilise `electron-builder` pour générer des paquets installables.

### 1. Prérequis
Assurez-vous d'avoir les outils de build nécessaires pour `better-sqlite3` (dépendance native) :
```bash
sudo apt-get install build-essential python3
```

### 2. Builder l'application
Pour générer l'exécutable et le paquet pour Linux :
```bash
pnpm build
```

### 3. Installer et Lancer
Après le build, les fichiers se trouvent dans le dossier `dist/` :

- **AppImage** (Recommandé) :
  - Rendez le fichier exécutable : `chmod +x dist/alternance-tracker-*.AppImage`
  - Lancez-le : `./dist/alternance-tracker-*.AppImage`
- **Paquet .deb** (Debian/Ubuntu) :
  - Installez-le : `sudo dpkg -i dist/alternance-tracker-*.deb`
  - Lancez l'application depuis votre menu d'applications.

### ⚠️ Note sur SQLite
Si vous rencontrez une erreur liée à `better-sqlite3` au lancement de l'application packagée, forcez la reconstruction du module natif :
```bash
pnpm exec electron-rebuild
```

## 📈 Avancée du Développement (Features)

L'application a été développée selon le découpage suivant :

### 1. Infrastructure & Données ✅
- Initialisation du projet (Electron + React + Vite).
- Schéma de base de données SQLite (tables `companies` et `contacts`).
- Script d'import initial automatique depuis `merged_classified_v2.json`.

### 2. Navigation & Liste ✅
- Layout global (Header fixe).
- Page `/list` avec recherche textuelle (nom, commune, secteur).
- Système de filtres cumulables par statut (Favoris, Positif, etc.).
- Tri par priorité, nom, commune ou statut.

### 3. Gestion des Entreprises ✅
- Page `/company/new` pour l'ajout manuel d'entreprises.
- Validation des champs obligatoires et gestion de la source (`manuel`).

### 4. Suivi des Contacts & Détails ✅
- Page `/company/:id` avec vue détaillée.
- Section "Accueil" éditable pour chaque entreprise.
- Gestion complète des contacts (CRUD).
- Zone de notes avec support Markdown.

### 5. Logique de Statuts & Navigation ✅
- Recalcul automatique du `best_status` de l'entreprise selon ses contacts.
- Navigation "Suivant/Précédent" respectant les filtres de la liste en cours.

### 6. Exports ✅
- Export de la base complète en format JSON.
- Export formatté en CSV (incluant les 2 contacts les plus "positifs" par entreprise).

## 📄 Documentation de référence

- `cahier_des_charges.md` : Besoins fonctionnels et techniques.
- `description_pages.md` : Spécifications détaillées des interfaces (wireframes).
