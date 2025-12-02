<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Reset Password</h1>
        
        <div v-if="!token" class="error-message">
          <h2>Invalid Link</h2>
          <p>This password reset link is invalid or missing a token.</p>
          <NuxtLink to="/forgot-password" class="btn-link">Request a new reset link</NuxtLink>
        </div>

        <div v-else-if="resetComplete" class="success-message">
          <h2>✓ Password Reset!</h2>
          <p>{{ successMessage }}</p>
          <NuxtLink to="/login" class="btn">Go to Login</NuxtLink>
        </div>

        <form v-else @submit.prevent="handleResetPassword">
          <p class="form-description">
            Enter your new password below.
          </p>
          <div class="form-group">
            <label for="password">New Password</label>
            <input 
              id="password"
              v-model="password" 
              type="password" 
              required 
              minlength="6"
              placeholder="Enter new password (min 6 characters)"
            />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input 
              id="confirmPassword"
              v-model="confirmPassword" 
              type="password" 
              required 
              minlength="6"
              placeholder="Confirm your new password"
            />
          </div>

          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" class="btn" :disabled="loading">
            {{ loading ? 'Resetting...' : 'Reset Password' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { resetPassword } = useAuth()
const route = useRoute()

const token = computed(() => route.query.token as string || '')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const resetComplete = ref(false)
const successMessage = ref('')

const handleResetPassword = async () => {
  error.value = ''
  
  // Validate passwords match
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  // Validate password length
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  
  loading.value = true

  try {
    const data = await resetPassword(token.value, password.value)
    resetComplete.value = true
    successMessage.value = data.message || 'Your password has been reset successfully!'
  } catch (err: any) {
    error.value = err.message || 'Failed to reset password. Please try again.'
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

.form-description {
  color: #666;
  text-align: center;
  margin-bottom: 1.5rem;
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

.success-message .btn {
  display: inline-block;
  margin-top: 1.5rem;
  text-decoration: none;
}

.error-message {
  text-align: center;
  padding: 2rem;
}

.error-message h2 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.error-message p {
  margin: 0.5rem 0;
  color: #666;
}

.btn-link {
  display: inline-block;
  color: #007bff;
  text-decoration: none;
  margin-top: 1.5rem;
}

.btn-link:hover {
  text-decoration: underline;
}
</style>
