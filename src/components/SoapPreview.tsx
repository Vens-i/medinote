import { useMemo, useState } from 'react'

export type SoapSection = {
  id: string
  label: string
  content: string
}

export type SoapPreviewProps = {
  sections: SoapSection[]
  initialSectionId?: string
  onCopySection?: (sectionId: string) => void
  onCopyAll?: () => void
}

const SoapPreview = ({ sections, initialSectionId, onCopySection, onCopyAll }: SoapPreviewProps) => {
  const firstSection = sections[0]
  const firstSectionId = initialSectionId ?? firstSection?.id ?? 'subjective'
  const [activeId, setActiveId] = useState(firstSectionId)

  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? firstSection,
    [activeId, sections, firstSection],
  )

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
            Subjective, Objective, Assessment, Plan in one place. Editing arrives later.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            onClick={() => {
              if (activeSection) {
                onCopySection?.(activeSection.id)
              }
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
          >
            Copy section
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            onClick={onCopyAll}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
          >
            Copy all
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
        {activeSection?.content || 'No content yet. Generated SOAP notes will appear here.'}
      </article>
    </section>
  )
}

export default SoapPreview
