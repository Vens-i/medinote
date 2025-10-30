export type Availability = 'readily' | 'after-download' | 'downloading' | 'unavailable'

export type LanguageModelIODescriptor = {
  type: 'text'
  languages?: string[]
}

export type AvailabilityOptions = {
  expectedInputs?: LanguageModelIODescriptor[]
  expectedOutputs?: LanguageModelIODescriptor[]
}

export type CreateOptions = {
  temperature?: number
  topK?: number
  signal?: AbortSignal
  initialPrompts?: string[]
  expectedInputs?: LanguageModelIODescriptor[]
  expectedOutputs?: LanguageModelIODescriptor[]
  monitor?: EventTarget
}

export interface LanguageModelParamsInfo {
  temperature?: {
    default: number
    max: number
    min?: number
  }
  topK?: {
    default: number
    max: number
    min?: number
  }
}

export interface PromptOptions {
  signal?: AbortSignal
  responseConstraint?: unknown
  omitResponseConstraintInput?: boolean
}

export interface PromptStreamOptions {
  signal?: AbortSignal
}

export interface LanguageModelSession {
  prompt: (input: string, options?: PromptOptions) => Promise<string>
  promptStreaming: (input: string, options?: PromptStreamOptions) => AsyncIterable<string>
  clone: (options?: { signal?: AbortSignal }) => Promise<LanguageModelSession>
  destroy: () => Promise<void> | void
  inputUsage?: number
  inputQuota?: number
}

interface LanguageModelNamespace {
  availability: (options?: AvailabilityOptions) => Promise<Availability>
  params: () => Promise<LanguageModelParamsInfo>
  create: (options?: CreateOptions) => Promise<LanguageModelSession>
}

declare global {
  interface Window {
    LanguageModel?: LanguageModelNamespace
  }
}

const DEFAULT_DESCRIPTOR: LanguageModelIODescriptor = { type: 'text', languages: ['en'] }

const ensureDescriptors = (descriptors?: LanguageModelIODescriptor[]): LanguageModelIODescriptor[] => {
  if (!descriptors || descriptors.length === 0) {
    return [DEFAULT_DESCRIPTOR]
  }
  return descriptors.map((descriptor) => ({
    type: descriptor.type,
    languages: descriptor.languages?.length ? descriptor.languages : DEFAULT_DESCRIPTOR.languages,
  }))
}

const getNamespace = (): LanguageModelNamespace | undefined => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.LanguageModel
}

export const availability = async (options?: AvailabilityOptions): Promise<Availability> => {
  const ns = getNamespace()
  if (!ns) {
    return 'unavailable'
  }

  try {
    return await ns.availability({
      expectedInputs: ensureDescriptors(options?.expectedInputs),
      expectedOutputs: ensureDescriptors(options?.expectedOutputs),
    })
  } catch (error) {
    console.error('LanguageModel.availability failed', error)
    return 'unavailable'
  }
}

export const params = async (): Promise<LanguageModelParamsInfo | null> => {
  const ns = getNamespace()
  if (!ns) {
    return null
  }
  try {
    return await ns.params()
  } catch (error) {
    console.error('LanguageModel.params failed', error)
    return null
  }
}

export const createSession = async (options?: CreateOptions): Promise<LanguageModelSession> => {
  const ns = getNamespace()
  if (!ns) {
    throw new Error('LanguageModel API unavailable')
  }

  const expectedInputs = ensureDescriptors(options?.expectedInputs)
  const expectedOutputs = ensureDescriptors(options?.expectedOutputs)

  const session = await ns.create({
    temperature: options?.temperature,
    topK: options?.topK,
    signal: options?.signal,
    initialPrompts: options?.initialPrompts,
    expectedInputs,
    expectedOutputs,
    monitor: options?.monitor,
  })

  return session
}
