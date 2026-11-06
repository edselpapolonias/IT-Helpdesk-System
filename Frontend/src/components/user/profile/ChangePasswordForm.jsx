import { Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { getProfileFieldErrors, userProfileService } from '../../../services/userProfileService'

function PasswordField({ label, name, value, onChange, error, visible, onToggle, autoComplete }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <div className={`mt-1.5 flex h-10 items-center rounded-md border bg-white focus-within:ring-2 ${error ? 'border-red-300 focus-within:border-red-500 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-emerald-600 focus-within:ring-emerald-100'}`}>
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
        />
        <button type="button" onClick={onToggle} className="grid h-full w-10 place-items-center text-slate-400 hover:text-slate-700" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

const emptyForm = {
  current_password: '',
  new_password: '',
  confirm_new_password: '',
}

export default function ChangePasswordForm({ onChanged, profileService = userProfileService }) {
  const [form, setForm] = useState(emptyForm)
  const [visible, setVisible] = useState({})
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '', detail: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const result = await profileService.changePassword(form)
      setForm(emptyForm)
      onChanged(result)
    } catch (error) {
      setErrors(getProfileFieldErrors(error, 'Unable to change your password.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><KeyRound size={17} /></span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Change password</h3>
            <p className="mt-1 text-xs text-slate-500">You will need to sign in again after changing your password.</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit}>
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          {errors.detail && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:col-span-2" role="alert">{errors.detail}</div>}
          <div className="sm:col-span-2">
            <PasswordField label="Current password" name="current_password" value={form.current_password} onChange={handleChange} error={errors.current_password} visible={visible.current_password} onToggle={() => setVisible((current) => ({ ...current, current_password: !current.current_password }))} autoComplete="current-password" />
          </div>
          <PasswordField label="New password" name="new_password" value={form.new_password} onChange={handleChange} error={errors.new_password} visible={visible.new_password} onToggle={() => setVisible((current) => ({ ...current, new_password: !current.new_password }))} autoComplete="new-password" />
          <PasswordField label="Confirm new password" name="confirm_new_password" value={form.confirm_new_password} onChange={handleChange} error={errors.confirm_new_password} visible={visible.confirm_new_password} onToggle={() => setVisible((current) => ({ ...current, confirm_new_password: !current.confirm_new_password }))} autoComplete="new-password" />
          <p className="text-[11px] leading-5 text-slate-500 sm:col-span-2">Use at least 8 characters. Avoid common passwords, personal information, and entirely numeric passwords.</p>
        </div>
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70">
            {saving && <LoaderCircle size={15} className="animate-spin" />}
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </section>
  )
}
