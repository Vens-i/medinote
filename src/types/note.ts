export type Soap = {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export type Note = {
  id: string
  createdAt: number
  updatedAt: number
  audioBlob?: Blob
  audioBlobUrl?: string
  audioDuration?: number
  audioSize?: number
  transcript?: string
  cleaned?: string
  soap?: Soap
}
