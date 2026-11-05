import api from './api'

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  )
}

export const technicianTicketService = {
  async list(params, options = {}) {
    const response = await api.get('/technician/tickets/', {
      ...options,
      params: cleanParams(params),
    })
    return response.data
  },

  async statistics(options = {}) {
    const response = await api.get('/technician/tickets/statistics/', options)
    return response.data
  },

  async detail(ticketId, options = {}) {
    const response = await api.get(`/technician/tickets/${ticketId}/`, options)
    return response.data
  },

  async startWork(ticketId) {
    const response = await api.post(`/technician/tickets/${ticketId}/start-work/`)
    return response.data
  },

  async history(ticketId, options = {}) {
    const response = await api.get(`/technician/tickets/${ticketId}/history/`, options)
    return response.data
  },

  async attachments(ticketId, options = {}) {
    const response = await api.get(`/technician/tickets/${ticketId}/attachments/`, options)
    return response.data
  },

  async attachmentFile(ticketId, attachmentId, preview = false) {
    const response = await api.get(
      `/technician/tickets/${ticketId}/attachments/${attachmentId}/download/`,
      { params: preview ? { preview: 1 } : {}, responseType: 'blob' },
    )
    return response.data
  },

  async troubleshooting(ticketId, options = {}) {
    const response = await api.get(`/technician/tickets/${ticketId}/troubleshooting/`, options)
    return response.data
  },

  async addTroubleshooting(ticketId, payload, attachments = []) {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => form.append(key, value))
    attachments.forEach((file) => form.append('attachments', file))
    const response = await api.post(`/technician/tickets/${ticketId}/troubleshooting/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async resolutions(ticketId, options = {}) {
    const response = await api.get(`/technician/tickets/${ticketId}/resolutions/`, options)
    return response.data
  },

  async categories(options = {}) {
    const response = await api.get('/ticket-categories/', options)
    return response.data
  },
}
