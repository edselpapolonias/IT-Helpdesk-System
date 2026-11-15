import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const pageTitles = [
  { pattern: /^\/$/, title: 'Sign In' },
  { pattern: /^\/login\/?$/, title: 'Sign In' },
  { pattern: /^\/set-password\/?$/, title: 'Set Password' },

  { pattern: /^\/it-admin\/?$/, title: 'IT Admin Dashboard' },
  { pattern: /^\/it-admin\/dashboard\/?$/, title: 'IT Admin Dashboard' },
  { pattern: /^\/it-admin\/tickets\/?$/, title: 'Ticket Management' },
  { pattern: /^\/it-admin\/tickets\/[^/]+\/?$/, title: 'Ticket Details' },
  { pattern: /^\/it-admin\/assignments\/?$/, title: 'Technician Assignment' },
  { pattern: /^\/it-admin\/users\/?$/, title: 'User Management' },
  { pattern: /^\/it-admin\/users\/[^/]+\/?$/, title: 'User Details' },
  { pattern: /^\/it-admin\/technicians\/?$/, title: 'Technician Management' },
  { pattern: /^\/it-admin\/technicians\/[^/]+\/?$/, title: 'Technician Details' },
  { pattern: /^\/it-admin\/reports\/?$/, title: 'Reports & Analytics' },
  { pattern: /^\/it-admin\/settings\/?$/, title: 'Settings' },
  { pattern: /^\/it-admin\/profile\/?$/, title: 'Administrator Profile' },

  { pattern: /^\/user\/?$/, title: 'User Dashboard' },
  { pattern: /^\/user\/dashboard\/?$/, title: 'User Dashboard' },
  { pattern: /^\/user\/tickets\/new\/?$/, title: 'Submit Ticket' },
  { pattern: /^\/user\/tickets\/?$/, title: 'My Tickets' },
  { pattern: /^\/user\/tickets\/[^/]+\/?$/, title: 'Ticket Details' },
  { pattern: /^\/user\/profile\/?$/, title: 'My Profile' },

  { pattern: /^\/technician\/?$/, title: 'Technician Dashboard' },
  { pattern: /^\/technician\/dashboard\/?$/, title: 'Technician Dashboard' },
  { pattern: /^\/technician\/tickets\/?$/, title: 'Assigned Tickets' },
  { pattern: /^\/technician\/tickets\/[^/]+\/resolve\/?$/, title: 'Resolve Ticket' },
  { pattern: /^\/technician\/tickets\/[^/]+\/?$/, title: 'Ticket Details' },
  { pattern: /^\/technician\/troubleshooting\/?$/, title: 'Troubleshooting History' },
  { pattern: /^\/technician\/completed\/?$/, title: 'Completed Work' },
  { pattern: /^\/technician\/profile\/?$/, title: 'Technician Profile' },
]

function getPageTitle(pathname) {
  return pageTitles.find(({ pattern }) => pattern.test(pathname))?.title || 'IT Helpdesk'
}

export default function PageMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = `${getPageTitle(pathname)} | SPUS IT Helpdesk`
  }, [pathname])

  return null
}
