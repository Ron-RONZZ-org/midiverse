<script setup lang="ts">
const { isAuthenticated, currentUser } = useAuth()
const router = useRouter()

// Define page metadata to handle redirect server-side when possible
definePageMeta({
  middleware: [
    function (to, from) {
      // Only run on client
      if (process.client) {
        const { isAuthenticated, currentUser } = useAuth()
        if (isAuthenticated.value && currentUser.value?.username) {
          return navigateTo(`/profile/${currentUser.value.username}`, { replace: true })
        }
      }
    }
  ]
})
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
