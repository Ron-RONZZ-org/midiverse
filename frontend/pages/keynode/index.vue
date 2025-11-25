<template>
  <div class="container">
    <div class="keynode-header">
      <h1>Keynode Hierarchy</h1>
      <p class="description">
        Explore the hierarchical structure of keynodes used across all markmaps.
      </p>
      
      <div class="controls">
        <label class="toggle-control">
          <input 
            type="checkbox" 
            v-model="showReferenceCounts"
            @change="loadHierarchy"
          />
          <span>Show reference counts</span>
        </label>
        
        <button @click="toggleFullscreen" class="btn btn-secondary">
          Fullscreen
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading keynode hierarchy...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="!hierarchyMarkdown" class="empty-state">No keynodes available yet.</div>
    <div v-else class="markmap-view">
      <ClientOnly>
        <MarkmapViewer 
          :markdown="hierarchyMarkdown"
          :options="{
            maxWidth: 300,
            colorFreezeLevel: 2,
            initialExpandLevel: 2
          }"
        />
      </ClientOnly>
    </div>

    <div class="info-card card" v-if="!loading && hierarchyMarkdown">
      <h3>About Keynodes</h3>
      <p>
        Keynodes are semantic entities that connect markmaps. They can represent people, 
        places, concepts, chemical compounds, astronomical bodies, and more.
      </p>
      <p v-if="showReferenceCounts">
        <strong>Reference counts</strong> show how many times each keynode (and its children) 
        are referenced across all markmaps. For example, "Earth (15)" means Earth and all its 
        child keynodes are referenced 15 times in total.
      </p>
      
      <h4>Available Categories</h4>
      <div class="categories-list">
        <span v-for="category in availableCategories" :key="category" class="category-badge">
          {{ formatCategory(category) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { authFetch } = useApi()

const hierarchyMarkdown = ref('')
const loading = ref(true)
const error = ref('')
const showReferenceCounts = ref(false)
const availableCategories = ref<string[]>([])

const loadHierarchy = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const params = new URLSearchParams()
    params.set('showReferenceCounts', String(showReferenceCounts.value))
    const response = await authFetch(`/keynodes/hierarchy?${params.toString()}`)
    
    if (response.ok) {
      hierarchyMarkdown.value = await response.text()
    } else {
      error.value = 'Failed to load keynode hierarchy'
    }
  } catch (err: any) {
    console.error('Error fetching hierarchy:', err)
    error.value = err.message || 'Failed to load keynode hierarchy'
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const response = await authFetch('/keynodes/categories')
    
    if (response.ok) {
      const data = await response.json()
      availableCategories.value = data.available
    }
  } catch (err) {
    console.error('Error fetching categories:', err)
  }
}

const formatCategory = (category: string): string => {
  return category.replace(/_/g, ' ')
}

const toggleFullscreen = () => {
  router.push('/keynode/fullscreen')
}

onMounted(() => {
  loadHierarchy()
  loadCategories()
})
</script>

<style scoped>
.keynode-header {
  margin-bottom: 2rem;
}

.keynode-header h1 {
  color: var(--link-color, #007bff);
  margin-bottom: 0.5rem;
}

.description {
  color: var(--text-secondary, #666);
  margin-bottom: 1.5rem;
}

.controls {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.toggle-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-primary);
}

.toggle-control input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary, #666);
}

.empty-state {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary, #666);
  font-style: italic;
}

.markmap-view {
  height: 600px;
  margin-bottom: 2rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--card-bg, white);
  position: relative;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.info-card {
  margin-top: 2rem;
}

.info-card h3 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.info-card h4 {
  color: var(--text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.info-card p {
  color: var(--text-secondary, #666);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.categories-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.category-badge {
  background: var(--bg-secondary, #e9ecef);
  border: 1px solid var(--border-color, #ddd);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--text-primary);
  text-transform: capitalize;
}
</style>
