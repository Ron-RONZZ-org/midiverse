<template>
  <div class="container">
    <div v-if="loading" class="loading-card">
      <p>Loading series...</p>
    </div>

    <div v-else-if="error" class="error-card">
      <p>{{ error }}</p>
      <NuxtLink to="/markmaps" class="btn">Back to Markmaps</NuxtLink>
    </div>

    <div v-else-if="series">
      <div class="series-header">
        <h1>{{ series.name }}</h1>
        <p v-if="series.description" class="series-description">{{ series.description }}</p>
        <div class="series-meta">
          <span>By <NuxtLink :to="`/profile/${username}`" class="author-link">{{ username }}</NuxtLink></span>
          <span class="separator">•</span>
          <span>{{ series.markmaps?.length || 0 }} markmaps</span>
          <span v-if="series.isPublic" class="badge badge-public">Public</span>
          <span v-else class="badge badge-private">Private</span>
        </div>
      </div>

      <div v-if="!series.markmaps || series.markmaps.length === 0" class="empty-state">
        <p>No markmaps in this series yet.</p>
      </div>

      <div v-else class="markmaps-grid">
        <div v-for="markmap in series.markmaps" :key="markmap.id" class="markmap-card">
          <NuxtLink :to="`/markmaps/${markmap.id}`" class="markmap-link">
            <h3>{{ markmap.title }}</h3>
            <div class="markmap-meta">
              <span class="views">👁️ {{ markmap._count?.viewHistory || 0 }} views</span>
              <span class="date">{{ formatDate(markmap.createdAt) }}</span>
            </div>
            <div v-if="markmap.tags && markmap.tags.length > 0" class="tags">
              <span v-for="tag in markmap.tags.slice(0, 3)" :key="tag.tagId" class="tag">
                {{ tag.tag.name }}
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch } = useApi()

const username = computed(() => route.params.username as string)
const slug = computed(() => route.params.slug as string)

const series = ref<any>(null)
const loading = ref(true)
const error = ref('')

const loadSeries = async () => {
  loading.value = true
  error.value = ''

  try {
    const response = await authFetch(`/series/${username.value}/${slug.value}`)
    
    if (!response.ok) {
      if (response.status === 404) {
        error.value = 'Series not found'
      } else {
        error.value = 'Failed to load series'
      }
      return
    }

    series.value = await response.json()
  } catch (err) {
    console.error('Failed to load series:', err)
    error.value = 'Failed to load series'
  } finally {
    loading.value = false
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  loadSeries()
})

// Update page metadata
useHead(() => ({
  title: series.value ? `${series.value.name} - Series by ${username.value}` : 'Series',
  meta: [
    {
      name: 'description',
      content: series.value?.description || `View the ${series.value?.name || 'series'} by ${username.value}`
    }
  ]
}))
</script>

<style scoped>
.loading-card,
.error-card {
  text-align: center;
  padding: 3rem;
  margin: 2rem 0;
}

.error-card p {
  color: #dc3545;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.series-header {
  margin-bottom: 2rem;
}

.series-header h1 {
  color: #007bff;
  margin-bottom: 0.5rem;
}

.series-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.series-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.author-link {
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
}

.author-link:hover {
  text-decoration: underline;
}

.separator {
  color: var(--text-tertiary);
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge-public {
  background: #d4edda;
  color: #155724;
}

.badge-private {
  background: #f8d7da;
  color: #721c24;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
  background: var(--card-bg);
  border-radius: 8px;
  margin: 2rem 0;
}

.markmaps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.markmap-card {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px var(--shadow);
}

.markmap-link {
  text-decoration: none;
  color: var(--text-primary);
}

.markmap-card h3 {
  color: #007bff;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.markmap-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.tag {
  background: #007bff;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .markmaps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
