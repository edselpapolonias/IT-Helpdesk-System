import { Camera, ImageUp, LoaderCircle, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getApiError } from '../../../services/api'
import { userProfileService } from '../../../services/userProfileService'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

function initials(profile) {
  return `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U'
}

export default function ProfilePictureUpload({ profile, avatarUrl, onChanged, onToast, profileService = userProfileService }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function clearSelection() {
    setFile(null)
    setPreviewUrl('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function chooseFile(event) {
    const selected = event.target.files?.[0]
    setError('')
    if (!selected) return
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Choose a JPG or PNG image.')
      event.target.value = ''
      return
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('Profile pictures must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
  }

  async function upload() {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const result = await profileService.uploadAvatar(file)
      onChanged(result.profile)
      clearSelection()
      onToast(result.detail)
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to upload the profile picture.'))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      const result = await profileService.removeAvatar()
      onChanged(result.profile)
      setConfirmRemove(false)
      onToast(result.detail)
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to remove the profile picture.'))
    } finally {
      setBusy(false)
    }
  }

  const displayedAvatar = previewUrl || avatarUrl

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">Profile picture</h3>
      <p className="mt-1 text-xs text-slate-500">Use a clear JPG or PNG image up to 2 MB.</p>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          {displayedAvatar ? (
            <img src={displayedAvatar} alt="Profile preview" className="h-24 w-24 rounded-full border border-slate-200 object-cover" />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-800">
              {initials(profile)}
            </span>
          )}
          <span className="absolute bottom-0 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#075b35] text-white">
            <Camera size={15} />
          </span>
        </div>
        <div className="flex-1">
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={chooseFile} className="sr-only" id="profile-picture-input" />
          <div className="flex flex-wrap gap-2">
            <label htmlFor="profile-picture-input" className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <ImageUp size={15} /> {profile.has_avatar ? 'Replace picture' : 'Choose picture'}
            </label>
            {profile.has_avatar && !file && (
              <button type="button" onClick={() => setConfirmRemove(true)} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                <Trash2 size={15} /> Remove
              </button>
            )}
          </div>
          {file && (
            <div className="mt-3">
              <p className="truncate text-xs font-medium text-slate-600">{file.name}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={upload} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-3 text-xs font-semibold text-white hover:bg-[#06492c] disabled:cursor-wait disabled:opacity-70">
                  {busy && <LoaderCircle size={14} className="animate-spin" />} {busy ? 'Uploading...' : 'Upload picture'}
                </button>
                <button type="button" onClick={clearSelection} disabled={busy} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cancel selected picture">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-xs font-medium text-red-600" role="alert">{error}</p>}
        </div>
      </div>

      {confirmRemove && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="remove-avatar-title">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <h4 id="remove-avatar-title" className="text-base font-semibold text-slate-900">Remove profile picture?</h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">Your initials will be shown in place of your picture.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmRemove(false)} disabled={busy} className="h-9 rounded-md border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={remove} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-70">
                {busy && <LoaderCircle size={14} className="animate-spin" />} Remove picture
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
