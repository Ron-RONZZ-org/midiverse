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
            <div class="profile-name-row">
              <h1>{{ profile.displayName || profile.username }}</h1>
              <span v-if="profile.role === 'administrator'" class="role-badge role-admin">{{ t('profile.administrator') }}</span>
              <span v-else-if="profile.role === 'content_manager'" class="role-badge role-content-manager">{{ t('profile.contentManager') }}</span>
              <span v-else-if="profile.role === 'user'" class="role-badge role-user">{{ t('profile.user') }}</span>
            </div>
            <p class="username">@{{ profile.username }}</p>
            <p v-if="profile.description" class="description">{{ profile.description }}</p>
            <p v-if="profile.email" class="email">{{ profile.email }}</p>
            <p class="joined">
              Joined {{ new Date(profile.createdAt).toLocaleDateString() }}
            </p>
          </div>
        </div>
        
        <div class="stats">
          <div class="stat">
            <strong>{{ profile._count.markmaps }}</strong>
            <span>{{ t('profile.markmaps') }}</span>
          </div>
          <div class="stat">
            <strong>{{ profile._count.viewHistory }}</strong>
            <span>{{ t('profile.views') }}</span>
          </div>
          <div class="stat">
            <strong>{{ profile._count.interactions }}</strong>
            <span>{{ t('profile.interactions') }}</span>
          </div>
        </div>

        <div v-if="profile.isOwnProfile" class="actions">
          <button @click="showEditModal = true" class="btn btn-secondary">Edit Profile</button>
          <button @click="showPreferencesModal = true" class="btn btn-secondary">User Preferences</button>
          <button @click="showSettingsModal = true" class="btn btn-secondary">Account Settings</button>
        </div>
      </div>

      <div class="profile-content">
        <h2>{{ profile.isOwnProfile ? 'Your Markmaps' : `${profile.username}'s Markmaps` }}</h2>
        
        <!-- Filters and sorting for own profile -->
        <div v-if="profile.isOwnProfile && markmaps.length > 0" class="markmap-controls card">
          <div class="control-row">
            <div class="control-group">
              <label>{{ t('profile.visibility') }}</label>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="visibilityFilters.published" @change="applyFilters" />
                  {{ t('profile.public') }}
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="visibilityFilters.private" @change="applyFilters" />
                  {{ t('profile.private') }}
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="visibilityFilters.actionRequired" @change="applyFilters" />
                  Action Required
                </label>
              </div>
            </div>
            
            <div class="control-group">
              <label>Sort By</label>
              <select v-model="sortBy" @change="applyFilters" class="form-control">
                <option value="created-desc">Creation Date (Newest)</option>
                <option value="created-asc">Creation Date (Oldest)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
            
            <div class="control-group search-group">
              <label>{{ t('common.search') }}</label>
              <input 
                type="text" 
                v-model="markmapSearch" 
                @input="applyFilters" 
                :placeholder="t('profile.searchPlaceholder')" 
                class="form-control"
              />
            </div>
          </div>
        </div>
        
        <div v-if="filteredMarkmaps.length === 0 && markmaps.length > 0" class="no-results">
          No markmaps match your filters.
        </div>
        <div v-else-if="markmaps.length === 0" class="no-results">
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
            v-for="markmap in filteredMarkmaps" 
            :key="markmap.id" 
            class="markmap-card-wrapper"
          >
            <NuxtLink 
              :to="markmap.isRetired && markmap.reviewStatus === 'action_required' ? `/editor?id=${markmap.id}` : `/markmaps/${markmap.id}`"
              class="markmap-card"
            >
              <div class="card-header">
                <h3>{{ markmap.title }}</h3>
                <!-- Status tags for own profile -->
                <div v-if="profile.isOwnProfile" class="status-tags">
                  <span v-if="markmap.isRetired && markmap.reviewStatus === 'action_required'" class="status-tag status-action-required">
                    Action Required
                  </span>
                  <span v-else-if="markmap.isRetired && markmap.reviewStatus === 'pending_review'" class="status-tag status-pending">
                    Pending Review
                  </span>
                  <span v-else-if="markmap.isPublic && !markmap.isRetired" class="status-tag status-published">
                    Published
                  </span>
                </div>
              </div>
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
              Dark Theme
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

          <div class="form-group">
            <h3>Email Notifications</h3>
            <div class="email-pref-item">
              <label for="emailEssentialNotifications" class="checkbox-label checkbox-disabled">
                <input 
                  id="emailEssentialNotifications"
                  type="checkbox" 
                  checked
                  disabled
                />
                Essential Account Notifications
              </label>
              <small class="form-text">Password resets, security alerts, etc. (always enabled)</small>
            </div>
          </div>

          <div class="form-group">
            <label for="emailComplaintsNotifications" class="checkbox-label">
              <input 
                id="emailComplaintsNotifications"
                type="checkbox" 
                v-model="preferencesForm.emailComplaintsNotifications"
              />
              Complaints Related Notifications
            </label>
            <small class="form-text">Notifications about complaints on your markmaps</small>
          </div>

          <div class="form-group">
            <h3>Default Editor Options</h3>
            <small class="form-text">These settings will be pre-filled when creating new markmaps</small>
            
            <div class="form-group" style="margin-top: 1rem;">
              <label for="defaultEditorLanguage">Language</label>
              <input 
                id="defaultEditorLanguage" 
                v-model="preferencesForm.defaultEditorLanguage" 
                type="text" 
                class="form-control"
                placeholder="e.g., en (leave empty for no default)"
              />
            </div>

            <div class="form-group">
              <label for="defaultEditorMaxWidth">Max Width</label>
              <input 
                id="defaultEditorMaxWidth" 
                v-model.number="preferencesForm.defaultEditorMaxWidth" 
                type="number" 
                class="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            <div class="form-group">
              <label for="defaultEditorColorFreezeLevel">Color Freeze Level</label>
              <input 
                id="defaultEditorColorFreezeLevel" 
                v-model.number="preferencesForm.defaultEditorColorFreezeLevel" 
                type="number" 
                class="form-control"
                placeholder="0"
                min="0"
              />
            </div>

            <div class="form-group">
              <label for="defaultEditorInitialExpandLevel">Initial Expand Level</label>
              <input 
                id="defaultEditorInitialExpandLevel" 
                v-model.number="preferencesForm.defaultEditorInitialExpandLevel" 
                type="number" 
                class="form-control"
                placeholder="-1 for all"
                min="-1"
              />
              <small class="form-text">Use -1 to expand all nodes by default</small>
            </div>
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

   <!-- account settings modal-->
        <div v-if="showSettingsModal" class="modal-overlay" @click.self="showSettingsModal = false">
      <div class="modal">
        <h2>{{ t('profile.accountSettings') }}</h2>
        <div v-if="settingsError" class="error">{{ settingsError }}</div>
        <div v-if="settingsSuccess" class="success-message">{{ settingsSuccess }}</div>
        <form @submit.prevent="updateSettings">
          <div class="form-group">
            <label for="email">{{ t('profile.email') }}</label>
            <input 
              id="email" 
              v-model="settingsForm.email" 
              type="email" 
              class="form-control"
              :placeholder="profile.email"
            />
            <small v-if="profile.pendingEmail" class="form-text pending-email">
              ⏳ {{ t('profile.pendingVerification') }}: {{ profile.pendingEmail }}
              <button type="button" @click="cancelPendingEmail" class="btn-link">{{ t('common.cancel') }}</button>
            </small>
            <small v-else-if="profile.lastEmailChange" class="form-text">
              {{ t('profile.lastChanged') }}: {{ new Date(profile.lastEmailChange).toLocaleDateString() }}
            </small>
          </div>
          <div class="form-group">
            <label for="username">{{ t('profile.username') }}</label>
            <input 
              id="username" 
              v-model="settingsForm.username" 
              type="text" 
              class="form-control"
              :placeholder="profile.username"
            />
            <small v-if="profile.lastUsernameChange" class="form-text">
              {{ t('profile.lastChanged') }}: {{ new Date(profile.lastUsernameChange).toLocaleDateString() }}
            </small>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showSettingsModal = false" class="btn btn-secondary">{{ t('common.cancel') }}</button>
            <button type="submit" class="btn" :disabled="settingsLoading">
              {{ settingsLoading ? t('profile.saving') : t('profile.saveSettings') }}
            </button>
          </div>
        </form>

        <hr class="settings-divider" />

        <h3>Change Password</h3>
        <div v-if="passwordError" class="error">{{ passwordError }}</div>
        <div v-if="passwordSuccess" class="success-message">{{ passwordSuccess }}</div>
        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label for="currentPassword">Current Password</label>
            <input 
              id="currentPassword" 
              v-model="passwordForm.currentPassword" 
              type="password" 
              class="form-control"
              placeholder="Enter current password"
              required
            />
          </div>
          <div class="form-group">
            <label for="newPassword">New Password</label>
            <input 
              id="newPassword" 
              v-model="passwordForm.newPassword" 
              type="password" 
              class="form-control"
              placeholder="Enter new password (min 6 characters)"
              minlength="6"
              required
            />
          </div>
          <div class="form-group">
            <label for="confirmPassword">Confirm New Password</label>
            <input 
              id="confirmPassword" 
              v-model="passwordForm.confirmPassword" 
              type="password" 
              class="form-control"
              placeholder="Confirm new password"
              minlength="6"
              required
            />
          </div>

          <div class="modal-actions">
            <button type="submit" class="btn" :disabled="passwordLoading">
              {{ passwordLoading ? 'Changing...' : 'Change Password' }}
            </button>
          </div>
        </form>

        <hr class="settings-divider" />

        <h3>API Keys</h3>
        <p class="api-keys-description">
          API keys allow you to access the Midiverse API programmatically. Create keys with different permissions based on your needs.
        </p>
        
        <div v-if="apiKeysError" class="error">{{ apiKeysError }}</div>
        <div v-if="apiKeysSuccess" class="success-message">{{ apiKeysSuccess }}</div>
        
        <!-- Create API Key Form -->
        <form @submit.prevent="createApiKey" class="api-key-create-form">
          <div class="form-group">
            <label for="apiKeyName">Key Name</label>
            <input 
              id="apiKeyName" 
              v-model="apiKeyForm.name" 
              type="text" 
              class="form-control"
              placeholder="e.g., Production App, Testing Script"
              required
            />
            <small class="form-text">A descriptive name to help you identify this key</small>
          </div>
          
          <div class="form-group">
            <label for="apiKeyPermission">Permission Level</label>
            <select 
              id="apiKeyPermission" 
              v-model="apiKeyForm.permission" 
              class="form-control"
              required
            >
              <option value="read_only">Read Only (fetch/search markmaps)</option>
              <option value="full_access">Full Access (create/edit/delete markmaps)</option>
            </select>
            <small class="form-text">Choose the access level for this API key</small>
          </div>
          
          <div class="form-group">
            <label for="apiKeyExpires">Expiration (Optional)</label>
            <input 
              id="apiKeyExpires" 
              v-model="apiKeyForm.expiresAt" 
              type="date" 
              class="form-control"
              :min="new Date().toISOString().split('T')[0]"
            />
            <small class="form-text">Leave empty for a key that never expires</small>
          </div>
          
          <div class="modal-actions">
            <button type="submit" class="btn" :disabled="apiKeyLoading">
              {{ apiKeyLoading ? 'Generating...' : 'Generate API Key' }}
            </button>
          </div>
        </form>

        <!-- Show new key once after creation -->
        <div v-if="newApiKey" class="api-key-reveal">
          <div class="api-key-warning">
            ⚠️ <strong>Important:</strong> Copy this API key now. You won't be able to see it again!
          </div>
          <div class="api-key-display">
            <code>{{ newApiKey }}</code>
            <button @click="copyApiKey" class="btn-icon" title="Copy to clipboard">
              {{ copiedApiKey ? '✓ Copied' : '📋 Copy' }}
            </button>
          </div>
        </div>

        <!-- List of existing API keys -->
        <div v-if="apiKeys.length > 0" class="api-keys-list">
          <h4>Your API Keys</h4>
          <div v-for="key in apiKeys" :key="key.id" class="api-key-item">
            <div class="api-key-info">
              <div class="api-key-name">
                <strong>{{ key.name }}</strong>
                <span class="api-key-prefix">{{ key.prefix }}...</span>
              </div>
              <div class="api-key-meta">
                <span :class="['permission-badge', `permission-${key.permission}`]">
                  {{ key.permission === 'read_only' ? 'Read Only' : 'Full Access' }}
                </span>
                <span class="api-key-date">
                  Created: {{ new Date(key.createdAt).toLocaleDateString() }}
                </span>
                <span v-if="key.lastUsedAt" class="api-key-date">
                  Last used: {{ new Date(key.lastUsedAt).toLocaleDateString() }}
                </span>
                <span v-else class="api-key-date">Never used</span>
                <span v-if="key.expiresAt" class="api-key-date" :class="{ 'expired': new Date(key.expiresAt) < new Date() }">
                  {{ new Date(key.expiresAt) < new Date() ? 'Expired' : 'Expires' }}: {{ new Date(key.expiresAt).toLocaleDateString() }}
                </span>
              </div>
            </div>
            <button @click="deleteApiKey(key.id)" class="btn btn-danger btn-sm" :disabled="apiKeyDeleteLoading === key.id">
              {{ apiKeyDeleteLoading === key.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
        <div v-else-if="!apiKeyLoading && apiKeys.length === 0" class="no-api-keys">
          No API keys created yet. Generate one above to get started.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { authFetch, setUser } = useApi()
const { isAuthenticated, currentUser } = useAuth()
const { setTheme } = useTheme()

const username = computed(() => route.params.username as string)
const profile = ref<any>(null)
const markmaps = ref<any[]>([])
const deletedMarkmaps = ref<any[]>([])
const loading = ref(true)
const error = ref('')

// Markmap filters and sorting for own profile
const visibilityFilters = ref({
  published: true,
  private: true,
  actionRequired: true
})
const sortBy = ref('created-desc')
const markmapSearch = ref('')

const filteredMarkmaps = computed(() => {
  if (!profile.value?.isOwnProfile) {
    return markmaps.value
  }
  
  let filtered = [...markmaps.value]
  
  // Apply visibility filters
  filtered = filtered.filter(m => {
    if (m.isRetired && m.reviewStatus === 'action_required') {
      return visibilityFilters.value.actionRequired
    } else if (!m.isPublic) {
      return visibilityFilters.value.private
    } else {
      return visibilityFilters.value.published
    }
  })
  
  // Apply search filter
  if (markmapSearch.value.trim()) {
    const search = markmapSearch.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.title.toLowerCase().includes(search) || 
      m.text.toLowerCase().includes(search)
    )
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'created-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'created-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'title-asc':
        return a.title.localeCompare(b.title)
      case 'title-desc':
        return b.title.localeCompare(a.title)
      default:
        return 0
    }
  })
  
  return filtered
})

