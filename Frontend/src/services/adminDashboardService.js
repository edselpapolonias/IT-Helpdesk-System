import api from './api'

async function get(path, config) {
  const response = await api.get(path, config)
  return response.data
}

export const adminDashboardService = {
  getSummary: (config) => get('/admin/dashboard/summary/', config),
  getTicketTrends: (days, config = {}) =>
    get('/admin/dashboard/ticket-trends/', {
      ...config,
      params: { days },
    }),
  getTicketCategories: (days, config = {}) =>
    get('/admin/dashboard/ticket-categories/', {
      ...config,
      params: { days },
    }),
  getRecentTickets: (config) =>
    get('/admin/dashboard/recent-tickets/', config),
  getAttention: (config) => get('/admin/dashboard/attention/', config),
  getTechnicianWorkload: (days, config = {}) =>
    get('/admin/dashboard/technician-workload/', {
      ...config,
      params: { days },
    }),
}
