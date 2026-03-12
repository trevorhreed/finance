<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { formatCurrency, type IncomeBreakdown } from '@/lib/tax'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  data1: IncomeBreakdown
  data2: IncomeBreakdown
  period: number
}>()

const chartData = computed(() => {
  const div = props.period
  const d1 = props.data1
  const d2 = props.data2

  return {
    labels: [formatCurrency(d1.gross), formatCurrency(d2.gross)],
    datasets: [
      {
        label: 'Tax',
        data: [d1.tax / div, d2.tax / div],
        backgroundColor: 'hsl(0 84% 60% / 0.8)',
      },
      {
        label: 'Budget (%)',
        data: [d1.charity / div, d2.charity / div],
        backgroundColor: 'hsl(30 90% 55% / 0.8)',
      },
      {
        label: 'Budget ($)',
        data: [d1.budget / div, d2.budget / div],
        backgroundColor: 'hsl(220 70% 55% / 0.8)',
      },
      {
        label: 'Savings',
        data: [d1.savings / div, d2.savings / div],
        backgroundColor: 'hsl(142 76% 40% / 0.8)',
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: 'hsl(240 5% 65%)',
        padding: 16,
      },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: 'hsl(240 5% 65%)' },
      grid: { display: false },
    },
    y: {
      stacked: true,
      ticks: {
        color: 'hsl(240 5% 65%)',
        callback: (value: string | number) => formatCurrency(+value),
      },
      grid: { color: 'hsl(240 5% 65% / 0.15)' },
    },
  },
}))
</script>

<template>
  <div class="h-72">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
