import { AUDIO_MIME_TYPE, MAX_CLIPS_PER_NOTE, TARGET_CLIP_SIZE_BYTES } from '../audioPlan'
import { PROOFREADER_SYSTEM, SOAP_SECTION_PROMPTS, SOAP_SYSTEM } from './prompts'
import type { Soap } from '../../types/note'

type LocalAiMock = {
  canUse?: () => boolean
  transcribe?: (blob: Blob) => Promise<string>
  proofread?: (text: string) => Promise<string>
  composeSoap?: (text: string) => Promise<Soap>
}

type EnsureResult =
  | { kind: 'mock'; mock: LocalAiMock }
  | { kind: 'native'; ai: any }

declare global {
  interface Window {
    ai?: any
    __MEDINOTE_AI_MOCK__?: LocalAiMock
  }
}

const hasWindow = typeof window !== 'undefined'
const MODEL = 'gemini-nano'

const getMock = (): LocalAiMock | undefined => {
  if (!hasWindow) {
    return undefined
  }
  return window.__MEDINOTE_AI_MOCK__
}

export const supportsLocalAI = (): boolean => {
  if (!hasWindow) {
    return false
  }

  const mock = getMock()
  if (mock && (typeof mock.canUse === 'function' ? mock.canUse() : true)) {
    return true
  }

  const ai = window.ai
  if (!ai) {
    return false
  }

  if (typeof ai.create === 'function' || typeof ai.createTextSession === 'function') {
    const hasProofreader = typeof ai.proofreader?.local === 'function'
    const hasRewriter = typeof ai.rewriter?.local === 'function'
    return hasProofreader && hasRewriter
  }

  return false
}

const ensureLocalOnly = (): EnsureResult => {
  if (!supportsLocalAI()) {
    throw new Error('Local AI unavailable')
  }

  const mock = getMock()
  if (mock && (typeof mock.canUse === 'function' ? mock.canUse() : true)) {
    return { kind: 'mock', mock }
  }

  if (!hasWindow || !window.ai) {
    throw new Error('Local AI runtime missing')
  }

  return { kind: 'native', ai: window.ai }
}

const wrapError = (message: string, error: unknown) => {
  const reason = error instanceof Error ? error.message : String(error)
  return new Error(`${message}: ${reason}`)
}

const ensureRecordingConstraints = (blob: Blob) => {
  if (blob.size > TARGET_CLIP_SIZE_BYTES) {
    throw new Error('Recording exceeds locally allowed size. Please shorten the clip and try again.')
  }

  if (MAX_CLIPS_PER_NOTE !== 1) {
    throw new Error('Unsupported recording configuration.')
  }
}

const createPromptSession = async (ai: any) => {
  const factory =
    typeof ai.create === 'function'
      ? ai.create.bind(ai)
      : typeof ai.createTextSession === 'function'
        ? ai.createTextSession.bind(ai)
        : undefined

  if (!factory) {
    throw new Error('Prompt API session creation unavailable')
  }

  const options = { model: MODEL, device: 'device', mode: 'device' }
  try {
    return await factory(options)
  } catch (error) {
    throw wrapError('Unable to start on-device prompt session', error)
  }
}

const runSessionPrompt = async (session: any, payload: any) => {
  if (typeof session.prompt === 'function') {
    return session.prompt(payload)
  }
  if (typeof session.generate === 'function') {
    return session.generate(payload)
  }
  if (typeof session.run === 'function') {
    return session.run(payload)
  }
  throw new Error('Prompt session missing supported execution method')
}

export const transcribeAudio = async (blob: Blob): Promise<string> => {
  const ensured = ensureLocalOnly()

  ensureRecordingConstraints(blob)

  if (ensured.kind === 'mock') {
    if (!ensured.mock.transcribe) {
      throw new Error('Local AI mock missing transcribe implementation')
    }
    return ensured.mock.transcribe(blob)
  }

  const session = await createPromptSession(ensured.ai)

  try {
    const response = await runSessionPrompt(session, {
      task: 'transcribe',
      input_audio: [{ mime_type: AUDIO_MIME_TYPE, data: blob }],
      format: 'text',
    })
    const text =
      response?.text ??
      response?.output ??
      (typeof response === 'string' ? response : undefined)
    if (!text) {
      throw new Error('No transcription received from local model')
    }
    return String(text).trim()
  } catch (error) {
    throw wrapError('Transcription failed', error)
  } finally {
    session?.destroy?.()
  }
}

export const proofread = async (text: string): Promise<string> => {
  const ensured = ensureLocalOnly()
  if (ensured.kind === 'mock') {
    if (!ensured.mock.proofread) {
      throw new Error('Local AI mock missing proofread implementation')
    }
    return ensured.mock.proofread(text)
  }

  const proofreader = ensured.ai.proofreader?.local
  if (typeof proofreader !== 'function') {
    throw new Error('Proofreader API unavailable')
  }

  try {
    const response = await proofreader({
      text,
      systemPrompt: PROOFREADER_SYSTEM,
      outputStyle: 'concise',
    })
    const cleaned =
      response?.text ??
      response?.output ??
      (typeof response === 'string' ? response : undefined)
    if (!cleaned) {
      throw new Error('No proofread output returned')
    }
    return String(cleaned).trim()
  } catch (error) {
    throw wrapError('Proofreader failed', error)
  }
}

const runRewriter = async (ai: any, text: string, instruction: string) => {
  const rewriter = ai.rewriter?.local
  if (typeof rewriter !== 'function') {
    throw new Error('Rewriter API unavailable')
  }

  const response = await rewriter({
    text,
    systemPrompt: SOAP_SYSTEM,
    instruction,
    format: 'text',
  })

  const output =
    response?.text ??
    response?.output ??
    (typeof response === 'string' ? response : undefined)

  if (!output) {
    throw new Error('No output from local rewriter')
  }

  return String(output).trim()
}

export const composeSoap = async (text: string): Promise<Soap> => {
  const ensured = ensureLocalOnly()
  if (ensured.kind === 'mock') {
    if (!ensured.mock.composeSoap) {
      throw new Error('Local AI mock missing composeSoap implementation')
    }
    return ensured.mock.composeSoap(text)
  }

  try {
    const [subjective, objective, assessment, plan] = await Promise.all([
      runRewriter(ensured.ai, text, SOAP_SECTION_PROMPTS.subjective),
      runRewriter(ensured.ai, text, SOAP_SECTION_PROMPTS.objective),
      runRewriter(ensured.ai, text, SOAP_SECTION_PROMPTS.assessment),
      runRewriter(ensured.ai, text, SOAP_SECTION_PROMPTS.plan),
    ])

    return { subjective, objective, assessment, plan }
  } catch (error) {
    throw wrapError('SOAP composition failed', error)
  }
}
