import { useCallback, useEffect, useRef, useState } from 'react'
import {
  availability as checkAvailability,
  createSession,
  params as fetchParams,
  type Availability,
  type AvailabilityOptions,
  type CreateOptions,
  type LanguageModelSession,
  type LanguageModelParamsInfo,
  type PromptOptions,
} from './model'

export type NanoSessionState = 'checking' | 'need-gesture' | 'downloading' | 'ready' | 'unavailable' | 'error'

type PromptStreamOptions = {
  signal?: AbortSignal
  onToken?: (chunk: string) => void
}

type NanoSessionOptions = AvailabilityOptions & {
  create?: Omit<CreateOptions, 'expectedInputs' | 'expectedOutputs' | 'monitor'>
}

type HookReturn = {
  state: NanoSessionState
  message: string
  progress: number
  availability: Availability | null
  session: LanguageModelSession | null
  params: LanguageModelParamsInfo | null
  beginSetup: () => Promise<void>
  prompt: (text: string, options?: PromptOptions) => Promise<string>
  promptStream: (text: string, options?: PromptStreamOptions) => Promise<string>
  stop: () => void
  clone: () => Promise<LanguageModelSession>
  destroy: () => Promise<void>
  inputUsage: number | undefined
  inputQuota: number | undefined
}

const DEFAULT_MESSAGE = 'Checking on-device model availability…'

export const useNanoSession = (options?: NanoSessionOptions): HookReturn => {
  const [state, setState] = useState<NanoSessionState>('checking')
  const [message, setMessage] = useState<string>(DEFAULT_MESSAGE)
  const [progress, setProgress] = useState(0)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [session, setSession] = useState<LanguageModelSession | null>(null)
  const [params, setParams] = useState<LanguageModelParamsInfo | null>(null)

  const optionsRef = useRef<AvailabilityOptions>({
    expectedInputs: options?.expectedInputs,
    expectedOutputs: options?.expectedOutputs,
  })
  optionsRef.current.expectedInputs = options?.expectedInputs
  optionsRef.current.expectedOutputs = options?.expectedOutputs
  const sessionRef = useRef<LanguageModelSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const settingUpRef = useRef(false)

  const availabilityOptions: AvailabilityOptions = {
    expectedInputs: optionsRef.current.expectedInputs,
    expectedOutputs: optionsRef.current.expectedOutputs,
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setState('checking')
      setMessage(DEFAULT_MESSAGE)
      const result = await checkAvailability(availabilityOptions)
      if (cancelled) {
        return
      }
      setAvailability(result)
      switch (result) {
        case 'readily':
          setState('need-gesture')
          setMessage('On-device model ready. Click to enable.')
          break
        case 'after-download':
        case 'downloading':
          setState('need-gesture')
          setMessage('On-device model download required. Click to begin.')
          break
        case 'unavailable':
        default:
          setState('unavailable')
          setMessage('On-device model unavailable in this browser.')
          break
      }

      if (result !== 'unavailable') {
        try {
          const modelParams = await fetchParams()
          if (!cancelled) {
            setParams(modelParams)
          }
        } catch (error) {
          console.error('Unable to fetch model params', error)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [availabilityOptions.expectedInputs, availabilityOptions.expectedOutputs])

  const attachAbortController = useCallback(
    (external?: AbortSignal): AbortController => {
      if (abortRef.current && !abortRef.current.signal.aborted) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      if (external) {
        if (external.aborted) {
          controller.abort()
        } else {
          external.addEventListener(
            'abort',
            () => {
              controller.abort()
            },
            { once: true },
          )
        }
      }
      abortRef.current = controller
      return controller
    },
    [],
  )

  const beginSetup = useCallback(async () => {
    if (settingUpRef.current || state === 'downloading' || state === 'ready') {
      return
    }

    if (availability === 'unavailable') {
      setState('unavailable')
      setMessage('On-device model unavailable.')
      return
    }

    const monitor = new EventTarget()
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<{ progress?: number; value?: number; loaded?: number; total?: number }>).detail
      if (detail?.progress != null) {
        setProgress(detail.progress)
        return
      }
      if (detail?.value != null) {
        setProgress(detail.value)
        return
      }
      if (detail?.loaded != null && detail.total) {
        setProgress(Math.min(1, detail.loaded / detail.total))
      }
    }
    monitor.addEventListener('downloadprogress', handleProgress)

    settingUpRef.current = true
    setState('downloading')
    setMessage('Downloading on-device model…')
    setProgress(0)
    try {
      const session = await createSession({
        ...options?.create,
        expectedInputs: availabilityOptions.expectedInputs,
        expectedOutputs: availabilityOptions.expectedOutputs,
        monitor,
      })
      sessionRef.current = session
      setSession(session)
      setState('ready')
      setMessage('On-device model ready.')
      setProgress(1)
    } catch (error) {
      console.error('LanguageModel.create failed', error)
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Unable to create on-device session.')
      setProgress(0)
    } finally {
      monitor.removeEventListener('downloadprogress', handleProgress)
      settingUpRef.current = false
    }
  }, [availability, availabilityOptions.expectedInputs, availabilityOptions.expectedOutputs, options?.create, state])

  const prompt = useCallback(
    async (text: string, promptOptions?: PromptOptions): Promise<string> => {
      const activeSession = sessionRef.current
      if (!activeSession) {
        throw new Error('On-device session not ready.')
      }
      const controller = attachAbortController(promptOptions?.signal)
      try {
        return await activeSession.prompt(text, {
          ...promptOptions,
          signal: controller.signal,
        })
      } finally {
        // Keep controller for potential stop() reuse
      }
    },
    [attachAbortController],
  )

  const promptStream = useCallback(
    async (text: string, streamOptions?: PromptStreamOptions): Promise<string> => {
      const activeSession = sessionRef.current
      if (!activeSession) {
        throw new Error('On-device session not ready.')
      }
      const controller = attachAbortController(streamOptions?.signal)
      const chunks: string[] = []
      try {
        for await (const chunk of activeSession.promptStreaming(text, {
          signal: controller.signal,
        })) {
          if (streamOptions?.onToken) {
            streamOptions.onToken(chunk)
          }
          chunks.push(chunk)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          throw error
        }
        throw error
      }
      return chunks.join('')
    },
    [attachAbortController],
  )

  const stop = useCallback(() => {
    if (!abortRef.current) {
      abortRef.current = new AbortController()
      return
    }
    abortRef.current.abort()
    abortRef.current = new AbortController()
  }, [])

  const clone = useCallback(async () => {
    const activeSession = sessionRef.current
    if (!activeSession) {
      throw new Error('No on-device session to clone.')
    }
    return activeSession.clone()
  }, [])

  const destroy = useCallback(async () => {
    const activeSession = sessionRef.current
    if (!activeSession) {
      return
    }
    try {
      await activeSession.destroy()
    } catch (error) {
      console.warn('Error destroying session', error)
    } finally {
      sessionRef.current = null
      setSession(null)
      setState('need-gesture')
      setMessage('Session destroyed. Click to enable again.')
      setProgress(0)
    }
  }, [])

  return {
    state,
    message,
    progress,
    availability,
    session,
    params,
    beginSetup,
    prompt,
    promptStream,
    stop,
    clone,
    destroy,
    inputUsage: session?.inputUsage,
    inputQuota: session?.inputQuota,
  }
}

export type UseNanoSessionReturn = ReturnType<typeof useNanoSession>
