export type MicPermissionState = 'pre' | 'granted' | 'denied'

export type MicPermissionGateProps = {
  state: MicPermissionState
  busy?: boolean
  errorMessage?: string | null
  onRequestPermission: () => void
  onDismissError?: () => void
}

const messages: Record<MicPermissionState, { title: string; body: string; cta: string }> = {
  pre: {
    title: 'Microphone access not requested',
    body: 'Grant access so medinote can capture short recordings securely on-device.',
    cta: 'Request access',
  },
  granted: {
    title: 'Microphone ready',
    body: 'Recording is unlocked. Start when you are ready.',
    cta: 'Recheck microphone',
  },
  denied: {
    title: 'Microphone access denied',
    body: 'Allow microphone permissions in browser settings, then retry.',
    cta: 'Retry access',
  },
}

const MicPermissionGate = ({
  state,
  busy = false,
  errorMessage,
  onRequestPermission,
  onDismissError,
}: MicPermissionGateProps) => {
  const { title, body, cta } = messages[state]
  const showAction = state !== 'granted' || busy

  return (
    <section
      aria-labelledby="mic-permission-heading"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-sm"
    >
      <div>
        <p id="mic-permission-heading" className="text-base font-semibold text-white">
          {title}
        </p>
        <p className="text-sm text-slate-200">{body}</p>
      </div>

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm text-rose-800">
          <span role="alert">{errorMessage}</span>
          <button
            type="button"
            onClick={onDismissError}
            className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-rose-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {showAction && (
        <button
          type="button"
          onClick={onRequestPermission}
          disabled={busy}
          className={`self-start rounded-full px-4 py-2 text-sm font-semibold shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            busy ? 'cursor-not-allowed bg-slate-500 text-slate-200' : 'bg-white text-slate-900'
          }`}
        >
          {busy ? 'Checking…' : cta}
        </button>
      )}
    </section>
  )
}

export default MicPermissionGate
