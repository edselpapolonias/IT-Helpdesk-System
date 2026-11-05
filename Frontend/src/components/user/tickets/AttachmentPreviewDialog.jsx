import { X } from 'lucide-react'

export default function AttachmentPreviewDialog({ preview, onClose }) {
  if (!preview) return null
  const isImage = ['JPG', 'JPEG', 'PNG'].includes(preview.fileType)
  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-slate-950/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Preview ${preview.name}`}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-t-lg bg-white px-4 py-3">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{preview.name}</p><p className="text-[11px] text-slate-400">Private attachment preview</p></div>
        <button type="button" onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close attachment preview"><X size={19} /></button>
      </div>
      <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 place-items-center overflow-auto rounded-b-lg bg-slate-100 p-3">
        {isImage ? <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" /> : <iframe src={preview.url} title={preview.name} sandbox="" className="h-full min-h-[65vh] w-full rounded bg-white" />}
      </div>
    </div>
  )
}
