import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { userProfileService } from '../services/userProfileService'
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
  const [avatarUrl, setAvatarUrl] = useState('')

  const syncUser = useCallback((nextUser) => {
    setUser((currentUser) => {
      const mergedUser = currentUser ? { ...currentUser, ...nextUser } : nextUser
      localStorage.setItem('sam_admin_user', JSON.stringify(mergedUser))
      return mergedUser
    })
  }, [])

  const endSession = useCallback(() => {
    localStorage.removeItem('sam_admin_token')
    localStorage.removeItem('sam_admin_user')
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const currentUser = await authService.getCurrentUser()
    syncUser(currentUser)
    return currentUser
  }, [syncUser])

  useEffect(() => {
    const token = localStorage.getItem('sam_admin_token')
    if (!token) return

    let active = true
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!active) return
        if (!['ADMIN', 'USER', 'TECHNICIAN'].includes(currentUser.role)) {
          throw new Error('This account does not have an available portal.')
        }
        syncUser(currentUser)
      })
      .catch(() => {
        if (!active) return
        endSession()
      })
      .finally(() => {
        if (active) setIsCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [endSession, syncUser])

  useEffect(() => {
    if (!user?.has_avatar) {
      return undefined
    }

    const controller = new AbortController()
    let objectUrl = ''
    userProfileService
      .getAvatar({ signal: controller.signal })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setAvatarUrl(objectUrl)
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setAvatarUrl('')
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [user?.avatar_version, user?.has_avatar])

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials)
    localStorage.setItem('sam_admin_token', result.token)
    syncUser(result.user)
    return result.user
  }, [syncUser])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      endSession()
    }
  }, [endSession])

  const visibleAvatarUrl = user?.has_avatar ? avatarUrl : ''

  const value = useMemo(
    () => ({
      user,
      avatarUrl: visibleAvatarUrl,
      isCheckingSession,
      login,
      logout,
      syncUser,
      refreshUser,
      endSession,
    }),
    [user, visibleAvatarUrl, isCheckingSession, login, logout, syncUser, refreshUser, endSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
