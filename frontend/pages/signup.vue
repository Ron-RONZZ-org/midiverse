<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Sign Up</h1>
        
        <div v-if="verificationPending" class="success-message">
          <h2>✓ Account Created!</h2>
          <p>{{ successMessage }}</p>
          <p>Please check your email and click the verification link to activate your account.</p>
          <div class="resend-section">
            <p>Didn't receive the email?</p>
            <button 
              @click="handleResendVerification" 
              class="btn-secondary"
              :disabled="resending"
            >
              {{ resending ? 'Sending...' : 'Resend Verification Email' }}
            </button>
          </div>
        </div>

        <form v-else @submit.prevent="handleSignup">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email"
              v-model="email" 
              type="email" 
              required 
              placeholder="Enter your email"
            />
          </div>
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              id="username"
              v-model="username" 
              type="text" 
              required 
              minlength="3"
              placeholder="Choose a username"
              @input="debouncedCheckUsername"
            />
            <div v-if="usernameChecking" class="field-status checking">
              Checking availability...
            </div>
            <div v-else-if="usernameStatus === 'available'" class="field-status available">
              ✓ Username is available
            </div>
            <div v-else-if="usernameStatus === 'taken'" class="field-status taken">
              ✗ Username is already taken
            </div>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input 
              id="password"
              v-model="password" 
              type="password" 
              required 
              minlength="6"
              placeholder="Choose a password (min 6 characters)"
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
          <button type="submit" class="btn" :disabled="loading || usernameStatus === 'taken' || usernameChecking || !canSubmit">
            {{ loading ? 'Creating account...' : (!canSubmit ? 'Waiting for verification...' : 'Sign Up') }}
          </button>
        </form>
        <p class="auth-switch">
          Already have an account? 
          <NuxtLink to="/login">Login here</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { signup, resendVerification, checkUsername } = useAuth()
const { renderTurnstile, resetTurnstile, removeTurnstile, isConfigured } = useTurnstile()

const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const turnstileToken = ref('')
const turnstileWidgetId = ref<string>()
const verificationPending = ref(false)
const successMessage = ref('')
const resending = ref(false)
const showTurnstileWarning = ref(false)
const turnstileReady = ref(false)
const usernameChecking = ref(false)
const usernameStatus = ref<'available' | 'taken' | null>(null)

// Computed property to check if form can be submitted
const canSubmit = computed(() => {
  // If Turnstile is not configured (dev mode), allow submission
  if (!isConfigured) {
    return true
  }
  // Otherwise, require a valid token
  return !!turnstileToken.value && turnstileToken.value !== 'dev-bypass-token'
})

let checkUsernameTimeout: ReturnType<typeof setTimeout> | null = null

const debouncedCheckUsername = () => {
  // Clear previous timeout
  if (checkUsernameTimeout) {
    clearTimeout(checkUsernameTimeout)
  }
  
  // Reset status if username is too short
  if (username.value.length < 3) {
    usernameStatus.value = null
    usernameChecking.value = false
    return
  }
  
  // Set a new timeout
  usernameChecking.value = true
  checkUsernameTimeout = setTimeout(async () => {
    try {
      const result = await checkUsername(username.value)
      usernameStatus.value = result.available ? 'available' : 'taken'
    } catch {
      usernameStatus.value = null
    } finally {
      usernameChecking.value = false
    }
  }, 500)
}

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
  if (checkUsernameTimeout) {
    clearTimeout(checkUsernameTimeout)
  }
})

const handleSignup = async () => {
  error.value = ''
  loading.value = true

  try {
    const data = await signup(email.value, username.value, password.value, turnstileToken.value)
    
    // Check if email verification is required
    if (data.message) {
      verificationPending.value = true
      successMessage.value = data.message
    } else if (data.user) {
      // If token is returned (old flow), redirect to profile
      navigateTo(`/profile/${data.user.username}`)
    }
  } catch (err: any) {
    error.value = err.message || 'Signup failed. Please try again.'
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
  if (!email.value) return
  
  error.value = ''
  resending.value = true
  
  try {
    const data = await resendVerification(email.value)
    successMessage.value = data.message || 'Verification email sent successfully!'
  } catch (err: any) {
    error.value = err.message || 'Failed to resend verification email'
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

.auth-switch {
  text-align: center;
  margin-top: 1.5rem;
}

.auth-switch a {
  color: #007bff;
  text-decoration: none;
}

.auth-switch a:hover {
  text-decoration: underline;
}

.success-message {
  text-align: center;
  padding: 2rem;
}

.success-message h2 {
  color: #28a745;
  margin-bottom: 1rem;
}

.success-message p {
  margin: 0.5rem 0;
  color: #666;
}

.resend-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 0.5rem;
}

.btn-secondary:hover {
  background-color: #5a6268;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.field-status {
  font-size: 12px;
  margin-top: 4px;
}

.field-status.checking {
  color: #6c757d;
}

.field-status.available {
  color: #28a745;
}

.field-status.taken {
  color: #dc3545;
}
</style>