const applyFilters = () => {
  // Filters are automatically applied through the computed property
  // This function exists for explicit change events
}

const showEditModal = ref(false)
const editForm = ref({ 
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
  emailVisible: true,
  emailComplaintsNotifications: true,
  defaultEditorLanguage: '',
  defaultEditorMaxWidth: null as number | null,
  defaultEditorColorFreezeLevel: null as number | null,
  defaultEditorInitialExpandLevel: null as number | null
})
const preferencesError = ref('')
const preferencesLoading = ref(false)

const showSettingsModal = ref(false)
const settingsForm = ref({
  email: '', 
  username: '',
})
const settingsError = ref('')
const settingsSuccess = ref('')
const settingsLoading = ref(false)

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordError = ref('')
const passwordSuccess = ref('')
const passwordLoading = ref(false)

// API Keys
const apiKeys = ref<any[]>([])
const apiKeyForm = ref({
  name: '',
  permission: 'read_only',
  expiresAt: ''
})
const newApiKey = ref('')
const copiedApiKey = ref(false)
const apiKeysError = ref('')
const apiKeysSuccess = ref('')
const apiKeyLoading = ref(false)
const apiKeyDeleteLoading = ref<string | null>(null)

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
      
      // Load API keys if viewing own profile
      loadApiKeys()
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
      editError.value = errorData.message || '[Unknown error] Failed to update profile'
      return
    }

    const updatedProfile = await response.json()
    
    // Update the stored user data if this is the current user's profile
    if (currentUser.value && currentUser.value.id === profile.value.id) {
      setUser({
        ...currentUser.value,
        displayName: updatedProfile.displayName,
        description: updatedProfile.description,
        profilePictureUrl: updatedProfile.profilePictureUrl,
        profileBackgroundColor: updatedProfile.profileBackgroundColor,
      })
    }    
  
      // Reload profile
      await loadProfile()
    
    
    showEditModal.value = false
    editForm.value = { 
      displayName: '',
      description: '',
      profilePictureUrl: '',
      profileBackgroundColor: ''
    }
  } catch (err: any) {
    editError.value = err.message || '[Unknown error] Failed to update profile'
  } finally {
    editLoading.value = false
  }
}

