import api from './api'

export const userTicketService = {
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
}
