import { useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './authContextDefinition'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('sam_admin_user')
    try {
      return storedUser ? JSON.parse(storedUser) : null
    } catch {
      return null
    }
  })
  const [isCheckingSession, setIsCheckingSession] = useState(
    Boolean(localStorage.getItem('sam_admin_token')),
  )

  useEffect(() => {
    const token = localStorage.getItem('sam_admin_token')
    if (!token) return

    let active = true
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!active) return
        if (currentUser.role !== 'ADMIN') {
          throw new Error('Administrator access is required.')
        }
        setUser(currentUser)
        localStorage.setItem('sam_admin_user', JSON.stringify(currentUser))
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem('sam_admin_token')
        localStorage.removeItem('sam_admin_user')
        setUser(null)
      })
      .finally(() => {
        if (active) setIsCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [])

  async function login(credentials) {
    const result = await authService.login(credentials)
    localStorage.setItem('sam_admin_token', result.token)
    localStorage.setItem('sam_admin_user', JSON.stringify(result.user))
    setUser(result.user)
    return result.user
  }

  async function logout() {
    try {
      await authService.logout()
    } finally {
      localStorage.removeItem('sam_admin_token')
      localStorage.removeItem('sam_admin_user')
      setUser(null)
    }
  }

  const value = useMemo(
    () => ({ user, isCheckingSession, login, logout }),
    [user, isCheckingSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
