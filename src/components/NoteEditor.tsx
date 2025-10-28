import type { ChangeEvent } from 'react'

export type NoteEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const countWords = (text: string) => {
  const trimmed = text.trim()
  if (!trimmed) {
    return 0
  }
  return trimmed.split(/\s+/).length
}

const NoteEditor = ({ value, onChange, placeholder = 'Start typing the transcript...', disabled = false }: NoteEditorProps) => {
  const words = countWords(value)

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value)
  }

  return (
    <section
      aria-labelledby="note-editor-heading"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="note-editor-heading" className="text-xl font-semibold text-slate-900">
            Transcript
          </h2>
          <p className="text-sm text-slate-500">Review and refine the auto-generated transcript.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600" aria-live="polite">
          {words} word{words === 1 ? '' : 's'}
        </span>
      </header>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Transcript text
        <textarea
          id="transcript-editor"
          value={value}
          onChange={handleChange}
          aria-describedby="transcript-editor-helptext"
          disabled={disabled}
          className="min-h-[220px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-75"
          placeholder={placeholder}
        />
      </label>
      <p id="transcript-editor-helptext" className="text-xs text-slate-500">
        This text area stays local. Speech-to-text hooks will wire in later.
      </p>
    </section>
  )
}

export default NoteEditor
