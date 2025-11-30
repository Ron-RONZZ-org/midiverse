<template>
  <div>
    <nav class="navbar">
      <div class="container">
        <NuxtLink to="/" class="brand">
          <div class="brand-logo">M</div>
          <span>Midiverse</span>
        </NuxtLink>
        <div class="nav-links">
          <NuxtLink to="/markmaps">Explore</NuxtLink>
          <NuxtLink to="/search">Search</NuxtLink>
          <NuxtLink to="/tags">Tags</NuxtLink>
          <NuxtLink to="/keynode">Keynodes</NuxtLink>
          <ClientOnly>
            <template v-if="isAuthenticated">
              <NuxtLink to="/editor">Create</NuxtLink>
              <button @click="showImportModal = true" class="btn btn-info">Import</button>
              <NuxtLink to="/notifications" class="btn btn-notification">
                🔔
                <span v-if="notificationCount > 0" class="notification-badge">{{ notificationCount > 9 ? '9+' : notificationCount }}</span>
              </NuxtLink>
              <NuxtLink v-if="isContentManager" to="/content-management" class="btn btn-purple">Content</NuxtLink>
              <NuxtLink v-if="isAdministrator" to="/admin" class="btn btn-admin">Admin</NuxtLink>
              <NuxtLink :to="dashboardUrl" class="btn">Dashboard</NuxtLink>
              <button @click="handleLogout" class="btn btn-secondary">Logout</button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="btn">Login</NuxtLink>
              <NuxtLink to="/signup" class="btn">Sign Up</NuxtLink>
            </template>
          </ClientOnly>
        </div>
      </div>
    </nav>
    <main>
      <slot />
    </main>
    
    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal">
        <h2>Import Markmaps</h2>
        <p class="modal-description">
          Upload HTML or Markdown files to import as markmaps.
          HTML files will preserve metadata, while Markdown files will use the first line as the title.
        </p>
        
        <div v-if="importError" class="error">{{ importError }}</div>
        <div v-if="importSuccess" class="success">{{ importSuccess }}</div>
        
        <div class="form-group">
          <label for="import-files">Select Files</label>
          <input 
            id="import-files" 
            ref="fileInput"
            type="file" 
            multiple
            accept=".html,.htm,.md,.markdown,.txt"
            @change="handleFileSelect"
            class="file-input"
          />
          <div v-if="selectedFiles.length > 0" class="selected-files">
            <p><strong>Selected files:</strong></p>
            <ul>
              <li v-for="file in selectedFiles" :key="file.name">{{ file.name }} ({{ formatFileSize(file.size) }})</li>
            </ul>
          </div>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="showImportModal = false" class="btn btn-secondary">Cancel</button>
          <button 
            type="button" 
            @click="handleImport" 
            class="btn" 
            :disabled="importLoading || selectedFiles.length === 0"
          >
            {{ importLoading ? 'Importing...' : 'Import' }}
          </button>
        </div>
      </div>
    </div>
    
    <footer class="footer">
      <div class="container">
        <p>&copy; 2025 The Ron Company. GNU Affero General Public License 3.0 .</p>
        <p>Made for the world with love from 🇫🇷</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, currentUser, isContentManager, isAdministrator, logout } = useAuth()
const { authFetch, notificationCount } = useApi()
const { initTheme, setTheme } = useTheme()

const loadNotificationCount = async () => {
  if (!isAuthenticated.value) {
    notificationCount.value = 0
    return
  }
  try {
    const response = await authFetch('/notifications/unread-count')
    if (response.ok) {
      const data = await response.json()
      notificationCount.value = data.count
    }
  } catch (err) {
    console.error('Failed to load notification count', err)
  }
}

// Initialize theme on mount and load user preferences
onMounted(async () => {
  initTheme()
  
  // If user is authenticated, load their theme preference and notification count
  if (isAuthenticated.value) {
    try {
      const response = await authFetch('/users/preferences')
      if (response.ok) {
        const prefs = await response.json()
        setTheme(prefs.darkTheme)
      }
    } catch (err) {
      console.error('Failed to load preferences', err)
    }
    
    // Load notification count
    loadNotificationCount()
  }
})

// Reload notification count when auth changes
watch(isAuthenticated, (val) => {
  if (val) {
    loadNotificationCount()
  } else {
    notificationCount.value = 0
  }
})

