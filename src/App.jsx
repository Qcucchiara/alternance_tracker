import React, { useState, useEffect } from 'react';
const { ipcRenderer } = window.require('electron');
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import MDEditor from '@uiw/react-md-editor';

// --- Composants Communs ---

const StatusBadge = ({ status }) => {
  const colors = {
    'positif': 'bg-green-500 text-white',
    'ambigu': 'bg-yellow-400 text-black',
    'relance': 'bg-blue-500 text-white',
    'tente_pas_reponse': 'bg-gray-400 text-white',
    'a_contacter': 'bg-white text-gray-800 border border-gray-300',
    'negatif': 'bg-red-500 text-white',
  };
  const labels = {
    'positif': 'Positif',
    'ambigu': 'Ambigu',
    'relance': 'Relance',
    'tente_pas_reponse': 'Pas répondu',
    'a_contacter': 'À contacter',
    'negatif': 'Négatif',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || 'bg-gray-200'}`}>
      ● {labels[status] || status}
    </span>
  );
};

// --- Layout ---

const Layout = ({ children }) => {
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
          <button onClick={() => navigate('/company/new')} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
            + Entreprise
          </button>
          <button onClick={handleExportJSON} className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm">
            ⬇ Export JSON
          </button>
          <button onClick={handleExportCSV} className="bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 text-sm">
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
      sortBy: 'priority',
      onlyFavorites: false
    };
  });

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
    await ipcRenderer.invoke('toggle-favorite', { id, favori: current ? 0 : 1 });
    loadCompanies();
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => {
      const statuses = prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status];
      return { ...prev, statuses };
    });
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
              onChange={e => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="border rounded px-2 py-2"
            value={filters.sortBy}
            onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
          >
            <option value="priority">Trier par : Priorité</option>
            <option value="nom">Trier par : Nom</option>
            <option value="commune">Trier par : Commune</option>
            <option value="status">Trier par : Statut</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilters({ ...filters, onlyFavorites: !filters.onlyFavorites })}
            className={`px-3 py-1 rounded border text-sm ${filters.onlyFavorites ? 'bg-yellow-100 border-yellow-400' : 'bg-white'}`}
          >
            ★ Favoris
          </button>
          {['positif', 'ambigu', 'relance', 'a_contacter', 'tente_pas_reponse', 'negatif'].map(s => (
            <button
              key={s}
              onClick={() => handleStatusFilter(s)}
              className={`px-3 py-1 rounded border text-sm transition-colors ${filters.statuses.includes(s) ? 'ring-2 ring-blue-400' : 'bg-white'}`}
            >
              <StatusBadge status={s} />
            </button>
          ))}
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
                  {c.favori ? <span className="text-yellow-500 text-lg">★</span> : <span className="text-gray-300 text-lg">☆</span>}
                </td>
                <td className="px-4 py-3 font-medium text-blue-700">{c.nom}</td>
                <td className="px-4 py-3 text-gray-600 truncate max-w-[12rem]">{c.commune}</td>
                <td className="px-4 py-3 text-center text-gray-500 font-mono">{c.priority}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.best_status} />
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    contact_nom: '',
    contact_poste: '',
    contact_email: '',
    contact_telephone: '',
    status: 'a_contacter',
    date_contact: new Date().toISOString().split('T')[0],
    next_action_date: '',
    notes: ''
  });

  const [accueilForm, setAccueilForm] = useState({
    email_accueil: '',
    contact_accueil: '',
    site_web: ''
  });

  useEffect(() => {
    loadCompany();
  }, [id]);

  const loadCompany = async (targetContactId = null) => {
    const data = await ipcRenderer.invoke('get-company', id);
    setCompany(data);
    setAccueilForm({
      email_accueil: data.email_accueil || '',
      contact_accueil: data.contact_accueil || '',
      site_web: data.site_web || ''
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
    setSelectedContact(null);
    setContactForm({
      contact_nom: '',
      contact_poste: '',
      contact_email: '',
      contact_telephone: '',
      status: 'a_contacter',
      date_contact: new Date().toISOString().split('T')[0],
      next_action_date: '',
      notes: ''
    });
  };

  const handleSelectContact = (contact) => {
    setSelectedContact(contact);
    setContactForm({
      id: contact.id,
      company_id: contact.company_id,
      contact_nom: contact.contact_nom || '',
      contact_poste: contact.contact_poste || '',
      contact_email: contact.contact_email || '',
      contact_telephone: contact.contact_telephone || '',
      status: contact.status || 'a_contacter',
      date_contact: contact.date_contact || '',
      next_action_date: contact.next_action_date || '',
      notes: contact.notes || ''
    });
  };

  const handleSaveAccueil = async () => {
    await ipcRenderer.invoke('update-company-accueil', { id, ...accueilForm });
    loadCompany();
  };

  const handleSaveContact = async () => {
    const result = await ipcRenderer.invoke('save-contact', { ...contactForm, company_id: id });
    const newId = contactForm.id || result.lastInsertRowid;
    loadCompany(newId);
  };

  const handleDeleteContact = async (e, contactId) => {
    e.stopPropagation();
    if (window.confirm('Supprimer ce contact ?')) {
      await ipcRenderer.invoke('delete-contact', { id: contactId, company_id: id });
      loadCompany();
    }
  };

  const toggleFavorite = async () => {
    await ipcRenderer.invoke('toggle-favorite', { id, favori: company.favori ? 0 : 1 });
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
          <StatusBadge status={company.best_status} />
          <button onClick={toggleFavorite} className="text-2xl leading-none">
            {company.favori ? <span className="text-yellow-500">★</span> : <span className="text-gray-300">☆</span>}
          </button>"
        </div>
        {company.site_web && (
          <a href={company.site_web} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
            🌐 {new URL(company.site_web).hostname}
          </a>
        )}
      </div>

      {/* Zone 2 — Bloc Infos */}
      <div className="flex border-b shrink-0 h-48">
        <div className="w-[40%] bg-gray-50 p-4 border-r text-xs space-y-2 overflow-auto">
          <p><strong>Secteur :</strong> {company.secteurs || company.secteur_1}</p>
          <p><strong>Effectifs :</strong> {company.effectifs_global || '?'} (global) · {company.effectifs_inovallee || '?'} (local)</p>
          <p><strong>Commune :</strong> {company.commune} ({company.code_postal})</p>
          <div className="flex flex-wrap gap-1">
            <strong>Catégories :</strong>
            {(company.categories || '').split('-').filter(Boolean).map(cat => (
              <span key={cat} className="bg-gray-200 px-1 rounded">{cat}</span>
            ))}
          </div>
          {company.site_internet && (
            <p>
              <strong>Annuaire :</strong>{' '}
              <a href={company.site_internet} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                Lien fiche
              </a>
            </p>
          )}
          <div className="mt-2 text-gray-600">
            <div className="mt-2 text-gray-600">
              <strong>Description :</strong>{' '}
              <span
                  className="cursor-help"
                  title={company.description || 'Aucune description'}
              >
                  {company.description?.slice(0, 100) || 'Aucune description'}...
                </span>
            </div>
          </div>
        </div>
        <div className="w-[60%] p-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Tél accueil :</span>
              <span className="text-gray-600 font-mono">{company.telephone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Email accueil :</span>
              <input
                type="text"
                className="flex-1 border-b focus:border-blue-500 outline-none"
                value={accueilForm.email_accueil}
                onChange={e => setAccueilForm({ ...accueilForm, email_accueil: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-32 font-semibold">Contact accueil :</span>
              <input
                type="text"
                className="flex-1 border-b focus:border-blue-500 outline-none"
                value={accueilForm.contact_accueil}
                onChange={e => setAccueilForm({ ...accueilForm, contact_accueil: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="w-32">Site web :</span>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://..."
                  className="flex-1 border-b focus:border-blue-500 outline-none font-normal"
                  value={accueilForm.site_web}
                  onChange={e => setAccueilForm({ ...accueilForm, site_web: e.target.value })}
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
            </div>
          </div>
          <button onClick={handleSaveAccueil} className="self-end bg-gray-800 text-white px-3 py-1 rounded text-xs">
            💾 Sauver accueil
          </button>
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
                  <StatusBadge status={c.status} />
                </div>
                {c.contact_nom !== 'Accueil' && (
                  <button onClick={e => handleDeleteContact(e, c.id)} className="text-red-400 opacity-0 group-hover:opacity-100 px-1">🗑</button>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleAddContact} className="m-2 p-2 border-2 border-dashed rounded text-blue-600 font-bold text-sm hover:bg-blue-50">
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
                onChange={e => setContactForm({ ...contactForm, contact_nom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Poste</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_poste}
                onChange={e => setContactForm({ ...contactForm, contact_poste: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Email</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_email}
                onChange={e => setContactForm({ ...contactForm, contact_email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-gray-500">Tél</label>
              <input
                type="text"
                className="w-full border px-2 py-1 rounded"
                value={contactForm.contact_telephone}
                onChange={e => setContactForm({ ...contactForm, contact_telephone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-500">Statut</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {['a_contacter', 'tente_pas_reponse', 'positif', 'negatif', 'ambigu', 'relance'].map(s => (
                <label key={s} className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={contactForm.status === s}
                    onChange={() => setContactForm({ ...contactForm, status: s })}
                  />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
          </div>

          {contactForm.status === 'relance' && (
            <div className="space-y-1">
              <label className="block text-sm text-gray-500">Date de relance</label>
              <input
                type="date"
                className="border px-2 py-1 rounded text-sm"
                value={contactForm.next_action_date}
                onChange={e => setContactForm({ ...contactForm, next_action_date: e.target.value })}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-[150px]">
            <label className="block text-sm text-gray-500 mb-1">Notes</label>
            <div className="flex-1 overflow-auto" data-color-mode="light">
              <MDEditor
                value={contactForm.notes}
                onChange={val => setContactForm({ ...contactForm, notes: val || '' })}
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
        <button onClick={() => navigateNextPrev(-1)} className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded">← Précédent</button>
        <button onClick={handleSaveContact} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 shadow-md">
          💾 Sauvegarder contact
        </button>
        <button onClick={() => navigateNextPrev(1)} className="text-gray-600 px-4 py-2 hover:bg-gray-200 rounded">Suivant →</button>
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
    description: ''
  });

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
                onChange={e => setForm({ ...form, nom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site web</label>
              <input
                type="text"
                placeholder="https://www.entreprise.com"
                className="w-full border px-3 py-2 rounded"
                value={form.site_web}
                onChange={e => setForm({ ...form, site_web: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-400 italic">Lien annuaire (Inovallée, etc.)</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded bg-gray-50 text-xs"
                value={form.site_internet}
                onChange={e => setForm({ ...form, site_internet: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.adresse}
                onChange={e => setForm({ ...form, adresse: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-sm font-medium mb-1">Code postal</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={form.code_postal}
                  onChange={e => setForm({ ...form, code_postal: e.target.value })}
                />
              </div>
              <div className="w-2/3">
                <label className="block text-sm font-medium mb-1">Commune</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={form.commune}
                  onChange={e => setForm({ ...form, commune: e.target.value })}
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
                onChange={e => setForm({ ...form, telephone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email accueil</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.email_accueil}
                onChange={e => setForm({ ...form, email_accueil: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact accueil</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={form.contact_accueil}
                onChange={e => setForm({ ...form, contact_accueil: e.target.value })}
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
                onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.favori === 1}
                onChange={e => setForm({ ...form, favori: e.target.checked ? 1 : 0 })}
              />
              Marquer comme favori
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Catégories (séparées par des tirets)</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            placeholder="ex: Ingénierie-Énergie-Grand groupe"
            value={form.categories}
            onChange={e => setForm({ ...form, categories: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full border px-3 py-2 rounded h-24"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">
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
          <Route path="/" element={<ListPage />} />
          <Route path="/company/:id" element={<CompanyPage />} />
          <Route path="/company/new" element={<NewCompanyPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
