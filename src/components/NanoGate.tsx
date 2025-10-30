import { useEffect } from 'react'
import type { LanguageModelSession } from '../lib/nano/model'
import type { UseNanoSessionReturn } from '../lib/nano/useNanoSession'

type NanoGateProps = {
  nano: UseNanoSessionReturn
  onReady?: (session: LanguageModelSession) => void
}

const checklistItems = [
  'OS: Windows 10/11, macOS 13+, Linux, or ChromeOS (Plus 16389.0.0+)',
  'Storage: ≥ 22 GB free on Chrome profile volume (model removed if free < 10 GB)',
  'Hardware: GPU with > 4 GB VRAM or CPU with ≥ 16 GB RAM and 4+ cores',
  'Network: Unlimited or unmetered connection for initial download',
  'Browser: Chrome with Prompt API enabled (no worker contexts)',
]

const NanoGate = ({ nano, onReady }: NanoGateProps) => {
  useEffect(() => {
    if (nano.state === 'ready' && nano.session) {
      onReady?.(nano.session)
    }
  }, [nano.session, nano.state, onReady])

  const isButtonVisible = nano.state === 'need-gesture' || nano.state === 'error'
  const isDownloading = nano.state === 'downloading'
  const isUnavailable = nano.state === 'unavailable'

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">On-device AI access</h2>
        <p className="text-sm text-slate-600">{nano.message}</p>
      </div>

      {isButtonVisible && (
        <button
          type="button"
          onClick={nano.beginSetup}
          className="self-start rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Enable On-device AI
        </button>
      )}

      {isDownloading && (
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Downloading model</span>
            <span>{Math.round(nano.progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-indigo-600 transition-[width]"
              style={{ width: `${Math.min(1, Math.max(0, nano.progress)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {isUnavailable && (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Checklist</p>
          <ul className="space-y-1 text-sm text-slate-600">
            {checklistItems.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default NanoGate
