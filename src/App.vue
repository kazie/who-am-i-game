<template>
  <main class="page" :class="{ wide: $route.name === 'screen' || $route.name === 'example' }">
    <RouterLink to="/" class="logo">
      <!-- A tilted index card with a question mark on it. -->
      <svg class="mark" viewBox="0 0 40 30" aria-hidden="true" focusable="false">
        <g transform="rotate(-4 20 15)">
          <rect x="3" y="3" width="34" height="24" rx="1" class="paper" />
          <path d="M3 9.5h34" class="red" />
          <path d="M3 15.5h34M3 21.5h34" class="blue" />
          <text x="20" y="24" text-anchor="middle" class="q">?</text>
        </g>
      </svg>
      Who Am I?
    </RouterLink>
    <RouterView :key="$route.path" />
  </main>
</template>

<style scoped>
.wide {
  max-width: 1600px;
}
.logo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  font-weight: 800;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  text-decoration: none;
  color: var(--text);
}
.mark {
  width: 40px;
  height: 30px;
  overflow: visible;
}
.paper {
  fill: var(--card);
  stroke: var(--border-strong);
  stroke-width: 1;
}
.red {
  stroke: var(--rule-red);
  stroke-width: 1.5;
}
.blue {
  stroke: var(--rule-blue);
  stroke-width: 1;
}
.q {
  font-family: var(--font-typed);
  font-weight: 700;
  font-size: 17px;
  fill: var(--accent);
}
</style>
