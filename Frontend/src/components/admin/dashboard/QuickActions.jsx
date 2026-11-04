import { BarChart3, Ticket, UserCog, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'

const actions = [
  {
    title: 'Add user',
    description: 'Create a regular user account.',
    icon: UserPlus,
    href: '/it-admin/users?action=create',
  },
  {
    title: 'Add technician',
    description: 'Register a technician account.',
    icon: UserCog,
    href: '/it-admin/technicians?action=create',
  },
  {
    title: 'Manage tickets',
    description: 'Review and update helpdesk tickets.',
    icon: Ticket,
    href: '/it-admin/tickets',
  },
  {
    title: 'Generate report',
    description: 'Open reports and service analytics.',
    icon: BarChart3,
    href: '/it-admin/reports',
  },
]

export default function QuickActions() {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">Quick actions</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map(({ title, description, icon: Icon, href }) => (
          <Link
            key={title}
            to={href}
            className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100">
              <Icon size={19} />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-800">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
