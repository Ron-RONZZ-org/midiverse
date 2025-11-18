<template>
  <div class="container">
    <div v-if="loading" class="loading">Loading profile...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="profile">
      <div class="profile-header card">
        <div class="profile-info">
          <h1>{{ profile.username }}</h1>
          <p v-if="profile.isOwnProfile" class="email">{{ profile.email }}</p>
          <p class="joined">
            Joined {{ new Date(profile.createdAt).toLocaleDateString() }}
          </p>
        </div>
        
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

        <div v-if="profile.isOwnProfile" class="actions">
          <button @click="showEditModal = true" class="btn btn-secondary">Edit Profile</button>
        </div>
      </div>

      <div class="profile-content">
        <h2>{{ profile.isOwnProfile ? 'Your Markmaps' : `${profile.username}'s Markmaps` }}</h2>
        <div v-if="markmaps.length === 0" class="no-results">
          <template v-if="profile.isOwnProfile">
            You haven't created any markmaps yet. 
            <NuxtLink to="/editor">Create your first one!</NuxtLink>
          </template>
          <template v-else>
            This user hasn't created any public markmaps yet.
          </template>
        </div>
        <div v-else class="markmap-grid">
          <div 
            v-for="markmap in markmaps" 
            :key="markmap.id" 
            class="markmap-card-wrapper"
          >
            <NuxtLink 
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
                <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
              </div>
            </NuxtLink>
            <div v-if="profile.isOwnProfile" class="markmap-actions">
              <button @click="duplicateMarkmap(markmap.id)" class="btn-icon" title="Duplicate">
                📋
              </button>
              <button @click="downloadMarkmap(markmap.id, markmap.title)" class="btn-icon" title="Download">
                💾
              </button>
              <button @click="deleteMarkmap(markmap.id)" class="btn-icon btn-danger" title="Delete">
                🗑️
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="profile.isOwnProfile && deletedMarkmaps.length > 0" class="profile-content deleted-section">
        <h2>Recycle Bin</h2>
        <p class="recycle-info">Deleted markmaps will be permanently removed after 30 days.</p>
        <div class="markmap-grid">
          <div 
            v-for="markmap in deletedMarkmaps" 
            :key="markmap.id" 
            class="markmap-card-wrapper deleted"
          >
            <div class="markmap-card">
              <h3>{{ markmap.title }}</h3>
              <p class="meta">
                Deleted {{ new Date(markmap.deletedAt).toLocaleDateString() }}
              </p>
              <div class="tags">
                <span v-if="markmap.language" class="tag">{{ markmap.language }}</span>
                <span v-for="tag in markmap.tags" :key="tag.id" class="tag">{{ tag.tag.name }}</span>
              </div>
            </div>
            <div class="markmap-actions">
              <button @click="restoreMarkmap(markmap.id)" class="btn-icon" title="Restore">
                ♻️
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal">
        <h2>Edit Profile</h2>
        <div v-if="editError" class="error">{{ editError }}</div>
        <form @submit.prevent="updateProfile">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              id="email" 
              v-model="editForm.email" 
              type="email" 
              class="form-control"
              :placeholder="profile.email"
            />
            <small v-if="profile.lastEmailChange" class="form-text">
              Last changed: {{ new Date(profile.lastEmailChange).toLocaleDateString() }}
            </small>
          </div>
          <div class="form-group">
            <label for="username">Username</label>
            <input 
              id="username" 
              v-model="editForm.username" 
              type="text" 
              class="form-control"
              :placeholder="profile.username"
            />
            <small v-if="profile.lastUsernameChange" class="form-text">
              Last changed: {{ new Date(profile.lastUsernameChange).toLocaleDateString() }}
            </small>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn" :disabled="editLoading">
              {{ editLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch } = useApi()
const { isAuthenticated, currentUser } = useAuth()

const username = computed(() => route.params.username as string)
const profile = ref<any>(null)
const markmaps = ref<any[]>([])
const deletedMarkmaps = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const showEditModal = ref(false)
const editForm = ref({ email: '', username: '' })
const editError = ref('')
const editLoading = ref(false)

const loadProfile = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const profileRes = await authFetch(`/users/profile/${username.value}`)

    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        error.value = 'User not found'
      } else {
        error.value = 'Failed to load profile'
      }
      return
    }

    profile.value = await profileRes.json()

    // Load markmaps - all users can see public markmaps, owners see all
    const markmapsRes = profile.value.isOwnProfile
      ? await authFetch('/users/markmaps')
      : await authFetch(`/markmaps?author=${username.value}`)
    
    if (markmapsRes.ok) {
      const allMarkmaps = await markmapsRes.json()
      markmaps.value = allMarkmaps.filter((m: any) => !m.deletedAt)
    }

    // Load deleted markmaps if viewing own profile
    if (profile.value.isOwnProfile) {
      const deletedRes = await authFetch('/users/deleted-markmaps')
      if (deletedRes.ok) {
        deletedMarkmaps.value = await deletedRes.json()
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load profile'
  } finally {
    loading.value = false
  }
}

