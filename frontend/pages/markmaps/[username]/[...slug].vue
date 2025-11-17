<template>
  <div :class="['container', { 'fullscreen-container': isFullscreenMode }]">
    <div v-if="loading" class="loading">Loading markmap...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="markmap">
      <div class="markmap-header" v-if="!isFullscreenMode">
        <h1>{{ markmap.title }}</h1>
        <div class="meta">
          <span>By {{ markmap.author?.username || 'Anonymous' }}</span>
          <span>Created: {{ new Date(markmap.createdAt).toLocaleDateString() }}</span>
          <div class="tags">
            <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
            <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
          </div>
        </div>
        <div class="actions">
          <button @click="toggleFullscreen" class="btn btn-secondary">
            Fullscreen
          </button>
          <button @click="copyDirectLink" class="btn btn-info">Copy Direct Link</button>
          <template v-if="isOwner">
            <NuxtLink :to="`/editor?id=${markmap.id}`" class="btn">Edit</NuxtLink>
            <button @click="handleDelete" class="btn btn-danger">Delete</button>
          </template>
        </div>
      </div>

      <div :class="['markmap-view', { 'fullscreen-view': isFullscreenMode }]">
        <button v-if="isFullscreenMode" @click="exitFullscreen" class="exit-fullscreen-btn" title="Exit Fullscreen">
          ✕
        </button>
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

      <div class="markmap-source card" v-if="!isFullscreenMode">
        <h3>Source Markdown</h3>
        <pre>{{ markmap.text }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { authFetch } = useApi()
const { currentUser } = useAuth()

const markmap = ref<any>(null)
const loading = ref(true)
const error = ref('')

// Parse slug - it can be an array if using catch-all route
const getSlugParts = () => {
  const slugParam = route.params.slug
  if (Array.isArray(slugParam)) {
    return slugParam
  }
  return [slugParam]
}

// Check if this is a fullscreen route
const isFullscreenMode = computed(() => {
  const parts = getSlugParts()
  return parts[parts.length - 1] === 'fullscreen'
})

// Get the actual slug without the fullscreen suffix
const getActualSlug = () => {
  const parts = getSlugParts()
  if (parts[parts.length - 1] === 'fullscreen') {
    return parts.slice(0, -1).join('-')
  }
  return parts.join('-')
}

const isOwner = computed(() => {
  return currentUser.value && markmap.value?.authorId === currentUser.value.id
})

const directLink = computed(() => {
  if (!markmap.value) return ''
  const baseUrl = window.location.origin
  const username = route.params.username
  const slug = getActualSlug()
  return `${baseUrl}/markmaps/${username}/${slug}`
})

const loadMarkmap = async () => {
  try {
    const username = route.params.username
    const slug = getActualSlug()
    const response = await authFetch(`/markmaps/${username}/${slug}`)
    if (response.ok) {
      markmap.value = await response.json()
      
      // Track view
      await authFetch(`/markmaps/${markmap.value.id}/interactions`, {
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
    const response = await authFetch(`/markmaps/${markmap.value.id}`, {
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

const toggleFullscreen = () => {
  const username = route.params.username
  const slug = getActualSlug()
  router.push(`/markmaps/${username}/${slug}/fullscreen`)
}

const exitFullscreen = () => {
  const username = route.params.username
  const slug = getActualSlug()
  router.push(`/markmaps/${username}/${slug}`)
}

const copyDirectLink = async () => {
  const link = `${directLink.value}/fullscreen`
  try {
    await navigator.clipboard.writeText(link)
    alert('Link copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy link:', err)
    alert('Failed to copy link')
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

.fullscreen-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: white;
  overflow: hidden;
  padding: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
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
  flex-wrap: wrap;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
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
  position: relative;
}

.fullscreen-view {
  height: 100vh !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

.exit-fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.exit-fullscreen-btn:hover {
  background: rgba(0, 0, 0, 0.9);
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
