import { CheckCircle2, LockKeyhole, PlayCircle, Plus } from 'lucide-react'

export default function TicketStatusActions({ ticket, onStart, onAddTroubleshooting, onResolve }) {
  if (ticket.access_mode === 'historical') {
    return <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"><LockKeyhole size={17} className="mt-0.5 shrink-0 text-slate-500" /><div><p className="text-xs font-semibold text-slate-700">Historical ticket access</p><p className="mt-1 text-xs leading-5 text-slate-500">You can review this completed ticket, but its status and work notes are read-only.</p></div></div>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ticket.can_start_work && <button type="button" onClick={onStart} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><PlayCircle size={16} /> {ticket.status === 'REOPENED' ? 'Resume Work' : 'Start Work'}</button>}
      {ticket.can_add_troubleshooting && <button type="button" onClick={onAddTroubleshooting} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Plus size={16} /> Add Troubleshooting</button>}
      {ticket.can_resolve && <button type="button" onClick={onResolve} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#075b35] px-4 text-xs font-semibold text-white hover:bg-[#06492c]"><CheckCircle2 size={16} /> Resolve Ticket</button>}
    </div>
  )
}
