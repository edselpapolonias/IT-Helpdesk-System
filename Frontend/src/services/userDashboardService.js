import api from './api'

export const userDashboardService = {
  async summary(config = {}) { const response = await api.get('/user/dashboard/summary/', config); return response.data },
  async recentTickets(config = {}) { const response = await api.get('/user/dashboard/recent-tickets/', config); return response.data },
  async recentActivity(config = {}) { const response = await api.get('/user/dashboard/recent-activity/', config); return response.data },
  async ticket(id, config = {}) { const response = await api.get(`/user/tickets/${id}/`, config); return response.data },
}
