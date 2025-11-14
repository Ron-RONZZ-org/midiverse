export const useApi = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  // Get auth token from localStorage
  const getToken = () => {
    if (process.client) {
      return localStorage.getItem('token')
    }
    return null
  }

  // Set auth token
  const setToken = (token: string) => {
    if (process.client) {
      localStorage.setItem('token', token)
    }
  }

  // Remove auth token
  const removeToken = () => {
    if (process.client) {
      localStorage.removeItem('token')
    }
  }

  // Get current user from token
  const getUser = () => {
    if (process.client) {
      const userStr = localStorage.getItem('user')
      return userStr ? JSON.parse(userStr) : null
    }
    return null
  }

  // Set user
  const setUser = (user: any) => {
    if (process.client) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  // Remove user
  const removeUser = () => {
    if (process.client) {
      localStorage.removeItem('user')
    }
  }

  // Make authenticated request
  const authFetch = async (url: string, options: any = {}) => {
    const token = getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${apiBase}${url}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      // Token expired or invalid
      removeToken()
      removeUser()
      navigateTo('/login')
    }

    return response
  }

  return {
    apiBase,
    getToken,
    setToken,
    removeToken,
    getUser,
    setUser,
    removeUser,
    authFetch,
  }
}
