import api from './api'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  )
}

export const technicianService = {
  async list(params, config = {}) {
    const response = await api.get('/admin/technicians/', {
      ...config,
      params: compactParams(params),
    })
    return response.data
  },
  async statistics(config = {}) {
    const response = await api.get('/admin/technicians/statistics/', config)
    return response.data
  },
  async get(id, config = {}) {
    const response = await api.get(`/admin/technicians/${id}/`, config)
    return response.data
  },
  async create(data) {
    const response = await api.post('/admin/technicians/', data)
    return response.data
  },
  async update(id, data) {
    const response = await api.patch(`/admin/technicians/${id}/`, data)
    return response.data
  },
  async activate(id) {
    const response = await api.post(`/admin/technicians/${id}/activate/`)
    return response.data
  },
  async deactivate(id) {
    const response = await api.post(`/admin/technicians/${id}/deactivate/`)
    return response.data
  },
  async setupLink(id) {
    const response = await api.post(`/admin/technicians/${id}/setup-link/`)
    return response.data
  },
  async tickets(id, config = {}) {
    const response = await api.get(`/admin/technicians/${id}/tickets/`, config)
    return response.data
  },
  async performance(id, days, config = {}) {
    const response = await api.get(`/admin/technicians/${id}/performance/`, {
      ...config,
      params: { days },
    })
    return response.data
  },
}
