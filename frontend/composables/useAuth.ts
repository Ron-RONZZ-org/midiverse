export const useAuth = () => {
  const { authFetch, setToken, setUser, removeToken, removeUser, getUser, getToken } = useApi()

  const isAuthenticated = computed(() => {
    return !!getToken()
  })

  const currentUser = computed(() => {
    return getUser()
  })

  const isContentManager = computed(() => {
    const user = getUser()
    return user && (user.role === 'content_manager' || user.role === 'administrator')
  })

  const isAdministrator = computed(() => {
    const user = getUser()
    return user && user.role === 'administrator'
  })

  const login = async (username: string, password: string, turnstileToken?: string) => {
    try {
      const response = await authFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, turnstileToken }),
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

  const signup = async (email: string, username: string, password: string, turnstileToken?: string) => {
    try {
      const response = await authFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, username, password, turnstileToken }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Signup failed')
      }

      const data = await response.json()
      // Note: signup now returns a message instead of access_token
      // Token is issued after email verification
      if (data.access_token) {
        setToken(data.access_token)
        setUser(data.user)
      }
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed')
    }
  }

  const verifyEmail = async (token: string) => {
    try {
      const response = await authFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Email verification failed')
      }

      const data = await response.json()
      setToken(data.access_token)
      setUser(data.user)
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Email verification failed')
    }
  }

  const resendVerification = async (email: string) => {
    try {
      const response = await authFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to resend verification email')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend verification email')
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
    isContentManager,
    isAdministrator,
    login,
    signup,
    verifyEmail,
    resendVerification,
    logout,
  }
}
