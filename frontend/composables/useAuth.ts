export const useAuth = () => {
  const { authFetch, setToken, setUser, removeToken, removeUser, getUser, getToken } = useApi()

  const isAuthenticated = computed(() => {
    return !!getToken()
  })

  const currentUser = computed(() => {
    return getUser()
  })

  const login = async (username: string, password: string) => {
    try {
      const response = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Login failed')
      }

      const data = await response.json()
      setToken(data.access_token)
      setUser(data.user)
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const signup = async (email: string, username: string, password: string) => {
    try {
      const response = await authFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, username, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Signup failed')
      }

      const data = await response.json()
      setToken(data.access_token)
      setUser(data.user)
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed')
    }
  }

  const logout = () => {
    removeToken()
    removeUser()
    navigateTo('/')
  }

  return {
    isAuthenticated,
    currentUser,
    login,
    signup,
    logout,
  }
}
