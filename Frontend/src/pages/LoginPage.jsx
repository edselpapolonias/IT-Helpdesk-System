import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Headset,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getApiError } from '../services/api'
import logo from '../Images/Logo.png'

const CURRENT_YEAR = new Date().getFullYear()

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      navigate('/it-admin/dashboard', { replace: true })
    }
  }, [navigate, user])

  async function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setIsSubmitting(true)

    try {
      await login({
        email: form.get('email'),
        password: form.get('password'),
      })
      const destination = location.state?.from?.pathname
      navigate(
        destination?.startsWith('/it-admin')
          ? destination
          : '/it-admin/dashboard',
        { replace: true },
      )
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to sign in.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="identity-panel" aria-labelledby="system-name">
        <div className="identity-content">
          <img
            className="university-logo"
            src={logo}
            alt="St. Paul University Surigao seal"
          />
          <div className="identity-copy">
            <p className="university-name">St. Paul University Surigao</p>
            <h1 id="system-name">
              IT Helpdesk &amp;
              <span>Technical Support</span>
            </h1>
            <p className="system-description">
              Manage service requests, technical concerns, and campus IT support
              from one secure workspace.
            </p>
          </div>
        </div>

        <div className="support-note">
          <Headset size={19} strokeWidth={1.8} aria-hidden="true" />
          <span>Information Technology Services</span>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="login-heading">
        <div className="login-card">
          <div className="mobile-brand" aria-hidden="true">
            <img src={logo} alt="" />
            <span>SPUS IT Helpdesk</span>
          </div>

          <div className="login-header">
            <h2 id="login-heading">Sign in to your account</h2>
            <p>Enter your administrator account details to continue.</p>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <Mail size={19} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@spus.edu.ph"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockKeyhole size={19} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={19} strokeWidth={1.8} aria-hidden="true" />
                  ) : (
                    <Eye size={19} strokeWidth={1.8} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button className="login-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle size={18} className="login-spinner" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="access-note">
            Authorized personnel only. Contact IT Services if you need access.
          </p>
        </div>

        <p className="copyright">
          &copy; {CURRENT_YEAR} St. Paul University Surigao
        </p>
      </section>
    </main>
  )
}
