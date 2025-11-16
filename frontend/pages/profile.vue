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
const router = useRouter()

// Redirect to username-based profile URL - client-side only
if (process.client) {
  onMounted(() => {
    // Use nextTick to ensure Vue has finished hydration
    nextTick(() => {
      if (isAuthenticated.value && currentUser.value?.username) {
        // Use router.replace for immediate navigation without history
        router.replace(`/profile/${currentUser.value.username}`)
      }
    })
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
