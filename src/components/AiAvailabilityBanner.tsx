export type AiAvailabilityState = 'unavailable' | 'warming' | 'ready'

export type AiAvailabilityBannerProps = {
  status: AiAvailabilityState
  onLearnMore: () => void
}

const statusConfig: Record<AiAvailabilityState, { label: string; description: string; tone: string }> = {
  unavailable: {
    label: 'AI unavailable',
    description: 'Chrome Built-in AI not detected. Features depending on it stay disabled.',
    tone: 'bg-amber-50 border-amber-200 text-amber-800',
  },
  warming: {
    label: 'AI warming up',
    description: 'We are getting things ready. You will be able to run automations shortly.',
    tone: 'bg-sky-50 border-sky-200 text-sky-900',
  },
  ready: {
    label: 'AI ready',
    description: 'Assistant actions are standing by. Connect to recording or transcript to start.',
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
}

const AiAvailabilityBanner = ({ status, onLearnMore }: AiAvailabilityBannerProps) => {
  const config = statusConfig[status]

  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${config.tone}`}
    >
      <div>
        <p className="font-semibold">{config.label}</p>
        <p className="text-xs">{config.description}</p>
      </div>
      <button
        type="button"
        onClick={onLearnMore}
        className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
      >
        Learn more
      </button>
    </section>
  )
}

export default AiAvailabilityBanner
