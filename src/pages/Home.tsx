import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AiAvailabilityBanner, { type AiAvailabilityState } from '../components/AiAvailabilityBanner'
import MicPermissionGate, { type MicPermissionState } from '../components/MicPermissionGate'
import NoteEditor from '../components/NoteEditor'
import RecentNotesSidebar, { type RecentNote } from '../components/RecentNotesSidebar'
import SampleLoader, { type SampleItem } from '../components/SampleLoader'
import SoapPreview, { type SoapSection } from '../components/SoapPreview'
import Toolbar, { type ExportFormat, type ToolbarMode } from '../components/Toolbar'
import VoiceRecorder, { type RecordingResult } from '../components/VoiceRecorder'
import NanoGate from '../components/NanoGate'
import NanoPlayground from '../components/NanoPlayground'
import { composeSoap, proofread, supportsLocalAI, transcribeAudio } from '../lib/ai/localAi'
import { useNanoSession } from '../lib/nano/useNanoSession'
import { registerShortcuts } from '../lib/shortcuts'
import { clearNotes, deleteNote, listNotes, loadNote, saveNote } from '../lib/storage'
import type { Note, Soap } from '../types/note'
import type { LanguageModelSession } from '../lib/nano/model'

const TRANSCRIPTION_TIMEOUT = 20_000
const PROOFREAD_TIMEOUT = 15_000
const SOAP_TIMEOUT = 20_000
const ON_DEVICE_DOCS_PATH = 'docs/ondevice-ai.md'

type SampleDictation = SampleItem & { path: string }

const sampleDictations: SampleDictation[] = [
  {
    id: 'sample1',
    title: 'Respiratory follow up',
    description: 'Mild cough, supportive care only.',
    path: '/fixtures/sample1.txt',
  },
  {
    id: 'sample2',
    title: 'Post operative rounding',
    description: 'Incision healing, continue mobility.',
    path: '/fixtures/sample2.txt',
  },
  {
    id: 'sample3',
    title: 'Hypertension visit',
    description: 'Stable readings, labs in three months.',
    path: '/fixtures/sample3.txt',
  },
  {
    id: 'sample4',
    title: 'Allergy consult',
    description: 'Seasonal flare, optimize nasal care.',
    path: '/fixtures/sample4.txt',
  },
  {
    id: 'sample5',
    title: 'Ankle sprain exam',
    description: 'Compression wrap and therapy referral.',
    path: '/fixtures/sample5.txt',
  },
]

const createNoteId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `note-${Date.now()}`)

const createEmptyNote = (): Note => ({
  id: createNoteId(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  transcript: '',
  cleaned: undefined,
  soap: undefined,
})

const withoutAudio = (note: Note): Note => ({
  ...note,
  audioBlob: undefined,
  audioBlobUrl: undefined,
})

const formatRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) {
    return 'just now'
  }
  if (diff < hour) {
    const value = Math.round(diff / minute)
    return `${value} min${value === 1 ? '' : 's'} ago`
  }
  if (diff < day) {
    const value = Math.round(diff / hour)
    return `${value} hour${value === 1 ? '' : 's'} ago`
  }
  const value = Math.round(diff / day)
  return `${value} day${value === 1 ? '' : 's'} ago`
}

const toBullets = (lines: string[], fallback: string) =>
  lines.length > 0 ? lines.map((line) => `- ${line}`).join('\n') : fallback

const composeTemplateSoap = (text: string): Soap => {
  const trimmed = text.trim()
  const fallback = '- Pending clinician review.'
  if (!trimmed) {
    return {
      subjective: '- No subjective details captured.',
      objective: '- No objective data documented.',
      assessment: '- Assessment pending clinical review.',
      plan: '- Plan pending documentation.',
    }
  }

  const sentences = trimmed
    .split(/\n|\.|\?|!/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 6)

  const subjective = toBullets(sentences.slice(0, 3), '- Subjective details pending.')
  const objective = '- Objective measurements pending.'
  const assessment = sentences[0]
    ? `- Clinical impression: ${sentences[0]}`
    : '- Assessment pending.'
  const plan = sentences[1]
    ? toBullets([`Plan continues to address ${sentences[1].toLowerCase()}`], fallback)
    : fallback

  return {
    subjective,
    objective,
    assessment,
    plan,
  }
}

