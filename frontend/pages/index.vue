<template>
  <div class="container">
    <div class="hero">
      <div class="logo-container">
        <div class="logo">M</div>
      </div>
      <h1>Welcome to Midiverse</h1>
      <p>Create, share, and explore interactive markmaps</p>
      <div class="cta-buttons">
        <NuxtLink to="/markmaps" class="btn">Explore Markmaps</NuxtLink>
        <NuxtLink to="/editor" class="btn btn-secondary">Create Your Own</NuxtLink>
      </div>
    </div>

    <div class="features">
      <div class="card">
        <h2>📊 Visualize Knowledge</h2>
        <p>Transform markdown into interactive mind maps with powerful visualization tools.</p>
      </div>
      <div class="card">
        <h2>🔍 Search & Discover</h2>
        <p>Find markmaps by tags, language, or content. Explore what others have created.</p>
      </div>
      <div class="card">
        <h2>✏️ Create & Edit</h2>
        <p>Easy-to-use editor with real-time preview. Share your knowledge with the world.</p>
      </div>
    </div>

    <div class="recent-markmaps">
      <h2>Recent Markmaps</h2>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="markmap-grid">
        <NuxtLink 
          v-for="markmap in recentMarkmaps" 
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

const recentMarkmaps = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const response = await authFetch('/markmaps')
    if (response.ok) {
      const data = await response.json()
      recentMarkmaps.value = data.slice(0, 6)
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
.hero {
  text-align: center;
  padding: 4rem 0;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.logo {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  font-weight: bold;
  color: white;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #007bff;
}

.hero p {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.cta-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin: 4rem 0;
}

.features .card h2 {
  margin-bottom: 1rem;
}

.recent-markmaps {
  margin-top: 4rem;
}

.recent-markmaps h2 {
  margin-bottom: 2rem;
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.markmap-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, background-color 0.3s ease, box-shadow 0.3s ease;
}

.markmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px var(--shadow);
}

.markmap-card h3 {
  margin-bottom: 0.5rem;
  color: #007bff;
}

.meta {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  background: var(--input-border);
  color: var(--text-primary);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  transition: background-color 0.3s ease;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}
</style>
