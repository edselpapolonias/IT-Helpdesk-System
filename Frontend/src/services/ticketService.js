import api from './api'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null && value !== 'all'),
  )
}

export const ticketService = {
  async list(params, config = {}) {
    const response = await api.get('/admin/tickets/', {
      ...config,
      params: compactParams(params),
    })
    return response.data
  },
  async statistics(config = {}) {
    const response = await api.get('/admin/tickets/statistics/', config)
    return response.data
  },
  async categories(config = {}) {
    const response = await api.get('/ticket-categories/', config)
    return response.data
  },
  async get(id, config = {}) {
    const response = await api.get(`/admin/tickets/${id}/`, config)
    return response.data
  },
  async updatePriority(id, data) {
    const response = await api.patch(`/admin/tickets/${id}/priority/`, data)
    return response.data
  },
  async transitionStatus(id, data) {
    const response = await api.post(`/admin/tickets/${id}/status/`, data)
    return response.data
  },
  async history(id, config = {}) {
    const response = await api.get(`/admin/tickets/${id}/history/`, config)
    return response.data
  },
  async troubleshooting(id, config = {}) {
    const response = await api.get(`/admin/tickets/${id}/troubleshooting/`, config)
    return response.data
  },
  async resolutions(id, config = {}) {
    const response = await api.get(`/admin/tickets/${id}/resolutions/`, config)
    return response.data
  },
  async attachments(id, config = {}) {
    const response = await api.get(`/admin/tickets/${id}/attachments/`, config)
    return response.data
  },
  async downloadAttachment(ticketId, attachmentId) {
    const response = await api.get(
      `/admin/tickets/${ticketId}/attachments/${attachmentId}/download/`,
      { responseType: 'blob' },
    )
    return response.data
  },
}
