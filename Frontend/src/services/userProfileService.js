import api from './api'

export const userProfileService = {
  async get(options = {}) {
    const response = await api.get('/user/profile/', options)
    return response.data
  },

  async update(data) {
    const response = await api.patch('/user/profile/', data)
    return response.data
  },

  async getAvatar(options = {}) {
    const response = await api.get('/user/profile/avatar/', {
      ...options,
      responseType: 'blob',
    })
    return response.data
  },

  async uploadAvatar(file) {
    const form = new FormData()
    form.append('avatar', file)
    const response = await api.post('/user/profile/avatar/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async removeAvatar() {
    const response = await api.delete('/user/profile/avatar/')
    return response.data
  },

  async changePassword(data) {
    const response = await api.post('/user/profile/change-password/', data)
    return response.data
  },
}

export function getProfileFieldErrors(error, fallback = 'Unable to save your changes.') {
  const data = error.response?.data
  if (!data || typeof data !== 'object') return { detail: fallback }
  const errors = {}
  Object.entries(data).forEach(([field, value]) => {
    errors[field] = Array.isArray(value) ? value.join(' ') : String(value)
  })
  return Object.keys(errors).length ? errors : { detail: fallback }
}
