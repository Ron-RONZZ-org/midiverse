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
    nextTick(async () => {
      console.log('[Profile] isAuthenticated:', isAuthenticated.value)
      console.log('[Profile] currentUser:', currentUser.value)
      console.log('[Profile] username:', currentUser.value?.username)
      
      if (isAuthenticated.value && currentUser.value?.username) {
        console.log('[Profile] Attempting redirect to:', `/profile/${currentUser.value.username}`)
        try {
          // Use navigateTo which is more reliable in Nuxt
          await navigateTo(`/profile/${currentUser.value.username}`, { 
            replace: true,
            redirectCode: 301
          })
          console.log('[Profile] Redirect completed')
        } catch (error) {
          console.error('[Profile] Redirect failed:', error)
        }
      } else {
        console.log('[Profile] Not redirecting - conditions not met')
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
