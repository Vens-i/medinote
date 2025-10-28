export type VoiceRecorderStatus = 'idle' | 'recording' | 'preview'

export type VoiceRecorderProps = {
  status: VoiceRecorderStatus
  elapsedSeconds: number
  inputLevel?: number
  onRecord: () => void
  onStop: () => void
  onPlay: () => void
  onDelete: () => void
  onReRecord: () => void
}

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds >= 0 ? totalSeconds : 0
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = Math.floor(safeSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const VoiceRecorder = ({
  status,
  elapsedSeconds,
  inputLevel = 0,
  onRecord,
  onStop,
  onPlay,
  onDelete,
  onReRecord,
}: VoiceRecorderProps) => {
  const isRecording = status === 'recording'
  const formattedTime = formatTime(elapsedSeconds)
  const levelWidth = `${Math.min(Math.max(inputLevel, 0), 1) * 100}%`

  return (
    <section
      aria-labelledby="voice-recorder-heading"
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 id="voice-recorder-heading" className="text-xl font-semibold text-slate-900">
            Voice Recorder
          </h2>
          <p className="text-sm text-slate-500">Capture a single clip per note (60 seconds max).</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          {status === 'recording' ? 'Recording' : status === 'preview' ? 'Preview' : 'Ready'}
        </span>
      </header>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          aria-pressed={isRecording}
          onClick={isRecording ? onStop : onRecord}
          className="h-16 w-56 rounded-full bg-indigo-600 text-lg font-semibold text-white shadow transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          {isRecording ? 'Stop' : 'Record'}
        </button>
        <p className="font-mono text-3xl text-slate-900" aria-live="polite">
          {formattedTime}
        </p>

        <div className="w-full max-w-sm">
          <p className="mb-2 text-sm font-medium text-slate-600">Input level</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: levelWidth }}
              aria-hidden="true"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">Live meter placeholder. Hook up MediaRecorder later.</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={onPlay}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500"
        >
          Play
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={onDelete}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500"
        >
          Delete
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          onClick={onReRecord}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-500"
        >
          Re-record
        </button>
      </div>
    </section>
  )
}

export default VoiceRecorder
