<template>
  <div class="container">
    <h1>Search Markmaps</h1>

    <div class="search-form card">
      <form @submit.prevent="handleSearch">
        <div class="form-row">
          <div class="form-group">
            <label for="query">Search</label>
            <input 
              id="query" 
              v-model="searchForm.query" 
              type="text" 
              placeholder="Search by title or content"
            />
          </div>
          <div class="form-group">
            <label for="language">Language</label>
            <input 
              id="language" 
              v-model="searchForm.language" 
              type="text" 
              placeholder="e.g., en, es, fr"
            />
          </div>
        </div>
        <button type="submit" class="btn" :disabled="loading">
          {{ loading ? 'Searching...' : 'Search' }}
        </button>
      </form>
    </div>

    <div v-if="loading" class="loading">Searching...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="searched">
      <h2>Search Results ({{ results.length }})</h2>
      <div v-if="results.length === 0" class="no-results">
        No markmaps found matching your search criteria.
      </div>
      <div v-else class="markmap-grid">
        <NuxtLink 
          v-for="markmap in results" 
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
            <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()

const searchForm = ref({
  query: '',
  language: ''
})

const results = ref<any[]>([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)

const handleSearch = async () => {
  error.value = ''
  loading.value = true
  searched.value = true

  try {
    const params = new URLSearchParams()
    if (searchForm.value.query) params.append('query', searchForm.value.query)
    if (searchForm.value.language) params.append('language', searchForm.value.language)

    const queryString = params.toString()
    const url = queryString ? `/markmaps/search?${queryString}` : '/markmaps'

    const response = await authFetch(url)
    if (response.ok) {
      results.value = await response.json()
    } else {
      error.value = 'Search failed'
    }
  } catch (err: any) {
    error.value = err.message || 'Search failed'
  } finally {
    loading.value = false
  }
}

// Auto-search if query params are present
onMounted(() => {
  const route = useRoute()
  if (route.query.query || route.query.language) {
    searchForm.value = {
      query: (route.query.query as string) || '',
      language: (route.query.language as string) || ''
    }
    handleSearch()
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.search-form {
  margin-bottom: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
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
  margin-top: 1.5rem;
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
</style>
