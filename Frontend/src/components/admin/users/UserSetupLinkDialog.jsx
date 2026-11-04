import { Check, Copy, ExternalLink, Link2, X } from 'lucide-react'
import { useState } from 'react'

export default function UserSetupLinkDialog({ invitation, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!invitation) return null

  async function copyLink() {
    if (!invitation.setup_link) return
    await navigator.clipboard.writeText(invitation.setup_link)
    setCopied(true)
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-labelledby="setup-link-title">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-50 text-amber-700"><Link2 size={21} /></span>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <h2 id="setup-link-title" className="mt-4 text-lg font-semibold text-slate-900">Password setup required</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{invitation.message}</p>
        {invitation.setup_link ? (
          <>
            <div className="mt-4 break-all rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-600">{invitation.setup_link}</div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <a href={invitation.setup_link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ExternalLink size={14} /> Open link</a>
              <button type="button" onClick={copyLink} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#075b35] px-3 text-xs font-semibold text-white hover:bg-[#06492c]">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy setup link'}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Configure an email delivery service before creating production invitations.</div>
        )}
      </div>
    </div>
  )
}
