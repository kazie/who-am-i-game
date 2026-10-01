<template>
  <main class="page" :class="{ wide: $route.name === 'screen' || $route.name === 'example' }">
    <RouterLink to="/" class="logo">❓ Who Am I?</RouterLink>
    <RouterView :key="$route.path" />
  </main>
</template>

<style scoped>
.wide {
  max-width: 1600px;
}
.logo {
  display: inline-block;
  margin-bottom: 20px;
  font-weight: 800;
  font-size: 1.25rem;
  text-decoration: none;
  color: var(--text);
}
</style>
