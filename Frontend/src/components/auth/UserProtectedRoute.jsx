import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export default function UserProtectedRoute() {
  const { user, isCheckingSession } = useAuth()
  const location = useLocation()

  if (isCheckingSession) {
    return <main className="grid min-h-screen place-items-center bg-[#f5f7f6]"><div className="flex items-center gap-3 text-sm font-medium text-slate-600"><LoaderCircle className="animate-spin text-emerald-700" size={20} /> Checking your session…</div></main>
  }
  if (!user || user.role !== 'USER') {
    return <Navigate to="/" state={{ from: location }} replace />
  }
  return <Outlet />
}
