import api from './api'

function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

async function download(path, filters) {
  const response = await api.get(path, {
    params: cleanParams(filters),
    responseType: 'blob',
    timeout: 60000,
  })
  return response.data
}

export const reportsService = {
  getMetadata: async (config) => {
    const response = await api.get('/admin/reports/metadata/', config)
    return response.data
  },
  getAnalytics: async (filters, config = {}) => {
    const response = await api.get('/admin/reports/analytics/', {
      ...config,
      params: cleanParams(filters),
      timeout: 60000,
    })
    return response.data
  },
  exportCsv: (filters) => download('/admin/reports/export/csv/', filters),
  exportPdf: (filters) => download('/admin/reports/export/pdf/', filters),
}
