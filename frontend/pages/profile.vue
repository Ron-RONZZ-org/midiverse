<template>
  <div class="container">
    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to view your profile.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>

    <ClientOnly>
      <div v-if="isAuthenticated" class="loading">
        Redirecting to your profile...
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, currentUser } = useAuth()

// Redirect to username-based profile URL - client-side only
if (process.client) {
  onMounted(async () => {
    // Small delay to ensure localStorage is fully accessible
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (isAuthenticated.value && currentUser.value?.username) {
      // Use replace option to avoid adding to history
      await navigateTo(`/profile/${currentUser.value.username}`, { replace: true })
    }
  })
}
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}
</style>
