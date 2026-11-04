import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import AdminNavbar from './AdminNavbar'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f5f7f6] text-slate-800">
      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
        onLogout={handleLogout}
      />
      <div
        className={`min-w-0 transition-[margin] duration-200 ${
          collapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        <AdminNavbar
          onMenuOpen={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
