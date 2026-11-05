import api from './api'

function cleanParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  )
}

export const troubleshootingService = {
  async list(params = {}, options = {}) {
    const response = await api.get('/technician/troubleshooting/', {
      ...options,
      params: cleanParams(params),
    })
    return response.data
  },

  async detail(logId, options = {}) {
    const response = await api.get(`/technician/troubleshooting/${logId}/`, options)
    return response.data
  },
}
