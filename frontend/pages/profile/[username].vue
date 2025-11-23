<template>
  <div class="container">
    <div v-if="loading" class="loading">Loading profile...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="profile">
      <div class="profile-header card">
        <div class="profile-header-content">
          <div v-if="profile.profilePictureUrl" class="profile-picture" :style="profile.profileBackgroundColor ? { backgroundColor: profile.profileBackgroundColor } : {}">
            <img :src="profile.profilePictureUrl" :alt="`${profile.username}'s profile picture`" />
          </div>
          <div v-else class="profile-picture-placeholder" :style="profile.profileBackgroundColor ? { backgroundColor: profile.profileBackgroundColor } : {}">
            {{ profile.username.charAt(0).toUpperCase() }}
          </div>
          <div class="profile-info">
            <h1>{{ profile.displayName || profile.username }}</h1>
            <p class="username">@{{ profile.username }}</p>
            <p v-if="profile.description" class="description">{{ profile.description }}</p>
            <p v-if="profile.isOwnProfile && profile.email" class="email">{{ profile.email }}</p>
            <p v-else-if="!profile.isOwnProfile && profile.email" class="email">{{ profile.email }}</p>
            <p class="joined">
              Joined {{ new Date(profile.createdAt).toLocaleDateString() }}
            </p>
          </div>
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
          <button @click="showPreferencesModal = true" class="btn btn-secondary">User Preferences</button>
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
            <label for="displayName">Display Name</label>
            <input 
              id="displayName" 
              v-model="editForm.displayName" 
              type="text" 
              class="form-control"
              :placeholder="profile.displayName || profile.username"
            />
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              v-model="editForm.description" 
              rows="3"
              class="form-control"
              :placeholder="profile.description || 'Tell us about yourself...'"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="profilePictureUrl">Profile Picture URL</label>
            <input 
              id="profilePictureUrl" 
              v-model="editForm.profilePictureUrl" 
              type="url" 
              class="form-control"
              :placeholder="profile.profilePictureUrl || 'https://example.com/your-picture.jpg'"
            />
          </div>
          <div class="form-group">
            <label for="profileBackgroundColor">Profile Picture Background Color (optional)</label>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input 
                id="profileBackgroundColor" 
                v-model="editForm.profileBackgroundColor" 
                type="text" 
                class="form-control"
                placeholder="#FF5733"
                maxlength="7"
                pattern="^#[0-9A-Fa-f]{6}$"
                style="flex: 1;"
              />
              <input 
                v-model="editForm.profileBackgroundColor" 
                type="color" 
                style="width: 50px; height: 38px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;"
                title="Pick a color"
              />
            </div>
            <small class="form-text">Enter a hex color code (e.g., #FF5733) or use the color picker</small>
          </div>
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

    <!-- User Preferences Modal -->
    <div v-if="showPreferencesModal" class="modal-overlay" @click.self="showPreferencesModal = false">
      <div class="modal">
        <h2>User Preferences</h2>
        <div v-if="preferencesError" class="error">{{ preferencesError }}</div>
        <form @submit.prevent="updatePreferences">
          <div class="form-group">
            <h3>Display</h3>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="preferencesForm.darkTheme"
              />
              Dark Theme (coming soon)
            </label>
          </div>
          
          <div class="form-group">
            <h3>Language</h3>
            <select v-model="preferencesForm.language" class="form-control">
              <option value="en">English</option>
            </select>
            <small class="form-text">More languages coming soon</small>
          </div>

          <div class="form-group">
            <h3>Privacy</h3>
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="preferencesForm.profilePageVisible"
              />
              Profile Page Public Visibility
            </label>
            <small class="form-text">When disabled, other users cannot view your profile page</small>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="preferencesForm.profilePictureVisible"
              />
              Profile Picture Public Visibility
            </label>
            <small class="form-text">When disabled, your profile picture is hidden from other users</small>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                v-model="preferencesForm.emailVisible"
              />
              Email Address Public Visibility
            </label>
            <small class="form-text">When disabled, your email is hidden from other users</small>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showPreferencesModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn" :disabled="preferencesLoading">
              {{ preferencesLoading ? 'Saving...' : 'Save Preferences' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch, setUser } = useApi()
const { isAuthenticated, currentUser } = useAuth()

const username = computed(() => route.params.username as string)
const profile = ref<any>(null)
const markmaps = ref<any[]>([])
const deletedMarkmaps = ref<any[]>([])
const loading = ref(true)
const error = ref('')

const showEditModal = ref(false)
const editForm = ref({ 
  email: '', 
  username: '',
  displayName: '',
  description: '',
  profilePictureUrl: '',
  profileBackgroundColor: ''
})
const editError = ref('')
const editLoading = ref(false)

const showPreferencesModal = ref(false)
const preferencesForm = ref({
  darkTheme: false,
  language: 'en',
  profilePageVisible: true,
  profilePictureVisible: true,
  emailVisible: true
})
const preferencesError = ref('')
const preferencesLoading = ref(false)

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
    if (editForm.value.displayName && editForm.value.displayName !== profile.value.displayName) {
      updateData.displayName = editForm.value.displayName
    }
    if (editForm.value.description && editForm.value.description !== profile.value.description) {
      updateData.description = editForm.value.description
    }
    if (editForm.value.profilePictureUrl && editForm.value.profilePictureUrl !== profile.value.profilePictureUrl) {
      updateData.profilePictureUrl = editForm.value.profilePictureUrl
    }
    if (editForm.value.profileBackgroundColor !== undefined && editForm.value.profileBackgroundColor !== profile.value.profileBackgroundColor) {
      updateData.profileBackgroundColor = editForm.value.profileBackgroundColor || null
    }
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
    
    // Update the stored user data if this is the current user's profile
    if (currentUser.value && currentUser.value.id === profile.value.id) {
      setUser({
        ...currentUser.value,
        username: updatedProfile.username,
        email: updatedProfile.email,
        displayName: updatedProfile.displayName,
        description: updatedProfile.description,
        profilePictureUrl: updatedProfile.profilePictureUrl,
        profileBackgroundColor: updatedProfile.profileBackgroundColor,
      })
    }
    
    // If username changed, redirect to new profile URL
    if (updateData.username) {
      navigateTo(`/profile/${updatedProfile.username}`)
    } else {
      // Reload profile
      await loadProfile()
    }
    
    showEditModal.value = false
    editForm.value = { 
      email: '', 
      username: '',
      displayName: '',
      description: '',
      profilePictureUrl: ''
    }
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
      const duplicatedMarkmap = await response.json()
      // Add the duplicated markmap to the list without full reload
      markmaps.value.unshift(duplicatedMarkmap)
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
      // Update local state instead of reloading to preserve scroll position
      const deletedMarkmap = markmaps.value.find(m => m.id === id)
      if (deletedMarkmap) {
        // Move from active markmaps to deleted markmaps
        markmaps.value = markmaps.value.filter(m => m.id !== id)
        deletedMarkmaps.value.unshift({
          ...deletedMarkmap,
          deletedAt: new Date().toISOString()
        })
      }
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
      const restoredMarkmap = await response.json()
      // Move from deleted to active markmaps without full reload
      deletedMarkmaps.value = deletedMarkmaps.value.filter(m => m.id !== id)
      markmaps.value.unshift(restoredMarkmap)
    } else {
      alert('Failed to restore markmap')
    }
  } catch (err) {
    alert('Failed to restore markmap')
  }
}

