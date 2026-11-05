import api from './api'

async function get(path, config) {
  const response = await api.get(path, config)
  return response.data
}

export const technicianDashboardService = {
  summary: (days, config = {}) => get('/technician/dashboard/summary/', {
    ...config,
    params: { days },
  }),
  recentTickets: (config) => get('/technician/dashboard/recent-tickets/', config),
  attention: (config) => get('/technician/dashboard/attention/', config),
  activity: (config) => get('/technician/dashboard/activity/', config),
}
