import { lazy, Suspense } from 'react'
import { LoaderCircle } from 'lucide-react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AdminProtectedRoute from './components/auth/AdminProtectedRoute'
import UserProtectedRoute from './components/auth/UserProtectedRoute'
import TechnicianProtectedRoute from './components/auth/TechnicianProtectedRoute'
import AdminLayout from './components/admin/layout/AdminLayout'
import TechnicianLayout from './components/technician/layout/TechnicianLayout'
import UserLayout from './components/user/layout/UserLayout'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const PlaceholderPage = lazy(() => import('./pages/admin/PlaceholderPage'))
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const UserDetailsPage = lazy(() => import('./pages/admin/UserDetailsPage'))
const TechnicianManagement = lazy(() => import('./pages/admin/TechnicianManagement'))
const TechnicianDetailsPage = lazy(() => import('./pages/admin/TechnicianDetailsPage'))
const TicketManagement = lazy(() => import('./pages/admin/TicketManagement'))
const TicketDetailsPage = lazy(() => import('./pages/admin/TicketDetailsPage'))
const TechnicianAssignment = lazy(() => import('./pages/admin/TechnicianAssignment'))
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'))
const SubmitTicket = lazy(() => import('./pages/user/SubmitTicket'))
const MyTickets = lazy(() => import('./pages/user/MyTickets'))
const UserTicketDetailsPage = lazy(() => import('./pages/user/UserTicketDetailsPage'))
const UserProfile = lazy(() => import('./pages/user/UserProfile'))
const PasswordSetupPage = lazy(() => import('./pages/PasswordSetupPage'))
const TechnicianDashboard = lazy(() => import('./pages/technician/TechnicianDashboard'))
const MyAssignedTickets = lazy(() => import('./pages/technician/MyAssignedTickets'))
const TechnicianTicketDetails = lazy(() => import('./pages/technician/TechnicianTicketDetails'))
const TroubleshootingHistory = lazy(() => import('./pages/technician/TroubleshootingHistory'))
const ResolveTicketPage = lazy(() => import('./pages/technician/ResolveTicketPage'))
const CompletedTickets = lazy(() => import('./pages/technician/CompletedTickets'))
const TechnicianProfile = lazy(() => import('./pages/technician/TechnicianProfile'))

function PageLoader() {
  return (
    <div className="grid min-h-56 place-items-center">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <LoaderCircle size={18} className="animate-spin text-emerald-700" />
        Loading page...
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/set-password" element={<PasswordSetupPage />} />

            <Route element={<AdminProtectedRoute />}>
              <Route path="/it-admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="tickets" element={<TicketManagement />} />
              <Route path="tickets/:ticketId" element={<TicketDetailsPage />} />
              <Route path="assignments" element={<TechnicianAssignment />} />
              <Route
                path="users"
                element={<UserManagement />}
              />
              <Route path="users/:userId" element={<UserDetailsPage />} />
              <Route
                path="technicians"
                element={<TechnicianManagement />}
              />
              <Route
                path="technicians/:technicianId"
                element={<TechnicianDetailsPage />}
              />
              <Route
                path="reports"
                element={
                  <PlaceholderPage
                    title="Reports & Analytics"
                    description="Service performance reports and export tools will be implemented here."
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <PlaceholderPage
                    title="Settings"
                    description="Configure helpdesk preferences and account settings from this workspace."
                  />
                }
              />
              <Route
                path="profile"
                element={
                  <PlaceholderPage
                    title="My Profile"
                    description="Review and maintain the signed-in administrator profile here."
                  />
                }
              />
              </Route>
            </Route>

            <Route element={<UserProtectedRoute />}>
              <Route path="/user" element={<UserLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="tickets/new" element={<SubmitTicket />} />
                <Route path="tickets" element={<MyTickets />} />
                <Route path="tickets/:ticketId" element={<UserTicketDetailsPage />} />
                <Route path="profile" element={<UserProfile />} />
              </Route>
            </Route>

            <Route element={<TechnicianProtectedRoute />}>
              <Route path="/technician" element={<TechnicianLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TechnicianDashboard />} />
                <Route path="tickets" element={<MyAssignedTickets />} />
                <Route path="tickets/:ticketId/resolve" element={<ResolveTicketPage />} />
                <Route path="tickets/:ticketId" element={<TechnicianTicketDetails />} />
                <Route path="troubleshooting" element={<TroubleshootingHistory />} />
                <Route path="completed" element={<CompletedTickets />} />
                <Route path="profile" element={<TechnicianProfile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
