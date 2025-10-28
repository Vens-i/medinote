export type SampleItem = {
  id: string
  title: string
  description: string
}

export type SampleLoaderProps = {
  samples: SampleItem[]
  onLoad: (sampleId: string) => void
}

const SampleLoader = ({ samples, onLoad }: SampleLoaderProps) => {
  return (
    <section
      aria-labelledby="sample-loader-heading"
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 id="sample-loader-heading" className="text-xl font-semibold text-slate-900">
          Sample dictations
        </h2>
        <p className="text-sm text-slate-500">
          Use these mock recordings to test medinote end to end once features are ready.
        </p>
      </div>
      <ul className="space-y-3">
        {samples.map((sample) => (
          <li key={sample.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{sample.title}</p>
                <p className="text-sm text-slate-500">{sample.description}</p>
              </div>
              <button
                type="button"
                disabled
                aria-disabled="true"
                onClick={() => onLoad(sample.id)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Load
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default SampleLoader
