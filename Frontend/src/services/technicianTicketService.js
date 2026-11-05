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

  async categories(options = {}) {
    const response = await api.get('/ticket-categories/', options)
    return response.data
  },
}
