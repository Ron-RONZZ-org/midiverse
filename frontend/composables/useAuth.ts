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
    const response = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, turnstileToken }),
    })

    if (!response.ok) {
      const error = await response.json()
      // Throw an error with the full response for the component to handle
      const err = new Error(error.message || 'Login failed')
      ;(err as any).code = error.code
      ;(err as any).email = error.email
      throw err
    }

    const data = await response.json()
    setToken(data.access_token)
    setUser(data.user)
    return data
  }

  const signup = async (email: string, username: string, password: string, turnstileToken?: string) => {
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
  }

  const verifyEmail = async (token: string) => {
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
  }

  const resendVerification = async (email: string) => {
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
  }

  const checkUsername = async (username: string) => {
    const response = await authFetch('/auth/check-username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to check username availability')
    }

    const data = await response.json()
    return data
  }

  const forgotPassword = async (email: string) => {
    const response = await authFetch('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send password reset email')
    }

    const data = await response.json()
    return data
  }

  const resetPassword = async (token: string, password: string) => {
    const response = await authFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reset password')
    }

    const data = await response.json()
    return data
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
    checkUsername,
    forgotPassword,
    resetPassword,
    logout,
  }
}
