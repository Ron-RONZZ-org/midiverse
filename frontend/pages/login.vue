<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Login</h1>
        <form @submit.prevent="handleLogin">
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
          <button type="submit" class="btn" :disabled="loading">
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>
        <p class="auth-switch">
          Don't have an account? 
          <NuxtLink to="/signup">Sign up here</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { login } = useAuth()
const { renderTurnstile, resetTurnstile, removeTurnstile, isConfigured } = useTurnstile()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const turnstileToken = ref('')
const turnstileWidgetId = ref<string>()
const showTurnstileWarning = ref(false)

onMounted(() => {
  // Show warning if Turnstile is not configured
  if (!isConfigured) {
    showTurnstileWarning.value = true
    // Set a dummy token to allow form submission in development
    turnstileToken.value = 'dev-bypass-token'
  }

  // Render Turnstile widget
  renderTurnstile('turnstile-container', (token: string) => {
    turnstileToken.value = token
  }).then((widgetId) => {
    turnstileWidgetId.value = widgetId
  }).catch((err) => {
    console.error('Failed to load Turnstile:', err)
    // Set a dummy token to allow form submission if Turnstile fails
    if (!turnstileToken.value) {
      turnstileToken.value = 'dev-bypass-token'
    }
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

  try {
    const data = await login(username.value, password.value, turnstileToken.value)
    // Redirect directly to user's profile page
    navigateTo(`/profile/${data.user.username}`)
  } catch (err: any) {
    error.value = err.message || 'Login failed. Please try again.'
    // Reset Turnstile on error
    if (turnstileWidgetId.value) {
      resetTurnstile(turnstileWidgetId.value)
      turnstileToken.value = ''
    }
  } finally {
    loading.value = false
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
</style>
