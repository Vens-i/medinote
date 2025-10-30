import type { Note } from '../types/note'

const DB_NAME = 'medinote'
const STORE_NAME = 'notes'
const DB_VERSION = 1

const hasIndexedDb = () => typeof indexedDB !== 'undefined'

const waitForRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })

const openDatabase = async (): Promise<IDBDatabase> => {
  if (!hasIndexedDb()) {
    throw new Error('IndexedDB not supported in this environment')
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  }
  return waitForRequest(request)
}

export const saveNote = async (note: Note): Promise<Note> => {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  const updated: Note = {
    ...note,
    updatedAt: Date.now(),
  }
  store.put(updated)
  await waitForTransaction(transaction)
  return updated
}

export const loadNote = async (id: string): Promise<Note | undefined> => {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const request = store.get(id)
  const record = await waitForRequest(request)
  await waitForTransaction(transaction)
  return record as Note | undefined
}

export const listNotes = async (): Promise<Note[]> => {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const request = store.getAll()
  const records = ((await waitForRequest(request)) ?? []) as Note[]
  await waitForTransaction(transaction)
  return records.sort((a, b) => b.updatedAt - a.updatedAt)
}

export const deleteNote = async (id: string): Promise<void> => {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  store.delete(id)
  await waitForTransaction(transaction)
}

export const clearNotes = async (): Promise<void> => {
  const db = await openDatabase()
  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  store.clear()
  await waitForTransaction(transaction)
}

export const ensureStorage = async () => {
  await openDatabase()
}
