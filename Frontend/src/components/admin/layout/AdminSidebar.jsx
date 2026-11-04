import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Ticket,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logo from '../../../Images/Logo.png'

const navigation = [
  { label: 'Dashboard', path: '/it-admin/dashboard', icon: LayoutDashboard },
  { label: 'Ticket Management', path: '/it-admin/tickets', icon: Ticket },
  {
    label: 'Technician Assignment',
    path: '/it-admin/assignments',
    icon: ClipboardCheck,
  },
  { label: 'User Management', path: '/it-admin/users', icon: Users },
  {
    label: 'Technician Management',
    path: '/it-admin/technicians',
    icon: UserCog,
  },
  { label: 'Reports & Analytics', path: '/it-admin/reports', icon: BarChart3 },
]

export default function AdminSidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
  onLogout,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-emerald-900/40 bg-[#075b35] text-white transition-[width,transform] duration-200 lg:translate-x-0 ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full'}`}
      >
        <div
          className={`flex h-20 items-center border-b border-white/10 px-5 ${
            collapsed ? 'lg:justify-center lg:px-3' : 'gap-3'
          }`}
        >
          <img className="h-11 w-11 shrink-0 object-contain" src={logo} alt="" />
          <div className={collapsed ? 'lg:hidden' : ''}>
            <p className="text-[15px] font-bold tracking-tight">SAM Helpdesk</p>
            <p className="mt-0.5 text-[11px] text-emerald-100/75">
              IT Support Management
            </p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="ml-auto rounded-md p-2 text-emerald-100 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Admin navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `group flex h-11 items-center rounded-md text-sm font-medium transition-colors ${
                  collapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-white text-[#075b35] shadow-sm'
                    : 'text-emerald-50/85 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={19} strokeWidth={1.9} className="shrink-0" />
              <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`flex h-11 w-full items-center rounded-md text-sm font-medium text-emerald-50/85 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3'
            }`}
          >
            <LogOut size={19} strokeWidth={1.9} />
            <span className={collapsed ? 'lg:hidden' : ''}>Logout</span>
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="hidden h-9 w-full items-center justify-center rounded-md border border-white/10 text-emerald-100 transition-colors hover:bg-white/10 lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  )
}
