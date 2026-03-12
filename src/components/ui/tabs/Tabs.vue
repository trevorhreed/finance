<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <div :class="cn('', props.class)">
    <slot :model-value="model" />
  </div>
</template>
