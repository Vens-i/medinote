export type ShortcutHandlers = {
  onToggleRecord: () => void
  onGenerateSoap: () => void
  onSaveNote: () => void
  allowToggleRecord?: () => boolean
  allowGenerateSoap?: () => boolean
  allowSave?: () => boolean
}

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tag = target.tagName
  if (tag === 'TEXTAREA') {
    return true
  }

  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type
    const nonEditableInputs = ['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'file', 'image']
    return !nonEditableInputs.includes(type)
  }

  return false
}

const shouldHandleSpace = (event: KeyboardEvent): boolean => {
  if (event.repeat) {
    return false
  }
  if (event.code !== 'Space') {
    return false
  }
  return !isEditableElement(event.target)
}

export const registerShortcuts = ({
  onToggleRecord,
  onGenerateSoap,
  onSaveNote,
  allowToggleRecord,
  allowGenerateSoap,
  allowSave,
}: ShortcutHandlers) => {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return
    }

    if (shouldHandleSpace(event) && (allowToggleRecord?.() ?? true)) {
      event.preventDefault()
      onToggleRecord()
      return
    }

    const isModifier = event.metaKey || event.ctrlKey
    if (!isModifier) {
      return
    }

    if (event.key === 'Enter' && (allowGenerateSoap?.() ?? true)) {
      event.preventDefault()
      onGenerateSoap()
      return
    }

    if ((event.key === 's' || event.key === 'S') && (allowSave?.() ?? true)) {
      event.preventDefault()
      onSaveNote()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}
