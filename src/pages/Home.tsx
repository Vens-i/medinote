import { useMemo, useState } from 'react'
import AiAvailabilityBanner, { type AiAvailabilityState } from '../components/AiAvailabilityBanner'
import MicPermissionGate, { type MicPermissionState } from '../components/MicPermissionGate'
import NoteEditor from '../components/NoteEditor'
import RecentNotesSidebar, { type RecentNote } from '../components/RecentNotesSidebar'
import SampleLoader, { type SampleItem } from '../components/SampleLoader'
import SoapPreview, { type SoapSection } from '../components/SoapPreview'
import Toolbar from '../components/Toolbar'
import VoiceRecorder, { type VoiceRecorderStatus } from '../components/VoiceRecorder'
import logo from '../assets/logo.svg'

const noop = () => undefined

const soapDefaults: SoapSection[] = [
  {
    id: 'subjective',
    label: 'Subjective',
    content: 'No content yet. Subjective notes from the patient interview will appear here.',
  },
  {
    id: 'objective',
    label: 'Objective',
    content: 'Pending vital signs, physical exam findings, and recent labs will land here.',
  },
  {
    id: 'assessment',
    label: 'Assessment',
    content: 'Diagnostic summary will surface in this section once generated.',
  },
  {
    id: 'plan',
    label: 'Plan',
    content: 'Treatment plan, referrals, and follow up tasks will show up here.',
  },
]

const sampleDictations: SampleItem[] = [
  {
    id: 'sample1',
    title: 'Respiratory follow up',
    description: 'Mild cough without fever, supportive care only.',
  },
  {
    id: 'sample2',
    title: 'Post operative rounding',
    description: 'Incision healing well, continue early mobility.',
  },
  {
    id: 'sample3',
    title: 'Hypertension visit',
    description: 'Stable readings, labs in three months.',
  },
  {
    id: 'sample4',
    title: 'Allergy consult',
    description: 'Seasonal flare, optimize nasal care.',
  },
  {
    id: 'sample5',
    title: 'Ankle sprain exam',
    description: 'Compression wrap and therapy referral.',
  },
]

const seedNotes: RecentNote[] = [
  {
    id: '1',
    title: 'Annual physical template',
    updatedAt: '2 days ago',
    summary: 'Baseline exam outline with vitals placeholder.',
  },
  {
    id: '2',
    title: 'Telehealth allergy visit',
    updatedAt: '5 days ago',
    summary: 'Care plan for seasonal rhinitis follow up.',
  },
  {
    id: '3',
    title: 'Post op progress check',
    updatedAt: '1 week ago',
    summary: 'Observation list for day two surgical recovery.',
  },
]

const Home = () => {
  const [permissionState, setPermissionState] = useState<MicPermissionState>('pre')
  const [recorderStatus, setRecorderStatus] = useState<VoiceRecorderStatus>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [aiStatus] = useState<AiAvailabilityState>('unavailable')

  const handleRequestPermission = () => {
    setPermissionState((current) => (current === 'pre' ? 'granted' : current))
  }

  const handleStartRecording = () => {
    setRecorderStatus('recording')
    setElapsedSeconds(0)
  }

  const handleStopRecording = () => {
    setRecorderStatus('preview')
    setElapsedSeconds((seconds) => seconds || 12)
  }

  const sections = useMemo<SoapSection[]>(() => soapDefaults, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <p className="text-lg font-semibold tracking-tight" aria-label="medinote logo">
            <img src={logo} alt="medinote logo" className="inline h-6 w-6 mr-2 align-middle" />
            medinote
          </p>
          <a
            href="#"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            aria-label="medinote GitHub repository"
          >
            GitHub
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <AiAvailabilityBanner status={aiStatus} onLearnMore={noop} />

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <MicPermissionGate state={permissionState} onRequestPermission={handleRequestPermission} />
            <VoiceRecorder
              status={recorderStatus}
              elapsedSeconds={elapsedSeconds}
              inputLevel={recorderStatus === 'recording' ? 0.4 : 0}
              onRecord={handleStartRecording}
              onStop={handleStopRecording}
              onPlay={noop}
              onDelete={noop}
              onReRecord={() => setRecorderStatus('idle')}
            />
            <Toolbar
              onTranscribe={noop}
              onProofread={noop}
              onGenerateSoap={noop}
              onRewrite={noop}
              onExport={noop}
              onSave={noop}
            />
            <SampleLoader samples={sampleDictations} onLoad={noop} />
          </div>
          <RecentNotesSidebar notes={seedNotes} onSelect={noop} onDelete={noop} onDeleteAll={noop} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <NoteEditor value={transcript} onChange={setTranscript} />
          <SoapPreview sections={sections} onCopySection={noop} onCopyAll={noop} />
        </div>
      </main>
    </div>
  )
}

export default Home
