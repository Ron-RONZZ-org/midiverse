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
          :to="`/markmaps/${markmap.id}`"
          class="markmap-card"
        >
          <h3>{{ markmap.title }}</h3>
          <p class="meta">
            By {{ markmap.author?.username || 'Anonymous' }} • 
            {{ new Date(markmap.createdAt).toLocaleDateString() }}
          </p>
          <div class="tags">
            <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
            <span v-if="markmap.topic" class="tag">{{ markmap.topic }}</span>
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
  color: #007bff;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
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
