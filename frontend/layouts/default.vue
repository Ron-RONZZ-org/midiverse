<template>
  <div>
    <nav class="navbar">
      <div class="container">
        <NuxtLink to="/" class="brand">Midiverse</NuxtLink>
        <div class="nav-links">
          <NuxtLink to="/markmaps">Explore</NuxtLink>
          <NuxtLink to="/search">Search</NuxtLink>
          <NuxtLink to="/tags">Tags</NuxtLink>
          <ClientOnly>
            <template v-if="isAuthenticated">
              <NuxtLink to="/editor">Create</NuxtLink>
              <NuxtLink to="/profile" class="btn">Dashboard</NuxtLink>
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
    <footer class="footer">
      <div class="container">
        <p>&copy; 2025 Midiverse. Built with Nuxt.js and NestJS.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { isAuthenticated, logout } = useAuth()

const handleLogout = () => {
  logout()
}
</script>

<style scoped>
.navbar {
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
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
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links a {
  color: #333;
  text-decoration: none;
  padding: 0.5rem 1rem;
}

.nav-links a:hover {
  color: #007bff;
}

.nav-links button {
  padding: 0.5rem 1rem;
  font-size: 14px;
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
</style>
