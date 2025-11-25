<template>
  <div class="container">
    <h1>Explore Markmaps</h1>
    
    <div v-if="loading" class="loading">Loading markmaps...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="markmap-grid">
        <NuxtLink 
          v-for="markmap in markmaps" 
          :key="markmap.id" 
          :to="getMarkmapUrl(markmap)"
          class="markmap-card"
        >
          <h3>{{ markmap.title }}</h3>
          <p class="meta">
            By {{ markmap.author?.username || 'Anonymous' }} • 
            {{ new Date(markmap.createdAt).toLocaleDateString() }}
          </p>
          <div class="tags">
            <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
            <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
          </div>
        </NuxtLink>
      </div>
      <div v-if="markmaps.length === 0" class="no-results">
        No markmaps found. <NuxtLink to="/editor">Create the first one!</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()

const markmaps = ref([])
const loading = ref(true)
const error = ref('')

const getMarkmapUrl = (markmap: any) => {
  // Use human-friendly URL if author username and slug are available
  if (markmap.author?.username && markmap.slug) {
    return `/markmaps/${markmap.author.username}/${markmap.slug}`
  }
  // Fallback to UUID-based URL
  return `/markmaps/${markmap.id}`
}

onMounted(async () => {
  try {
    const response = await authFetch('/markmaps')
    if (response.ok) {
      markmaps.value = await response.json()
    } else {
      error.value = 'Failed to load markmaps'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load markmaps'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: var(--link-color, #007bff);
}

.loading {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary, #666);
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.markmap-card {
  background: var(--card-bg, white);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow, rgba(0,0,0,0.1));
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, background-color 0.3s ease, box-shadow 0.3s ease;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px var(--shadow, rgba(0,0,0,0.15));
}

.markmap-card h3 {
  margin-bottom: 0.5rem;
  color: var(--link-color, #007bff);
}

.meta {
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: var(--input-border, #e9ecef);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  transition: background-color 0.3s ease;
}

.no-results {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary, #666);
}

.no-results a {
  color: var(--link-color, #007bff);
  text-decoration: none;
}

.no-results a:hover {
  text-decoration: underline;
}
</style>
