<template>
  <div class="container">
    <div class="verify-email-change">
      <div class="card">
        <div v-if="loading" class="loading">
          <h2>Verifying your new email...</h2>
          <p>Please wait while we verify your new email address.</p>
        </div>

        <div v-else-if="success" class="success">
          <h2>✓ Email Changed!</h2>
          <p>{{ message }}</p>
          <p>Redirecting to your profile...</p>
        </div>

        <div v-else class="error-state">
          <h2>✗ Verification Failed</h2>
          <p>{{ error }}</p>
          <div class="actions">
            <NuxtLink to="/" class="btn">Go to Home</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch, isAuthenticated, currentUser } = useApi()

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
    const response = await authFetch('/users/verify-email-change', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Email change verification failed')
    }

    const data = await response.json()
    success.value = true
    message.value = data.message || 'Your email has been changed successfully!'
    
    // Redirect to profile after 2 seconds
    setTimeout(() => {
      if (isAuthenticated.value && currentUser.value) {
        navigateTo(`/profile/${currentUser.value.username}`)
      } else {
        navigateTo('/login')
      }
    }, 2000)
  } catch (err: any) {
    error.value = err.message || 'Email change verification failed. The link may have expired.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.verify-email-change {
  max-width: 500px;
  margin: 4rem auto;
  text-align: center;
}

.verify-email-change h2 {
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

.verify-email-change p {
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