const updateSettings = async () => {
  settingsLoading.value = true
  settingsError.value = ''
  settingsSuccess.value = ''
  
  try {
    const updateData: any = {}
    if (settingsForm.value.email && settingsForm.value.email !== profile.value.email) {
      updateData.email = settingsForm.value.email
    }
    if (settingsForm.value.username && settingsForm.value.username !== profile.value.username) {
      updateData.username = settingsForm.value.username
    }

    if (Object.keys(updateData).length === 0) {
      showSettingsModal.value = false
      return
    }

    const response = await authFetch('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      settingsError.value = errorData.message || '[Unknown error] Failed to update account settings'
      return
    }

    const updatedSettings = await response.json()

    // Show success message if email change was requested
    if (updatedSettings.emailChangeRequested) {
      settingsSuccess.value = 'A verification email has been sent to your new email address. Please check your inbox to complete the change.'
      // Reload profile to show pending email
      await loadProfile()
      settingsForm.value.email = ''
      return
    }

    // Update the stored user data if this is the current user's settings
    if (currentUser.value && currentUser.value.id === profile.value.id) {
      setUser({
        ...currentUser.value,
        username: updatedSettings.username ?? currentUser.value.username,
        email: updatedSettings.email ?? currentUser.value.email,
      })
    }

    // If username changed, redirect to new profile URL
    if (updateData.username) {
      navigateTo(`/profile/${updatedSettings.username}`)
    } else {
      // Reload profile
      await loadProfile()
    }

    showSettingsModal.value = false
    settingsForm.value = {
      email: '',
      username: '',
    }
  } catch (err: any) {
    settingsError.value = err.message || '[Unknown error] Failed to update account settings'
  } finally {
    settingsLoading.value = false
  }
}

