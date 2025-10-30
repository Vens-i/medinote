import { useEffect, useMemo, useState } from 'react'

export type SoapSection = {
  id: string
  label: string
  content: string
}

export type SoapPreviewProps = {
  sections: SoapSection[]
  initialSectionId?: string
  isCopyingSection?: boolean
  isCopyingAll?: boolean
  emptyMessage?: string
  onCopySection?: (sectionId: string) => void
  onCopyAll?: () => void
}

const DEFAULT_EMPTY_MESSAGE = 'No content yet. Generated SOAP notes will appear here.'

const SoapPreview = ({
  sections,
  initialSectionId,
  isCopyingSection = false,
  isCopyingAll = false,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  onCopySection,
  onCopyAll,
}: SoapPreviewProps) => {
  const firstSection = sections[0]
  const firstSectionId = initialSectionId ?? firstSection?.id ?? 'subjective'
  const [activeId, setActiveId] = useState(firstSectionId)

  useEffect(() => {
    if (!sections.find((section) => section.id === activeId)) {
      setActiveId(firstSectionId)
    }
  }, [activeId, sections, firstSectionId])

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? firstSection,
    [activeId, sections, firstSection],
  )

  const hasContent = sections.some((section) => section.content.trim().length > 0)
  const activeHasContent = Boolean(activeSection?.content.trim())

  return (
    <section
      aria-labelledby="soap-preview-heading"
      className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="soap-preview-heading" className="text-xl font-semibold text-slate-900">
            SOAP Preview
          </h2>
          <p className="text-sm text-slate-500">
            Subjective, Objective, Assessment, Plan summaries update after each generation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeSection) {
                onCopySection?.(activeSection.id)
              }
            }}
            disabled={!activeHasContent || isCopyingSection}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              activeHasContent && !isCopyingSection
                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'border-slate-200 text-slate-400'
            }`}
          >
            {isCopyingSection ? 'Copying…' : 'Copy section'}
          </button>
          <button
            type="button"
            onClick={onCopyAll}
            disabled={!hasContent || isCopyingAll}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              hasContent && !isCopyingAll
                ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'border-slate-200 text-slate-400'
            }`}
          >
            {isCopyingAll ? 'Copying…' : 'Copy all'}
          </button>
        </div>
      </header>

      <nav aria-label="SOAP sections" className="flex gap-2">
        {sections.map((section) => {
          const isActive = section.id === activeId
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(section.id)}
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                isActive
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {section.label}
            </button>
          )
        })}
      </nav>

      <article
        aria-live="polite"
        className="flex-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"
      >
        {activeSection?.content?.trim() || emptyMessage}
      </article>
    </section>
  )
}

export default SoapPreview
