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
          <div class="form-group">
            <div id="turnstile-container"></div>
          </div>

          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" class="btn" :disabled="loading || !turnstileToken">
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
const { renderTurnstile, resetTurnstile, removeTurnstile } = useTurnstile()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const turnstileToken = ref('')
const turnstileWidgetId = ref<string>()

onMounted(() => {
  // Render Turnstile widget
  renderTurnstile('turnstile-container', (token: string) => {
    turnstileToken.value = token
  }).then((widgetId) => {
    turnstileWidgetId.value = widgetId
  }).catch((err) => {
    console.error('Failed to load Turnstile:', err)
    // Continue without Turnstile if it fails to load
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
</style>
