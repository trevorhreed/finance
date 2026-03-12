<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import IncomeCalculator from '@/components/IncomeCalculator.vue'
import IncomeGrowthCalculator from '@/components/IncomeGrowthCalculator.vue'
import DisclaimerPage from '@/components/DisclaimerPage.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useUrlSync } from '@/composables/useUrlSync'

const activeTab = ref('income')
const version = ref<number | null>(null)

useUrlSync({
  tab: { ref: activeTab, defaultValue: 'income' },
})

onMounted(async () => {
  const res = await fetch(import.meta.env.BASE_URL + 'version.json')
  const data = await res.json()
  version.value = data.version
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b">
      <div class="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
        <h1 class="text-lg font-semibold">Finance <span v-if="version" class="text-xs font-normal text-muted-foreground">v{{ version }}</span></h1>
        <div class="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="income" :active="activeTab === 'income'" @click="activeTab = 'income'">
              Income Comparison
            </TabsTrigger>
            <TabsTrigger value="growth" :active="activeTab === 'growth'" @click="activeTab = 'growth'">
              Income Growth
            </TabsTrigger>
            <TabsTrigger value="disclaimer" :active="activeTab === 'disclaimer'" @click="activeTab = 'disclaimer'">
              Disclaimer
            </TabsTrigger>
          </TabsList>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
      <IncomeCalculator
        v-if="activeTab === 'income'"
        @navigate="(tab: string) => activeTab = tab"
      />
      <IncomeGrowthCalculator v-else-if="activeTab === 'growth'" />
      <DisclaimerPage v-else-if="activeTab === 'disclaimer'" />
    </main>
  </div>
</template>
