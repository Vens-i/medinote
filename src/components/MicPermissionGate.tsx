export type MicPermissionState = 'pre' | 'granted' | 'denied'

export type MicPermissionGateProps = {
  state: MicPermissionState
  onRequestPermission: () => void
}

const messages: Record<MicPermissionState, { title: string; body: string }> = {
  pre: {
    title: 'Microphone access not requested',
    body: 'Allow microphone access to enable recording inside MediNote.',
  },
  granted: {
    title: 'Microphone ready',
    body: 'Recording is unlocked. Start when you are ready.',
  },
  denied: {
    title: 'Microphone access denied',
    body: 'Enable microphone permissions in your browser settings to continue.',
  },
}

const MicPermissionGate = ({ state, onRequestPermission }: MicPermissionGateProps) => {
  const { title, body } = messages[state]
  const showAction = state !== 'granted'

  return (
    <section
      aria-labelledby="mic-permission-heading"
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-sm"
    >
      <div>
        <p
          id="mic-permission-heading"
          className="text-base font-semibold text-white"
        >
          {title}
        </p>
        <p className="text-sm text-slate-200">{body}</p>
      </div>
      {showAction && (
        <button
          type="button"
          onClick={onRequestPermission}
          className="self-start rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Check microphone
        </button>
      )}
    </section>
  )
}

export default MicPermissionGate
