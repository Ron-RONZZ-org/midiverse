<template>
  <div class="container">
    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to view your profile.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>

    <div v-else>
      <h1>Profile</h1>

      <div v-if="loading" class="loading">Loading profile...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="profile">
        <div class="profile-header card">
          <h2>{{ profile.username }}</h2>
          <p>{{ profile.email }}</p>
          <div class="stats">
            <div class="stat">
              <strong>{{ profile._count.markmaps }}</strong>
              <span>Markmaps</span>
            </div>
            <div class="stat">
              <strong>{{ profile._count.viewHistory }}</strong>
              <span>Views</span>
            </div>
            <div class="stat">
              <strong>{{ profile._count.interactions }}</strong>
              <span>Interactions</span>
            </div>
          </div>
        </div>

        <div class="profile-content">
          <h2>Your Markmaps</h2>
          <div v-if="markmaps.length === 0" class="no-results">
            You haven't created any markmaps yet. 
            <NuxtLink to="/editor">Create your first one!</NuxtLink>
          </div>
          <div v-else class="markmap-grid">
            <NuxtLink 
              v-for="markmap in markmaps" 
              :key="markmap.id" 
              :to="`/markmaps/${markmap.id}`"
              class="markmap-card"
            >
              <h3>{{ markmap.title }}</h3>
              <p class="meta">
                {{ new Date(markmap.createdAt).toLocaleDateString() }}
                {{ markmap.isPublic ? '• Public' : '• Private' }}
              </p>
              <div class="tags">
                <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
                <span v-if="markmap.topic" class="tag">{{ markmap.topic }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()
const { isAuthenticated } = useAuth()

const profile = ref<any>(null)
const markmaps = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const loadProfile = async () => {
  try {
    const [profileRes, markmapsRes] = await Promise.all([
      authFetch('/users/profile'),
      authFetch('/users/markmaps')
    ])

    if (profileRes.ok && markmapsRes.ok) {
      profile.value = await profileRes.json()
      markmaps.value = await markmapsRes.json()
    } else {
      error.value = 'Failed to load profile'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    loadProfile()
  }
})

watch(isAuthenticated, (newValue) => {
  if (newValue) {
    loadProfile()
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-header h2 {
  margin-bottom: 0.5rem;
}

.profile-header p {
  color: #666;
  margin-bottom: 1.5rem;
}

.stats {
  display: flex;
  gap: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.stat {
  display: flex;
  flex-direction: column;
  text-align: center;
}

.stat strong {
  font-size: 2rem;
  color: #007bff;
}

.stat span {
  color: #666;
  font-size: 0.9rem;
}

.profile-content h2 {
  margin-bottom: 1.5rem;
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.markmap-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.markmap-card h3 {
  margin-bottom: 0.5rem;
  color: #007bff;
}

.meta {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.no-results {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.no-results a {
  color: #007bff;
  text-decoration: none;
}

.no-results a:hover {
  text-decoration: underline;
}
</style>
