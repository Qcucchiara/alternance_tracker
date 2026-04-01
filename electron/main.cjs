const { app, BrowserWindow, ipcMain, dialog } = require('electron');
console.log('Main process starting...');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const Papa = require('papaparse');

let db;

const STATUS_HIERARCHY = {
    'positif': 8,
    'entretien': 7,
    'en_cours': 6,
    'relance': 5,
    'pas_reponse': 4,
    'a_contacter': 3,
    'negatif': 2,
    'neutre': 1
};

function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'alternance-tracker.db');
    db = new Database(dbPath);

    db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      description TEXT,
      adresse TEXT,
      code_postal TEXT,
      commune TEXT,
      categorie TEXT,
      secteur_1 TEXT,
      secteur_2 TEXT,
      secteur_3 TEXT,
      activite_principale TEXT,
      secteurs TEXT,
      telephone TEXT,
      email_accueil TEXT,
      contact_accueil TEXT,
      source TEXT,
      site_internet TEXT,
      effectifs_inovallee INTEGER,
      effectifs_global INTEGER,
      responsable TEXT,
      siren TEXT,
      url_fiche TEXT,
      categories TEXT,
      priority INTEGER DEFAULT 0,
      favori INTEGER DEFAULT 0,
      source_ajout TEXT,
      best_status TEXT DEFAULT 'neutre',
      site_web TEXT
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER,
      contact_nom TEXT,
      contact_poste TEXT,
      contact_email TEXT,
      contact_telephone TEXT,
      status TEXT,
      date_contact TEXT,
      next_action_date TEXT,
      notes TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS global_categories (
      name TEXT PRIMARY KEY
    );
  `);

    // Migrations
    let userVersion = db.pragma('user_version', { simple: true });
    
    // Migration V2 : Nettoyage et ré-import des catégories uniquement depuis le champ 'categories' du JSON
    if (userVersion < 2) {
        migrateCategoriesFromJSON();
        db.pragma('user_version = 2');
        userVersion = 2;
    }

    // Migration V3 : Harmonisation des statuts et ajout de la colonne site_web
    if (userVersion < 3) {
        // Ajouter le champ site_web s'il n'existe pas
        try {
            db.prepare('ALTER TABLE companies ADD COLUMN site_web TEXT').run();
        } catch (e) {
            // Ignorer si la colonne existe déjà
        }

        // Harmonisation des statuts
        db.prepare("UPDATE companies SET best_status = 'neutre' WHERE best_status = 'a_contacter'").run();
        db.prepare("UPDATE contacts SET status = 'neutre' WHERE status = 'a_contacter' AND contact_nom = 'Accueil'").run();
        db.prepare("UPDATE contacts SET status = 'pas_reponse' WHERE status = 'tente_pas_reponse'").run();

        // Migration pour s'assurer que toutes les entreprises ont un contact "Accueil"
        const companiesWithoutAccueil = db.prepare(`
            SELECT id, telephone, email_accueil, contact_accueil FROM companies 
            WHERE id NOT IN (SELECT company_id FROM contacts WHERE contact_nom = 'Accueil')
        `).all();

        const insertAccueil = db.prepare(`
            INSERT INTO contacts (company_id, contact_nom, contact_poste, contact_email, contact_telephone, status, notes)
            VALUES (?, 'Accueil', 'Standard', ?, ?, 'neutre', '')
        `);

        db.transaction(() => {
            for (const c of companiesWithoutAccueil) {
                insertAccueil.run(c.id, c.email_accueil, c.telephone);
            }
        })();

        if (companiesWithoutAccueil.length > 0) {
            console.log(`Migrated ${companiesWithoutAccueil.length} companies to have an Accueil contact.`);
        }

        db.pragma('user_version = 3');
        userVersion = 3;
    }

    // Import initial si la table est vide
    const count = db.prepare('SELECT COUNT(*) as count FROM companies').get().count;
    if (count === 0) {
        importInitialData();
    }
}

function importInitialData() {
    const projectRoot = path.join(__dirname, '..');
    const jsonPath = path.join(projectRoot, 'merged_classified_v2.json');
    const csvPath = path.join(projectRoot, 'data.csv');
    const dataJsonPath = path.join(projectRoot, 'data.json');

    let data = [];
    if (fs.existsSync(jsonPath)) {
        data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    } else if (fs.existsSync(dataJsonPath)) {
        data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
    } else if (fs.existsSync(csvPath)) {
        const Papa = require('papaparse');
        const csvFile = fs.readFileSync(csvPath, 'utf8');
        const results = Papa.parse(csvFile, { header: true, dynamicTyping: true });
        data = results.data;
    }

    if (data.length > 0) {
        const insert = db.prepare(`
      INSERT INTO companies (
        nom, description, adresse, code_postal, commune, categorie,
        secteur_1, secteur_2, secteur_3, activite_principale, secteurs,
        telephone, site_internet, effectifs_inovallee, effectifs_global,
        responsable, siren, url_fiche, categories, priority,
        source_ajout, best_status, source
      ) VALUES (
        @nom, @description, @adresse, @code_postal, @commune, @categorie,
        @secteur_1, @secteur_2, @secteur_3, @activite_principale, @secteurs,
        @telephone, @site_internet, @effectifs_inovallee, @effectifs_global,
        @responsable, @siren, @url_fiche, @categories, @priority,
        'import', 'neutre', @source
      )
    `);

        const insertContact = db.prepare(`
            INSERT INTO contacts (company_id, contact_nom, contact_poste, contact_telephone, status, notes)
            VALUES (?, 'Accueil', 'Standard', ?, 'neutre', '')
        `);

        const insertMany = db.transaction((companies) => {
            for (const company of companies) {
                // Ensure priority is an integer
                if (company.priority === undefined || company.priority === null) {
                    company.priority = 0;
                } else {
                    company.priority = parseInt(company.priority) || 0;
                }
                
                // Set default values for missing fields to NULL
                const fields = [
                    'nom', 'description', 'adresse', 'code_postal', 'commune', 'categorie',
                    'secteur_1', 'secteur_2', 'secteur_3', 'activite_principale', 'secteurs',
                    'telephone', 'site_internet', 'effectifs_inovallee', 'effectifs_global',
                    'responsable', 'siren', 'url_fiche', 'categories', 'source'
                ];
                fields.forEach(f => {
                    if (company[f] === undefined) company[f] = null;
                });

                // Nettoyage spécifique pour les catégories lors de l'import
                if (company.categories === 'NONE') company.categories = '';
                company.categorie = null;
                company.secteurs = null;
                company.secteur_1 = null;
                company.secteur_2 = null;
                company.secteur_3 = null;
                company.activite_principale = null;

                const result = insert.run(company);
                insertContact.run(result.lastInsertRowid, company.telephone);
            }
        });

        insertMany(data);
        console.log(`Imported ${data.length} companies.`);
    }
}

function refreshBestStatus(companyId) {
    const contacts = db.prepare('SELECT status FROM contacts WHERE company_id = ?').all(companyId);
    
    if (contacts.length === 0) {
        db.prepare('UPDATE companies SET best_status = "neutre" WHERE id = ?').run(companyId);
        return;
    }

    let bestRank = 0;
    let bestStatus = 'neutre';

    for (const contact of contacts) {
        const rank = STATUS_HIERARCHY[contact.status] || 0;
        if (rank > bestRank) {
            bestRank = rank;
            bestStatus = contact.status;
        }
    }

    db.prepare('UPDATE companies SET best_status = ? WHERE id = ?').run(bestStatus, companyId);
}

function cleanupUnusedCategories() {
    if (!db) return;
    try {
        const categoriesSet = new Set();
        const rows = db.prepare("SELECT categories FROM companies").all();
        rows.forEach(row => {
            if (row.categories) {
                row.categories.split('-').forEach(cat => {
                    const clean = cat.trim().toUpperCase();
                    if (clean) categoriesSet.add(clean);
                });
            }
        });

        db.transaction(() => {
            db.prepare('DELETE FROM global_categories').run();
            const insert = db.prepare('INSERT INTO global_categories (name) VALUES (?)');
            categoriesSet.forEach(cat => insert.run(cat));
        })();
    } catch (error) {
        console.error('Error cleaning up categories:', error);
    }
}

function migrateCategoriesFromJSON() {
    const projectRoot = path.join(__dirname, '..');
    const jsonPath = path.join(projectRoot, 'merged_classified_v2.json');
    if (!fs.existsSync(jsonPath)) {
        console.warn('Migration V2 : merged_classified_v2.json non trouvé, passage outre.');
        return;
    }

    console.log('Migration V2 : Ré-import des catégories depuis le JSON...');
    try {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        // Vider les colonnes qui ne sont pas des catégories
        db.prepare("UPDATE companies SET categorie = NULL, secteurs = NULL, secteur_1 = NULL, secteur_2 = NULL, secteur_3 = NULL, activite_principale = NULL").run();

        const updateStmt = db.prepare('UPDATE companies SET categories = ? WHERE nom = ? AND commune = ?');
        
        db.transaction(() => {
            for (const item of data) {
                let cats = item.categories || '';
                if (cats === 'NONE') cats = '';
                updateStmt.run(cats, item.nom, item.commune);
            }
        })();
        
        cleanupUnusedCategories();
        console.log('Migration V2 terminée avec succès.');
    } catch (error) {
        console.error('Erreur lors de la migration V2 :', error);
    }
}

// IPC Handlers
ipcMain.handle('get-all-categories', (event) => {
    try {
        if (!db) {
            console.warn('Database not initialized for get-all-categories');
            return [];
        }
        // Always cleanup before returning all categories to ensure consistency as requested
        cleanupUnusedCategories();
        const rows = db.prepare('SELECT name FROM global_categories ORDER BY name ASC').all();
        return rows.map(r => r.name);
    } catch (error) {
        console.error('Error in get-all-categories handler:', error);
        return [];
    }
});

ipcMain.handle('get-companies', (event, filters) => {
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = {};

    if (filters.search) {
        query += ' AND (nom LIKE @search OR commune LIKE @search OR categories LIKE @search)';
        params.search = `%${filters.search}%`;
    }

    if (filters.statuses && filters.statuses.length > 0) {
        const statusPlaceholders = filters.statuses.map((_, i) => `@status${i}`).join(',');
        query += ` AND best_status IN (${statusPlaceholders})`;
        filters.statuses.forEach((s, i) => params[`status${i}`] = s);
    }

    if (filters.categories && filters.categories.length > 0) {
        // Match exactly or with dash separators
        const categoryClauses = filters.categories.map((_, i) => `('-' || categories || '-') LIKE @cat${i}`).join(' OR ');
        query += ` AND (${categoryClauses})`;
        filters.categories.forEach((c, i) => params[`cat${i}`] = `%-${c}-%`);
    }

    if (filters.onlyFavorites) {
        query += ' AND favori = 1';
    }

    if (filters.sortBy) {
        switch (filters.sortBy) {
            case 'nom': query += ' ORDER BY nom ASC'; break;
            case 'commune': query += ' ORDER BY commune ASC'; break;
            case 'status': query += ' ORDER BY best_status DESC'; break; // Simple ordering
            case 'priority': 
            default:
                query += ' ORDER BY priority DESC, nom ASC'; break;
        }
    } else {
        query += ' ORDER BY priority DESC, nom ASC';
    }

    return db.prepare(query).all(params);
});

ipcMain.handle('get-company', (event, id) => {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    const contacts = db.prepare(`
        SELECT * FROM contacts 
        WHERE company_id = ? 
        ORDER BY CASE WHEN contact_nom = 'Accueil' THEN 0 ELSE 1 END, updated_at DESC
    `).all(id);
    return { ...company, contacts };
});

ipcMain.handle('update-company-accueil', (event, { id, email_accueil, contact_accueil, site_web, priority, categories }) => {
    // Update company
    const result = db.prepare('UPDATE companies SET email_accueil = ?, contact_accueil = ?, site_web = ?, priority = ?, categories = ? WHERE id = ?')
        .run(email_accueil, contact_accueil, site_web, priority, categories, id);
    
    // Update global categories
    if (categories) {
        const insertCat = db.prepare('INSERT OR IGNORE INTO global_categories (name) VALUES (?)');
        db.transaction(() => {
            categories.split('-').forEach(cat => {
                if (cat.trim()) insertCat.run(cat.trim().toUpperCase());
            });
        })();
    }
    
    return result;
});

ipcMain.handle('toggle-favorite', (event, { id, favori }) => {
    return db.prepare('UPDATE companies SET favori = ? WHERE id = ?').run(favori, id);
});

ipcMain.handle('save-contact', (event, contact) => {
    let result;
    if (contact.id) {
        result = db.prepare(`
            UPDATE contacts SET 
                contact_nom = @contact_nom, 
                contact_poste = @contact_poste, 
                contact_email = @contact_email, 
                contact_telephone = @contact_telephone, 
                status = @status, 
                date_contact = @date_contact, 
                next_action_date = @next_action_date, 
                notes = @notes,
                updated_at = datetime('now')
            WHERE id = @id
        `).run(contact);
    } else {
        result = db.prepare(`
            INSERT INTO contacts (
                company_id, contact_nom, contact_poste, contact_email, 
                contact_telephone, status, date_contact, next_action_date, notes
            ) VALUES (
                @company_id, @contact_nom, @contact_poste, @contact_email, 
                @contact_telephone, @status, @date_contact, @next_action_date, @notes
            )
        `).run(contact);
    }
    refreshBestStatus(contact.company_id);
    return result;
});

ipcMain.handle('delete-contact', (event, { id, company_id }) => {
    const result = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    refreshBestStatus(company_id);
    return result;
});


ipcMain.handle('create-company', (event, company) => {
    const result = db.prepare(`
        INSERT INTO companies (
            nom, site_internet, site_web, adresse, code_postal, commune, 
            telephone, email_accueil, contact_accueil, categories, 
            priority, favori, description, source_ajout, best_status
        ) VALUES (
            @nom, @site_internet, @site_web, @adresse, @code_postal, @commune, 
            @telephone, @email_accueil, @contact_accueil, @categories, 
            @priority, @favori, @description, 'manuel', 'neutre'
        )
    `).run(company);

    const companyId = result.lastInsertRowid;
    db.prepare(`
        INSERT INTO contacts (company_id, contact_nom, contact_poste, contact_email, contact_telephone, status, notes)
        VALUES (?, 'Accueil', 'Standard', ?, ?, 'neutre', '')
    `).run(companyId, company.email_accueil, company.telephone);

    // Update global categories
    if (company.categories) {
        const insertCat = db.prepare('INSERT OR IGNORE INTO global_categories (name) VALUES (?)');
        db.transaction(() => {
            company.categories.split('-').forEach(cat => {
                if (cat.trim()) insertCat.run(cat.trim().toUpperCase());
            });
        })();
    }

    return companyId;
});

ipcMain.handle('export-json', async (event) => {
    const companies = db.prepare('SELECT * FROM companies').all();
    for (const company of companies) {
        company.contacts = db.prepare('SELECT * FROM contacts WHERE company_id = ?').all(company.id);
    }
    
    const { filePath } = await dialog.showSaveDialog({
        title: 'Exporter en JSON',
        defaultPath: 'alternance-tracker-export.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(companies, null, 2));
        return true;
    }
    return false;
});

ipcMain.handle('export-csv', async (event) => {
    const companies = db.prepare('SELECT * FROM companies').all();
    const exportData = [];

    for (const company of companies) {
        const contacts = db.prepare('SELECT * FROM contacts WHERE company_id = ?').all(company.id);
        // Sort contacts by status rank then updated_at DESC
        contacts.sort((a, b) => {
            const rankA = STATUS_HIERARCHY[a.status] || 0;
            const rankB = STATUS_HIERARCHY[b.status] || 0;
            if (rankA !== rankB) return rankB - rankA;
            return new Date(b.updated_at) - new Date(a.updated_at);
        });

        const row = {
            nom: company.nom,
            commune: company.commune,
            telephone: company.telephone,
            email_accueil: company.email_accueil,
            contact_accueil: company.contact_accueil,
            site_internet: company.site_internet,
            site_web: company.site_web,
            categories: company.categories,
            priority: company.priority,
            favori: company.favori,
            best_status: company.best_status
        };

        for (let i = 1; i <= 2; i++) {
            const c = contacts[i - 1] || {};
            row[`c${i}_nom`] = c.contact_nom || '';
            row[`c${i}_poste`] = c.contact_poste || '';
            row[`c${i}_email`] = c.contact_email || '';
            row[`c${i}_tel`] = c.contact_telephone || '';
            row[`c${i}_status`] = c.status || '';
            row[`c${i}_date`] = c.date_contact || '';
            row[`c${i}_notes`] = c.notes || '';
        }
        exportData.push(row);
    }

    const csv = Papa.unparse(exportData);

    const { filePath } = await dialog.showSaveDialog({
        title: 'Exporter en CSV',
        defaultPath: 'alternance-tracker-export.csv',
        filters: [{ name: 'CSV', extensions: ['csv'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, csv);
        return true;
    }
    return false;
});

function createWindow() {
    initDatabase();

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