const cancelPendingEmail = async () => {
  try {
    const response = await authFetch('/users/cancel-pending-email', {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json()
      settingsError.value = errorData.message || 'Failed to cancel pending email change'
      return
    }

    settingsSuccess.value = 'Pending email change cancelled'
    await loadProfile()
  } catch (err: any) {
    settingsError.value = err.message || 'Failed to cancel pending email change'
  }
}

const changePassword = async () => {
  passwordLoading.value = true
  passwordError.value = ''
  passwordSuccess.value = ''

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordError.value = 'New passwords do not match'
    passwordLoading.value = false
    return
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordError.value = 'New password must be at least 6 characters'
    passwordLoading.value = false
    return
  }

  try {
    const response = await authFetch('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      passwordError.value = errorData.message || 'Failed to change password'
      return
    }

    const data = await response.json()
    passwordSuccess.value = data.message || 'Password changed successfully'
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (err: any) {
    passwordError.value = err.message || 'Failed to change password'
  } finally {
    passwordLoading.value = false
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
        emailVisible: prefs.emailVisible,
        emailComplaintsNotifications: prefs.emailComplaintsNotifications ?? true,
        defaultEditorLanguage: prefs.defaultEditorLanguage ?? '',
        defaultEditorMaxWidth: prefs.defaultEditorMaxWidth ?? null,
        defaultEditorColorFreezeLevel: prefs.defaultEditorColorFreezeLevel ?? null,
        defaultEditorInitialExpandLevel: prefs.defaultEditorInitialExpandLevel ?? null
      }
      // Apply the theme immediately
      setTheme(prefs.darkTheme)
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

    // Apply the theme immediately
    setTheme(preferencesForm.value.darkTheme)
    
    showPreferencesModal.value = false
    // Reload profile to reflect changes
    await loadProfile()
  } catch (err: any) {
    preferencesError.value = err.message || 'Failed to update preferences'
  } finally {
    preferencesLoading.value = false
  }
}

