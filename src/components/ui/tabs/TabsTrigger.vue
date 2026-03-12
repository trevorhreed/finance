<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: string; value: string; active: boolean }>()
const emit = defineEmits<{ click: [value: string] }>()
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      active && 'bg-background text-foreground shadow-sm',
      props.class,
    )"
    @click="emit('click', value)"
  >
    <slot />
  </button>
</template>
