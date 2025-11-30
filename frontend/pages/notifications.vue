<template>
  <div class="container">
    <h1>Notifications</h1>
    
    <div v-if="!isAuthenticated" class="card">
      <p>You need to be logged in to view notifications.</p>
      <NuxtLink to="/login" class="btn">Login</NuxtLink>
    </div>
    
    <div v-else>
      <div class="actions-bar">
        <button 
          v-if="unreadCount > 0"
          @click="markAllAsRead" 
          class="btn btn-secondary btn-sm"
          :disabled="markingAllRead"
        >
          {{ markingAllRead ? 'Marking...' : 'Mark All as Read' }}
        </button>
        <button 
          v-if="notifications.length > 0"
          @click="clearAll" 
          class="btn btn-danger btn-sm"
          :disabled="clearing"
        >
          {{ clearing ? 'Clearing...' : 'Clear All' }}
        </button>
      </div>
      
      <div v-if="loading" class="loading">Loading notifications...</div>
      
      <div v-else-if="notifications.length === 0" class="empty-state">
        <p>You have no notifications.</p>
      </div>
      
      <div v-else class="notifications-list">
        <div 
          v-for="notification in notifications" 
          :key="notification.id"
          :class="['notification-item', { unread: !notification.isRead }]"
        >
          <div class="notification-icon">
            <span v-if="notification.type === 'complaint_sustained'">⚠️</span>
            <span v-else-if="notification.type === 'complaint_dismissed'">❌</span>
            <span v-else-if="notification.type === 'markmap_reinstated'">✅</span>
            <span v-else-if="notification.type === 'markmap_needs_edit'">📝</span>
            <span v-else-if="notification.type === 'keynode_approved'">✓</span>
            <span v-else-if="notification.type === 'keynode_rejected'">✗</span>
            <span v-else>🔔</span>
          </div>
          <div class="notification-content">
            <h3>{{ notification.title }}</h3>
            <p class="message">{{ notification.message }}</p>
            <div class="meta">
              <span class="time">{{ formatDate(notification.createdAt) }}</span>
              <div class="notification-actions">
                <NuxtLink 
                  v-if="notification.markmapId" 
                  :to="`/editor?id=${notification.markmapId}`"
                  class="btn btn-sm btn-info"
                >
                  Edit Markmap
                </NuxtLink>
                <button 
                  v-if="!notification.isRead"
                  @click="markAsRead(notification.id)"
                  class="btn btn-sm btn-secondary"
                >
                  Mark as Read
                </button>
                <button 
                  @click="deleteNotification(notification.id)"
                  class="btn btn-sm btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { authFetch, notificationCount } = useApi()
const { isAuthenticated } = useAuth()

const notifications = ref<any[]>([])
const loading = ref(true)
const markingAllRead = ref(false)
const clearing = ref(false)

const unreadCount = computed(() => notifications.value.filter(n => !n.isRead).length)

const formatDate = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now'
  // Less than 1 hour
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`
  // Less than 24 hours
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  // Less than 7 days
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`
  // Otherwise show full date
  return d.toLocaleDateString()
}

const loadNotifications = async () => {
  loading.value = true
  try {
    const response = await authFetch('/notifications')
    if (response.ok) {
      notifications.value = await response.json()
    }
  } catch (err) {
    console.error('Failed to load notifications:', err)
  } finally {
    loading.value = false
  }
}

const markAsRead = async (id: string) => {
  try {
    const response = await authFetch(`/notifications/${id}/read`, { method: 'PATCH' })
    if (response.ok) {
      const notification = notifications.value.find(n => n.id === id)
      if (notification && !notification.isRead) {
        notification.isRead = true
        // Update global notification count
        notificationCount.value = Math.max(0, notificationCount.value - 1)
      }
    }
  } catch (err) {
    console.error('Failed to mark notification as read:', err)
  }
}

const markAllAsRead = async () => {
  markingAllRead.value = true
  try {
    const response = await authFetch('/notifications/mark-all-read', { method: 'POST' })
    if (response.ok) {
      notifications.value.forEach(n => n.isRead = true)
      // Update global notification count
      notificationCount.value = 0
    }
  } catch (err) {
    console.error('Failed to mark all as read:', err)
  } finally {
    markingAllRead.value = false
  }
}

const deleteNotification = async (id: string) => {
  try {
    const notification = notifications.value.find(n => n.id === id)
    const wasUnread = notification && !notification.isRead
    const response = await authFetch(`/notifications/${id}`, { method: 'DELETE' })
    if (response.ok) {
      notifications.value = notifications.value.filter(n => n.id !== id)
      // Update global notification count if the deleted notification was unread
      if (wasUnread) {
        notificationCount.value = Math.max(0, notificationCount.value - 1)
      }
    }
  } catch (err) {
    console.error('Failed to delete notification:', err)
  }
}

const clearAll = async () => {
  if (!confirm('Are you sure you want to clear all notifications?')) return
  
  clearing.value = true
  try {
    const response = await authFetch('/notifications', { method: 'DELETE' })
    if (response.ok) {
      notifications.value = []
      // Update global notification count
      notificationCount.value = 0
    }
  } catch (err) {
    console.error('Failed to clear notifications:', err)
  } finally {
    clearing.value = false
  }
}

onMounted(() => {
  if (isAuthenticated.value) {
    loadNotifications()
  }
})

watch(isAuthenticated, (val) => {
  if (val) {
    loadNotifications()
  }
})
</script>

<style scoped>
h1 {
  margin-bottom: 2rem;
  color: #007bff;
}

.actions-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.loading, .empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notification-item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.notification-item.unread {
  background: rgba(0, 123, 255, 0.05);
  border-left: 4px solid #007bff;
}

.notification-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
}

.notification-content h3 {
  margin: 0 0 0.5rem;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.notification-content .message {
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  white-space: pre-line;
  font-size: 0.95rem;
}

.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.time {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.notification-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
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
</style>
