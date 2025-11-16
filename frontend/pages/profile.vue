<template>
  <div class="container">
    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to view your profile.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>

    <div v-else-if="redirecting" class="loading">
      Redirecting to your profile...
    </div>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, currentUser } = useAuth()
const redirecting = ref(false)
const hasRedirected = ref(false)

// Redirect to username-based profile URL
// Only redirect once when user data is available
watch(
  () => currentUser.value?.username,
  (username) => {
    if (isAuthenticated.value && username && !hasRedirected.value) {
      hasRedirected.value = true
      redirecting.value = true
      navigateTo(`/profile/${username}`)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}
</style>