const loadPreferences = async () => {
  try {
    const response = await authFetch('/users/preferences')
    if (response.ok) {
      const prefs = await response.json()
      preferencesForm.value = {
        darkTheme: prefs.darkTheme,
        language: prefs.language,
        profilePageVisible: prefs.profilePageVisible,
        profilePictureVisible: prefs.profilePictureVisible,
        emailVisible: prefs.emailVisible
      }
    }
  } catch (err) {
    console.error('Failed to load preferences', err)
  }
}

const updatePreferences = async () => {
  preferencesLoading.value = true
  preferencesError.value = ''
  
  try {
    const response = await authFetch('/users/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferencesForm.value),
    })

    if (!response.ok) {
      const errorData = await response.json()
      preferencesError.value = errorData.message || 'Failed to update preferences'
      return
    }

    showPreferencesModal.value = false
    // Reload profile to reflect changes
    await loadProfile()
  } catch (err: any) {
    preferencesError.value = err.message || 'Failed to update preferences'
  } finally {
    preferencesLoading.value = false
  }
}

// Open preferences modal and load preferences
watch(showPreferencesModal, (newVal) => {
  if (newVal && profile.value?.isOwnProfile) {
    loadPreferences()
  }
})

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

.profile-header-content {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.profile-picture {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.profile-picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-picture-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  flex-shrink: 0;
}

.profile-info {
  flex: 1;
}

.username {
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.description {
  color: #444;
  margin-bottom: 0.75rem;
  font-size: 1rem;
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

textarea.form-control {
  resize: vertical;
  min-height: 80px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.form-group h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #495057;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 0.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}
</style>
