import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-8 sm:p-12">
      <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
        <Construction size={23} />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  )
}