const updateProfile = async () => {
  editLoading.value = true
  editError.value = ''
  
  try {
    const updateData: any = {}
    if (editForm.value.email && editForm.value.email !== profile.value.email) {
      updateData.email = editForm.value.email
    }
    if (editForm.value.username && editForm.value.username !== profile.value.username) {
      updateData.username = editForm.value.username
    }

    if (Object.keys(updateData).length === 0) {
      showEditModal.value = false
      return
    }

    const response = await authFetch('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      editError.value = errorData.message || 'Failed to update profile'
      return
    }

    const updatedProfile = await response.json()
    
    // If username changed, redirect to new profile URL
    if (updateData.username) {
      navigateTo(`/profile/${updatedProfile.username}`)
    } else {
      // Reload profile
      await loadProfile()
    }
    
    showEditModal.value = false
    editForm.value = { email: '', username: '' }
  } catch (err: any) {
    editError.value = err.message || 'Failed to update profile'
  } finally {
    editLoading.value = false
  }
}

const duplicateMarkmap = async (id: string) => {
  try {
    const response = await authFetch(`/markmaps/${id}/duplicate`, {
      method: 'POST',
    })

    if (response.ok) {
      await loadProfile()
    } else {
      alert('Failed to duplicate markmap')
    }
  } catch (err) {
    alert('Failed to duplicate markmap')
  }
}

const downloadMarkmap = async (id: string, title: string) => {
  try {
    const response = await authFetch(`/markmaps/${id}/download`)

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } else {
      alert('Failed to download markmap')
    }
  } catch (err) {
    alert('Failed to download markmap')
  }
}

const deleteMarkmap = async (id: string) => {
  if (!confirm('Are you sure you want to delete this markmap? It will be moved to the recycle bin.')) {
    return
  }

  try {
    const response = await authFetch(`/markmaps/${id}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      await loadProfile()
    } else {
      alert('Failed to delete markmap')
    }
  } catch (err) {
    alert('Failed to delete markmap')
  }
}

const restoreMarkmap = async (id: string) => {
  try {
    const response = await authFetch(`/markmaps/${id}/restore`, {
      method: 'POST',
    })

    if (response.ok) {
      await loadProfile()
    } else {
      alert('Failed to restore markmap')
    }
  } catch (err) {
    alert('Failed to restore markmap')
  }
}

onMounted(() => {
  loadProfile()
})

watch(() => route.params.username, () => {
  if (route.params.username) {
    loadProfile()
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 0.5rem;
  color: #007bff;
  font-size: 2rem;
}

h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.loading {
  text-align: center;
  padding: 4rem;
  color: #666;
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-info {
  margin-bottom: 1.5rem;
}

.email {
  color: #666;
  margin-bottom: 0.25rem;
}

.joined {
  color: #999;
  font-size: 0.9rem;
}

.stats {
  display: flex;
  gap: 2rem;
  padding: 1.5rem 0;
  border-top: 1px solid #e9ecef;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 1rem;
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

.actions {
  display: flex;
  gap: 1rem;
}

.profile-content {
  margin-bottom: 3rem;
}

.deleted-section {
  border-top: 2px solid #e9ecef;
  padding-top: 2rem;
}

.recycle-info {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.markmap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.markmap-card-wrapper {
  position: relative;
}

.markmap-card-wrapper.deleted .markmap-card {
  opacity: 0.7;
  background: #f8f9fa;
}

.markmap-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;
  display: block;
}

a.markmap-card:hover {
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

.markmap-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-icon {
  background: white;
  border: 1px solid #dee2e6;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #f8f9fa;
  transform: scale(1.1);
}

.btn-icon.btn-danger:hover {
  background: #dc3545;
  border-color: #dc3545;
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
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}
</style>
