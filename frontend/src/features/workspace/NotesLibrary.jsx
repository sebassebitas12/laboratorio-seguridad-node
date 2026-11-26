import Icon from '../../components/Icon.jsx';

const dateFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short' });

export default function NotesLibrary({ notes, selectedId, search, onSearch, onSelect, onCreate, status }) {
  const filtered = notes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')));

  return (
    <aside className="notes-library" aria-label="Lista de notas">
      <div className="library-heading">
        <div>
          <p className="library-overline">ARCHIVO PERSONAL</p>
          <h2>Mis notas</h2>
        </div>
        <button className="icon-action library-add" type="button" onClick={onCreate} aria-label="Crear nota" title="Crear nota">
          <Icon name="add" size={20} />
        </button>
      </div>
      <label className="library-search">
        <Icon name="search" size={18} />
        <span className="sr-only">Buscar entre mis notas</span>
        <input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar entre tus notas" />
        {search && <button type="button" className="search-clear" onClick={() => onSearch('')} aria-label="Limpiar búsqueda"><Icon name="close" size={16} /></button>}
      </label>
      <div className="library-count"><span>{notes.length === 1 ? '1 nota' : `${notes.length} notas`}</span><span>{status}</span></div>

      <div className="notes-list" aria-live="polite">
        {filtered.map((note) => (
          <button
            type="button"
            className={`note-row${String(note.id) === String(selectedId) ? ' note-row-selected' : ''}`}
            key={note.id}
            onClick={() => onSelect(note)}
          >
            <span className="note-row-date">{dateFormat.format(new Date(note.updatedAt))}</span>
            <strong>{note.title}</strong>
            <span className="note-row-summary">{note.content}</span>
          </button>
        ))}
        {!filtered.length && (
          <p className="library-empty">{search ? 'No hay notas que coincidan con la búsqueda.' : 'Todavía no hay notas en tu archivo.'}</p>
        )}
      </div>
    </aside>
  );
}
