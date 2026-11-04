import { LoaderCircle, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { userManagementService } from '../../../services/userManagementService'

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  department: '',
  contact_number: '',
  is_active: true,
}

function fieldErrors(error) {
  const data = error.response?.data
  if (!data || typeof data !== 'object') return { detail: 'Unable to save this user.' }
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value),
    ]),
  )
}

function FormField({ label, name, value, onChange, error, required, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className={`mt-1.5 h-10 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'}`}
      />
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

function UserFormModalContent({ user, onClose, onSaved }) {
  const isEditing = Boolean(user)
  const [form, setForm] = useState(() =>
    user
      ? {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          department: user.department || '',
          contact_number: user.contact_number || '',
          is_active: user.is_active,
        }
      : emptyForm,
  )
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setIsSubmitting(true)
    try {
      let result
      if (isEditing) {
        const changed = Object.fromEntries(
          Object.entries(form)
            .filter(([key]) => key !== 'is_active')
            .filter(([key, value]) => value !== (user[key] ?? '')),
        )
        result = Object.keys(changed).length
          ? await userManagementService.update(user.id, changed)
          : user
      } else {
        result = await userManagementService.create(form)
      }
      onSaved(result, isEditing ? 'updated' : 'created')
    } catch (error) {
      setErrors(fieldErrors(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="user-form-title">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <UserPlus size={20} />
            </span>
            <div>
              <h2 id="user-form-title" className="text-lg font-semibold text-slate-900">{isEditing ? 'Edit user' : 'Add user'}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isEditing ? 'Update account and contact information.' : 'Create a regular user account for IT support access.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close modal">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-5 p-6 sm:grid-cols-2">
            {errors.detail && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2">{errors.detail}</div>
            )}
            <FormField label="First name" name="first_name" value={form.first_name} onChange={handleChange} error={errors.first_name} required />
            <FormField label="Last name" name="last_name" value={form.last_name} onChange={handleChange} error={errors.last_name} required />
            <div className="sm:col-span-2">
              <FormField label="Email address" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} required placeholder="name@example.com" />
            </div>
            <FormField label="Department / Office" name="department" value={form.department} onChange={handleChange} error={errors.department} placeholder="e.g. Registrar's Office" />
            <FormField label="Contact number" name="contact_number" type="tel" value={form.contact_number} onChange={handleChange} error={errors.contact_number} placeholder="e.g. +63 912 345 6789" />

            {!isEditing && (
              <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">Create as active account</span>
                  <span className="mt-1 block text-[11px] leading-5 text-slate-500">The account cannot sign in until the user completes secure password setup.</span>
                </span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-5 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70">
              {isSubmitting && <LoaderCircle size={15} className="animate-spin" />}
              {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function UserFormModal({ open, user, onClose, onSaved }) {
  if (!open) return null
  return (
    <UserFormModalContent
      key={user?.id || 'new-user'}
      user={user}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
