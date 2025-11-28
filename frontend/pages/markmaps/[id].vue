<template>
  <div :class="['container', { 'fullscreen-container': isFullscreen }]">
    <div v-if="loading" class="loading">Loading markmap...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="markmap">
      <div class="markmap-header" v-if="!isFullscreen">
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
            {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
          </button>
          <button @click="copyDirectLink" class="btn btn-info">Copy Direct Link</button>
          <button @click="handleReportClick" class="btn btn-danger" title="Report this content">
            ⚠️ Report
          </button>
          <template v-if="isOwner">
            <NuxtLink :to="`/editor?id=${markmap.id}`" class="btn">Edit</NuxtLink>
            <button @click="handleDelete" class="btn btn-danger">Delete</button>
          </template>
        </div>
      </div>

      <div :class="['markmap-view', { 'fullscreen-view': isFullscreen }]">
        <button v-if="isFullscreen" @click="exitFullscreen" class="exit-fullscreen-btn" title="Exit Fullscreen">
          ✕
        </button>
        <button v-if="isFullscreen" @click="showShareModal = true" class="share-btn" title="Share">
          🔗
        </button>
        <button v-if="isFullscreen" @click="handleReportClick" class="report-btn" title="Report this content">
          ⚠️
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

      <div class="markmap-source card" v-if="!isFullscreen">
        <h3>Source Markdown</h3>
        <pre>{{ markmap.text }}</pre>
      </div>

      <!-- Share Modal -->
      <div v-if="showShareModal" class="modal-overlay" @click.self="showShareModal = false">
        <div class="modal">
          <h2>Share Markmap</h2>
          <p class="modal-description">Copy the direct link to share this markmap:</p>
          <div class="link-container">
            <input 
              type="text" 
              :value="directLink" 
              readonly 
              class="link-input"
              ref="linkInput"
            />
          </div>
          <div class="modal-actions">
            <button @click="showShareModal = false" class="btn btn-secondary">Close</button>
            <button @click="copyDirectLinkFromModal" class="btn">🔗 Copy Link</button>
          </div>
        </div>
      </div>

      <!-- Complaint Modal -->
      <div v-if="showComplaintModal" class="modal-overlay" @click.self="showComplaintModal = false">
        <div class="modal">
          <h2>Report Content</h2>
          <p class="modal-description">Please provide details about why you're reporting this markmap.</p>
          
          <div v-if="complaintError" class="error-message">{{ complaintError }}</div>
          <div v-if="complaintSuccess" class="success-message">{{ complaintSuccess }}</div>
          
          <form v-if="!complaintSuccess" @submit.prevent="submitComplaint">
            <div class="form-group">
              <label for="complaint-reason">Reason</label>
              <select id="complaint-reason" v-model="complaintForm.reason" required class="form-control">
                <option value="">Select a reason...</option>
                <option value="harassment">Harassment</option>
                <option value="false_information">False Information</option>
                <option value="author_right_infringement">Author Right Infringement</option>
                <option value="inciting_violence_hate">Inciting Violence/Hate</option>
                <option value="discriminatory_abusive">Discriminatory/Abusive</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="complaint-explanation">Explanation (minimum 5 words)</label>
              <textarea 
                id="complaint-explanation" 
                v-model="complaintForm.explanation" 
                required
                rows="4"
                class="form-control"
                placeholder="Please explain why you're reporting this content..."
              ></textarea>
              <small class="form-text">Word count: {{ wordCount }}</small>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="closeComplaintModal" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-warning" :disabled="complaintLoading || wordCount < 5">
                {{ complaintLoading ? 'Submitting...' : 'Submit Report' }}
              </button>
            </div>
          </form>
          
          <div v-else class="modal-actions">
            <button @click="closeComplaintModal" class="btn">Close</button>
          </div>
        </div>
      </div>

      <!-- Login Prompt Modal -->
      <div v-if="showLoginPrompt" class="modal-overlay" @click.self="showLoginPrompt = false">
        <div class="modal">
          <h2>Login Required</h2>
          <p class="modal-description">You need to be logged in to report content. Please log in or create an account to continue.</p>
          <div class="modal-actions">
            <button @click="showLoginPrompt = false" class="btn btn-secondary">Cancel</button>
            <NuxtLink :to="`/login?redirect=${encodeURIComponent($route.fullPath)}`" class="btn">Log In</NuxtLink>
            <NuxtLink to="/signup" class="btn btn-info">Sign Up</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { authFetch } = useApi()
const { currentUser, isAuthenticated } = useAuth()

const markmap = ref<any>(null)
const loading = ref(true)
const error = ref('')
const isFullscreen = ref(false)
const showShareModal = ref(false)
const linkInput = ref<HTMLInputElement | null>(null)

// Complaint modal state
const showComplaintModal = ref(false)
const showLoginPrompt = ref(false)
const complaintForm = ref({
  reason: '',
  explanation: ''
})
const complaintLoading = ref(false)
const complaintError = ref('')
const complaintSuccess = ref('')

const isOwner = computed(() => {
  return currentUser.value && markmap.value?.authorId === currentUser.value.id
})

const directLink = computed(() => {
  if (!markmap.value || !markmap.value.author?.username || !markmap.value.slug) {
    return ''
  }
  const baseUrl = window.location.origin
  return `${baseUrl}/markmaps/${markmap.value.author.username}/${markmap.value.slug}`
})

const handleReportClick = () => {
  if (!isAuthenticated.value) {
    showLoginPrompt.value = true
  } else {
    showComplaintModal.value = true
  }
}

const wordCount = computed(() => {
  return complaintForm.value.explanation.trim().split(/\s+/).filter(w => w.length > 0).length
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

const submitComplaint = async () => {
  if (wordCount.value < 5) {
    complaintError.value = 'Please provide at least 5 words of explanation'
    return
  }
  
  complaintLoading.value = true
  complaintError.value = ''
  
  try {
    const response = await authFetch(`/complaints/markmaps/${markmap.value.id}`, {
      method: 'POST',
      body: JSON.stringify(complaintForm.value)
    })
    
    if (response.ok) {
      complaintSuccess.value = 'Your report has been submitted. Thank you for helping keep our community safe.'
      complaintForm.value = { reason: '', explanation: '' }
    } else {
      const data = await response.json()
      complaintError.value = data.message || 'Failed to submit report'
    }
  } catch (err: any) {
    complaintError.value = err.message || 'Failed to submit report'
  } finally {
    complaintLoading.value = false
  }
}

const closeComplaintModal = () => {
  showComplaintModal.value = false
  complaintForm.value = { reason: '', explanation: '' }
  complaintError.value = ''
  complaintSuccess.value = ''
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

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const exitFullscreen = () => {
  isFullscreen.value = false
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

const copyDirectLinkFromModal = async () => {
  const link = directLink.value
  try {
    await navigator.clipboard.writeText(link)
    // Select the text in the input for visual feedback
    if (linkInput.value) {
      linkInput.value.select()
    }
    alert('Link copied to clipboard!')
    showShareModal.value = false
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
  color: var(--text-secondary);
}

.fullscreen-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: var(--bg-primary);
  overflow: hidden;
  padding: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
}

.markmap-header {
  margin-bottom: 2rem;
}

.markmap-header h1 {
  color: var(--link-color, #007bff);
  margin-bottom: 1rem;
}

.meta {
  color: var(--text-secondary);
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
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  color: var(--text-primary);
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
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

.share-btn {
  position: absolute;
  top: 10px;
  right: 60px;
  z-index: 1000;
  background: rgba(0, 123, 255, 0.8);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.share-btn:hover {
  background: rgba(0, 123, 255, 1);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal {
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 4px 16px var(--shadow);
}

.modal h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.modal-description {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.link-container {
  margin-bottom: 1.5rem;
}

.link-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
  background: var(--input-bg);
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-warning:disabled {
  background: #d4a000;
  opacity: 0.7;
  cursor: not-allowed;
}

.report-btn {
  position: absolute;
  top: 10px;
  right: 110px;
  z-index: 1000;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.report-btn:hover {
  background: rgba(220, 53, 69, 1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-primary);
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

textarea.form-control {
  resize: vertical;
  min-height: 100px;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.markmap-source {
  margin-top: 2rem;
}

.markmap-source h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.markmap-source pre {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
