import { useEffect, useMemo, useRef, useState } from 'react'
import { AUDIO_MIME_TYPE, MAX_RECORDING_SECONDS, TARGET_CLIP_SIZE_BYTES } from '../lib/audioPlan'

export type VoiceRecorderStatus = 'idle' | 'recording' | 'preview'

export type RecordingResult = {
  blob: Blob
  url: string
  duration: number
  size: number
}

export type VoiceRecorderProps = {
  disabled?: boolean
  recording: RecordingResult | null
  toggleSignal?: number
  onRecordingReady: (result: RecordingResult) => void
  onRecordingCleared: () => void
  onStatusChange?: (status: VoiceRecorderStatus) => void
  onError?: (message: string) => void
}

const formatTime = (totalSeconds: number) => {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds >= 0 ? totalSeconds : 0
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = Math.floor(safeSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const isMediaRecorderSupported = () =>
  typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'

const VoiceRecorder = ({
  disabled = false,
  recording,
  toggleSignal,
  onRecordingReady,
  onRecordingCleared,
  onStatusChange,
  onError,
}: VoiceRecorderProps) => {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const toggleSignalRef = useRef<number | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const autoStopRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)

  const hasRecording = useMemo(() => Boolean(recording), [recording])

  const setStatusWithNotify = (next: VoiceRecorderStatus) => {
    setStatus(next)
    onStatusChange?.(next)
  }

  const resetLevelTracking = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    analyserRef.current = null
    dataArrayRef.current = null
    setLevel(0)
  }

  const teardownRecorder = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop()
        } catch {
          // ignore stop failures
        }
      }
      mediaRecorderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    chunksRef.current = []
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (autoStopRef.current) {
      window.clearTimeout(autoStopRef.current)
      autoStopRef.current = null
    }
    resetLevelTracking()
  }

  const handleError = (message: string, reason?: unknown) => {
    const detail = reason instanceof Error ? reason.message : reason
    const finalMessage = detail ? `${message}: ${detail}` : message
    setErrorMessage(finalMessage)
    onError?.(finalMessage)
  }

  const setupLevelTracking = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyserRef.current = analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)
      const dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount))
      dataArrayRef.current = dataArray

      const updateLevel = () => {
        const analyserNode = analyserRef.current
        const buffer = dataArrayRef.current
        if (!analyserNode || !buffer) {
          return
        }
        analyserNode.getByteTimeDomainData(buffer as unknown as Uint8Array<ArrayBuffer>)
        let sum = 0
        for (let i = 0; i < buffer.length; i += 1) {
          const value = buffer[i] / 128 - 1
          sum += value * value
        }
        const rms = Math.sqrt(sum / buffer.length)
        setLevel(Math.min(1, rms * 2))
        rafRef.current = requestAnimationFrame(updateLevel)
      }

      rafRef.current = requestAnimationFrame(updateLevel)
    } catch {
      setLevel(0)
    }
  }

  const stopRecording = (discard: boolean) => {
    const recorder = mediaRecorderRef.current
    if (!recorder) {
      return
    }

    const finalize = () => {
      const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
      if (!discard && totalSize > TARGET_CLIP_SIZE_BYTES) {
        handleError('Recording exceeds the local size cap. Please record a shorter clip.')
        chunksRef.current = []
        setStatusWithNotify('idle')
        teardownRecorder()
        onRecordingCleared()
        return
      }

      if (discard) {
        chunksRef.current = []
        setStatusWithNotify('idle')
        teardownRecorder()
        return
      }

      const blob = new Blob(chunksRef.current, { type: AUDIO_MIME_TYPE })
      const url = URL.createObjectURL(blob)
      const duration = elapsedSeconds
      const result: RecordingResult = { blob, url, duration, size: blob.size }
      chunksRef.current = []
      teardownRecorder()
      setStatusWithNotify('preview')
      onRecordingReady(result)
    }

    recorder.onstop = finalize
    try {
      if (recorder.state !== 'inactive') {
        recorder.stop()
      } else {
        finalize()
      }
    } catch (error) {
      handleError('Unable to stop recording', error)
    } finally {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (autoStopRef.current) {
        window.clearTimeout(autoStopRef.current)
        autoStopRef.current = null
      }
      resetLevelTracking()
    }
  }

  const startRecording = async () => {
    if (disabled) {
      return
    }

    setErrorMessage(null)

    if (!isMediaRecorderSupported()) {
      handleError('MediaRecorder not supported in this browser')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setupLevelTracking(stream)

      const recorder = new MediaRecorder(stream, { mimeType: AUDIO_MIME_TYPE })
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      setElapsedSeconds(0)
      setStatusWithNotify('recording')

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.start()

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((seconds) => {
          const next = seconds + 0.25
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording(false)
          }
          return next
        })
      }, 250)

      autoStopRef.current = window.setTimeout(() => {
        stopRecording(false)
      }, MAX_RECORDING_SECONDS * 1000)
    } catch (error) {
      handleError('Unable to access microphone', error)
      teardownRecorder()
      setStatusWithNotify('idle')
    }
  }

  const cancelRecording = () => {
    stopRecording(true)
    setElapsedSeconds(0)
    setStatusWithNotify('idle')
    onRecordingCleared()
  }

  const deleteRecording = () => {
    if (recording?.url) {
      URL.revokeObjectURL(recording.url)
    }
    onRecordingCleared()
    setStatusWithNotify('idle')
    setElapsedSeconds(0)
  }

  const playRecording = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => undefined)
    }
  }

  useEffect(() => {
    if (recording) {
      setStatusWithNotify('preview')
      setElapsedSeconds(recording.duration || 0)
    } else if (status !== 'recording') {
      setStatusWithNotify('idle')
      setElapsedSeconds(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording?.url])

  useEffect(() => {
    if (typeof toggleSignal === 'undefined') {
      return
    }
    if (toggleSignalRef.current === toggleSignal) {
      return
    }
    toggleSignalRef.current = toggleSignal
    if (disabled) {
      return
    }
    if (status === 'recording') {
      stopRecording(false)
    } else {
      void startRecording()
    }
  }, [toggleSignal, disabled, status])

  useEffect(() => () => teardownRecorder(), [])

  const formattedTime = formatTime(elapsedSeconds)
  const levelWidth = `${Math.min(Math.max(level, 0), 1) * 100}%`
  const isRecording = status === 'recording'

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
          {status === 'recording' ? 'Recording' : hasRecording ? 'Preview' : 'Ready'}
        </span>
      </header>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          aria-pressed={isRecording}
          onClick={isRecording ? () => stopRecording(false) : startRecording}
          disabled={disabled}
          className={`h-16 w-56 rounded-full text-lg font-semibold text-white shadow transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
            disabled ? 'cursor-not-allowed bg-slate-400' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
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
          <p className="mt-1 text-xs text-slate-500">On-device meter placeholder. Values stay local.</p>
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {isRecording ? (
          <>
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="rounded-full border border-indigo-200 px-5 py-2 text-sm font-medium text-indigo-700"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={playRecording}
              disabled={!hasRecording || disabled}
              className={`rounded-full border px-5 py-2 text-sm font-medium ${
                hasRecording && !disabled ? 'border-slate-200 text-slate-700' : 'border-slate-100 text-slate-400'
              }`}
            >
              Play
            </button>
            <button
              type="button"
              onClick={deleteRecording}
              disabled={!hasRecording || disabled}
              className={`rounded-full border px-5 py-2 text-sm font-medium ${
                hasRecording && !disabled ? 'border-slate-200 text-slate-700' : 'border-slate-100 text-slate-400'
              }`}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => {
                deleteRecording()
                startRecording()
              }}
              disabled={disabled}
              className={`rounded-full border px-5 py-2 text-sm font-medium ${
                !disabled ? 'border-slate-200 text-slate-700' : 'border-slate-100 text-slate-400'
              }`}
            >
              Re-record
            </button>
          </>
        )}
      </div>

      <audio ref={audioRef} src={recording?.url} className="hidden" aria-hidden="true" />
    </section>
  )
}

export default VoiceRecorder
