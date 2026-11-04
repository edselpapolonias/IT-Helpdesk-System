import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sam_admin_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname.startsWith('/it-admin')
    ) {
      localStorage.removeItem('sam_admin_token')
      localStorage.removeItem('sam_admin_user')
      window.location.assign('/')
    }
    return Promise.reject(error)
  },
)

export function getApiError(error, fallback = 'Something went wrong.') {
  if (!error.response) {
    return 'Unable to reach the server. Check that the backend is running.'
  }
  return error.response.data?.detail || fallback
}

export default api
