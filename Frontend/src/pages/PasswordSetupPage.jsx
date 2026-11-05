import { AlertCircle, CheckCircle2, LoaderCircle, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import logo from '../Images/Logo.png'
import { userManagementService } from '../services/userManagementService'

export default function PasswordSetupPage() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const uid = searchParams.get('uid') || ''
  const token = searchParams.get('token') || ''

  async function submit(event) {
    event.preventDefault()
    setErrors({})
    setIsSubmitting(true)
    try {
      const result = await userManagementService.setupPassword({ uid, token, password, password_confirm: passwordConfirm })
      setSuccess(result.detail)
    } catch (error) {
      const data = error.response?.data
      if (data && typeof data === 'object') {
        setErrors(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.join(' ') : String(value)])))
      } else {
        setErrors({ detail: 'Unable to reach the server.' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f7f6] p-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><img src={logo} alt="St. Paul University Surigao seal" className="h-12 w-12 object-contain" /><div><p className="text-sm font-bold text-[#075b35]">SAM Helpdesk</p><p className="text-xs text-slate-500">Secure account setup</p></div></div>
        {success ? (
          <div className="py-8 text-center"><CheckCircle2 size={42} className="mx-auto text-emerald-600" /><h1 className="mt-4 text-xl font-bold text-slate-900">Password created</h1><p className="mt-2 text-sm leading-6 text-slate-600">{success}</p><p className="mt-2 text-xs leading-5 text-slate-500">You can now sign in to the regular-user support portal.</p><Link to="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-[#075b35] px-5 text-xs font-semibold text-white">Sign in</Link></div>
        ) : (
          <>
            <div className="mt-8"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><LockKeyhole size={20} /></span><h1 className="mt-4 text-xl font-bold text-slate-900">Create your password</h1><p className="mt-2 text-sm leading-6 text-slate-600">Use at least eight characters and avoid common or entirely numeric passwords.</p></div>
            {(!uid || !token || errors.detail) && <div className="mt-5 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={16} className="shrink-0" />{errors.detail || 'This setup link is incomplete.'}</div>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block"><span className="text-xs font-semibold text-slate-700">New password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />{errors.password && <span className="mt-1 block text-[11px] text-red-600">{errors.password}</span>}</label>
              <label className="block"><span className="text-xs font-semibold text-slate-700">Confirm password</span><input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} required autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />{errors.password_confirm && <span className="mt-1 block text-[11px] text-red-600">{errors.password_confirm}</span>}</label>
              <button type="submit" disabled={isSubmitting || !uid || !token} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#075b35] text-sm font-semibold text-white hover:bg-[#06492c] disabled:opacity-60">{isSubmitting && <LoaderCircle size={17} className="animate-spin" />}{isSubmitting ? 'Creating password…' : 'Create password'}</button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}
