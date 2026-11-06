import api from './api'

export const technicianProfileService = {
  async get(options = {}) {
    const response = await api.get('/technician/profile/', options)
    return response.data
  },

  async update(data) {
    const response = await api.patch('/technician/profile/', data)
    return response.data
  },

  async getAvatar(options = {}) {
    const response = await api.get('/technician/profile/avatar/', {
      ...options,
      responseType: 'blob',
    })
    return response.data
  },

  async uploadAvatar(file) {
    const form = new FormData()
    form.append('avatar', file)
    const response = await api.post('/technician/profile/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async removeAvatar() {
    const response = await api.delete('/technician/profile/avatar/')
    return response.data
  },

  async changePassword(data) {
    const response = await api.post('/technician/profile/change-password/', data)
    return response.data
  },
}
