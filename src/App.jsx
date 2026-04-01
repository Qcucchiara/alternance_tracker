import React, {useState, useEffect, useRef, useCallback} from 'react';

const {ipcRenderer} = window.require('electron');
import {HashRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation} from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';

// --- Composants Communs ---

const STATUS_COLORS = {
  'positif': 'bg-green-500 text-white',
  'entretien': 'bg-purple-500 text-white',
  'en_cours': 'bg-orange-400 text-white',
  'relance': 'bg-blue-500 text-white',
  'pas_reponse': 'bg-gray-600 text-white',
  'a_contacter': 'bg-white text-gray-800 border border-gray-300',
  'neutre': 'bg-slate-400 text-white',
  'negatif': 'bg-red-500 text-white',
};

const STATUS_LABELS = {
  'positif': 'Positif / Recruté',
  'entretien': 'Entretien',
  'en_cours': 'En cours',
  'relance': 'Relance',
  'pas_reponse': 'Pas de réponse',
  'a_contacter': 'À contacter',
  'neutre': 'Neutre',
  'negatif': 'Négatif / Refusé',
};

const STATUS_OPTIONS = ['neutre', 'a_contacter', 'pas_reponse', 'relance', 'en_cours', 'entretien', 'positif', 'negatif'];

const StatusBadge = ({status}) => {
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[status] || 'bg-gray-200'}`}>
      ● {STATUS_LABELS[status] || status}
    </span>
  );
};

const TagSelector = ({
  selectedItems,
  allItems,
  onChange,
  renderTag,
  renderSuggestion,
  getLabel = (item) => item,
  allowCreate = false,
  placeholder = "Rechercher...",
  uppercase = false
}) => {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = allItems.filter(item => {
    const label = getLabel(item).toLowerCase();
    const search = input.toLowerCase();
    return label.includes(search) && !selectedItems.includes(item);
  });

  const handleSelect = (item) => {
    onChange([...selectedItems, item]);
    setInput('');
    setShowSuggestions(false);
  };

  const handleCreate = () => {
    let newItem = input.trim();
    if (uppercase) newItem = newItem.toUpperCase();
    if (newItem && !selectedItems.includes(newItem)) {
      onChange([...selectedItems, newItem]);
      setInput('');
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        const exactMatch = allItems.find(item => getLabel(item).toLowerCase() === input.toLowerCase().trim());
        if (exactMatch) {
          handleSelect(exactMatch);
        } else if (allowCreate) {
          handleCreate();
        }
      }
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-wrap gap-1 mb-1">
        {selectedItems.map(item => (
          <React.Fragment key={item}>
            {renderTag ? renderTag(item, () => onChange(selectedItems.filter(i => i !== item))) : (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold border border-blue-200">
                {item}
                <button type="button" onClick={() => onChange(selectedItems.filter(i => i !== item))} className="hover:text-red-500 font-bold ml-1">×</button>
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
      <input
        type="text"
        className={`w-full border-b bg-transparent outline-none ${uppercase ? 'uppercase' : ''} placeholder:normal-case text-[10px] py-1`}
        placeholder={placeholder}
        value={input}
        onChange={e => {
          setInput(uppercase ? e.target.value.toUpperCase() : e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
      />
      {showSuggestions && (input || filteredSuggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-40 overflow-auto">
          {filteredSuggestions.map(item => (
            <div
              key={item}
              className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-[10px] font-bold border-b last:border-0"
              onClick={() => handleSelect(item)}
            >
              {renderSuggestion ? renderSuggestion(item) : getLabel(item)}
            </div>
          ))}
          {allowCreate && input.trim() && !allItems.some(item => getLabel(item).toLowerCase() === input.toLowerCase().trim()) && (
            <div
              className="px-2 py-1 hover:bg-green-50 cursor-pointer text-[10px] font-bold text-green-600 italic"
              onClick={handleCreate}
            >
              + CRÉER "{uppercase ? input.toUpperCase() : input}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CategorySelector = ({selectedCategories, allCategories, onChange, allowCreate = false, placeholder = "Rechercher..."}) => (
  <TagSelector
    selectedItems={selectedCategories}
    allItems={allCategories}
    onChange={onChange}
    allowCreate={allowCreate}
    placeholder={placeholder}
    uppercase={true}
  />
);

const StatusSelector = ({selectedStatuses, onChange, placeholder = "Filtrer par statut..."}) => (
  <TagSelector
    selectedItems={selectedStatuses}
    allItems={STATUS_OPTIONS}
    onChange={onChange}
    getLabel={(s) => STATUS_LABELS[s]}
    placeholder={placeholder}
    renderTag={(status, onRemove) => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border ${STATUS_COLORS[status] || 'bg-gray-200'}`}>
        ● {STATUS_LABELS[status]}
        <button type="button" onClick={onRemove} className="hover:opacity-70 font-bold ml-1">×</button>
      </span>
    )}
    renderSuggestion={(status) => (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full border border-gray-200 ${STATUS_COLORS[status].split(' ')[0]}`}></span>
        {STATUS_LABELS[status]}
      </div>
    )}
  />
);

// --- Layout ---

const Layout = ({children}) => {
  const navigate = useNavigate();

  const handleExportJSON = async () => {
    await ipcRenderer.invoke('export-json');
  };

  const handleExportCSV = async () => {
    await ipcRenderer.invoke('export-csv');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b px-4 py-2 flex justify-between items-center shrink-0">
        <Link to="/" className="text-xl font-bold text-blue-600">Alternance Tracker</Link>
        <div className="flex gap-2">
          <button onClick={() => navigate('/company/new')}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
            + Entreprise
          </button>
          <button onClick={handleExportJSON}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm">
            ⬇ Export JSON
          </button>
          <button onClick={handleExportCSV}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm">
            ⬇ Export CSV
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};

// --- Page Liste ---

const ListPage = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState(() => {
    const saved = sessionStorage.getItem('filters');
    return saved ? JSON.parse(saved) : {
      search: '',
      statuses: [],
      categories: [],
      sortBy: 'priority',
      onlyFavorites: false
    };
  });

  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadAllCategories();
  }, []);

    const loadAllCategories = async () => {
      try {
        const cats = await ipcRenderer.invoke('get-all-categories');
        setAllCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

  useEffect(() => {
    sessionStorage.setItem('filters', JSON.stringify(filters));
    loadCompanies();
  }, [filters]);

  const loadCompanies = async () => {
    const data = await ipcRenderer.invoke('get-companies', filters);
    setCompanies(data);
  };

  const toggleFavorite = async (e, id, current) => {
    e.stopPropagation();
    await ipcRenderer.invoke('toggle-favorite', {id, favori: current ? 0 : 1});
    loadCompanies();
  };

  const stats = {
    total: companies.length,
    positive: companies.filter(c => c.best_status === 'positif').length,
    relance: companies.filter(c => c.best_status === 'relance').length,
  };

  return (
    <div className="p-4 space-y-4">
      {/* Barre de contrôles */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="🔍 Rechercher une entreprise..."
              className="w-full pl-8 pr-4 py-2 border rounded"
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <button
            onClick={() => setFilters({...filters, onlyFavorites: !filters.onlyFavorites})}
            className={`px-3 py-1 rounded border text-sm shrink-0 ${filters.onlyFavorites ? 'bg-yellow-100 border-yellow-400' : 'bg-white'}`}
          >
            ★ Favoris
          </button>
          <select
            className="border rounded px-2 py-2"
            value={filters.sortBy}
            onChange={e => setFilters({...filters, sortBy: e.target.value})}
          >
            <option value="priority">Trier par : Priorité</option>
            <option value="nom">Trier par : Nom</option>
            <option value="commune">Trier par : Commune</option>
            <option value="status">Trier par : Statut</option>
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <span className="text-xs text-gray-500 mt-1 shrink-0">Statuts :</span>
            <div className="flex-1 max-w-sm">
              <StatusSelector
                selectedStatuses={filters.statuses}
                onChange={(stats) => setFilters({...filters, statuses: stats})}
              />
            </div>
          </div>
          {allCategories.length > 0 && (
            <div className="flex-1 flex gap-2 items-start border-l sm:pl-4">
              <span className="text-xs text-gray-500 mt-1 shrink-0">Catégories :</span>
              <div className="flex-1 max-w-sm">
                <CategorySelector
                  selectedCategories={filters.categories}
                  allCategories={allCategories}
                  onChange={(cats) => setFilters({...filters, categories: cats})}
                  placeholder="Filtrer par catégorie..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-sm text-gray-600">
          <tr>
            <th className="px-4 py-2 w-10">★</th>
            <th className="px-4 py-2">Nom</th>
            <th className="px-4 py-2 w-48">Commune</th>
            <th className="px-4 py-2 w-24 text-center">Priorité</th>
            <th className="px-4 py-2 w-36">Statut</th>
          </tr>
          </thead>
          <tbody className="divide-y">
          {companies.map(c => (
            <tr
              key={c.id}
              className="hover:bg-blue-50 cursor-pointer text-sm"
              onClick={() => navigate(`/company/${c.id}`)}
            >
              <td className="px-4 py-3 text-center" onClick={e => toggleFavorite(e, c.id, c.favori)}>
                {c.favori ? <span className="text-yellow-500 text-lg">★</span> :
                  <span className="text-gray-300 text-lg">☆</span>}
              </td>
              <td className="px-4 py-3 font-medium text-blue-700">{c.nom}</td>
              <td className="px-4 py-3 text-gray-600 truncate max-w-[12rem]">{c.commune}</td>
              <td className="px-2 py-3 text-center text-gray-500 font-mono">{c.priority}</td>
              <td className="px-2 py-3">
                <StatusBadge status={c.best_status}/>
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        {stats.total} entreprises affichées · {stats.positive} positives · {stats.relance} relances
      </div>
    </div>
  );
};

// --- Page Détail ---

const CompanyPage = () => {
  const {id} = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [isEditingInfos, setIsEditingInfos] = useState(false);
  const [contactForm, setContactForm] = useState({
    contact_nom: '',
    contact_poste: '',
    contact_email: '',
    contact_telephone: '',
    status: 'neutre',
    date_contact: new Date().toISOString().split('T')[0],
    next_action_date: '',
    notes: ''
  });

  const [accueilForm, setAccueilForm] = useState({
    email_accueil: '',
    contact_accueil: '',
    site_web: '',
    priority: 0,
    categories: '',
    telephone: '',
    secteurs: '',
    effectifs_global: '',
    effectifs_inovallee: '',
    commune: '',
    adresse: '',
    code_postal: '',
    description: ''
  });

  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadAllCategories();
  }, []);

    const loadAllCategories = async () => {
      try {
        const cats = await ipcRenderer.invoke('get-all-categories');
        setAllCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

  const saveAccueilRef = useRef(null);
  const saveContactRef = useRef(null);

  const autoSaveAccueil = (formData) => {
    if (saveAccueilRef.current) clearTimeout(saveAccueilRef.current);
    saveAccueilRef.current = setTimeout(async () => {
      await ipcRenderer.invoke('update-company-accueil', {id, ...formData});
    }, 500);
  };

  const autoSaveContact = (formData, forceRefresh = false) => {
    if (saveContactRef.current) clearTimeout(saveContactRef.current);
    saveContactRef.current = setTimeout(async () => {
      const result = await ipcRenderer.invoke('save-contact', {...formData, company_id: id});
      if (!formData.id || forceRefresh) {
        loadCompany(formData.id || result.lastInsertRowid);
      }
    }, 500);
  };

  const updateAccueilField = (field, val) => {
    const newForm = {...accueilForm, [field]: val};
    setAccueilForm(newForm);
    autoSaveAccueil(newForm);
  };

  const updateContactField = (field, val, forceRefresh = false) => {
    const newForm = {...contactForm, [field]: val};
    setContactForm(newForm);
    autoSaveContact(newForm, forceRefresh);
  };

  useEffect(() => {
    loadCompany();
  }, [id]);

  const loadCompany = async (targetContactId = null) => {
    const data = await ipcRenderer.invoke('get-company', id);
    setCompany(data);
    setAccueilForm({
      email_accueil: data.email_accueil || '',
      contact_accueil: data.contact_accueil || '',
      site_web: data.site_web || '',
      priority: data.priority || 0,
      categories: data.categories || '',
      telephone: data.telephone || '',
      secteurs: data.secteurs || data.secteur_1 || '',
      effectifs_global: data.effectifs_global || '',
      effectifs_inovallee: data.effectifs_inovallee || '',
      commune: data.commune || '',
      adresse: data.adresse || '',
      code_postal: data.code_postal || '',
      description: data.description || ''
    });

    if (targetContactId) {
      const target = data.contacts.find(c => c.id === targetContactId);
      if (target) {
        handleSelectContact(target);
        return;
      }
    } else if (selectedContact) {
      const current = data.contacts.find(c => c.id === selectedContact.id);
      if (current) {
        handleSelectContact(current);
        return;
      }
    }

    // Default to Accueil contact if present
    const accueil = data.contacts.find(c => c.contact_nom === 'Accueil');
    if (accueil) {
      handleSelectContact(accueil);
    } else {
      handleAddContact();
    }
  };

  const handleAddContact = () => {
    if (saveContactRef.current) clearTimeout(saveContactRef.current);
    setSelectedContact(null);
    setContactForm({
      contact_nom: '',
      contact_poste: '',
      contact_email: '',
      contact_telephone: '',
      status: 'neutre',
      date_contact: new Date().toISOString().split('T')[0],
      next_action_date: '',
      notes: ''
    });
  };

  const handleSelectContact = (contact) => {
    if (saveContactRef.current) clearTimeout(saveContactRef.current);
    setSelectedContact(contact);
    setContactForm({
      id: contact.id,
      company_id: contact.company_id,
      contact_nom: contact.contact_nom || '',
      contact_poste: contact.contact_poste || '',
      contact_email: contact.contact_email || '',
      contact_telephone: contact.contact_telephone || '',
      status: contact.status || 'neutre',
      date_contact: contact.date_contact || '',
      next_action_date: contact.next_action_date || '',
      notes: contact.notes || ''
    });
  };


  const handleDeleteContact = async (e, contactId) => {
    e.stopPropagation();
    if (window.confirm('Supprimer ce contact ?')) {
      await ipcRenderer.invoke('delete-contact', {id: contactId, company_id: id});
      loadCompany();
    }
  };

  const toggleFavorite = async () => {
    await ipcRenderer.invoke('toggle-favorite', {id, favori: company.favori ? 0 : 1});
    loadCompany();
  };

  const navigateNextPrev = async (dir) => {
    const filters = JSON.parse(sessionStorage.getItem('filters') || '{}');
    const all = await ipcRenderer.invoke('get-companies', filters);
    const currentIndex = all.findIndex(c => c.id == id);
    const nextIndex = currentIndex + dir;
    if (nextIndex >= 0 && nextIndex < all.length) {
      navigate(`/company/${all[nextIndex].id}`);
    }
  };

  if (!company) return <div className="p-8">Chargement...</div>;

  return (
    <div className="h-full flex flex-col max-w-[960px] mx-auto bg-white shadow-lg overflow-hidden border-x">
      {/* Zone 1 — Header */}
      <div className="p-4 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-black">← Liste</button>
          <h1 className="text-xl font-bold truncate max-w-[400px]">{company.nom}</h1>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
              Priorité: {accueilForm.priority}
            </span>
            <StatusBadge status={company.best_status}/>
          </div>
          <button onClick={toggleFavorite} className="text-2xl leading-none">
            {company.favori ? <span className="text-yellow-500">★</span> : <span className="text-gray-300">☆</span>}
          </button>
        </div>
      </div>

      {/* Zone 2 — Bloc Infos */}
      <div className="flex border-b shrink-0 h-48">
        <div className="w-[40%] bg-gray-50 p-4 border-r text-xs space-y-2 overflow-auto">
          {isEditingInfos ? (
            <div className="space-y-2">
              <div>
                <strong className="block text-[10px] text-gray-500 uppercase">Secteur :</strong>
                <input
                  type="text"
                  className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                  value={accueilForm.secteurs}
                  onChange={e => updateAccueilField('secteurs', e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <strong className="block text-[10px] text-gray-500 uppercase">Eff. Global :</strong>
                  <input
                    type="text"
                    className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                    value={accueilForm.effectifs_global}
                    onChange={e => updateAccueilField('effectifs_global', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <strong className="block text-[10px] text-gray-500 uppercase">Eff. Local :</strong>
                  <input
                    type="text"
                    className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                    value={accueilForm.effectifs_inovallee}
                    onChange={e => updateAccueilField('effectifs_inovallee', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <strong className="block text-[10px] text-gray-500 uppercase">Adresse :</strong>
                <input
                  type="text"
                  className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                  value={accueilForm.adresse}
                  onChange={e => updateAccueilField('adresse', e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <strong className="block text-[10px] text-gray-500 uppercase">Code Postal :</strong>
                  <input
                    type="text"
                    className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                    value={accueilForm.code_postal}
                    onChange={e => updateAccueilField('code_postal', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <strong className="block text-[10px] text-gray-500 uppercase">Commune :</strong>
                  <input
                    type="text"
                    className="w-full border-b border-gray-300 focus:border-blue-500 outline-none bg-transparent py-0.5"
                    value={accueilForm.commune}
                    onChange={e => updateAccueilField('commune', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <p><strong>Secteur :</strong> {accueilForm.secteurs || '?'}</p>
              <p><strong>Effectifs :</strong> {accueilForm.effectifs_global || '?'} (global)
                · {accueilForm.effectifs_inovallee || '?'} (local)</p>
              <p><strong>Adresse :</strong> {accueilForm.adresse || '?'}</p>
              <p><strong>Commune :</strong> {accueilForm.code_postal} {accueilForm.commune}</p>
            </>
          )}

          <div className="space-y-1">
            <strong>Catégories :</strong>
            {isEditingInfos ? (
              <div className="mt-1 p-2 bg-white rounded border shadow-inner">
                <CategorySelector
                  selectedCategories={accueilForm.categories.split('-').filter(Boolean)}
                  allCategories={allCategories}
                  allowCreate={true}
                  onChange={(cats) => updateAccueilField('categories', cats.join('-'))}
                  placeholder="Rechercher ou créer..."
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {accueilForm.categories.split('-').filter(Boolean).map(cat => (
                  <span key={cat} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {cat}
                  </span>
                ))}
                {(!accueilForm.categories || accueilForm.categories === '') && (
                  <span className="text-gray-400 italic text-[10px]">Aucune catégorie</span>
                )}
              </div>
            )}
          </div>

          {company.site_internet && (
            <p>
              <strong>Annuaire :</strong>{' '}
              <a href={company.site_internet} target="_blank" rel="noreferrer"
                 className="text-blue-600 hover:underline">
                Lien fiche
              </a>
            </p>
          )}
          <div className="mt-2 text-gray-600">
            <strong className="block text-[10px] text-gray-500 uppercase">Description :</strong>
            {isEditingInfos ? (
              <textarea
                className="w-full mt-1 p-1 text-[10px] border rounded focus:border-blue-500 outline-none h-24 bg-white"
                value={accueilForm.description}
                onChange={e => updateAccueilField('description', e.target.value)}
              />
            ) : (
              <span
                className="cursor-help"
                title={accueilForm.description || 'Aucune description'}
              >
                  {accueilForm.description
                    ? accueilForm.description.length > 500
                      ? accueilForm.description.slice(0, 500) + '...'
                      : accueilForm.description
                    : 'Aucune description'}
                </span>
            )}
          </div>
        </div>
        <div className="w-[60%] p-4 flex flex-col justify-between relative">
          <button
            onClick={() => setIsEditingInfos(!isEditingInfos)}
            className={`absolute top-2 right-2 px-2 py-1 text-[10px] rounded border font-semibold ${isEditingInfos ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
          >
            {isEditingInfos ? '✓ TERMINER' : '✎ MODIFIER'}
          </button>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Tél accueil :</span>
              {isEditingInfos ? (
                <input
                  type="text"
                  className="flex-1 border-b focus:border-blue-500 outline-none font-mono"
                  value={accueilForm.telephone}
                  onChange={e => updateAccueilField('telephone', e.target.value)}
                />
              ) : (
                <span className="text-gray-600 font-mono">{accueilForm.telephone || 'Non renseigné'}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Email accueil :</span>
              {isEditingInfos ? (
                <input
                  type="text"
                  className="flex-1 border-b focus:border-blue-500 outline-none"
                  value={accueilForm.email_accueil}
                  onChange={e => updateAccueilField('email_accueil', e.target.value)}
                />
              ) : (
                <span className="flex-1 truncate">{accueilForm.email_accueil || 'Non renseigné'}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Contact accueil :</span>
              {isEditingInfos ? (
                <input
                  type="text"
                  className="flex-1 border-b focus:border-blue-500 outline-none"
                  value={accueilForm.contact_accueil}
                  onChange={e => updateAccueilField('contact_accueil', e.target.value)}
                />
              ) : (
                <span className="flex-1 truncate">{accueilForm.contact_accueil || 'Non renseigné'}</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold font-bold">Site web :</span>
              {isEditingInfos ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    className="flex-1 border-b focus:border-blue-500 outline-none font-normal"
                    value={accueilForm.site_web}
                    onChange={e => updateAccueilField('site_web', e.target.value)}
                  />
                  {accueilForm.site_web && (
                    <a
                      href={accueilForm.site_web.startsWith('http') ? accueilForm.site_web : `https://${accueilForm.site_web}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                      title="Ouvrir le site"
                    >
                      🌐
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-2">
                  {accueilForm.site_web ? (
                    <a
                      href={accueilForm.site_web.startsWith('http') ? accueilForm.site_web : `https://${accueilForm.site_web}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline truncate"
                    >
                      {accueilForm.site_web.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span className="text-gray-400">Non renseigné</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm mt-2">
              <span className="w-32 font-semibold">Priorité (0-10) :</span>
              {isEditingInfos ? (
                <div className="flex-1 flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    className="flex-1 accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    value={accueilForm.priority}
                    onChange={e => updateAccueilField('priority', parseInt(e.target.value))}
                  />
                  <span className="text-lg font-bold text-blue-600 w-6 text-center">{accueilForm.priority}</span>
                </div>
              ) : (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">
                  {accueilForm.priority} / 10
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3 — Bloc Contacts */}
      <div className="flex flex-1 min-h-0">
        <div className="w-[35%] border-r flex flex-col">
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {company.contacts.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelectContact(c)}
                className={`p-2 rounded border cursor-pointer flex justify-between items-center group ${selectedContact?.id === c.id ? 'bg-blue-50 border-blue-400' : 'hover:bg-gray-50'}`}
              >
                <div className="truncate text-sm">
                  <div className="font-semibold">{c.contact_nom}</div>
                  <div className="text-xs text-gray-500">{c.contact_poste}</div>
                  <StatusBadge status={c.status}/>
                </div>
                {c.contact_nom !== 'Accueil' && (
                  <button onClick={e => handleDeleteContact(e, c.id)}
                          className="text-red-400 opacity-0 group-hover:opacity-100 px-1">🗑</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleAddContact}
                  className="m-2 p-2 border-2 border-dashed rounded text-blue-600 font-bold text-sm hover:bg-blue-50">
            + Ajouter un contact
          </button>
        </div>

        <div className="w-[65%] p-4 flex flex-col space-y-4 overflow-auto">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-gray-500">Nom</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_nom}
                onChange={e => updateContactField('contact_nom', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Poste</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_poste}
                onChange={e => updateContactField('contact_poste', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Email</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_email}
                onChange={e => updateContactField('contact_email', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Tél</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_telephone}
                onChange={e => updateContactField('contact_telephone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-500 font-semibold">Statut</label>
            <select
              className="w-full border px-2 py-1.5 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={contactForm.status}
              onChange={e => updateContactField('status', e.target.value, true)}
            >
              <option value="neutre">Neutre</option>
              <option value="a_contacter">À contacter</option>
              <option value="pas_reponse">Pas de réponse</option>
              <option value="relance">Relance</option>
              <option value="en_cours">En cours</option>
              <option value="entretien">Entretien</option>
              <option value="positif">Positif / Recruté</option>
              <option value="negatif">Négatif / Refusé</option>
            </select>
          </div>

          {contactForm.status === 'relance' && (
            <div className="space-y-1">
              <label className="block text-sm text-gray-500">Date de relance</label>
              <input
                type="date"
                className="border px-2 py-1 rounded text-sm"
                value={contactForm.next_action_date}
                onChange={e => updateContactField('next_action_date', e.target.value)}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-[150px]">
            <label className="block text-sm text-gray-500 mb-1">Notes</label>
            <div className="flex-1 overflow-auto" data-color-mode="light">
              <MDEditor
                value={contactForm.notes}
                onChange={val => updateContactField('notes', val || '')}
                height={150}
                preview="edit"
                extraCommands={[]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Zone 4 — Pied de page */}
      <div className="p-4 border-t flex justify-between items-center bg-gray-50 shrink-0">
        <button onClick={() => navigateNextPrev(-1)} className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded">←
          Précédent
        </button>
        <button onClick={() => navigateNextPrev(1)}
                className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded">Suivant →
        </button>
      </div>
    </div>
  );
};

// --- Page Nouvelle Entreprise ---

const NewCompanyPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: '',
    site_internet: '',
    site_web: '',
    adresse: '',
    code_postal: '',
    commune: '',
    telephone: '',
    email_accueil: '',
    contact_accueil: '',
    categories: '',
    priority: 5,
    favori: 0,
    description: '',
    secteurs: '',
    effectifs_global: '',
    effectifs_inovallee: ''
  });

  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    loadAllCategories();
  }, []);

    const loadAllCategories = async () => {
      try {
        const cats = await ipcRenderer.invoke('get-all-categories');
        setAllCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nom) {
      alert("Le nom est obligatoire");
      return;
    }
    const newId = await ipcRenderer.invoke('create-company', form);
    navigate(`/company/${newId}`);
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="text-gray-600 hover:text-black">← Annuler</button>
        <h1 className="text-2xl font-bold text-center flex-1">Ajouter une entreprise</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <input
                required
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.nom}
                onChange={e => setForm({...form, nom: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site web</label>
              <input
                type="text"
                placeholder="https://www.entreprise.com"
                className="w-full border px-3 py-2 rounded"
                value={form.site_web}
                onChange={e => setForm({...form, site_web: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400 italic">Lien annuaire (Inovallée,
                etc.)</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-gray-50 text-xs"
                value={form.site_internet}
                onChange={e => setForm({...form, site_internet: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.adresse}
                onChange={e => setForm({...form, adresse: e.target.value})}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-sm font-medium mb-1">Code postal</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={form.code_postal}
                  onChange={e => setForm({...form, code_postal: e.target.value})}
                />
              </div>
              <div className="w-2/3">
                <label className="block text-sm font-medium mb-1">Commune</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={form.commune}
                  onChange={e => setForm({...form, commune: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone accueil</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.telephone}
                onChange={e => setForm({...form, telephone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email accueil</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.email_accueil}
                onChange={e => setForm({...form, email_accueil: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact accueil</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.contact_accueil}
                onChange={e => setForm({...form, contact_accueil: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 flex justify-between">
                Priorité <span>{form.priority}</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                className="w-full"
                value={form.priority}
                onChange={e => setForm({...form, priority: parseInt(e.target.value)})}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.favori === 1}
                onChange={e => setForm({...form, favori: e.target.checked ? 1 : 0})}
              />
              Marquer comme favori
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded border">
          <div>
            <label className="block text-sm font-medium mb-1">Secteur(s)</label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded bg-white"
              value={form.secteurs}
              onChange={e => setForm({...form, secteurs: e.target.value})}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Eff. Global</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-white"
                value={form.effectifs_global}
                onChange={e => setForm({...form, effectifs_global: e.target.value})}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Eff. Inovallée</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-white"
                value={form.effectifs_inovallee}
                onChange={e => setForm({...form, effectifs_inovallee: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded border">
          <label className="block text-sm font-medium mb-1">Catégories</label>
          <CategorySelector
            selectedCategories={form.categories.split('-').filter(Boolean)}
            allCategories={allCategories}
            allowCreate={true}
            onChange={(cats) => setForm({...form, categories: cats.join('-')})}
            placeholder="Rechercher ou créer..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border px-3 py-2 rounded h-24"
            value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/')}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
            Annuler
          </button>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">
            💾 Créer l'entreprise
          </button>
        </div>
      </form>
    </div>
  );
};

// --- App Root ---

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ListPage/>}/>
          <Route path="/company/:id" element={<CompanyPage/>}/>
          <Route path="/company/new" element={<NewCompanyPage/>}/>
        </Routes>
      </Layout>
    </Router>
  );
}