// API Key functions
const loadApiKeys = async () => {
  try {
    const response = await authFetch('/api-keys')
    if (response.ok) {
      apiKeys.value = await response.json()
    }
  } catch (err: any) {
    console.error('Failed to load API keys:', err)
  }
}

const createApiKey = async () => {
  apiKeyLoading.value = true
  apiKeysError.value = ''
  apiKeysSuccess.value = ''
  newApiKey.value = ''
  copiedApiKey.value = false
  
  try {
    const response = await authFetch('/api-keys', {
      method: 'POST',
      body: JSON.stringify({
        name: apiKeyForm.value.name,
        permission: apiKeyForm.value.permission,
        expiresAt: apiKeyForm.value.expiresAt || undefined
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      apiKeysError.value = errorData.message || 'Failed to create API key'
      return
    }
    
    const result = await response.json()
    newApiKey.value = result.key
    apiKeysSuccess.value = 'API key created successfully! Copy it now.'
    
    // Reset form
    apiKeyForm.value = {
      name: '',
      permission: 'read_only',
      expiresAt: ''
    }
    
    // Reload API keys list
    await loadApiKeys()
  } catch (err: any) {
    apiKeysError.value = err.message || 'Failed to create API key'
  } finally {
    apiKeyLoading.value = false
  }
}

const copyApiKey = async () => {
  try {
    await navigator.clipboard.writeText(newApiKey.value)
    copiedApiKey.value = true
    setTimeout(() => {
      copiedApiKey.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy API key:', err)
  }
}

const deleteApiKey = async (keyId: string) => {
  if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
    return
  }
  
  apiKeyDeleteLoading.value = keyId
  apiKeysError.value = ''
  
  try {
    const response = await authFetch(`/api-keys/${keyId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      apiKeysError.value = errorData.message || 'Failed to delete API key'
      return
    }
    
    apiKeysSuccess.value = 'API key deleted successfully'
    await loadApiKeys()
    
    setTimeout(() => {
      apiKeysSuccess.value = ''
    }, 3000)
  } catch (err: any) {
    apiKeysError.value = err.message || 'Failed to delete API key'
  } finally {
    apiKeyDeleteLoading.value = null
  }
}

// Populate edit form when modal is opened
watch(showEditModal, (newVal) => {
  if (newVal && profile.value?.isOwnProfile) {
    editForm.value = {
      displayName: profile.value.displayName || '',
      description: profile.value.description || '',
      profilePictureUrl: profile.value.profilePictureUrl || '',
      profileBackgroundColor: profile.value.profileBackgroundColor || ''
    }
  }
})

// Open preferences modal and load preferences
watch(showPreferencesModal, (newVal) => {
  if (newVal && profile.value?.isOwnProfile) {
    loadPreferences()
  }
})

// Populate settings form when modal is opened and reset when closed
watch(showSettingsModal, (newVal) => {
  if (newVal && profile.value?.isOwnProfile) {
    settingsForm.value = {
      email: profile.value.email || '',
      username: profile.value.username || '',
    }
    settingsError.value = ''
    settingsSuccess.value = ''
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    passwordError.value = ''
    passwordSuccess.value = ''
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
  color: var(--text-primary);
}

.loading {
  text-align: center;
  padding: 4rem;
  color: var(--text-secondary);
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.profile-picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
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
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.description {
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  font-size: 1rem;
}

.email {
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.joined {
  color: var(--text-tertiary);
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
  background: var(--bg-secondary);
}

.markmap-card {
  background: var(--card-bg);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, background-color 0.3s ease, box-shadow 0.3s ease;
  display: block;
}

a.markmap-card:hover {
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.card-header h3 {
  margin: 0 0 0.5rem 0;
  flex: 1;
}

.status-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.status-published {
  background-color: #28a745;
  color: white;
}

.status-action-required {
  background-color: #dc3545;
  color: white;
}

.status-pending {
  background-color: #ffc107;
  color: #212529;
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
  background: var(--card-bg);
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  transition: background-color 0.3s ease;
}

.modal h2 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
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
  padding: 0.5rem;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-primary);
  transition: background-color 0.3s ease, border-color 0.3s ease;
}

textarea.form-control {
  resize: vertical;
  min-height: 80px;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
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
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.role-admin {
  background-color: #dc3545;
  color: white;
}

.role-content-manager {
  background-color: #6f42c1;
  color: white;
}

.role-user {
  background-color: #3c3c3c;
  color: white;
}

.email-pref-item {
  margin-bottom: 0.75rem;
}

.checkbox-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #c3e6cb;
}

.settings-divider {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid var(--border-color, #dee2e6);
}

.modal h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.pending-email {
  color: #856404;
  background-color: #fff3cd;
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-link {
  background: none;
  border: none;
  color: #dc3545;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.875rem;
  padding: 0;
}

.btn-link:hover {
  color: #a71d2a;
}

/* API Keys styles */
.api-keys-description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.api-key-create-form {
  background: var(--background-secondary);
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.api-key-reveal {
  background: #fff3cd;
  border: 2px solid #ffc107;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.api-key-warning {
  color: #856404;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.api-key-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.75rem;
  border-radius: 4px;
  border: 1px solid #ffc107;
}

.api-key-display code {
  flex: 1;
  font-family: monospace;
  font-size: 0.9rem;
  word-break: break-all;
  color: #333;
}

.api-keys-list {
  margin-top: 2rem;
}

.api-keys-list h4 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.api-key-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--background-secondary);
  border-radius: 8px;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border-color);
}

.api-key-info {
  flex: 1;
}

.api-key-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.api-key-name strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.api-key-prefix {
  font-family: monospace;
  background: var(--background-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.api-key-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.permission-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.permission-badge.permission-read_only {
  background: #e3f2fd;
  color: #1976d2;
}

.permission-badge.permission-full_access {
  background: #fff3e0;
  color: #f57c00;
}

.api-key-date {
  color: var(--text-secondary);
}

.api-key-date.expired {
  color: #dc3545;
  font-weight: 600;
}

.no-api-keys {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  background: var(--background-secondary);
  border-radius: 8px;
  margin-top: 1rem;
}

/* Markmap controls */
.markmap-controls {
  margin-bottom: 1.5rem;
  padding: 1rem;
}

.control-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.checkbox-group {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: normal;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.search-group input {
  width: 100%;
}

@media (max-width: 768px) {
  .control-row {
    grid-template-columns: 1fr;
  }
}
</style>
