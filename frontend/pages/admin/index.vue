<template>
  <div class="container">
    <div v-if="!hasAccess" class="access-denied">
      <h1>Access Denied</h1>
      <p>You need to be an administrator to access this page.</p>
      <NuxtLink to="/" class="btn">Go Home</NuxtLink>
    </div>
    
    <div v-else>
      <h1>Administrator Panel</h1>
      
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'users' }]" 
          @click="activeTab = 'users'"
        >
          User Management
        </button>
        <button 
          :class="['tab', { active: activeTab === 'appeals' }]" 
          @click="activeTab = 'appeals'; loadAppeals()"
        >
          Appealed Complaints ({{ appealedComplaints.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'keynodes' }]" 
          @click="activeTab = 'keynodes'"
        >
          Keynode Hierarchy
        </button>
      </div>
      
      <!-- Users Tab -->
      <div v-if="activeTab === 'users'" class="tab-content">
        <h2>User Management</h2>
        <p class="description">Manage user roles and account status.</p>
        
        <div v-if="actionSuccess" class="success-message">{{ actionSuccess }}</div>
        <div v-if="actionError" class="error-message">{{ actionError }}</div>
        
        <div class="search-bar">
          <input 
            v-model="userSearch" 
            @input="debouncedSearch"
            class="form-control" 
            placeholder="Search users by username, email, or display name..."
          />
          <select v-model="roleFilter" @change="loadUsers" class="form-control filter-select">
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="content_manager">Content Manager</option>
            <option value="administrator">Administrator</option>
          </select>
          <select v-model="statusFilter" @change="loadUsers" class="form-control filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        
        <div v-if="loadingUsers" class="loading">Loading users...</div>
        <div v-else-if="users.length === 0" class="empty-state">
          No users found.
        </div>
        <div v-else>
          <table class="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Markmaps</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <NuxtLink :to="`/profile/${user.username}`">
                    {{ user.displayName || user.username }}
                  </NuxtLink>
                  <div class="user-username">@{{ user.username }}</div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span :class="['role-badge', `role-${user.role}`]">
                    {{ formatRole(user.role) }}
                  </span>
                </td>
                <td>
                  <span :class="['status-badge', `status-${user.status}`]">
                    {{ user.status }}
                  </span>
                  <div v-if="user.status === 'suspended' && user.suspendedUntil" class="suspended-until">
                    Until: {{ new Date(user.suspendedUntil).toLocaleDateString() }}
                  </div>
                </td>
                <td>{{ user._count?.markmaps || 0 }}</td>
                <td class="actions-cell">
                  <button @click="openRoleModal(user)" class="btn btn-info btn-sm">Change Role</button>
                  <button 
                    v-if="user.status === 'active'" 
                    @click="openSuspendModal(user)" 
                    class="btn btn-warning btn-sm"
                    :disabled="actionLoading === user.id"
                  >
                    {{ actionLoading === user.id ? 'Suspending...' : 'Suspend' }}
                  </button>
                  <button 
                    v-else 
                    @click="reinstateUser(user.id)" 
                    class="btn btn-success btn-sm"
                    :disabled="actionLoading === user.id"
                  >
                    {{ actionLoading === user.id ? 'Reinstating...' : 'Reinstate' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div class="pagination" v-if="totalPages > 1">
            <button 
              @click="currentPage--; loadUsers()" 
              :disabled="currentPage === 1"
              class="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button 
              @click="currentPage++; loadUsers()" 
              :disabled="currentPage === totalPages"
              class="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      
      <!-- Appeals Tab -->
      <div v-if="activeTab === 'appeals'" class="tab-content">
        <h2>Appealed Complaints</h2>
        <p class="description">Review complaints that were dismissed by content managers and appealed by users.</p>
        
        <div v-if="loadingAppeals" class="loading">Loading appeals...</div>
        <div v-else-if="appealedComplaints.length === 0" class="empty-state">
          No appealed complaints to review.
        </div>
        <div v-else class="card-grid">
          <div v-for="complaint in appealedComplaints" :key="complaint.id" class="item-card">
            <div class="item-header">
              <h3>{{ complaint.markmap?.title || 'Unknown Markmap' }}</h3>
              <span :class="['badge', `reason-${complaint.reason}`]">
                {{ formatReason(complaint.reason) }}
              </span>
            </div>
            <div class="item-meta">
              <span>Reported by: {{ complaint.reporter?.username || 'Anonymous' }}</span>
              <span>Previously dismissed by: {{ complaint.resolvedBy?.username }}</span>
            </div>
            <div class="explanation">
              <strong>Original Explanation:</strong> {{ complaint.explanation }}
            </div>
            <div v-if="complaint.resolution" class="resolution">
              <strong>Previous Resolution:</strong> {{ complaint.resolution }}
            </div>
            <div class="item-actions">
              <NuxtLink :to="`/markmaps/${complaint.markmapId}`" class="btn btn-secondary btn-sm" target="_blank">
                View Markmap
              </NuxtLink>
              <button @click="openResolveAppealModal(complaint, 'sustain')" class="btn btn-danger btn-sm">
                Sustain (Override)
              </button>
              <button @click="openResolveAppealModal(complaint, 'dismiss')" class="btn btn-warning btn-sm">
                Uphold Dismissal
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Keynodes Tab -->
      <div v-if="activeTab === 'keynodes'" class="tab-content">
        <h2>Keynode Hierarchy Editor</h2>
        <p class="description">Manage the keynode hierarchy with the tree editor. Add, rename, move, or delete nodes.</p>
        
        <div class="hierarchy-actions">
          <NuxtLink to="/keynode" class="btn btn-secondary" target="_blank">
            View Public Hierarchy
          </NuxtLink>
          <button @click="loadKeynodeTree" class="btn btn-info" :disabled="loadingTree">
            {{ loadingTree ? 'Loading...' : 'Refresh' }}
          </button>
          <button @click="openAddNodeModal(null)" class="btn btn-success">
            + Add Root Node
          </button>
        </div>
        
        <div v-if="treeSuccess" class="success-message">{{ treeSuccess }}</div>
        <div v-if="treeError" class="error-message">{{ treeError }}</div>
        
        <div class="tree-editor-container">
          <div v-if="loadingTree" class="loading">Loading keynode hierarchy...</div>
          <div v-else-if="keynodeTree.length === 0" class="empty-state">
            No keynodes in the hierarchy yet. Add a root node to get started.
          </div>
          <div v-else class="tree-wrapper">
            <!-- Category groups -->
            <div v-for="category in groupedCategories" :key="category.name" class="category-group">
              <div class="category-header" @click="toggleCategory(category.name)">
                <span class="expand-icon">{{ expandedCategories[category.name] ? '▼' : '▶' }}</span>
                <span class="category-name">{{ formatCategoryName(category.name) }}</span>
                <span class="category-count">({{ category.nodes.length }})</span>
              </div>
              <div v-show="expandedCategories[category.name]" class="category-nodes">
                <KeynodeTreeNode 
                  v-for="node in category.nodes" 
                  :key="node.id" 
                  :node="node" 
                  :all-nodes="keynodeTree"
                  :depth="0"
                  @edit="openEditNodeModal"
                  @add-child="openAddNodeModal"
                  @delete="confirmDeleteNode"
                  @move="openMoveNodeModal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Add/Edit Node Modal -->
      <div v-if="showNodeModal" class="modal-overlay" @click.self="showNodeModal = false">
        <div class="modal">
          <h2>{{ editingNode ? 'Edit Keynode' : 'Add Keynode' }}</h2>
          <div class="form-group">
            <label for="node-name">Name</label>
            <input 
              id="node-name" 
              v-model="nodeForm.name" 
              type="text" 
              class="form-control" 
              placeholder="Enter keynode name..."
            />
          </div>
          <div class="form-group">
            <label for="node-category">Category</label>
            <select id="node-category" v-model="nodeForm.category" class="form-control">
              <option 
                v-for="category in availableCategories" 
                :key="category" 
                :value="category"
              >
                {{ formatCategoryName(category) }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="node-parent">Parent Node (optional)</label>
            <select id="node-parent" v-model="nodeForm.parentId" class="form-control">
              <option :value="null">-- No Parent (Root Node) --</option>
              <option 
                v-for="node in availableParentNodes" 
                :key="node.id" 
                :value="node.id"
              >
                {{ node.name }} ({{ formatCategoryName(node.category) }})
              </option>
            </select>
          </div>
          <p v-if="nodeForm.parentId && parentNode" class="info-text">
            Will be added as a child of "{{ parentNode.name }}"
          </p>
          <div class="modal-actions">
            <button @click="showNodeModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="saveNode" class="btn btn-primary" :disabled="savingNode || !nodeForm.name.trim()">
              {{ savingNode ? 'Saving...' : (editingNode ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Move Node Modal -->
      <div v-if="showMoveModal" class="modal-overlay" @click.self="showMoveModal = false">
        <div class="modal">
          <h2>Move Keynode</h2>
          <p>Move "{{ movingNode?.name }}" to a new parent:</p>
          <div class="form-group">
            <label for="move-parent">New Parent</label>
            <select id="move-parent" v-model="moveToParentId" class="form-control">
              <option :value="null">-- No Parent (Make Root) --</option>
              <option 
                v-for="node in availableMoveTargets" 
                :key="node.id" 
                :value="node.id"
              >
                {{ node.name }} ({{ formatCategoryName(node.category) }})
              </option>
            </select>
          </div>
          <div class="modal-actions">
            <button @click="showMoveModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="moveNode" class="btn btn-primary" :disabled="savingNode">
              {{ savingNode ? 'Moving...' : 'Move' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Change Role Modal -->
      <div v-if="showRoleModal" class="modal-overlay" @click.self="showRoleModal = false">
        <div class="modal">
          <h2>Change User Role</h2>
          <p>Change role for: <strong>{{ selectedUser?.username }}</strong></p>
          <div class="form-group">
            <label for="new-role">New Role</label>
            <select id="new-role" v-model="newRole" class="form-control">
              <option value="user">User</option>
              <option value="content_manager">Content Manager</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div class="modal-actions">
            <button @click="showRoleModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="changeUserRole" class="btn btn-primary">Update Role</button>
          </div>
        </div>
      </div>
      
      <!-- Suspend User Modal -->
      <div v-if="showSuspendModal" class="modal-overlay" @click.self="showSuspendModal = false">
        <div class="modal">
          <h2>Suspend User</h2>
          <p>Suspend <strong>{{ selectedUser?.username }}</strong> for:</p>
          <div class="duration-inputs">
            <div class="form-group">
              <label>Years</label>
              <input type="number" v-model.number="suspendDuration.years" min="0" max="10" class="form-control" />
            </div>
            <div class="form-group">
              <label>Months</label>
              <input type="number" v-model.number="suspendDuration.months" min="0" max="11" class="form-control" />
            </div>
            <div class="form-group">
              <label>Days</label>
              <input type="number" v-model.number="suspendDuration.days" min="0" max="30" class="form-control" />
            </div>
            <div class="form-group">
              <label>Hours</label>
              <input type="number" v-model.number="suspendDuration.hours" min="0" max="23" class="form-control" />
            </div>
          </div>
          <p class="info-text">Leave all at 0 for permanent suspension.</p>
          <div class="modal-actions">
            <button @click="showSuspendModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="suspendUser" class="btn btn-warning">Suspend User</button>
          </div>
        </div>
      </div>
      
      <!-- Resolve Appeal Modal -->
      <div v-if="showResolveAppealModal" class="modal-overlay" @click.self="showResolveAppealModal = false">
        <div class="modal">
          <h2>{{ resolveAction === 'sustain' ? 'Sustain Appeal (Override Dismissal)' : 'Uphold Dismissal' }}</h2>
          <p v-if="resolveAction === 'sustain'">
            This will override the previous dismissal, retire the markmap from public view, and notify the author.
          </p>
          <p v-else>
            This will uphold the original dismissal. The complaint will be closed and the reporter notified.
          </p>
          <div class="form-group">
            <label for="appeal-resolution">Resolution Notes (optional)</label>
            <textarea 
              id="appeal-resolution" 
              v-model="resolutionNotes" 
              class="form-control"
              rows="3"
              placeholder="Add any notes about your decision..."
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showResolveAppealModal = false" class="btn btn-secondary">Cancel</button>
            <button 
              @click="resolveAppeal" 
              :class="['btn', resolveAction === 'sustain' ? 'btn-danger' : 'btn-warning']"
            >
              {{ resolveAction === 'sustain' ? 'Sustain & Retire' : 'Uphold Dismissal' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch } = useApi()
const { currentUser } = useAuth()

const activeTab = ref('users')

// Users state
const users = ref<any[]>([])
const loadingUsers = ref(true)
const userSearch = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

// Role modal
const showRoleModal = ref(false)
const selectedUser = ref<any>(null)
const newRole = ref('user')

// Suspend modal
const showSuspendModal = ref(false)
const suspendDuration = ref({ years: 0, months: 0, days: 0, hours: 0 })

// Action feedback
const actionLoading = ref<string | null>(null)
const actionSuccess = ref('')
const actionError = ref('')

// Keynode tree state
const keynodeTree = ref<any[]>([])
const loadingTree = ref(false)
const savingNode = ref(false)
const treeSuccess = ref('')
const treeError = ref('')
const expandedCategories = ref<Record<string, boolean>>({})
const availableCategories = ref<string[]>([])

// Node modal state
const showNodeModal = ref(false)
const editingNode = ref<any>(null)
const nodeForm = ref({ name: '', category: 'others', parentId: null as string | null })

// Move modal state
const showMoveModal = ref(false)
const movingNode = ref<any>(null)
const moveToParentId = ref<string | null>(null)

// Appeals state
const appealedComplaints = ref<any[]>([])
const loadingAppeals = ref(true)

// Resolve appeal modal
const showResolveAppealModal = ref(false)
const selectedComplaint = ref<any>(null)
const resolveAction = ref<'sustain' | 'dismiss'>('dismiss')
const resolutionNotes = ref('')

const hasAccess = computed(() => {
  return currentUser.value && currentUser.value.role === 'administrator'
})

let searchTimeout: any = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadUsers()
  }, 300)
}

const formatRole = (role: string) => {
  const labels: Record<string, string> = {
    user: 'User',
    content_manager: 'Content Manager',
    administrator: 'Administrator'
  }
  return labels[role] || role
}

const formatReason = (reason: string) => {
  const labels: Record<string, string> = {
    harassment: 'Harassment',
    false_information: 'False Information',
    author_right_infringement: 'Copyright Infringement',
    inciting_violence_hate: 'Violence/Hate',
    discriminatory_abusive: 'Discriminatory'
  }
  return labels[reason] || reason
}

const formatCategoryName = (category: string) => {
  return category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Computed properties for tree editor
const groupedCategories = computed(() => {
  const groups: Record<string, any[]> = {}
  
  // Get root nodes (no parent)
  const rootNodes = keynodeTree.value.filter(n => !n.parentId)
  
  for (const node of rootNodes) {
    if (!groups[node.category]) {
      groups[node.category] = []
    }
    groups[node.category].push(node)
  }
  
  return Object.entries(groups)
    .map(([name, nodes]) => ({ name, nodes: nodes.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const availableParentNodes = computed(() => {
  // When editing, exclude the node itself and its descendants
  if (editingNode.value) {
    const descendants = getDescendantIds(editingNode.value.id)
    return keynodeTree.value.filter(n => n.id !== editingNode.value.id && !descendants.includes(n.id))
  }
  return keynodeTree.value
})

const availableMoveTargets = computed(() => {
  if (!movingNode.value) return []
  const descendants = getDescendantIds(movingNode.value.id)
  return keynodeTree.value.filter(n => n.id !== movingNode.value.id && !descendants.includes(n.id))
})

const parentNode = computed(() => {
  if (!nodeForm.value.parentId) return null
  return keynodeTree.value.find(n => n.id === nodeForm.value.parentId)
})

const getDescendantIds = (nodeId: string): string[] => {
  const children = keynodeTree.value.filter(n => n.parentId === nodeId)
  let ids: string[] = []
  for (const child of children) {
    ids.push(child.id)
    ids = ids.concat(getDescendantIds(child.id))
  }
  return ids
}

const toggleCategory = (categoryName: string) => {
  expandedCategories.value[categoryName] = !expandedCategories.value[categoryName]
}

const loadUsers = async () => {
  loadingUsers.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      perPage: '20'
    })
    if (userSearch.value) params.append('search', userSearch.value)
    if (roleFilter.value) params.append('role', roleFilter.value)
    if (statusFilter.value) params.append('status', statusFilter.value)
    
    const response = await authFetch(`/admin/users?${params}`)
    if (response.ok) {
      const data = await response.json()
      users.value = data.users
      totalPages.value = data.totalPages
    }
  } catch (err) {
    console.error('Failed to load users:', err)
  } finally {
    loadingUsers.value = false
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
    console.error('Failed to load categories:', err)
    // Fallback to minimal list
    availableCategories.value = ['person', 'geographical_location', 'abstract_concept', 'others']
  }
}

const loadKeynodeTree = async () => {
  loadingTree.value = true
  treeError.value = ''
  try {
    // Load categories if not loaded yet
    if (availableCategories.value.length === 0) {
      await loadCategories()
    }
    
    const response = await authFetch('/keynodes/tree')
    if (response.ok) {
      keynodeTree.value = await response.json()
      // Expand all categories by default
      for (const cat of groupedCategories.value) {
        if (expandedCategories.value[cat.name] === undefined) {
          expandedCategories.value[cat.name] = true
        }
      }
    } else {
      treeError.value = 'Failed to load keynode tree'
    }
  } catch (err) {
    console.error('Failed to load keynode tree:', err)
    treeError.value = 'Failed to load keynode tree'
  } finally {
    loadingTree.value = false
  }
}

const openAddNodeModal = (parentId: string | null) => {
  editingNode.value = null
  nodeForm.value = { 
    name: '', 
    category: parentId ? (keynodeTree.value.find(n => n.id === parentId)?.category || 'others') : 'others',
    parentId 
  }
  showNodeModal.value = true
}

const openEditNodeModal = (node: any) => {
  editingNode.value = node
  nodeForm.value = { 
    name: node.name, 
    category: node.category,
    parentId: node.parentId
  }
  showNodeModal.value = true
}

const openMoveNodeModal = (node: any) => {
  movingNode.value = node
  moveToParentId.value = node.parentId
  showMoveModal.value = true
}

const saveNode = async () => {
  if (!nodeForm.value.name.trim()) return
  
  savingNode.value = true
  treeSuccess.value = ''
  treeError.value = ''
  
  try {
    if (editingNode.value) {
      // Update existing node
      const response = await authFetch(`/keynodes/${editingNode.value.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: nodeForm.value.name.trim(),
          category: nodeForm.value.category,
          parentId: nodeForm.value.parentId
        })
      })
      
      if (response.ok) {
        treeSuccess.value = `Keynode "${nodeForm.value.name}" updated successfully`
        showNodeModal.value = false
        await loadKeynodeTree()
      } else {
        const data = await response.json()
        treeError.value = data.message || 'Failed to update keynode'
      }
    } else {
      // Create new node
      const response = await authFetch('/keynodes/admin', {
        method: 'POST',
        body: JSON.stringify({
          name: nodeForm.value.name.trim(),
          category: nodeForm.value.category,
          parentId: nodeForm.value.parentId
        })
      })
      
      if (response.ok) {
        treeSuccess.value = `Keynode "${nodeForm.value.name}" created successfully`
        showNodeModal.value = false
        await loadKeynodeTree()
      } else {
        const data = await response.json()
        treeError.value = data.message || 'Failed to create keynode'
      }
    }
    
    setTimeout(() => { treeSuccess.value = '' }, 5000)
  } catch (err) {
    console.error('Failed to save keynode:', err)
    treeError.value = 'Failed to save keynode'
  } finally {
    savingNode.value = false
  }
}

const confirmDeleteNode = async (node: any) => {
  const childCount = keynodeTree.value.filter(n => n.parentId === node.id).length
  let message = `Are you sure you want to delete "${node.name}"?`
  if (childCount > 0) {
    message += ` This node has ${childCount} child node(s) that will become root nodes.`
  }
  if (node.referenceCount > 0) {
    message += ` This keynode is referenced by ${node.referenceCount} markmap(s).`
  }
  
  if (!confirm(message)) return
  
  treeSuccess.value = ''
  treeError.value = ''
  
  try {
    const response = await authFetch(`/keynodes/${node.id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      treeSuccess.value = `Keynode "${node.name}" deleted successfully`
      await loadKeynodeTree()
    } else {
      const data = await response.json()
      treeError.value = data.message || 'Failed to delete keynode'
    }
    
    setTimeout(() => { treeSuccess.value = '' }, 5000)
  } catch (err) {
    console.error('Failed to delete keynode:', err)
    treeError.value = 'Failed to delete keynode'
  }
}

const moveNode = async () => {
  if (!movingNode.value) return
  
  savingNode.value = true
  treeSuccess.value = ''
  treeError.value = ''
  
  try {
    const response = await authFetch(`/keynodes/${movingNode.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId: moveToParentId.value })
    })
    
    if (response.ok) {
      const newParent = moveToParentId.value 
        ? keynodeTree.value.find(n => n.id === moveToParentId.value)?.name 
        : 'root'
      treeSuccess.value = `Keynode "${movingNode.value.name}" moved to ${newParent}`
      showMoveModal.value = false
      await loadKeynodeTree()
    } else {
      const data = await response.json()
      treeError.value = data.message || 'Failed to move keynode'
    }
    
    setTimeout(() => { treeSuccess.value = '' }, 5000)
  } catch (err) {
    console.error('Failed to move keynode:', err)
    treeError.value = 'Failed to move keynode'
  } finally {
    savingNode.value = false
  }
}

const loadAppeals = async () => {
  loadingAppeals.value = true
  try {
    const response = await authFetch('/complaints/appealed')
    if (response.ok) {
      appealedComplaints.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to load appeals:', err)
  } finally {
    loadingAppeals.value = false
  }
}

const openRoleModal = (user: any) => {
  selectedUser.value = user
  newRole.value = user.role
  showRoleModal.value = true
}

const changeUserRole = async () => {
  try {
    const response = await authFetch(`/admin/users/${selectedUser.value.id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole.value })
    })
    if (response.ok) {
      const updatedUser = await response.json()
      const index = users.value.findIndex(u => u.id === updatedUser.id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updatedUser }
      }
      showRoleModal.value = false
    }
  } catch (err) {
    console.error('Failed to change role:', err)
  }
}

const openSuspendModal = (user: any) => {
  selectedUser.value = user
  suspendDuration.value = { years: 0, months: 0, days: 0, hours: 0 }
  showSuspendModal.value = true
}

const clearActionMessages = () => {
  setTimeout(() => {
    actionSuccess.value = ''
    actionError.value = ''
  }, 5000)
}

const suspendUser = async () => {
  const userId = selectedUser.value.id
  const username = selectedUser.value.username
  actionLoading.value = userId
  actionSuccess.value = ''
  actionError.value = ''
  showSuspendModal.value = false
  
  try {
    const response = await authFetch(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify(suspendDuration.value)
    })
    if (response.ok) {
      const updatedUser = await response.json()
      const index = users.value.findIndex(u => u.id === updatedUser.id)
      if (index !== -1) {
        users.value[index] = { ...users.value[index], ...updatedUser }
      }
      actionSuccess.value = `User "${username}" has been suspended successfully.`
      clearActionMessages()
    } else {
      actionError.value = 'Failed to suspend user. Please try again.'
      clearActionMessages()
    }
  } catch (err) {
    console.error('Failed to suspend user:', err)
    actionError.value = 'Failed to suspend user. Please try again.'
    clearActionMessages()
  } finally {
    actionLoading.value = null
  }
}

const reinstateUser = async (userId: string) => {
  if (!confirm('Are you sure you want to reinstate this user?')) return
  
  const user = users.value.find(u => u.id === userId)
  const username = user?.username || 'User'
  actionLoading.value = userId
  actionSuccess.value = ''
  actionError.value = ''
  
  try {
    const response = await authFetch(`/admin/users/${userId}/reinstate`, {
      method: 'POST'
    })
    if (response.ok) {
      const updatedUser = await response.json()
      const index = users.value.findIndex(u => u.id === updatedUser.id)
      if (index !== -1) {
        // Clear suspendedUntil when reinstating
        users.value[index] = { ...users.value[index], ...updatedUser, suspendedUntil: null }
      }
      actionSuccess.value = `User "${username}" has been reinstated successfully.`
      clearActionMessages()
    } else {
      actionError.value = 'Failed to reinstate user. Please try again.'
      clearActionMessages()
    }
  } catch (err) {
    console.error('Failed to reinstate user:', err)
    actionError.value = 'Failed to reinstate user. Please try again.'
    clearActionMessages()
  } finally {
    actionLoading.value = null
  }
}

const openResolveAppealModal = (complaint: any, action: 'sustain' | 'dismiss') => {
  selectedComplaint.value = complaint
  resolveAction.value = action
  resolutionNotes.value = ''
  showResolveAppealModal.value = true
}

const resolveAppeal = async () => {
  try {
    const response = await authFetch(`/complaints/${selectedComplaint.value.id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: resolveAction.value,
        resolution: resolutionNotes.value || undefined
      })
    })
    if (response.ok) {
      appealedComplaints.value = appealedComplaints.value.filter(c => c.id !== selectedComplaint.value.id)
      showResolveAppealModal.value = false
    }
  } catch (err) {
    console.error('Failed to resolve appeal:', err)
  }
}

onMounted(() => {
  if (hasAccess.value) {
    loadUsers()
  }
})

watch(hasAccess, (newVal) => {
  if (newVal) {
    loadUsers()
  }
})

watch(activeTab, (newVal) => {
  if (newVal === 'keynodes' && keynodeTree.value.length === 0) {
    loadKeynodeTree()
  }
})
</script>

<style scoped>
.access-denied {
  text-align: center;
  padding: 4rem 2rem;
}

.access-denied h1 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.success-message {
  background: #d4edda;
  color: #155724;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #c3e6cb;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border: 1px solid #f5c6cb;
}

h1 {
  color: var(--text-primary);
  margin-bottom: 2rem;
}

h2 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.description {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.tab {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.tab-content {
  padding: 1rem 0;
}

.search-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-bar .form-control {
  flex: 1;
  min-width: 200px;
}

.filter-select {
  width: auto;
  flex: none;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
}

.users-table th,
.users-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.users-table th {
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.user-username {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.role-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.role-user { background: #e9ecef; color: #495057; }
.role-content_manager { background: #6f42c1; color: white; }
.role-administrator { background: #dc3545; color: white; }

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.status-active { background: #d4edda; color: #155724; }
.status-suspended { background: #f8d7da; color: #721c24; }

.suspended-until {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell .btn {
  margin-right: 0.25rem;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.card-grid {
  display: grid;
  gap: 1.5rem;
}

.item-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.item-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.badge {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #e9ecef;
  color: #495057;
}

.reason-harassment { background: #f8d7da; color: #721c24; }
.reason-false_information { background: #fff3cd; color: #856404; }
.reason-author_right_infringement { background: #d4edda; color: #155724; }
.reason-inciting_violence_hate { background: #f8d7da; color: #721c24; }
.reason-discriminatory_abusive { background: #f8d7da; color: #721c24; }

.item-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.explanation, .resolution {
  background: var(--bg-secondary);
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hierarchy-actions {
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.tree-editor-container {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  min-height: 400px;
}

.tree-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-group {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--bg-secondary);
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.category-header:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
}

.expand-icon {
  font-size: 0.75rem;
  color: var(--text-secondary);
  width: 1rem;
}

.category-name {
  font-weight: 600;
  color: var(--text-primary);
  text-transform: capitalize;
}

.category-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.category-nodes {
  padding: 0.5rem;
}

.info-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover {
  background: #218838;
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover {
  background: #138496;
}

.btn-purple {
  background: #6f42c1;
  color: white;
}

.btn-purple:hover {
  background: #5a32a3;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background: #e0a800;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
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
}

.modal h2 {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
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

.duration-inputs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
