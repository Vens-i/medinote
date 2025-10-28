export type RecentNote = {
  id: string
  title: string
  updatedAt: string
  summary?: string
}

export type RecentNotesSidebarProps = {
  notes: RecentNote[]
  onSelect: (noteId: string) => void
  onDelete: (noteId: string) => void
  onDeleteAll: () => void
}

const RecentNotesSidebar = ({ notes, onSelect, onDelete, onDeleteAll }: RecentNotesSidebarProps) => {
  return (
    <aside
      aria-labelledby="recent-notes-heading"
      className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 id="recent-notes-heading" className="text-xl font-semibold text-slate-900">
            Recent notes
          </h2>
          <p className="text-sm text-slate-500">Coming soon: sync, filters, and sharing.</p>
        </div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={onDeleteAll}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
        >
          Delete all data
        </button>
      </header>

      <ul className="flex-1 space-y-3 overflow-y-auto pr-1" aria-label="Note history">
        {notes.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No saved notes yet. Once you save, they will appear here.
          </li>
        )}
        {notes.map((note) => (
          <li key={note.id}>
            <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onSelect(note.id)}
                  className="text-left text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                >
                  {note.title}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    onClick={() => onDelete(note.id)}
                    className="rounded-full border border-slate-300 px-2 py-1 text-xs font-medium text-slate-500"
                    aria-label={`Open actions for ${note.title}`}
                  >
                    Actions
                  </button>
                </div>
              </div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Updated {note.updatedAt}</p>
              {note.summary && <p className="text-sm text-slate-600">{note.summary}</p>}
            </article>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default RecentNotesSidebar
