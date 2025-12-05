<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Login</h1>
        
        <!-- Email verification prompt -->
        <div v-if="showVerificationPrompt" class="verification-prompt">
          <h3>Email Verification Required</h3>
          <p>Your email address has not been verified. Please check your inbox for the verification email.</p>
          <button 
            @click="handleResendVerification" 
            class="btn-secondary"
            :disabled="resending"
          >
            {{ resending ? 'Sending...' : 'Resend Verification Email' }}
          </button>
          <p v-if="resendMessage" class="resend-message">{{ resendMessage }}</p>
          <button @click="showVerificationPrompt = false" class="btn-link">
            ← Back to login
          </button>
        </div>

        <form v-else @submit.prevent="handleLogin">
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              id="username"
              v-model="username" 
              type="text" 
              required 
              placeholder="Enter your username"
            />
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password"
              v-model="password" 
              type="password" 
              required 
              placeholder="Enter your password"
            />
          </div>

          <!-- Cloudflare Turnstile -->
          <div v-if="!showTurnstileWarning" class="form-group">
            <div id="turnstile-container"></div>
          </div>
          
          <!-- Development Warning -->
          <div v-if="showTurnstileWarning" class="warning-message">
            ⚠️ Running in development mode without Turnstile bot protection
          </div>

          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" class="btn" :disabled="loading || !canSubmit">
            {{ loading ? 'Logging in...' : (!canSubmit ? 'Waiting for verification...' : 'Login') }}
          </button>
        </form>
        <div v-if="!showVerificationPrompt" class="auth-links">
          <p class="auth-switch">
            Don't have an account? 
            <NuxtLink to="/signup">Sign up here</NuxtLink>
          </p>
          <p class="forgot-password">
            <NuxtLink to="/forgot-password">Forgot your password?</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { login, resendVerification } = useAuth()
const { renderTurnstile, resetTurnstile, removeTurnstile, isConfigured } = useTurnstile()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const turnstileToken = ref('')
const turnstileWidgetId = ref<string>()
const showTurnstileWarning = ref(false)
const turnstileReady = ref(false)
const showVerificationPrompt = ref(false)
const unverifiedEmail = ref('')
const resending = ref(false)
const resendMessage = ref('')

// Computed property to check if form can be submitted
const canSubmit = computed(() => {
  // If Turnstile is not configured (dev mode), allow submission
  if (!isConfigured) {
    return true
  }
  // Otherwise, require a valid token
  return !!turnstileToken.value && turnstileToken.value !== 'dev-bypass-token'
})

onMounted(() => {
  // Show warning if Turnstile is not configured
  if (!isConfigured) {
    showTurnstileWarning.value = true
    turnstileReady.value = true
    // Set a dummy token for development only when not configured
    turnstileToken.value = 'dev-bypass-token'
    return
  }

  // Render Turnstile widget
  renderTurnstile('turnstile-container', (token: string) => {
    turnstileToken.value = token
    turnstileReady.value = true
  }).then((widgetId) => {
    turnstileWidgetId.value = widgetId
  }).catch((err) => {
    console.error('Failed to load Turnstile:', err)
    error.value = 'Failed to load security verification. Please refresh the page.'
  })
})

onUnmounted(() => {
  if (turnstileWidgetId.value) {
    removeTurnstile(turnstileWidgetId.value)
  }
})

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  resendMessage.value = ''

  try {
    const data = await login(username.value, password.value, turnstileToken.value)
    // Redirect directly to user's profile page
    navigateTo(`/profile/${data.user.username}`)
  } catch (err: any) {
    // Check if this is an email verification error
    if (err.code === 'EMAIL_NOT_VERIFIED' && err.email) {
      unverifiedEmail.value = err.email
      showVerificationPrompt.value = true
    } else {
      error.value = err.message || 'Login failed. Please try again.'
    }
    // Reset Turnstile on error - user needs to complete verification again
    if (turnstileWidgetId.value) {
      resetTurnstile(turnstileWidgetId.value)
      turnstileToken.value = ''
      turnstileReady.value = false
    }
  } finally {
    loading.value = false
  }
}

const handleResendVerification = async () => {
  if (!unverifiedEmail.value) return
  
  resending.value = true
  resendMessage.value = ''
  
  try {
    const data = await resendVerification(unverifiedEmail.value)
    resendMessage.value = data.message || 'Verification email sent successfully!'
  } catch (err: any) {
    resendMessage.value = err.message || 'Failed to resend verification email'
  } finally {
    resending.value = false
  }
}
</script>

<style scoped>
.auth-form {
  max-width: 500px;
  margin: 4rem auto;
}

.auth-form h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #007bff;
}

.auth-form button {
  width: 100%;
  margin-top: 1rem;
}

.auth-links {
  margin-top: 1.5rem;
}

.auth-switch {
  text-align: center;
  margin-bottom: 0.5rem;
}

.auth-switch a,
.forgot-password a {
  color: #007bff;
  text-decoration: none;
}

.auth-switch a:hover,
.forgot-password a:hover {
  text-decoration: underline;
}

.forgot-password {
  text-align: center;
  font-size: 14px;
}

#turnstile-container {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.warning-message {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
  padding: 0.75rem;
  border-radius: 4px;
  margin: 1rem 0;
  text-align: center;
  font-size: 14px;
}

.verification-prompt {
  text-align: center;
  padding: 1rem 0;
}

.verification-prompt h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.verification-prompt p {
  margin-bottom: 1rem;
  color: #666;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-link {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 14px;
  margin-top: 1rem;
}

.btn-link:hover {
  text-decoration: underline;
}

.resend-message {
  color: #28a745;
  font-size: 14px;
  margin-top: 0.5rem;
}
</style>
