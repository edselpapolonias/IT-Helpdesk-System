import { Eye, LockKeyhole } from 'lucide-react'

export default function VisibilityBadge({ visibility }) {
  const requesterVisible = visibility === 'REQUESTER_VISIBLE'
  const Icon = requesterVisible ? Eye : LockKeyhole
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${requesterVisible ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-slate-100 text-slate-600 ring-slate-500/15'}`}><Icon size={11} /> {requesterVisible ? 'Requester visible' : 'Internal'}</span>
}
