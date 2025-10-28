export type RewriteTone = 'clinical' | 'concise' | 'patient-friendly'
export type ExportFormat = 'pdf' | 'json'

export type ToolbarProps = {
  onTranscribe: () => void
  onProofread: () => void
  onGenerateSoap: () => void
  onRewrite: (tone: RewriteTone) => void
  onExport: (format: ExportFormat) => void
  onSave: () => void
}

const rewriteTones: Array<{ tone: RewriteTone; label: string }> = [
  { tone: 'clinical', label: 'Clinical' },
  { tone: 'concise', label: 'Concise' },
  { tone: 'patient-friendly', label: 'Patient friendly' },
]

const exportFormats: Array<{ format: ExportFormat; label: string }> = [
  { format: 'pdf', label: 'PDF' },
  { format: 'json', label: 'JSON' },
]

const Toolbar = ({
  onTranscribe,
  onProofread,
  onGenerateSoap,
  onRewrite,
  onExport,
  onSave,
}: ToolbarProps) => {
  return (
    <section
      aria-labelledby="toolbar-heading"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header>
        <h2 id="toolbar-heading" className="text-xl font-semibold text-slate-900">
          Assistant tools
        </h2>
        <p className="text-sm text-slate-500">
          Controls stay disabled until AI flows are ready. Wire actions to props when ready.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onTranscribe}
          disabled
          aria-disabled="true"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Transcribe
        </button>
        <button
          type="button"
          onClick={onProofread}
          disabled
          aria-disabled="true"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Proofread
        </button>
        <button
          type="button"
          onClick={onGenerateSoap}
          disabled
          aria-disabled="true"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Generate SOAP
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-600">Rewrite</p>
        <div className="flex flex-wrap gap-2">
          {rewriteTones.map(({ tone, label }) => (
            <button
              key={tone}
              type="button"
              onClick={() => onRewrite(tone)}
              disabled
              aria-disabled="true"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-600">Export</p>
        <div className="flex gap-2">
          {exportFormats.map(({ format, label }) => (
            <button
              key={format}
              type="button"
              onClick={() => onExport(format)}
              disabled
              aria-disabled="true"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={onSave}
          disabled
          aria-disabled="true"
          className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500"
        >
          Save note
        </button>
      </div>
    </section>
  )
}

export default Toolbar
