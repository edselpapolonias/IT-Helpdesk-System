import { Edit3, LoaderCircle, Save, X } from 'lucide-react'
import { useState } from 'react'
import { getProfileFieldErrors, userProfileService } from '../../../services/userProfileService'

function Field({ label, name, value, onChange, error, disabled, type = 'text', note }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`mt-1.5 h-10 w-full rounded-md border px-3 text-sm outline-none transition ${disabled ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500' : error ? 'border-red-300 bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-slate-200 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'}`}
      />
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
      {note && !error && <span className="mt-1 block text-[11px] text-slate-400">{note}</span>}
    </label>
  )
}

export default function PersonalInformationForm({ profile, onSaved, profileService = userProfileService }) {
  const initialForm = {
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    contact_number: profile.contact_number || '',
  }
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', detail: '' }))
  }

  function cancel() {
    setForm(initialForm)
    setErrors({})
    setEditing(false)
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const changed = Object.fromEntries(
        Object.entries(form).filter(([field, value]) => value !== initialForm[field]),
      )
      const result = Object.keys(changed).length
        ? await profileService.update(changed)
        : profile
      onSaved(result)
      setEditing(false)
    } catch (error) {
      setErrors(getProfileFieldErrors(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Personal information</h3>
          <p className="mt-1 text-xs text-slate-500">Keep your name and contact details current.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Edit3 size={15} /> Edit profile
          </button>
        )}
      </div>
      <form onSubmit={submit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {errors.detail && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2" role="alert">
              {errors.detail}
            </div>
          )}
          <Field label="First name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} disabled={!editing} />
          <Field label="Last name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} disabled={!editing} />
          <Field label="Contact number" name="contact_number" type="tel" value={form.contact_number} onChange={handleChange} error={errors.contact_number} disabled={!editing} />
          <Field label="Department / Office" value={profile.department || 'Not specified'} disabled note="Managed by your IT administrator." />
          <div className="sm:col-span-2">
            <Field label="Email address" type="email" value={profile.email} disabled note="Contact your IT administrator if this address needs to change." />
          </div>
        </div>
        {editing && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <button type="button" onClick={cancel} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
              <X size={15} /> Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70">
              {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
