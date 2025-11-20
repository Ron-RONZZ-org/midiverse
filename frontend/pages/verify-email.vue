<template>
  <div class="container">
    <div class="verify-email">
      <div class="card">
        <div v-if="loading" class="loading">
          <h2>Verifying your email...</h2>
          <p>Please wait while we verify your email address.</p>
        </div>

        <div v-else-if="success" class="success">
          <h2>✓ Email Verified!</h2>
          <p>{{ message }}</p>
          <p>Redirecting to your profile...</p>
        </div>

        <div v-else class="error-state">
          <h2>✗ Verification Failed</h2>
          <p>{{ error }}</p>
          <div class="actions">
            <NuxtLink to="/signup" class="btn">Go to Sign Up</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { verifyEmail } = useAuth()

const loading = ref(true)
const success = ref(false)
const error = ref('')
const message = ref('')

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    loading.value = false
    error.value = 'No verification token provided'
    return
  }

  try {
    const data = await verifyEmail(token)
    success.value = true
    message.value = data.message || 'Your email has been verified successfully!'
    
    // Redirect to profile after 2 seconds
    setTimeout(() => {
      if (data.user) {
        navigateTo(`/profile/${data.user.username}`)
      } else {
        navigateTo('/login')
      }
    }, 2000)
  } catch (err: any) {
    error.value = err.message || 'Email verification failed. The link may have expired.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.verify-email {
  max-width: 500px;
  margin: 4rem auto;
  text-align: center;
}

.verify-email h2 {
  margin-bottom: 1rem;
}

.loading h2 {
  color: #007bff;
}

.success h2 {
  color: #28a745;
}

.error-state h2 {
  color: #dc3545;
}

.verify-email p {
  color: #666;
  margin: 0.5rem 0;
}

.actions {
  margin-top: 2rem;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #0056b3;
}
</style>
