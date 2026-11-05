import api from './api'

export const userTicketService = {
  async get(ticketId, config = {}) {
    const response = await api.get(`/user/tickets/${ticketId}/`, config)
    return response.data
  },

  async activity(ticketId, config = {}) {
    const response = await api.get(`/user/tickets/${ticketId}/activity/`, config)
    return response.data
  },

  async resolution(ticketId, config = {}) {
    const response = await api.get(`/user/tickets/${ticketId}/resolution/`, config)
    return response.data
  },

  async list(params = {}, config = {}) {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== 'all'),
    )
    const response = await api.get('/user/tickets/', {
      ...config,
      params: cleanParams,
    })
    return response.data
  },

  async categories(config = {}) {
    const response = await api.get('/ticket-categories/', config)
    return response.data
  },

  async create(values, attachments = []) {
    const form = new FormData()
    Object.entries(values).forEach(([key, value]) => form.append(key, value))
    attachments.forEach((file) => form.append('attachments', file))
    const response = await api.post('/user/tickets/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async downloadAttachment(ticketId, attachmentId) {
    const response = await api.get(
      `/user/tickets/${ticketId}/attachments/${attachmentId}/download/`,
      { responseType: 'blob' },
    )
    return response.data
  },

  async previewAttachment(ticketId, attachmentId) {
    const response = await api.get(
      `/user/tickets/${ticketId}/attachments/${attachmentId}/download/?preview=1`,
      { responseType: 'blob' },
    )
    return response.data
  },

  async confirmResolution(ticketId) {
    const response = await api.post(`/user/tickets/${ticketId}/confirm-resolution/`)
    return response.data
  },

  async requestReopen(ticketId, reason) {
    const response = await api.post(`/user/tickets/${ticketId}/reopen/`, {
      reason,
    })
    return response.data
  },
}
