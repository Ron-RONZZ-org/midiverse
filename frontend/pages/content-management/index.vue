<template>
  <div class="container">
    <div v-if="!hasAccess" class="access-denied">
      <h1>Access Denied</h1>
      <p>You need to be a content manager or administrator to access this page.</p>
      <NuxtLink to="/" class="btn">Go Home</NuxtLink>
    </div>
    
    <div v-else>
      <h1>Content Management</h1>
      
      <div class="tabs">
        <button 
          :class="['tab', { active: activeTab === 'keynodes' }]" 
          @click="activeTab = 'keynodes'"
        >
          Keynodes ({{ unverifiedKeynodes.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'complaints' }]" 
          @click="activeTab = 'complaints'"
        >
          Complaints ({{ pendingComplaints.length }})
        </button>
        <button 
          :class="['tab', { active: activeTab === 'review' }]" 
          @click="activeTab = 'review'"
        >
          Pending Review ({{ pendingReviewMarkmaps.length }})
        </button>
      </div>
      
      <!-- Keynodes Tab -->
      <div v-if="activeTab === 'keynodes'" class="tab-content">
        <h2>Unverified Keynodes</h2>
        <p class="description">Review and approve, edit, or reject user-submitted keynodes.</p>
        
        <div v-if="loadingKeynodes" class="loading">Loading keynodes...</div>
        <div v-else-if="unverifiedKeynodes.length === 0" class="empty-state">
          No unverified keynodes pending review.
        </div>
        <div v-else class="card-grid">
          <div v-for="keynode in unverifiedKeynodes" :key="keynode.id" class="item-card">
            <div class="item-header">
              <h3>{{ keynode.name }}</h3>
              <span class="badge">{{ keynode.category.replace(/_/g, ' ') }}</span>
            </div>
            <div class="item-meta">
              <span v-if="keynode.parent">Parent: {{ keynode.parent.name }}</span>
              <span v-if="keynode.createdBy">By: {{ keynode.createdBy.username }}</span>
            </div>
            <div class="item-actions">
              <button @click="approveKeynode(keynode.id)" class="btn btn-success btn-sm">Approve</button>
              <button @click="openEditKeynodeModal(keynode)" class="btn btn-info btn-sm">Edit & Approve</button>
              <button @click="openRejectModal(keynode)" class="btn btn-danger btn-sm">Reject</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Complaints Tab -->
      <div v-if="activeTab === 'complaints'" class="tab-content">
        <h2>Pending Complaints</h2>
        <p class="description">Review user-submitted complaints about markmaps.</p>
        
        <div v-if="loadingComplaints" class="loading">Loading complaints...</div>
        <div v-else-if="pendingComplaints.length === 0" class="empty-state">
          No pending complaints to review.
        </div>
        <div v-else class="card-grid">
          <div v-for="complaint in pendingComplaints" :key="complaint.id" class="item-card">
            <div class="item-header">
              <h3>{{ complaint.markmap?.title || 'Unknown Markmap' }}</h3>
              <span :class="['badge', `reason-${complaint.reason}`]">
                {{ formatReason(complaint.reason) }}
              </span>
            </div>
            <div class="item-meta">
              <span>Reported by: {{ complaint.reporter?.username || 'Anonymous' }}</span>
              <span>Date: {{ new Date(complaint.createdAt).toLocaleDateString() }}</span>
            </div>
            <div class="explanation">
              <strong>Explanation:</strong> {{ complaint.explanation }}
            </div>
            <div class="item-actions">
              <NuxtLink :to="`/markmaps/${complaint.markmapId}`" class="btn btn-secondary btn-sm" target="_blank">
                View Markmap
              </NuxtLink>
              <button @click="openResolveModal(complaint, 'sustain')" class="btn btn-danger btn-sm">
                Sustain
              </button>
              <button @click="openResolveModal(complaint, 'dismiss')" class="btn btn-warning btn-sm">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Pending Review Tab -->
      <div v-if="activeTab === 'review'" class="tab-content">
        <h2>Markmaps Pending Review</h2>
        <p class="description">Review edited markmaps that were previously retired due to complaints.</p>
        
        <div v-if="loadingReview" class="loading">Loading markmaps...</div>
        <div v-else-if="pendingReviewMarkmaps.length === 0" class="empty-state">
          No markmaps pending review.
        </div>
        <div v-else class="card-grid">
          <div v-for="markmap in pendingReviewMarkmaps" :key="markmap.id" class="item-card">
            <div class="item-header">
              <h3>{{ markmap.title }}</h3>
            </div>
            <div class="item-meta">
              <span v-if="markmap.author">By: {{ markmap.author.username }}</span>
              <span>Updated: {{ new Date(markmap.updatedAt).toLocaleDateString() }}</span>
            </div>
            <div v-if="markmap.complaints && markmap.complaints.length > 0" class="complaint-info">
              <strong>Original complaint:</strong> {{ formatReason(markmap.complaints[0].reason) }}
              <p v-if="markmap.complaints[0].explanation" class="complaint-explanation">
                {{ markmap.complaints[0].explanation }}
              </p>
            </div>
            <div class="item-actions">
              <NuxtLink :to="`/markmaps/${markmap.id}`" class="btn btn-info btn-sm" target="_blank">
                View
              </NuxtLink>
              <button @click="openReviewModal(markmap, 'reinstate')" class="btn btn-success btn-sm">
                Reinstate
              </button>
              <button @click="openReviewModal(markmap, 'needs_edit')" class="btn btn-warning btn-sm">
                Needs Edit
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Review Markmap Modal -->
      <div v-if="showReviewModal" class="modal-overlay" @click.self="!reviewing && (showReviewModal = false)">
        <div class="modal">
          <h2>{{ reviewAction === 'reinstate' ? 'Reinstate Markmap' : 'Request Further Edits' }}</h2>
          <p v-if="reviewAction === 'reinstate'">
            This will reinstate the markmap to public view.
          </p>
          <p v-else>
            This will notify the author that further edits are needed before reinstatement.
          </p>
          <div v-if="reviewSuccess" class="success">{{ reviewSuccess }}</div>
          <div v-if="reviewError" class="error">{{ reviewError }}</div>
          <div class="form-group">
            <label for="review-resolution">{{ reviewAction === 'reinstate' ? 'Notes (optional)' : 'Feedback for author' }}</label>
            <textarea 
              id="review-resolution" 
              v-model="reviewResolution" 
              class="form-control"
              rows="3"
              :placeholder="reviewAction === 'reinstate' ? 'Any notes about the review...' : 'Explain what changes are still needed...'"
              :disabled="reviewing"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showReviewModal = false" class="btn btn-secondary" :disabled="reviewing">Cancel</button>
            <button 
              @click="submitReview" 
              :class="['btn', reviewAction === 'reinstate' ? 'btn-success' : 'btn-warning']"
              :disabled="reviewing"
            >
              {{ reviewing ? 'Processing...' : (reviewAction === 'reinstate' ? 'Reinstate' : 'Send for Edits') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Edit Keynode Modal -->
      <div v-if="showEditKeynodeModal" class="modal-overlay" @click.self="showEditKeynodeModal = false">
        <div class="modal">
          <h2>Edit & Approve Keynode</h2>
          <form @submit.prevent="submitEditKeynode">
            <div class="form-group">
              <label for="keynode-name">Name</label>
              <input id="keynode-name" v-model="editKeynodeForm.name" class="form-control" required />
            </div>
            <div class="form-group">
              <label for="keynode-category">Category</label>
              <select id="keynode-category" v-model="editKeynodeForm.category" class="form-control" required>
                <option value="person">Person</option>
                <option value="fictional_character">Fictional Character</option>
                <option value="mythological_figure">Mythological Figure</option>
                <option value="geographical_location">Geographical Location</option>
                <option value="geological_form">Geological Form</option>
                <option value="architectural_structure">Architectural Structure</option>
                <option value="chemical">Chemical</option>
                <option value="astronomical_entity">Astronomical Entity</option>
                <option value="biological_species">Biological Species</option>
                <option value="medical_condition">Medical Condition</option>
                <option value="scientific_theory">Scientific Theory</option>
                <option value="date_time">Date/Time</option>
                <option value="historical_event">Historical Event</option>
                <option value="artwork">Artwork</option>
                <option value="literary_work">Literary Work</option>
                <option value="musical_work">Musical Work</option>
                <option value="film_or_show">Film or Show</option>
                <option value="organization">Organization</option>
                <option value="educational_institution">Educational Institution</option>
                <option value="political_entity">Political Entity</option>
                <option value="technology">Technology</option>
                <option value="food_or_cuisine">Food or Cuisine</option>
                <option value="language">Language</option>
                <option value="sport_or_game">Sport or Game</option>
                <option value="abstract_concept">Abstract Concept</option>
                <option value="mathematical_concept">Mathematical Concept</option>
                <option value="others">Others</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" @click="showEditKeynodeModal = false" class="btn btn-secondary">Cancel</button>
              <button type="submit" class="btn btn-success">Save & Approve</button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Reject Keynode Modal -->
      <div v-if="showRejectModal" class="modal-overlay" @click.self="showRejectModal = false">
        <div class="modal">
          <h2>Reject Keynode</h2>
          <p>Choose how to reject "{{ selectedKeynode?.name }}":</p>
          <div class="reject-options">
            <div class="reject-option">
              <h4>Mark as Duplicate</h4>
              <p>This keynode is a duplicate of an existing one. Select the existing keynode to redirect to:</p>
              <input 
                v-model="duplicateSearch" 
                @input="searchDuplicates"
                class="form-control" 
                placeholder="Search for existing keynode..."
              />
              <div v-if="duplicateResults.length > 0" class="search-results">
                <div 
                  v-for="result in duplicateResults" 
                  :key="result.id" 
                  @click="selectDuplicate(result)"
                  :class="['result-item', { selected: selectedDuplicate?.id === result.id }]"
                >
                  {{ result.name }} ({{ result.category }})
                </div>
              </div>
              <button 
                @click="rejectAsDuplicate" 
                class="btn btn-warning"
                :disabled="!selectedDuplicate"
              >
                Reject as Duplicate
              </button>
            </div>
            <div class="reject-option">
              <h4>Mark as Irrelevant</h4>
              <p>This keynode is not appropriate for the hierarchy and will be deleted.</p>
              <button @click="rejectAsIrrelevant" class="btn btn-danger">
                Delete Keynode
              </button>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="showRejectModal = false" class="btn btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
      
      <!-- Resolve Complaint Modal -->
      <div v-if="showResolveModal" class="modal-overlay" @click.self="!resolving && (showResolveModal = false)">
        <div class="modal">
          <h2>{{ resolveAction === 'sustain' ? 'Sustain Complaint' : 'Dismiss Complaint' }}</h2>
          <p v-if="resolveAction === 'sustain'">
            This will retire the markmap from public view and notify the author.
          </p>
          <p v-else>
            This will dismiss the complaint. The reporter will be notified and may appeal to an administrator.
          </p>
          <div v-if="resolveSuccess" class="success">{{ resolveSuccess }}</div>
          <div v-if="resolveError" class="error">{{ resolveError }}</div>
          <div class="form-group">
            <label for="resolution">Resolution Notes (optional)</label>
            <textarea 
              id="resolution" 
              v-model="resolutionNotes" 
              class="form-control"
              rows="3"
              placeholder="Add any notes about your decision..."
              :disabled="resolving"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showResolveModal = false" class="btn btn-secondary" :disabled="resolving">Cancel</button>
            <button 
              @click="resolveComplaint" 
              :class="['btn', resolveAction === 'sustain' ? 'btn-danger' : 'btn-warning']"
              :disabled="resolving"
            >
              {{ resolving ? 'Processing...' : (resolveAction === 'sustain' ? 'Sustain & Retire' : 'Dismiss Complaint') }}
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

const activeTab = ref('keynodes')
const unverifiedKeynodes = ref<any[]>([])
const pendingComplaints = ref<any[]>([])
const pendingReviewMarkmaps = ref<any[]>([])
const loadingKeynodes = ref(true)
const loadingComplaints = ref(true)
const loadingReview = ref(true)

// Edit Keynode Modal
const showEditKeynodeModal = ref(false)
const editKeynodeForm = ref({ id: '', name: '', category: '', parentId: '' })

// Reject Keynode Modal
const showRejectModal = ref(false)
const selectedKeynode = ref<any>(null)
const duplicateSearch = ref('')
const duplicateResults = ref<any[]>([])
const selectedDuplicate = ref<any>(null)

// Resolve Complaint Modal
const showResolveModal = ref(false)
const selectedComplaint = ref<any>(null)
const resolveAction = ref<'sustain' | 'dismiss'>('dismiss')
const resolutionNotes = ref('')
const resolving = ref(false)
const resolveSuccess = ref('')
const resolveError = ref('')

// Review Markmap Modal
const showReviewModal = ref(false)
const selectedMarkmap = ref<any>(null)
const reviewAction = ref<'reinstate' | 'needs_edit'>('reinstate')
const reviewResolution = ref('')
const reviewing = ref(false)
const reviewSuccess = ref('')
const reviewError = ref('')

const hasAccess = computed(() => {
  return currentUser.value && 
    (currentUser.value.role === 'content_manager' || currentUser.value.role === 'administrator')
})

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

const loadKeynodes = async () => {
  try {
    const response = await authFetch('/keynodes/unverified')
    if (response.ok) {
      unverifiedKeynodes.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to load keynodes:', err)
  } finally {
    loadingKeynodes.value = false
  }
}

const loadComplaints = async () => {
  try {
    const response = await authFetch('/complaints/pending')
    if (response.ok) {
      pendingComplaints.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to load complaints:', err)
  } finally {
    loadingComplaints.value = false
  }
}

const loadPendingReview = async () => {
  try {
    const response = await authFetch('/complaints/pending-review')
    if (response.ok) {
      pendingReviewMarkmaps.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to load pending review:', err)
  } finally {
    loadingReview.value = false
  }
}

const openReviewModal = (markmap: any, action: 'reinstate' | 'needs_edit') => {
  selectedMarkmap.value = markmap
  reviewAction.value = action
  reviewResolution.value = ''
  reviewSuccess.value = ''
  reviewError.value = ''
  showReviewModal.value = true
}

const submitReview = async () => {
  reviewing.value = true
  reviewError.value = ''
  reviewSuccess.value = ''
  
  try {
    const response = await authFetch(`/complaints/markmaps/${selectedMarkmap.value.id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: reviewAction.value,
        resolution: reviewResolution.value || undefined
      })
    })
    if (response.ok) {
      reviewSuccess.value = reviewAction.value === 'reinstate' 
        ? 'Markmap has been reinstated.' 
        : 'Author has been notified to make further edits.'
      pendingReviewMarkmaps.value = pendingReviewMarkmaps.value.filter(m => m.id !== selectedMarkmap.value.id)
      // Auto-close after success
      setTimeout(() => {
        showReviewModal.value = false
      }, 1500)
    } else {
      const errorData = await response.json()
      reviewError.value = errorData.message || 'Failed to review markmap'
    }
  } catch (err) {
    reviewError.value = 'Failed to review markmap'
    console.error('Failed to review markmap:', err)
  } finally {
    reviewing.value = false
  }
}

const approveKeynode = async (id: string) => {
  try {
    const response = await authFetch(`/keynodes/${id}/approve`, { method: 'PATCH' })
    if (response.ok) {
      unverifiedKeynodes.value = unverifiedKeynodes.value.filter(k => k.id !== id)
    }
  } catch (err) {
    console.error('Failed to approve keynode:', err)
  }
}

const openEditKeynodeModal = (keynode: any) => {
  editKeynodeForm.value = {
    id: keynode.id,
    name: keynode.name,
    category: keynode.category,
    parentId: keynode.parentId || ''
  }
  showEditKeynodeModal.value = true
}

const submitEditKeynode = async () => {
  try {
    const response = await authFetch(`/keynodes/${editKeynodeForm.value.id}/edit-approve`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: editKeynodeForm.value.name,
        category: editKeynodeForm.value.category,
        parentId: editKeynodeForm.value.parentId || null
      })
    })
    if (response.ok) {
      unverifiedKeynodes.value = unverifiedKeynodes.value.filter(k => k.id !== editKeynodeForm.value.id)
      showEditKeynodeModal.value = false
    }
  } catch (err) {
    console.error('Failed to edit keynode:', err)
  }
}

const openRejectModal = (keynode: any) => {
  selectedKeynode.value = keynode
  duplicateSearch.value = ''
  duplicateResults.value = []
  selectedDuplicate.value = null
  showRejectModal.value = true
}

const searchDuplicates = async () => {
  if (duplicateSearch.value.length < 2) {
    duplicateResults.value = []
    return
  }
  
  try {
    const response = await authFetch(`/keynodes/suggestions?query=${encodeURIComponent(duplicateSearch.value)}`)
    if (response.ok) {
      const results = await response.json()
      duplicateResults.value = results.filter((r: any) => r.id !== selectedKeynode.value?.id)
    }
  } catch (err) {
    console.error('Failed to search keynodes:', err)
  }
}

const selectDuplicate = (result: any) => {
  selectedDuplicate.value = result
}

const rejectAsDuplicate = async () => {
  if (!selectedDuplicate.value) return
  
  try {
    const response = await authFetch(`/keynodes/${selectedKeynode.value.id}/reject-duplicate`, {
      method: 'PATCH',
      body: JSON.stringify({ existingKeynodeId: selectedDuplicate.value.id })
    })
    if (response.ok) {
      unverifiedKeynodes.value = unverifiedKeynodes.value.filter(k => k.id !== selectedKeynode.value.id)
      showRejectModal.value = false
    }
  } catch (err) {
    console.error('Failed to reject keynode:', err)
  }
}

const rejectAsIrrelevant = async () => {
  if (!confirm('Are you sure you want to delete this keynode?')) return
  
  try {
    const response = await authFetch(`/keynodes/${selectedKeynode.value.id}/reject-irrelevant`, {
      method: 'DELETE'
    })
    if (response.ok) {
      unverifiedKeynodes.value = unverifiedKeynodes.value.filter(k => k.id !== selectedKeynode.value.id)
      showRejectModal.value = false
    }
  } catch (err) {
    console.error('Failed to delete keynode:', err)
  }
}

const openResolveModal = (complaint: any, action: 'sustain' | 'dismiss') => {
  selectedComplaint.value = complaint
  resolveAction.value = action
  resolutionNotes.value = ''
  resolveSuccess.value = ''
  resolveError.value = ''
  showResolveModal.value = true
}

const resolveComplaint = async () => {
  resolving.value = true
  resolveError.value = ''
  resolveSuccess.value = ''
  
  try {
    const response = await authFetch(`/complaints/${selectedComplaint.value.id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: resolveAction.value,
        resolution: resolutionNotes.value || undefined
      })
    })
    if (response.ok) {
      resolveSuccess.value = resolveAction.value === 'sustain' 
        ? 'Complaint sustained. Markmap has been retired.' 
        : 'Complaint dismissed. Reporter will be notified.'
      pendingComplaints.value = pendingComplaints.value.filter(c => c.id !== selectedComplaint.value.id)
      // Auto-close after success
      setTimeout(() => {
        showResolveModal.value = false
      }, 1500)
    } else {
      const errorData = await response.json()
      resolveError.value = errorData.message || 'Failed to resolve complaint'
    }
  } catch (err) {
    resolveError.value = 'Failed to resolve complaint'
    console.error('Failed to resolve complaint:', err)
  } finally {
    resolving.value = false
  }
}

onMounted(() => {
  if (hasAccess.value) {
    loadKeynodes()
    loadComplaints()
    loadPendingReview()
  }
})

watch(hasAccess, (newVal) => {
  if (newVal) {
    loadKeynodes()
    loadComplaints()
    loadPendingReview()
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

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
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
  text-transform: capitalize;
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
}

.complaint-info {
  background: var(--complaint-info-bg, #fff3cd);
  border: 1px solid var(--complaint-info-border, #ffc107);
  border-radius: 4px;
  padding: 0.75rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--complaint-info-text, #856404);
}

.complaint-explanation {
  margin: 0.5rem 0 0;
  color: var(--text-secondary);
  font-style: italic;
}

.explanation {
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

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
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
}

.modal h2 {
  margin-bottom: 1rem;
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

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}

.reject-options {
  display: grid;
  gap: 1.5rem;
  margin: 1.5rem 0;
}

.reject-option {
  background: var(--bg-secondary);
  padding: 1.5rem;
  border-radius: 8px;
}

.reject-option h4 {
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.reject-option p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.search-results {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  margin: 0.5rem 0 1rem;
}

.result-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background: var(--bg-secondary);
}

.result-item.selected {
  background: #007bff;
  color: white;
}

.success {
  background: #d4edda;
  color: #155724;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>
