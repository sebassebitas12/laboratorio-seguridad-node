import { useState } from 'react';
import Button from '../../components/Button.jsx';
import Icon from '../../components/Icon.jsx';

const dateTimeFormat = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function EmptyEditor({ onCreate }) {
  return (
    <div className="empty-editor">
      <div className="empty-page-mark" aria-hidden="true"><i /><i /><i /><i /></div>
      <h2>Dejá que empiece por una línea.</h2>
      <p>Elegí una nota del archivo o abrí una página nueva.</p>
      <Button variant="text" icon="add" onClick={onCreate}>Nueva nota</Button>
    </div>
  );
}

export default function NoteEditor({ note, draft, dirty, busy, error, onChange, onSave, onDelete, onBack, onCreate }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');

  if (!note && !draft) return <EmptyEditor onCreate={onCreate} />;

  function update(nextTitle, nextContent) {
    setTitle(nextTitle);
    setContent(nextContent);
    onChange({ title: nextTitle, content: nextContent });
  }

  const editedAt = note?.updatedAt ? dateTimeFormat.format(new Date(note.updatedAt)) : 'Todavía sin guardar';
  const characterCount = content.length.toLocaleString('es-CR');

  return (
    <section className="note-editor" aria-label="Editor de notas">
      <div className="editor-topline">
        <button className="editor-back" type="button" onClick={onBack}><Icon name="back" size={18} /><span>Archivo</span></button>
        <p className="editor-updated">{draft ? 'Nota nueva' : `Última edición · ${editedAt}`}</p>
        <span className={`editor-save-state${dirty ? ' editor-save-state-dirty' : ''}`}>{dirty ? 'Cambios sin guardar' : 'Guardado'}</span>
      </div>
      <form className="note-form" onSubmit={(event) => { event.preventDefault(); onSave({ title: title.trim(), content }); }}>
        <label className="sr-only" htmlFor="note-title">Título de la nota</label>
        <input id="note-title" className="note-title" name="title" value={title} onChange={(event) => update(event.target.value, content)} placeholder="Sin título" required maxLength={120} />
        <div className="editor-writing">
          <div className="editor-margin" aria-hidden="true" />
          <label className="sr-only" htmlFor="note-content">Contenido de la nota</label>
          <textarea id="note-content" name="content" value={content} onChange={(event) => update(title, event.target.value)} placeholder="Empezá a escribir aquí…" required maxLength={10000} />
        </div>
        {error && <p className="form-message form-message-error" role="alert">{error}</p>}
        <footer className="editor-footer">
          <span className="character-count">{characterCount} / 10 000</span>
          <div className="editor-actions">
            {!draft && <Button type="button" variant="quiet-danger" onClick={onDelete}>Eliminar nota</Button>}
            <Button type="submit" disabled={busy || !dirty} icon="check">{busy ? 'Guardando…' : 'Guardar nota'}</Button>
          </div>
        </footer>
      </form>
    </section>
  );
}