const buildSoapSections = (soap: Soap | undefined): SoapSection[] => [
  {
    id: 'subjective',
    label: 'Subjective',
    content: soap?.subjective ?? '',
  },
  {
    id: 'objective',
    label: 'Objective',
    content: soap?.objective ?? '',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    content: soap?.assessment ?? '',
  },
  {
    id: 'plan',
    label: 'Plan',
    content: soap?.plan ?? '',
  },
]

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Please retry.`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const downloadFile = (filename: string, content: BlobPart, type: string) => {
  if (typeof window === 'undefined') {
    return
  }
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const soapToText = (soap: Soap) =>
  ['Subjective', soap.subjective, '', 'Objective', soap.objective, '', 'Assessment', soap.assessment, '', 'Plan', soap.plan]
    .join('\n')
    .trim()

const noteTitle = (note: Note): string => {
  const source = note.transcript?.trim()
  if (!source) {
    return 'Untitled note'
  }
  const firstLine = source.split('\n')[0] ?? source
  return firstLine.slice(0, 60) + (firstLine.length > 60 ? '…' : '')
}

const noteSummary = (note: Note): string | undefined => {
  if (note.soap?.assessment) {
    const firstBullet = note.soap.assessment.split('\n').find((line) => line.startsWith('-'))
    return firstBullet ? firstBullet.replace(/^-\s*/, '') : undefined
  }
  if (note.transcript) {
    return note.transcript.slice(0, 80)
  }
  return undefined
}

const prepareNoteForState = (note: Note): { prepared: Note; recording: RecordingResult | null } => {
  if (note.audioBlob) {
    const url = URL.createObjectURL(note.audioBlob)
    const recording: RecordingResult = {
      blob: note.audioBlob,
      url,
      duration: note.audioDuration ?? 0,
      size: note.audioSize ?? note.audioBlob.size,
    }
    return {
      prepared: {
        ...note,
        audioBlobUrl: url,
      },
      recording,
    }
  }

  return {
    prepared: {
      ...note,
      audioBlobUrl: undefined,
      audioBlob: undefined,
    },
    recording: null,
  }
}

const safeCopy = async (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

const Home = () => {
  const nanoSectionRef = useRef<HTMLDivElement | null>(null)
  const nanoExpectedDescriptors = useMemo(() => [{ type: 'text' as const, languages: ['en'] }], [])
  const nano = useNanoSession({
    expectedInputs: nanoExpectedDescriptors,
    expectedOutputs: nanoExpectedDescriptors,
  })
  const [aiStatus, setAiStatus] = useState<AiAvailabilityState>('warming')
  const [manualOverride, setManualOverride] = useState(false)
  const [micState, setMicState] = useState<MicPermissionState>('pre')
  const [micBusy, setMicBusy] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [recording, setRecording] = useState<RecordingResult | null>(null)
  const [toggleSignal, setToggleSignal] = useState(0)
  const [currentNote, setCurrentNote] = useState<Note>(() => createEmptyNote())
  const [notes, setNotes] = useState<Note[]>([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isProofreading, setIsProofreading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const [toolbarError, setToolbarError] = useState<string | null>(null)
  const [loadingSample, setLoadingSample] = useState(false)
  const [copyingSectionId, setCopyingSectionId] = useState<string | null>(null)
  const [copyingAll, setCopyingAll] = useState(false)

  const mode: ToolbarMode = aiStatus === 'ready' && !manualOverride ? 'ai' : 'manual'

  const handleNanoReady = useCallback((_: LanguageModelSession) => {
    nanoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const refreshAiAvailability = useCallback(() => {
    const available = supportsLocalAI()
    setAiStatus(available ? 'ready' : 'unavailable')
    return available
  }, [])

  useEffect(() => {
    refreshAiAvailability()
  }, [refreshAiAvailability])

  useEffect(() => {
    if (aiStatus !== 'ready') {
      setManualOverride(true)
    }
  }, [aiStatus])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const stored = await listNotes()
        if (cancelled) {
          return
        }
        setNotes(stored.map(withoutAudio))
      } catch (error) {
        console.error('Failed to load notes', error)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => {
    if (recording?.url) {
      URL.revokeObjectURL(recording.url)
    }
  }, [recording?.url])

  const hasTranscript = Boolean(currentNote.transcript?.trim())
  const hasCleaned = Boolean(currentNote.cleaned)
  const hasSoap = Boolean(currentNote.soap)
  const hasRecording = Boolean(recording)

  const soapSections = useMemo(() => buildSoapSections(currentNote.soap), [currentNote.soap])

  const recentNotes: RecentNote[] = useMemo(
    () =>
      notes.map((note) => ({
        id: note.id,
        title: noteTitle(note),
        updatedAt: formatRelativeTime(note.updatedAt),
        summary: noteSummary(note),
      })),
    [notes],
  )

  const handleRequestMicrophone = async () => {
    if (micBusy) {
      return
    }
    setMicBusy(true)
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicState('granted')
    } catch (error) {
      setMicState('denied')
      setMicError(error instanceof Error ? error.message : 'Microphone request was blocked.')
    } finally {
      setMicBusy(false)
    }
  }

  const handleRecordingReady = (result: RecordingResult) => {
    if (recording?.url && recording.url !== result.url) {
      URL.revokeObjectURL(recording.url)
    }
    setRecording(result)
    setCurrentNote((prev) => ({
      ...prev,
      audioBlob: result.blob,
      audioBlobUrl: result.url,
      audioDuration: result.duration,
      audioSize: result.size,
      updatedAt: Date.now(),
      transcript: prev.transcript,
    }))
  }

  const handleRecordingCleared = () => {
    if (recording?.url) {
      URL.revokeObjectURL(recording.url)
    }
    setRecording(null)
    setCurrentNote((prev) => ({
      ...prev,
      audioBlob: undefined,
      audioBlobUrl: undefined,
      audioDuration: undefined,
      audioSize: undefined,
    }))
  }

  const handleTranscriptChange = (value: string) => {
    setCurrentNote((prev) => ({
      ...prev,
      transcript: value,
      cleaned: undefined,
      soap: undefined,
      updatedAt: Date.now(),
    }))
  }

  const runTranscription = useCallback(async () => {
    if (mode === 'manual') {
      setToolbarError('Enable local AI to transcribe recordings.')
      return
    }
    if (!recording) {
      setToolbarError('Record audio before transcribing.')
      return
    }

    setToolbarError(null)
    setIsTranscribing(true)
    try {
      const transcription = await withTimeout(transcribeAudio(recording.blob), TRANSCRIPTION_TIMEOUT, 'Transcription')
      setCurrentNote((prev) => ({
        ...prev,
        transcript: transcription,
        cleaned: undefined,
        soap: undefined,
        updatedAt: Date.now(),
      }))
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Transcription failed.')
    } finally {
      setIsTranscribing(false)
    }
  }, [mode, recording])

  const runProofread = useCallback(async () => {
    if (mode === 'manual') {
      setToolbarError('Proofreader requires local AI. Edit manually instead.')
      return
    }
    if (!hasTranscript) {
      setToolbarError('Add or transcribe text before proofreading.')
      return
    }

    setToolbarError(null)
    setIsProofreading(true)
    try {
      const cleaned = await withTimeout(proofread(currentNote.transcript ?? ''), PROOFREAD_TIMEOUT, 'Proofreader')
      setCurrentNote((prev) => ({
        ...prev,
        transcript: cleaned,
        cleaned,
        soap: undefined,
        updatedAt: Date.now(),
      }))
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Proofreading failed.')
    } finally {
      setIsProofreading(false)
    }
  }, [mode, hasTranscript, currentNote.transcript])

  const runComposeSoap = useCallback(async () => {
    if (!hasTranscript) {
      setToolbarError('Add transcript text before generating SOAP.')
      return
    }

    setToolbarError(null)
    setIsComposing(true)
    try {
      let soap: Soap
      const source = currentNote.cleaned ?? currentNote.transcript ?? ''
      if (mode === 'ai') {
        soap = await withTimeout(composeSoap(source), SOAP_TIMEOUT, 'SOAP composition')
      } else {
        soap = composeTemplateSoap(source)
      }
      setCurrentNote((prev) => ({
        ...prev,
        soap,
        updatedAt: Date.now(),
      }))
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'SOAP generation failed.')
    } finally {
      setIsComposing(false)
    }
  }, [hasTranscript, mode, currentNote.cleaned, currentNote.transcript])

  const handleExport = useCallback((format: ExportFormat) => {
    const soap = currentNote.soap ?? (mode === 'manual' ? composeTemplateSoap(currentNote.transcript ?? '') : undefined)
    if (!soap) {
      setToolbarError('Generate SOAP content before exporting.')
      return
    }
    if (format === 'json') {
      downloadFile('medinote-note.json', JSON.stringify({ ...soap }, null, 2), 'application/json')
    } else {
      downloadFile('medinote-note.pdf', soapToText(soap), 'text/plain')
    }
  }, [currentNote.soap, currentNote.transcript, mode])

  const handleSave = useCallback(async () => {
    try {
      const noteToSave: Note = {
        ...currentNote,
        audioBlob: recording?.blob ?? currentNote.audioBlob,
        audioBlobUrl: recording?.url ?? currentNote.audioBlobUrl,
        audioDuration: recording?.duration ?? currentNote.audioDuration,
        audioSize: recording?.size ?? currentNote.audioSize,
      }
      const saved = await saveNote(noteToSave)
      setCurrentNote(saved)
      setNotes((prev) => {
        const remaining = prev.filter((item) => item.id !== saved.id)
        return [withoutAudio(saved), ...remaining].sort((a, b) => b.updatedAt - a.updatedAt)
      })
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Failed to save note.')
    }
  }, [currentNote, recording])

  const handleSelectNote = async (id: string) => {
    try {
      const loaded = await loadNote(id)
      if (!loaded) {
        return
      }
      if (recording?.url) {
        URL.revokeObjectURL(recording.url)
      }
      const { prepared, recording: hydratedRecording } = prepareNoteForState(loaded)
      setCurrentNote(prepared)
      setRecording(hydratedRecording)
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Unable to load note.')
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id)
      setNotes((prev) => prev.filter((note) => note.id !== id))
      if (currentNote.id === id) {
        handleRecordingCleared()
        setCurrentNote(createEmptyNote())
      }
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Failed to delete note.')
    }
  }

  const handleDeleteAll = async () => {
    try {
      await clearNotes()
      handleRecordingCleared()
      setNotes([])
      setCurrentNote(createEmptyNote())
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Failed to clear notes.')
    }
  }

  const handleLoadSample = async (sampleId: string) => {
    const sample = sampleDictations.find((item) => item.id === sampleId)
    if (!sample) {
      return
    }
    setLoadingSample(true)
    try {
      const response = await fetch(sample.path)
      const text = await response.text()
      setCurrentNote((prev) => ({
        ...prev,
        transcript: text.trim(),
        cleaned: undefined,
        soap: undefined,
        updatedAt: Date.now(),
      }))
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Unable to load sample.')
    } finally {
      setLoadingSample(false)
    }
  }

  const handleCopySection = async (sectionId: string) => {
    const target = soapSections.find((section) => section.id === sectionId)
    if (!target || !target.content.trim()) {
      return
    }
    setCopyingSectionId(sectionId)
    try {
      await safeCopy(target.content)
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Copy failed.')
    } finally {
      setCopyingSectionId(null)
    }
  }

  const handleCopyAll = async () => {
    const soap = currentNote.soap
    if (!soap) {
      return
    }
    setCopyingAll(true)
    try {
      await safeCopy(soapToText(soap))
    } catch (error) {
      setToolbarError(error instanceof Error ? error.message : 'Copy failed.')
    } finally {
      setCopyingAll(false)
    }
  }

  const toggleRecording = useCallback(() => {
    setToggleSignal((value) => value + 1)
  }, [])

  useEffect(() => {
    const unregister = registerShortcuts({
      onToggleRecord: toggleRecording,
      onGenerateSoap: runComposeSoap,
      onSaveNote: handleSave,
      allowToggleRecord: () => micState === 'granted' && !isTranscribing && !isProofreading && !isComposing,
      allowGenerateSoap: () => hasTranscript,
      allowSave: () => hasTranscript || hasRecording || hasSoap,
    })
    return unregister
  }, [toggleRecording, runComposeSoap, handleSave, micState, isTranscribing, isProofreading, isComposing, hasTranscript, hasRecording, hasSoap])

  const manualToggleDisabled = aiStatus !== 'ready'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <p className="text-lg font-semibold tracking-tight" aria-label="medinote logo">
            medinote
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              aria-label="medinote GitHub repository"
            >
              GitHub
            </a>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
              <span>Manual mode</span>
              <button
                type="button"
                onClick={() => setManualOverride((value) => !value)}
                disabled={manualToggleDisabled}
                aria-pressed={mode === 'manual'}
                className={`h-5 w-10 rounded-full p-1 transition ${
                  mode === 'manual' ? 'bg-indigo-600' : 'bg-slate-300'
                } ${manualToggleDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                title={manualToggleDisabled ? 'Local AI unavailable. Manual mode enforced.' : 'Toggle manual fallback mode.'}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition-transform ${
                    mode === 'manual' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <AiAvailabilityBanner
          status={aiStatus}
          docsHref={ON_DEVICE_DOCS_PATH}
          localOnlyTooltip="Inference happens on your device. No protected health information is sent to servers."
          onRefresh={refreshAiAvailability}
        />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <MicPermissionGate
              state={micState}
              busy={micBusy}
              errorMessage={micError}
              onRequestPermission={handleRequestMicrophone}
              onDismissError={() => setMicError(null)}
            />
            <VoiceRecorder
              disabled={micState !== 'granted' || isTranscribing || isProofreading || isComposing}
              recording={recording}
              toggleSignal={toggleSignal}
              onRecordingReady={handleRecordingReady}
              onRecordingCleared={handleRecordingCleared}
              onError={setToolbarError}
            />
            <Toolbar
              mode={mode}
              hasRecording={hasRecording}
              hasTranscript={hasTranscript}
              hasCleaned={hasCleaned}
              hasSoap={hasSoap}
              isTranscribing={isTranscribing}
              isProofreading={isProofreading}
              isComposing={isComposing}
              errorMessage={toolbarError}
              onClearError={() => setToolbarError(null)}
              onTranscribe={runTranscription}
              onProofread={runProofread}
              onGenerateSoap={runComposeSoap}
              onExport={handleExport}
              onSave={handleSave}
            />
            <SampleLoader samples={sampleDictations} onLoad={handleLoadSample} busy={loadingSample} />
          </div>
          <RecentNotesSidebar notes={recentNotes} onSelect={handleSelectNote} onDelete={handleDeleteNote} onDeleteAll={handleDeleteAll} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <NoteEditor value={currentNote.transcript ?? ''} onChange={handleTranscriptChange} />
          <SoapPreview
            sections={soapSections}
            onCopySection={handleCopySection}
            onCopyAll={handleCopyAll}
            isCopyingSection={Boolean(copyingSectionId)}
            isCopyingAll={copyingAll}
          />
        </div>

        <section ref={nanoSectionRef} className="flex flex-col gap-4">
          <NanoGate nano={nano} onReady={handleNanoReady} />
          {nano.state === 'ready' && nano.session ? <NanoPlayground session={nano.session} /> : null}
        </section>
      </main>
    </div>
  )
}

export default Home
