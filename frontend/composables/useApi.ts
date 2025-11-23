// Create reactive state for auth
const authState = ref<{
  token: string | null
  user: any | null
}>({
  token: null,
  user: null
})

// Initialize auth state from localStorage on client side
if (process.client) {
  authState.value = {
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  }
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  // Get auth token from reactive state
  const getToken = () => {
    return authState.value.token
  }

  // Set auth token
  const setToken = (token: string) => {
    authState.value.token = token
    if (process.client) {
      localStorage.setItem('token', token)
    }
  }

  // Remove auth token
  const removeToken = () => {
    authState.value.token = null
    if (process.client) {
      localStorage.removeItem('token')
    }
  }

  // Get current user
  const getUser = () => {
    return authState.value.user
  }

  // Set user
  const setUser = (user: any) => {
    authState.value.user = user
    if (process.client) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  }

  // Remove user
  const removeUser = () => {
    authState.value.user = null
    if (process.client) {
      localStorage.removeItem('user')
    }
  }

  // Make authenticated request
  const authFetch = async (url: string, options: any = {}) => {
    const token = getToken()
    const headers: any = {
      ...options.headers,
    }

    // Only set Content-Type if body is not FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
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
