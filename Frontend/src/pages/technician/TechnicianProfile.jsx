import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AccountInformation from '../../components/user/profile/AccountInformation'
import ChangePasswordForm from '../../components/user/profile/ChangePasswordForm'
import PersonalInformationForm from '../../components/user/profile/PersonalInformationForm'
import ProfileHeader from '../../components/user/profile/ProfileHeader'
import ProfilePictureUpload from '../../components/user/profile/ProfilePictureUpload'
import TechnicianProfessionalInfo from '../../components/technician/profile/TechnicianProfessionalInfo'
import { useAuth } from '../../context/useAuth'
import { getApiError } from '../../services/api'
import { technicianProfileService } from '../../services/technicianProfileService'

export default function TechnicianProfile() {
  const navigate = useNavigate()
  const { avatarUrl, syncUser, endSession } = useAuth()
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const [toast, setToast] = useState('')

  const loadProfile = useCallback(async (signal) => {
    setState((current) => ({ ...current, loading: true, error: '' }))
    try {
      const data = await technicianProfileService.get({ signal })
      setState({ data, loading: false, error: '' })
      syncUser(data)
    } catch (error) {
      if (error.code !== 'ERR_CANCELED') {
        setState({ data: null, loading: false, error: getApiError(error, 'Unable to load your technician profile.') })
      }
    }
  }, [syncUser])

  useEffect(() => {
    const controller = new AbortController()
    const task = setTimeout(() => loadProfile(controller.signal), 0)
    return () => {
      clearTimeout(task)
      controller.abort()
    }
  }, [loadProfile])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timeout)
  }, [toast])

  function applyProfile(profile, message) {
    setState({ data: profile, loading: false, error: '' })
    syncUser(profile)
    if (message) setToast(message)
  }

  function passwordChanged(result) {
    endSession()
    navigate('/', {
      replace: true,
      state: { notice: result.detail },
    })
  }

  if (state.loading) {
    return (
      <div className="mx-auto max-w-[1300px] space-y-5" aria-label="Loading technician profile">
        <div className="h-16 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.8fr]"><div className="h-[520px] animate-pulse rounded-lg bg-slate-200" /><div className="h-[520px] animate-pulse rounded-lg bg-slate-200" /></div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-white p-8 text-center">
        <AlertCircle size={24} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-base font-semibold text-slate-900">Unable to load your profile</h2>
        <p className="mt-2 text-sm text-red-700">{state.error}</p>
        <button type="button" onClick={() => loadProfile()} className="mx-auto mt-5 inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><RefreshCw size={15} /> Try again</button>
      </div>
    )
  }

  const profile = state.data

  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Account settings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="mt-1.5 text-sm text-slate-600">Manage your personal information and account security.</p>
      </section>

      <ProfileHeader profile={profile} avatarUrl={avatarUrl} descriptor={profile.specialization_display || 'Specialization not assigned'} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <PersonalInformationForm
            key={`${profile.first_name}-${profile.last_name}-${profile.contact_number}`}
            profile={profile}
            profileService={technicianProfileService}
            onSaved={(updated) => applyProfile(updated, 'Personal information updated successfully.')}
          />
          <TechnicianProfessionalInfo profile={profile} />
          <ChangePasswordForm profileService={technicianProfileService} onChanged={passwordChanged} />
        </div>
        <div className="space-y-6">
          <ProfilePictureUpload
            profile={profile}
            avatarUrl={avatarUrl}
            profileService={technicianProfileService}
            onChanged={applyProfile}
            onToast={setToast}
          />
          <AccountInformation profile={profile} showIdentifier={false} showDepartment={false} />
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[90] flex max-w-sm items-start gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg" role="status">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> {toast}
        </div>
      )}
    </div>
  )
}
