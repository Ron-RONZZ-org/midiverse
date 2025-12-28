<template>
  <div class="language-switcher">
    <button 
      @click="toggleDropdown" 
      class="language-button"
      :title="currentLocale.name"
    >
      <span class="language-icon">🌐</span>
      <span class="language-code">{{ currentLocale.code.toUpperCase() }}</span>
      <span class="dropdown-arrow">{{ isOpen ? '▲' : '▼' }}</span>
    </button>
    <div v-if="isOpen" class="language-dropdown">
      <button
        v-for="locale in availableLocales"
        :key="locale.code"
        @click="switchLanguage(locale.code)"
        :class="['language-option', { active: locale.code === currentLocale.code }]"
      >
        <span class="locale-name">{{ locale.name }}</span>
        <span v-if="locale.code === currentLocale.code" class="check-mark">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, locales } = useI18n()
const isOpen = ref(false)

const currentLocale = computed(() => {
  return locales.value.find(l => l.code === locale.value) || locales.value[0]
})

const availableLocales = computed(() => {
  return locales.value
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const switchLanguage = (newLocale: string) => {
  locale.value = newLocale
  isOpen.value = false
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.language-switcher')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.language-switcher {
  position: relative;
  display: inline-block;
}

.language-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--card-bg, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary, #333);
  transition: all 0.2s;
}

.language-button:hover {
  background: var(--bg-secondary, #f5f5f5);
  border-color: #007bff;
}

.language-icon {
  font-size: 1.1rem;
}

.language-code {
  font-weight: 500;
}

.dropdown-arrow {
  font-size: 0.7rem;
  opacity: 0.6;
}

.language-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: var(--card-bg, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  box-shadow: 0 4px 12px var(--shadow, rgba(0, 0, 0, 0.15));
  min-width: 150px;
  z-index: 1000;
  overflow: hidden;
}

.language-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-primary, #333);
  text-align: left;
  transition: background 0.2s;
}

.language-option:hover {
  background: var(--bg-secondary, #f5f5f5);
}

.language-option.active {
  background: rgba(0, 123, 255, 0.1);
  color: #007bff;
  font-weight: 500;
}

.locale-name {
  flex: 1;
}

.check-mark {
  color: #007bff;
  font-weight: bold;
}
</style>
