import { useCallback, useRef, useState } from 'react'
import type { LanguageModelSession } from '../lib/nano/model'

type NanoPlaygroundProps = {
  session: LanguageModelSession
}

type RunMode = 'idle' | 'prompt' | 'stream' | 'classify'

const BOOLEAN_SCHEMA = { type: 'boolean' }

const NanoPlayground = ({ session }: NanoPlaygroundProps) => {
  const [promptText, setPromptText] = useState('')
  const [output, setOutput] = useState<string>('')
  const [status, setStatus] = useState<string>('Idle')
  const [mode, setMode] = useState<RunMode>('idle')
  const abortRef = useRef<AbortController | null>(null)

  const resetController = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()
    return abortRef.current
  }, [])

  const handleRun = useCallback(async () => {
    if (!promptText.trim()) {
      setStatus('Enter text before prompting.')
      return
    }
    const controller = resetController()
    setMode('prompt')
    setStatus('Running prompt…')
    setOutput('')
    try {
      const result = await session.prompt(promptText, { signal: controller.signal })
      setOutput(result)
      setStatus('Prompt complete.')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatus('Prompt aborted.')
      } else {
        setStatus((error as Error).message ?? 'Prompt failed.')
      }
    } finally {
      setMode('idle')
    }
  }, [promptText, resetController, session])

  const handleStream = useCallback(async () => {
    if (!promptText.trim()) {
      setStatus('Enter text before streaming.')
      return
    }
    const controller = resetController()
    setMode('stream')
    setStatus('Streaming response…')
    setOutput('')
    try {
      for await (const chunk of session.promptStreaming(promptText, { signal: controller.signal })) {
        setOutput((prev) => prev + chunk)
      }
      setStatus('Stream complete.')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatus('Stream aborted.')
      } else {
        setStatus((error as Error).message ?? 'Stream failed.')
      }
    } finally {
      setMode('idle')
    }
  }, [promptText, resetController, session])

  const handleClassify = useCallback(async () => {
    if (!promptText.trim()) {
      setStatus('Enter text before classifying.')
      return
    }
    const controller = resetController()
    setMode('classify')
    setStatus('Running boolean classification…')
    setOutput('')
    try {
      const response = await session.prompt(`Is this post about pottery?\n\n${promptText}`, {
        responseConstraint: BOOLEAN_SCHEMA,
        signal: controller.signal,
      })
      const result = JSON.parse(response) as boolean
      setOutput(`Classification: ${result ? 'Yes' : 'No'}`)
      setStatus('Classification complete.')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setStatus('Classification aborted.')
      } else {
        setStatus((error as Error).message ?? 'Classification failed.')
      }
    } finally {
      setMode('idle')
    }
  }, [promptText, resetController, session])

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
  }, [])

  const busy = mode !== 'idle'
  const usage = session.inputUsage ?? 0
  const quota = session.inputQuota ?? 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-slate-700">
          Prompt
          <textarea
            className="mt-1 h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            placeholder="Ask the on-device model something…"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={busy}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            busy ? 'border-slate-200 text-slate-400' : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Run
        </button>
        <button
          type="button"
          onClick={handleStream}
          disabled={busy}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            busy ? 'border-slate-200 text-slate-400' : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Stream
        </button>
        <button
          type="button"
          onClick={handleClassify}
          disabled={busy}
          className={`rounded-full border px-4 py-2 text-sm font-semibold ${
            busy ? 'border-slate-200 text-slate-400' : 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}
        >
          Boolean Classify
        </button>
        <button
          type="button"
          onClick={handleStop}
          className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          Stop
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700">Status</p>
        <p className="text-sm text-slate-600">{status}</p>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-slate-700">Output</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
          {output || '—'}
        </pre>
      </div>

      <div className="text-xs text-slate-500">
        Input usage: {usage} / {quota || '∞'}
      </div>
    </div>
  )
}

export default NanoPlayground
