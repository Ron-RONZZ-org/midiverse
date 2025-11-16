<script setup lang="ts">
const { isAuthenticated, currentUser } = useAuth()

// Simple client-side redirect - runs once when component is created
if (process.client && isAuthenticated.value && currentUser.value?.username) {
  // Use navigateTo immediately without waiting for mount
  navigateTo(`/profile/${currentUser.value.username}`, { replace: true })
}
</script>

<template>
  <div class="container">
    <ClientOnly>
      <div v-if="!isAuthenticated" class="card">
        <p>You need to be logged in to view your profile.</p>
        <NuxtLink to="/login" class="btn">Login</NuxtLink>
      </div>
      <div v-else class="loading">
        Redirecting to your profile...
      </div>
    </ClientOnly>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}
</style>
