import { FileText, Paperclip, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

const MAX_FILES = 5
const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf']

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileError(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `${file.name}: only JPG, PNG, and PDF files are allowed.`
  }
  if (file.size > MAX_SIZE) return `${file.name}: files must not exceed 10 MB.`
  if (!file.size) return `${file.name}: the file is empty.`
  return ''
}

export default function TicketAttachmentUpload({ files, onChange, error }) {
  const inputRef = useRef(null)
  const [localError, setLocalError] = useState('')

  function addFiles(fileList) {
    const incoming = Array.from(fileList)
    if (files.length + incoming.length > MAX_FILES) {
      setLocalError(`You can attach up to ${MAX_FILES} files.`)
      return
    }
    const validationError = incoming.map(fileError).find(Boolean)
    if (validationError) {
      setLocalError(validationError)
      return
    }
    setLocalError('')
    onChange([...files, ...incoming])
  }

  function handleInput(event) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">Attachments</label>
        <span className="text-[11px] text-slate-400">Optional</span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files)
        }}
        className="mt-2 flex w-full flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition hover:border-emerald-600 hover:bg-emerald-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/25"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200">
          <UploadCloud size={19} />
        </span>
        <span className="mt-3 text-sm font-semibold text-slate-700">
          Choose files or drop them here
        </span>
        <span className="mt-1 text-xs text-slate-500">
          JPG, PNG, or PDF · up to 10 MB each · maximum 5 files
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={handleInput}
        className="sr-only"
      />

      {(localError || error) && (
        <p className="mt-2 text-xs font-medium text-red-600">{localError || error}</p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}-${index}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <FileText size={17} className="shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{file.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLocalError('')
                  onChange(files.filter((_, fileIndex) => fileIndex !== index))
                }}
                className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Remove ${file.name}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
        <Paperclip size={12} /> Avoid uploading passwords or other confidential credentials.
      </p>
    </div>
  )
}
