import api from './api'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value != null && value !== 'all'),
  )
}

export const assignmentService = {
  async statistics(config = {}) {
    const response = await api.get('/admin/assignments/statistics/', config)
    return response.data
  },
  async unassigned(params, config = {}) {
    const response = await api.get('/admin/assignments/unassigned/', {
      ...config,
      params: compactParams(params),
    })
    return response.data
  },
  async workloads(config = {}) {
    const response = await api.get('/admin/assignments/workloads/', config)
    return response.data
  },
  async history(params, config = {}) {
    const response = await api.get('/admin/assignments/history/', {
      ...config,
      params: compactParams(params),
    })
    return response.data
  },
  async eligibleTechnicians(ticketId, search = '', config = {}) {
    const response = await api.get('/admin/assignments/eligible-technicians/', {
      ...config,
      params: compactParams({ ticket: ticketId, search }),
    })
    return response.data
  },
  async assign(data) {
    const response = await api.post('/admin/assignments/', data)
    return response.data
  },
  async reassign(data) {
    const response = await api.post('/admin/assignments/reassign/', data)
    return response.data
  },
}
