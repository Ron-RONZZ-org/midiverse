<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Forgot Password</h1>
        
        <div v-if="emailSent" class="success-message">
          <h2>✓ Email Sent!</h2>
          <p>{{ successMessage }}</p>
          <p>Please check your inbox for the password reset link.</p>
          <NuxtLink to="/login" class="btn-link">← Back to login</NuxtLink>
        </div>

        <form v-else @submit.prevent="handleForgotPassword">
          <p class="form-description">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email"
              v-model="email" 
              type="email" 
              required 
              placeholder="Enter your email address"
            />
          </div>

          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" class="btn" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </form>
        <p v-if="!emailSent" class="auth-switch">
          Remember your password? 
          <NuxtLink to="/login">Login here</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { forgotPassword } = useAuth()

const email = ref('')
const error = ref('')
const loading = ref(false)
const emailSent = ref(false)
const successMessage = ref('')

const handleForgotPassword = async () => {
  error.value = ''
  loading.value = true

  try {
    const data = await forgotPassword(email.value)
    emailSent.value = true
    successMessage.value = data.message || 'Password reset email sent!'
  } catch (err: any) {
    error.value = err.message || 'Failed to send reset email. Please try again.'
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
