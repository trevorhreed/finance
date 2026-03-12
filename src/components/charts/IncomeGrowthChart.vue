<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { formatCurrency } from '@/lib/tax'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface YearData {
  year: number
  nominal: number
  real: number
  isPayChange?: boolean
}

const props = defineProps<{
  data: YearData[]
}>()

const chartData = computed(() => ({
  labels: props.data.map((d) => String(d.year)),
  datasets: [
    {
      label: 'Nominal Income',
      data: props.data.map((d) => d.nominal),
      borderColor: 'hsl(220 70% 55%)',
      backgroundColor: 'hsl(220 70% 55% / 0.1)',
      fill: true,
      tension: 0,
      pointRadius: props.data.map((d) => d.isPayChange ? 5 : 0),
      pointHitRadius: 10,
    },
    {
      label: 'Real Income (inflation-adjusted)',
      data: props.data.map((d) => d.real),
      borderColor: 'hsl(280 60% 55%)',
      backgroundColor: 'hsl(280 60% 55% / 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: props.data.map((d) => d.isPayChange ? 5 : 0),
      pointHitRadius: 10,
    },
  ],
}))

const options = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
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
      ticks: {
        color: 'hsl(240 5% 65%)',
        maxTicksLimit: 10,
      },
      grid: { display: false },
    },
    y: {
      ticks: {
        color: 'hsl(240 5% 65%)',
        callback: (value: string | number) => {
          const n = +value
          if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
          if (n >= 1000) return `$${Math.round(n / 1000)}k`
          return formatCurrency(n)
        },
      },
      grid: { color: 'hsl(240 5% 65% / 0.15)' },
    },
  },
}
</script>

<template>
  <div class="h-80">
    <Line :data="chartData" :options="options" />
  </div>
</template>
