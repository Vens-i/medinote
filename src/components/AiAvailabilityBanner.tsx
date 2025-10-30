export type AiAvailabilityState = 'unavailable' | 'warming' | 'ready'

export type AiAvailabilityBannerProps = {
  status: AiAvailabilityState
  docsHref: string
  localOnlyTooltip: string
  onRefresh?: () => void
}

const statusConfig: Record<
  AiAvailabilityState,
  { label: string; description: string; tone: string; cta: string }
> = {
  unavailable: {
    label: 'Local AI unavailable',
    description: 'Chrome Built-in AI not detected. Assistant flows remain in manual mode.',
    tone: 'bg-amber-50 border-amber-200 text-amber-800',
    cta: 'Setup guide',
  },
  warming: {
    label: 'Local AI warming up',
    description: 'Downloading or initializing the device model. Try again shortly.',
    tone: 'bg-sky-50 border-sky-200 text-sky-900',
    cta: 'Check status',
  },
  ready: {
    label: 'Local AI ready',
    description: 'Assistant actions stay on your device. Use toolbar controls to run flows.',
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    cta: 'Refresh status',
  },
}

const AiAvailabilityBanner = ({ status, docsHref, localOnlyTooltip, onRefresh }: AiAvailabilityBannerProps) => {
  const config = statusConfig[status]
  const isUnavailable = status === 'unavailable'

  return (
    <section
      role="status"
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm ${config.tone}`}
    >
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{config.label}</p>
        <p className="text-xs">{config.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-current bg-white/20 px-3 py-1 text-xs font-semibold">
          <span aria-live="off">Local only</span>
          <span
            className="inline-flex h-5 w-10 items-center rounded-full bg-emerald-100 p-1 text-emerald-900"
            title={localOnlyTooltip}
            aria-label={localOnlyTooltip}
          >
            <span className="block h-3 w-3 rounded-full bg-emerald-600" />
          </span>
        </div>

        {isUnavailable ? (
          <a
            href={docsHref}
            className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
          >
            {config.cta}
          </a>
        ) : (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-current px-3 py-1 text-xs font-semibold"
          >
            {config.cta}
          </button>
        )}
      </div>
    </section>
  )
}

export default AiAvailabilityBanner
