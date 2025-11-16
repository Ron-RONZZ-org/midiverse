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
    console.log('[Profile/Redirect] Watch triggered:', {
      isAuthenticated: authValue,
      hasUser: !!userValue,
      username: userValue?.username,
      currentPath: window.location.pathname
    })
    
    if (authValue && userValue?.username) {
      const targetUrl = `/profile/${userValue.username}`
      console.log('[Profile/Redirect] Target URL:', targetUrl)
      
      // Only redirect if we're not already on the target page
      if (window.location.pathname !== targetUrl) {
        console.log('[Profile/Redirect] Redirecting now...')
        window.location.replace(targetUrl)
      } else {
        console.log('[Profile/Redirect] Already on target page, skipping redirect')
      }
    } else {
      console.log('[Profile/Redirect] Conditions not met for redirect')
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
