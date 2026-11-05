import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'

const pageTitles = [
  ['/user/dashboard', 'My Dashboard'],
  ['/user/tickets/new', 'Submit Ticket'],
  ['/user/tickets', 'My Tickets'],
  ['/user/profile', 'My Profile'],
]

export default function UserNavbar({ onMenuOpen, onLogout }) {
  const { user, avatarUrl } = useAuth()
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState(null)
  const dropdownRef = useRef(null)
  const title = pageTitles.find(([path]) => location.pathname.startsWith(path))?.[1] || 'Support Portal'
  const initials = user?.name?.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  useEffect(() => { function close(event) { if (!dropdownRef.current?.contains(event.target)) setOpenMenu(null) } document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, [])

  return <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={onMenuOpen} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden" aria-label="Open navigation menu"><Menu size={20} /></button><div className="min-w-0"><p className="hidden text-xs font-medium text-slate-400 sm:block">Regular User</p><h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">{title}</h1></div></div><div ref={dropdownRef} className="relative flex items-center gap-2 sm:gap-3"><div className="relative"><button type="button" onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifications" aria-expanded={openMenu === 'notifications'}><Bell size={19} /></button>{openMenu === 'notifications' && <div className="absolute right-0 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"><p className="text-sm font-semibold text-slate-900">Notifications</p><div className="mt-4 rounded-md bg-slate-50 px-4 py-5 text-center"><Bell className="mx-auto text-slate-300" size={22} /><p className="mt-2 text-xs font-medium text-slate-600">No notifications yet</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Notification delivery will appear here when that system is introduced.</p></div></div>}</div><div className="relative"><button type="button" onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} className="flex h-11 items-center gap-2 rounded-md px-1.5 text-left hover:bg-slate-50 sm:gap-3 sm:pr-2" aria-label="Open profile menu" aria-expanded={openMenu === 'profile'}>{avatarUrl ? <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{initials || 'US'}</span>}<span className="hidden max-w-40 sm:block"><span className="block truncate text-sm font-semibold text-slate-800">{user?.name}</span><span className="block text-[11px] text-slate-500">Support requester</span></span><ChevronDown size={15} className="hidden text-slate-400 sm:block" /></button>{openMenu === 'profile' && <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 shadow-xl"><div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div><Link to="/user/profile" onClick={() => setOpenMenu(null)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"><UserRound size={17} /> My Profile</Link><button type="button" onClick={onLogout} className="mt-1 flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"><LogOut size={17} /> Logout</button></div>}</div></div></header>
}
