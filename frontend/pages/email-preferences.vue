<template>
  <div class="container">
    <div class="email-preferences">
      <div class="card">
        <div v-if="loading" class="loading">
          <h2>Loading preferences...</h2>
          <p>Please wait while we load your email preferences.</p>
        </div>

        <div v-else-if="error" class="error-state">
          <h2>✗ Error</h2>
          <p>{{ error }}</p>
          <div class="actions">
            <NuxtLink to="/" class="btn">Go to Home</NuxtLink>
          </div>
        </div>

        <div v-else-if="success" class="success">
          <h2>✓ Preferences Updated!</h2>
          <p>{{ successMessage }}</p>
          <div class="actions">
            <NuxtLink to="/" class="btn">Go to Home</NuxtLink>
          </div>
        </div>

        <div v-else class="preferences-form">
          <h2>Email Preferences</h2>
          <p class="subtitle">Manage your communication preferences for <strong>{{ preferences.username }}</strong> ({{ preferences.email }})</p>

          <form @submit.prevent="updatePreferences">
            <div class="form-group">
              <h3>Email Notifications</h3>
              
              <div class="preference-item">
                <label class="checkbox-label checkbox-disabled">
                  <input 
                    type="checkbox" 
                    checked
                    disabled
                  />
                  Essential Account Notifications
                </label>
                <small class="form-text">Password resets, security alerts, account verification (always enabled)</small>
              </div>

              <div class="preference-item">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="preferences.emailComplaintsNotifications"
                  />
                  Complaints Related Notifications
                </label>
                <small class="form-text">Notifications about complaints filed against your markmaps, resolution updates, and markmap reinstatement</small>
              </div>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn" :disabled="saving">
                {{ saving ? 'Saving...' : 'Save Preferences' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase

const loading = ref(true)
const saving = ref(false)
const success = ref(false)
const error = ref('')
const successMessage = ref('')

const preferences = ref({
  username: '',
  email: '',
  emailComplaintsNotifications: true
})

const token = computed(() => route.query.token as string)

onMounted(async () => {
  if (!token.value) {
    loading.value = false
    error.value = 'No preferences token provided. This link may be invalid.'
    return
  }

  try {
    const response = await fetch(`${apiBase}/users/email-preferences?token=${encodeURIComponent(token.value)}`)
    
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to load preferences')
    }

    const data = await response.json()
    preferences.value = {
      username: data.username,
      email: data.email,
      emailComplaintsNotifications: data.emailComplaintsNotifications
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load preferences. The link may have expired.'
  } finally {
    loading.value = false
  }
})

const updatePreferences = async () => {
  saving.value = true
  
  try {
    const response = await fetch(`${apiBase}/users/email-preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token.value,
        emailComplaintsNotifications: preferences.value.emailComplaintsNotifications
      })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to update preferences')
    }

    const data = await response.json()
    success.value = true
    successMessage.value = data.message || 'Your email preferences have been updated successfully!'
  } catch (err: any) {
    error.value = err.message || 'Failed to update preferences'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.email-preferences {
  max-width: 600px;
  margin: 4rem auto;
}

.email-preferences h2 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.loading h2 {
  color: #007bff;
  text-align: center;
}

.loading p {
  color: var(--text-secondary);
  text-align: center;
}

.success h2 {
  color: #28a745;
  text-align: center;
}

.success p {
  color: var(--text-secondary);
  text-align: center;
}

.error-state {
  text-align: center;
}

.error-state h2 {
  color: #dc3545;
}

.error-state p {
  color: var(--text-secondary);
  margin: 0.5rem 0;
}

.form-group {
  margin-bottom: 2rem;
}

.form-group h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color, #e9ecef);
  padding-bottom: 0.5rem;
}

.preference-item {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.form-text {
  display: block;
  margin-top: 0.25rem;
  margin-left: 26px;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.form-actions {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e9ecef);
}

.actions {
  margin-top: 2rem;
  text-align: center;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
