import { LoaderCircle, UserCog, X } from 'lucide-react'
import { useState } from 'react'
import { technicianService } from '../../../services/technicianService'
import { SPECIALIZATIONS } from './constants'

const emptyForm = { first_name: '', last_name: '', email: '', contact_number: '', specialization: '', is_active: true }

function normalizeErrors(error) {
  const data = error.response?.data
  if (!data || typeof data !== 'object') return { detail: 'Unable to save this technician.' }
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)]))
}

function InputField({ label, name, type = 'text', value, onChange, error, required, placeholder }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-700">{label} {required && <span className="text-red-500">*</span>}</span><input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder} className={`mt-1.5 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'}`} />{error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}</label>
}

function TechnicianFormContent({ technician, onClose, onSaved }) {
  const isEditing = Boolean(technician)
  const [form, setForm] = useState(() => technician ? { first_name: technician.first_name || '', last_name: technician.last_name || '', email: technician.email || '', contact_number: technician.contact_number || '', specialization: technician.specialization || '', is_active: technician.is_active } : emptyForm)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  function change(event) { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value })); setErrors((current) => ({ ...current, [name]: '' })) }
  async function submit(event) {
    event.preventDefault(); setErrors({}); setIsSubmitting(true)
    try {
      let result
      if (isEditing) {
        const changed = Object.fromEntries(Object.entries(form).filter(([key]) => key !== 'is_active').filter(([key, value]) => value !== (technician[key] ?? '')))
        result = Object.keys(changed).length ? await technicianService.update(technician.id, changed) : technician
      } else result = await technicianService.create(form)
      onSaved(result, isEditing ? 'updated' : 'created')
    } catch (error) { setErrors(normalizeErrors(error)) } finally { setIsSubmitting(false) }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="technician-form-title"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
    <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><UserCog size={20} /></span><div><h2 id="technician-form-title" className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit technician' : 'Add technician'}</h2><p className="mt-0.5 text-xs text-slate-500">{isEditing ? 'Update technical profile and contact information.' : 'Register an IT support personnel account.'}</p></div></div><button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100" aria-label="Close modal"><X size={19} /></button></div>
    <form onSubmit={submit}><div className="grid gap-5 p-6 sm:grid-cols-2">{errors.detail && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2">{errors.detail}</div>}<InputField label="First name" name="first_name" value={form.first_name} onChange={change} error={errors.first_name} required /><InputField label="Last name" name="last_name" value={form.last_name} onChange={change} error={errors.last_name} required /><div className="sm:col-span-2"><InputField label="Email address" name="email" type="email" value={form.email} onChange={change} error={errors.email} required placeholder="technician@example.com" /></div><InputField label="Contact number" name="contact_number" type="tel" value={form.contact_number} onChange={change} error={errors.contact_number} placeholder="e.g. +63 912 345 6789" /><label><span className="text-xs font-semibold text-slate-700">Specialization <span className="text-red-500">*</span></span><select name="specialization" value={form.specialization} onChange={change} required className={`mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none ${errors.specialization ? 'border-red-300' : 'border-slate-200 focus:border-emerald-600'}`}><option value="">Select specialization</option>{SPECIALIZATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{errors.specialization && <span className="mt-1 block text-[11px] text-red-600">{errors.specialization}</span>}</label>{!isEditing && <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:col-span-2"><input type="checkbox" name="is_active" checked={form.is_active} onChange={change} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="block text-xs font-semibold text-slate-800">Create as active account</span><span className="mt-1 block text-[11px] leading-5 text-slate-500">Sign-in remains unavailable until secure password setup is complete.</span></span></label>}</div>
      <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700">Cancel</button><button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-5 text-xs font-semibold text-white disabled:opacity-60">{isSubmitting && <LoaderCircle size={15} className="animate-spin" />}{isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create technician'}</button></div>
    </form>
  </div></div>
}

export default function TechnicianFormModal({ open, technician, onClose, onSaved }) {
  if (!open) return null
  return <TechnicianFormContent key={technician?.id || 'new-technician'} technician={technician} onClose={onClose} onSaved={onSaved} />
}