// Compute the dashboard URL based on current user
const dashboardUrl = computed(() => {
  if (currentUser.value?.username) {
    return `/profile/${currentUser.value.username}`
  }
  return '/login'
})

const handleLogout = () => {
  logout()
}

// Import modal state
const showImportModal = ref(false)
const selectedFiles = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const importLoading = ref(false)
const importError = ref('')
const importSuccess = ref('')

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = Array.from(target.files)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const handleImport = async () => {
  if (selectedFiles.value.length === 0) {
    importError.value = 'Please select at least one file'
    return
  }

  importLoading.value = true
  importError.value = ''
  importSuccess.value = ''

  try {
    const formData = new FormData()
    selectedFiles.value.forEach(file => {
      formData.append('files', file)
    })

    const response = await authFetch('/markmaps/import', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      importError.value = errorData.message || 'Failed to import files'
      return
    }

    const result = await response.json()

    if (result.count === 1 && result.imported.length === 1 && !result.imported[0].error) {
      // Single file import - redirect to editor
      importSuccess.value = 'File imported successfully! Redirecting to editor...'
      setTimeout(() => {
        navigateTo(`/editor?id=${result.imported[0].id}`)
        showImportModal.value = false
      }, 1000)
    } else if (result.count === 0 && result.imported.length === 1 && result.imported[0].error) {
      // Single file import with error - show specific error
      importError.value = `Failed to import ${result.imported[0].filename}: ${result.imported[0].error}`
    } else {
      // Multiple files or mixed results - show detailed results
      const successCount = result.count
      const errorCount = result.total - result.count
      
      if (errorCount > 0) {
        // Build detailed error message
        const failedFiles = result.imported
          .filter((f: any) => f.error)
          .map((f: any) => `• ${f.filename}: ${f.error}`)
          .join('\n');
        
        if (successCount === 0) {
          importError.value = `All ${errorCount} files failed to import:\n${failedFiles}`
        } else {
          importSuccess.value = `Imported ${successCount} of ${result.total} files. ${errorCount} failed.`
          if (failedFiles) {
            importError.value = `Failed files:\n${failedFiles}`
          }
        }
      } else {
        importSuccess.value = `Successfully imported ${successCount} files!`
      }
      
      // Only redirect if at least one file was successfully imported
      if (successCount > 0) {
        setTimeout(() => {
          navigateTo(dashboardUrl.value)
          showImportModal.value = false
        }, 2000)
      }
    }
  } catch (err: any) {
    importError.value = err.message || 'Failed to import files'
  } finally {
    importLoading.value = false
  }
}

// Reset modal state when closed
watch(showImportModal, (newVal) => {
  if (!newVal) {
    selectedFiles.value = []
    importError.value = ''
    importSuccess.value = ''
    importLoading.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
})
</script>

<style scoped>
.navbar {
  background: var(--card-bg);
  box-shadow: 0 2px 4px var(--shadow);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.navbar .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-logo {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links a {
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.5rem 1rem;
  transition: color 0.3s ease;
}

.nav-links a:hover {
  color: #007bff;
}

.nav-links button {
  padding: 0.5rem 1rem;
  font-size: 14px;
}

.btn-info {
  background: #17a2b8;
  color: white;
  border: none;
  cursor: pointer;
}

.btn-info:hover {
  background: #138496;
}

.btn-notification {
  position: relative;
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 0.5rem 0.75rem;
  font-size: 1.1rem;
  cursor: pointer;
}

.btn-notification:hover {
  background: var(--bg-secondary);
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #dc3545;
  color: white;
  font-size: 0.65rem;
  padding: 0.2rem 0.4rem;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
  font-weight: bold;
}

.btn-purple {
  background: #6f42c1;
  color: white;
  border: none;
  cursor: pointer;
}

.btn-purple:hover {
  background: #5a32a3;
}

.btn-admin {
  background: #dc3545;
  color: white;
  border: none;
  cursor: pointer;
}

.btn-admin:hover {
  background: #c82333;
}

main {
  min-height: calc(100vh - 180px);
}

.footer {
  background: #333;
  color: #fff;
  padding: 2rem 0;
  text-align: center;
  margin-top: 2rem;
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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  transition: background-color 0.3s ease;
}

.modal h2 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.modal-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
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

.file-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.selected-files {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.selected-files ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.selected-files li {
  margin: 0.25rem 0;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  white-space: pre-line;
  word-break: break-word;
}

.success {
  background: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  white-space: pre-line;
}
</style>
