import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import AdminPanel from './AdminPanel.jsx';
import NoteEditor from './NoteEditor.jsx';
import NotesLibrary from './NotesLibrary.jsx';
import NavRail from './NavRail.jsx';
import ProfilePanel from './ProfilePanel.jsx';
import { api } from '../../lib/api.js';

export default function Workspace({ user: initialUser, onLogout, notify }) {
  const [user, setUser] = useState(initialUser);
  const [activeView, setActiveView] = useState('notes');
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [draft, setDraft] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');
  const [editorError, setEditorError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mobilePane, setMobilePane] = useState('list');

  const loadNotes = useCallback(async () => {
    setNotesLoading(true); setNotesError('');
    try {
      const result = await api('/api/notes');
      setNotes(result.notes || []);
      setSelectedNote(null); setDraft(false); setDirty(false);
    } catch (error) {
      setNotesError(error.message);
      setNotes([]); setSelectedNote(null); setDraft(false);
    } finally { setNotesLoading(false); }
  }, []);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  function confirmLeave() {
    return !dirty || window.confirm('Tenés cambios sin guardar. ¿Querés descartarlos?');
  }

  function navigate(view) {
    if (view === activeView || !confirmLeave()) return;
    setActiveView(view); setDirty(false); setEditorError(''); setMobilePane('list');
    if (view === 'notes') loadNotes();
  }

  function startNote() {
    if (!confirmLeave()) return;
    setSelectedNote({ title: '', content: '' });
    setDraft(true); setDirty(false); setEditorError(''); setMobilePane('editor');
  }

  function selectNote(note) {
    if (String(note.id) === String(selectedNote?.id) || !confirmLeave()) return;
    setSelectedNote(note); setDraft(false); setDirty(false); setEditorError(''); setMobilePane('editor');
  }

  function updateNote(changes) {
    setSelectedNote((current) => ({ ...(current || {}), ...changes }));
    setDirty(true); setEditorError('');
  }

  async function saveNote(noteData) {
    setSaving(true); setEditorError('');
    try {
      const path = draft ? '/api/notes' : `/api/notes/${encodeURIComponent(selectedNote.id)}`;
      const result = await api(path, { method: draft ? 'POST' : 'PATCH', body: noteData });
      const saved = result.note;
      setNotes((current) => [saved, ...current.filter((note) => String(note.id) !== String(saved.id))]);
      setSelectedNote(saved); setDraft(false); setDirty(false);
      notify('Nota guardada.');
    } catch (error) { setEditorError(error.message); }
    finally { setSaving(false); }
  }

  async function deleteNote() {
    if (!selectedNote?.id || !window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
    try {
      await api(`/api/notes/${encodeURIComponent(selectedNote.id)}`, { method: 'DELETE' });
      setNotes((current) => current.filter((note) => String(note.id) !== String(selectedNote.id)));
      setSelectedNote(null); setDraft(false); setDirty(false); setMobilePane('list');
      notify('Nota eliminada.');
    } catch (error) { setEditorError(error.message); }
  }

  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className={`workspace-shell${mobilePane === 'editor' ? ' workspace-mobile-editor' : ''}`}>
      <NavRail user={user} activeView={activeView} onNavigate={navigate} onLogout={onLogout} />
      <main className="workspace-main">
        {activeView === 'notes' && (
          <>
            <header className="workspace-heading">
              <div><p className="workspace-overline">MI ESPACIO</p><h1>Hola, {firstName}.</h1></div>
              <p>Tus notas, en un solo lugar.</p>
              <button className="mobile-back" type="button" onClick={() => { if (confirmLeave()) { setMobilePane('list'); setDirty(false); } }}><Icon name="back" size={18} /> Archivo</button>
            </header>
            <div className="notes-workspace">
              <NotesLibrary
                notes={notes}
                selectedId={selectedNote?.id}
                search={search}
                onSearch={setSearch}
                onSelect={selectNote}
                onCreate={startNote}
                status={notesLoading ? 'Cargando' : notesError ? 'Sin conexión' : ''}
              />
              <section className="editor-stage">
                {notesError && <p className="workspace-error" role="alert">{notesError} <button type="button" onClick={loadNotes}>Reintentar</button></p>}
                {!notesError && (
                  <NoteEditor
                    key={draft ? 'draft' : selectedNote?.id || 'empty'}
                    note={selectedNote}
                    draft={draft}
                    dirty={dirty}
                    busy={saving}
                    error={editorError}
                    onChange={updateNote}
                    onSave={saveNote}
                    onDelete={deleteNote}
                    onBack={() => { if (confirmLeave()) { setMobilePane('list'); setDirty(false); } }}
                    onCreate={startNote}
                  />
                )}
              </section>
            </div>
          </>
        )}
        {activeView === 'profile' && <ProfilePanel user={user} onUserChange={setUser} />}
        {activeView === 'admin' && user.role === 'admin' && <AdminPanel user={user} notify={notify} />}
      </main>
    </div>
  );
}
