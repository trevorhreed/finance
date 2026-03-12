<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Moon, Sun, Monitor } from 'lucide-vue-next'

type Theme = 'system' | 'light' | 'dark'

const theme = ref<Theme>('system')
let mediaQuery: MediaQueryList

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', onSystemChange)
  applyTheme()
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', onSystemChange)
})

function onSystemChange() {
  if (theme.value === 'system') applyTheme()
}

function cycle() {
  const order: Theme[] = ['system', 'light', 'dark']
  const i = order.indexOf(theme.value)
  theme.value = order[(i + 1) % order.length]!
  applyTheme()
}

function applyTheme() {
  const isDark =
    theme.value === 'dark' ||
    (theme.value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
}
</script>

<template>
  <button
    class="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 w-10 hover:bg-accent hover:text-accent-foreground transition-colors"
    :title="`Theme: ${theme}`"
    @click="cycle"
  >
    <Monitor v-if="theme === 'system'" class="h-5 w-5" />
    <Sun v-else-if="theme === 'light'" class="h-5 w-5" />
    <Moon v-else class="h-5 w-5" />
  </button>
</template>
