<template>
  <ClientOnly>
    <div class="container">
      <div v-if="!isAuthenticated" class="card">
        <p>You need to be logged in to view your profile.</p>
        <NuxtLink to="/login" class="btn">Login</NuxtLink>
      </div>

      <div v-else class="loading">
        Redirecting to your profile...
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
const { isAuthenticated, currentUser } = useAuth()

// Redirect to username-based profile URL - client-side only
if (process.client) {
  // Watch for authentication state changes
  watch([isAuthenticated, currentUser], ([authValue, userValue]) => {
    console.log('[Profile] Watch triggered - isAuthenticated:', authValue, 'user:', userValue)
    
    if (authValue && userValue?.username) {
      console.log('[Profile] Redirecting to:', `/profile/${userValue.username}`)
      // Use window.location for guaranteed navigation
      window.location.href = `/profile/${userValue.username}`
    }
  }, { immediate: true })
}
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}
</style>
