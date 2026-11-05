import api from './api'

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  )
}

export const resolutionService = {
  async resolve(ticketId, payload, attachments = []) {
    const form = new FormData()
    Object.entries(payload).forEach(([key, value]) => form.append(key, value))
    attachments.forEach((file) => form.append('attachments', file))
    const response = await api.post(`/technician/tickets/${ticketId}/resolve/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async completed(params = {}, options = {}) {
    const response = await api.get('/technician/completed/', {
      ...options,
      params: cleanParams(params),
    })
    return response.data
  },

  async statistics(options = {}) {
    const response = await api.get('/technician/completed/statistics/', options)
    return response.data
  },
}
