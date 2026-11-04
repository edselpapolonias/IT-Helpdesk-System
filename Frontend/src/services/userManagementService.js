import api from './api'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null),
  )
}

export const userManagementService = {
  async list(params, config = {}) {
    const response = await api.get('/admin/users/', {
      ...config,
      params: compactParams(params),
    })
    return response.data
  },

  async statistics(config = {}) {
    const response = await api.get('/admin/users/statistics/', config)
    return response.data
  },

  async get(userId, config = {}) {
    const response = await api.get(`/admin/users/${userId}/`, config)
    return response.data
  },

  async create(data) {
    const response = await api.post('/admin/users/', data)
    return response.data
  },

  async update(userId, data) {
    const response = await api.patch(`/admin/users/${userId}/`, data)
    return response.data
  },

  async activate(userId) {
    const response = await api.post(`/admin/users/${userId}/activate/`)
    return response.data
  },

  async deactivate(userId) {
    const response = await api.post(`/admin/users/${userId}/deactivate/`)
    return response.data
  },

  async tickets(userId, config = {}) {
    const response = await api.get(`/admin/users/${userId}/tickets/`, config)
    return response.data
  },

  async setupPassword(data) {
    const response = await api.post('/auth/setup-password/', data)
    return response.data
  },
}
