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
    if (authValue && userValue?.username) {
      const targetUrl = `/profile/${userValue.username}`
      // Only redirect if we're not already on the target page
      if (window.location.pathname !== targetUrl) {
        window.location.replace(targetUrl)
      }
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
