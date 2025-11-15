<template>
  <div class="container">
    <div v-if="loading" class="loading">Loading markmap...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="markmap">
      <div class="markmap-header">
        <h1>{{ markmap.title }}</h1>
        <div class="meta">
          <span>By {{ markmap.author?.username || 'Anonymous' }}</span>
          <span>Created: {{ new Date(markmap.createdAt).toLocaleDateString() }}</span>
          <div class="tags">
            <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
            <span v-if="markmap.topic" class="tag">{{ markmap.topic }}</span>
          </div>
        </div>
        <div class="actions" v-if="isOwner">
          <NuxtLink :to="`/editor?id=${markmap.id}`" class="btn">Edit</NuxtLink>
          <button @click="handleDelete" class="btn btn-danger">Delete</button>
        </div>
      </div>

      <div class="markmap-view">
        <ClientOnly>
          <MarkmapViewer 
            :markdown="markmap.text"
            :options="{
              maxWidth: markmap.maxWidth,
              colorFreezeLevel: markmap.colorFreezeLevel,
              initialExpandLevel: markmap.initialExpandLevel
            }"
          />
        </ClientOnly>
      </div>

      <div class="markmap-source card">
        <h3>Source Markdown</h3>
        <pre>{{ markmap.text }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch } = useApi()
const { currentUser } = useAuth()

const markmap = ref<any>(null)
const loading = ref(true)
const error = ref('')

const isOwner = computed(() => {
  return currentUser.value && markmap.value?.authorId === currentUser.value.id
})

const loadMarkmap = async () => {
  try {
    const response = await authFetch(`/markmaps/${route.params.id}`)
    if (response.ok) {
      markmap.value = await response.json()
      
      // Track view
      await authFetch(`/markmaps/${route.params.id}/interactions`, {
        method: 'POST',
        body: JSON.stringify({ type: 'view', metadata: {} })
      })
    } else {
      error.value = 'Markmap not found'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load markmap'
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  if (!confirm('Are you sure you want to delete this markmap?')) return

  try {
    const response = await authFetch(`/markmaps/${route.params.id}`, {
      method: 'DELETE'
    })
    if (response.ok) {
      navigateTo('/markmaps')
    } else {
      alert('Failed to delete markmap')
    }
  } catch (err) {
    alert('Failed to delete markmap')
  }
}

onMounted(() => {
  loadMarkmap()
})
</script>

<style scoped>
.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.markmap-header {
  margin-bottom: 2rem;
}

.markmap-header h1 {
  color: #007bff;
  margin-bottom: 1rem;
}

.meta {
  color: #666;
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
}

.tag {
  background: #e9ecef;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
}

.actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-danger {
  background: #dc3545;
}

.btn-danger:hover {
  background: #c82333;
}

.markmap-view {
  height: 600px;
  margin-bottom: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
}

.markmap-source {
  margin-top: 2rem;
}

.markmap-source h3 {
  margin-bottom: 1rem;
}

.markmap-source pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
