import { Construction } from 'lucide-react'

export default function TechnicianPlaceholderPage({ title, description }) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center sm:p-12">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Construction size={22} /></span>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      </section>
    </div>
  )
}
