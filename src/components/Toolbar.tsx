export type RewriteTone = 'clinical' | 'concise' | 'patient-friendly'
export type ExportFormat = 'pdf' | 'json'

export type ToolbarMode = 'ai' | 'manual'

export type ToolbarProps = {
  mode: ToolbarMode
  hasRecording: boolean
  hasTranscript: boolean
  hasCleaned: boolean
  hasSoap: boolean
  isTranscribing: boolean
  isProofreading: boolean
  isComposing: boolean
  errorMessage?: string | null
  onClearError?: () => void
  onRetry?: () => void
  onTranscribe: () => void
  onProofread: () => void
  onGenerateSoap: () => void
  onExport: (format: ExportFormat) => void
  onSave: () => void
  onRewrite?: (tone: RewriteTone) => void
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
  mode,
  hasRecording,
  hasTranscript,
  hasCleaned,
  hasSoap,
  isTranscribing,
  isProofreading,
  isComposing,
  errorMessage,
  onClearError,
  onRetry,
  onTranscribe,
  onProofread,
  onGenerateSoap,
  onExport,
  onSave,
  onRewrite,
}: ToolbarProps) => {
  const manualMode = mode === 'manual'
  const transcribeDisabled = manualMode || !hasRecording || isTranscribing || isProofreading || isComposing
  const proofreadDisabled = manualMode || !hasTranscript || isTranscribing || isProofreading || isComposing
  const composeDisabled = !hasTranscript || isTranscribing || isProofreading || isComposing
  const saveDisabled = !hasTranscript && !hasRecording && !hasSoap

  return (
    <section
      aria-labelledby="toolbar-heading"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="toolbar-heading" className="text-xl font-semibold text-slate-900">
            Assistant tools
          </h2>
          <p className="text-sm text-slate-500">
            {manualMode
              ? 'Manual mode: AI helpers unavailable. Generate SOAP uses the template flow.'
              : 'Run actions locally on your device. All inference stays private.'}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {manualMode ? 'Manual mode' : 'Local AI'}
        </span>
      </header>

      {errorMessage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <span role="alert">{errorMessage}</span>
          <div className="flex gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-800"
              >
                Retry
              </button>
            )}
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-rose-700"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onTranscribe}
          disabled={transcribeDisabled}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            transcribeDisabled
              ? 'border-slate-200 text-slate-400'
              : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isTranscribing ? 'Transcribing…' : 'Transcribe'}
        </button>
        <button
          type="button"
          onClick={onProofread}
          disabled={proofreadDisabled}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            proofreadDisabled
              ? 'border-slate-200 text-slate-400'
              : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isProofreading ? 'Proofreading…' : 'Proofread'}
        </button>
        <button
          type="button"
          onClick={onGenerateSoap}
          disabled={composeDisabled}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${
            composeDisabled
              ? 'border-slate-200 text-slate-400'
              : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          {isComposing ? 'Composing SOAP…' : 'Generate SOAP'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-slate-600">Rewrite</p>
        <div className="flex flex-wrap gap-2">
          {rewriteTones.map(({ tone, label }) => (
            <button
              key={tone}
              type="button"
              onClick={() => onRewrite?.(tone)}
              disabled={manualMode || !hasCleaned}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                manualMode || !hasCleaned
                  ? 'border-slate-200 text-slate-400'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
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
              disabled={!hasTranscript && !hasSoap}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                hasTranscript || hasSoap
                  ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'border-slate-200 text-slate-400'
              }`}
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
          disabled={saveDisabled}
          className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
            saveDisabled
              ? 'border-slate-200 bg-slate-100 text-slate-400'
              : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {hasSoap ? 'Save SOAP note' : 'Save note'}
        </button>
      </div>
    </section>
  )
}

export default Toolbar
