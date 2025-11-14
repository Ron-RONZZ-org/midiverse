<template>
  <div class="container">
    <div class="auth-form">
      <div class="card">
        <h1>Sign Up</h1>
        <form @submit.prevent="handleSignup">
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
              placeholder="Choose a username"
            />
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
          <div v-if="error" class="error">{{ error }}</div>
          <button type="submit" class="btn" :disabled="loading">
            {{ loading ? 'Creating account...' : 'Sign Up' }}
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
const { signup } = useAuth()

const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleSignup = async () => {
  error.value = ''
  loading.value = true

  try {
    await signup(email.value, username.value, password.value)
    navigateTo('/profile')
  } catch (err: any) {
    error.value = err.message || 'Signup failed. Please try again.'
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
</style>
