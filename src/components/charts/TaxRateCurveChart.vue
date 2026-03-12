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
  Filler,
} from 'chart.js'
import { calculateTax, formatCurrency, type FilingStatus } from '@/lib/tax'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const props = defineProps<{
  filingStatus: FilingStatus
  income1: number
  income2: number
}>()

const chartData = computed(() => {
  const fs = props.filingStatus
  const maxIncome = Math.max(props.income1, props.income2, 200000) * 1.5
  const steps = 50
  const incomes: number[] = []
  const rates: number[] = []

  for (let i = 0; i <= steps; i++) {
    const income = Math.round((maxIncome / steps) * i)
    incomes.push(income)
    const tax = calculateTax(income, fs)
    rates.push(income > 0 ? (tax / income) * 100 : 0)
  }

  return {
    labels: incomes.map((v) => formatCurrency(v)),
    datasets: [
      {
        label: 'Effective Tax Rate',
        data: rates,
        borderColor: 'hsl(160 60% 45%)',
        backgroundColor: 'hsl(160 60% 45% / 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  }
})

const annotationIncomes = computed(() => {
  const fs = props.filingStatus
  return [props.income1, props.income2].map((income) => {
    const tax = calculateTax(income, fs)
    return {
      income,
      rate: income > 0 ? (tax / income) * 100 : 0,
    }
  })
})

const verticalLinePlugin = computed(() => ({
  id: 'verticalLines',
  afterDraw(chart: ChartJS) {
    const ctx = chart.ctx
    const xScale = chart.scales['x']
    const yScale = chart.scales['y']
    if (!xScale || !yScale) return

    const maxIncome = Math.max(props.income1, props.income2, 200000) * 1.5
    const colors = ['hsl(220 70% 55%)', 'hsl(280 60% 55%)']

    annotationIncomes.value.forEach((ann, i) => {
      const xPixel = xScale.left + (ann.income / maxIncome) * (xScale.right - xScale.left)
      const yPixel = yScale.top + ((yScale.max! - ann.rate) / (yScale.max! - yScale.min!)) * (yScale.bottom - yScale.top)

      ctx.save()
      ctx.beginPath()
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = colors[i]!
      ctx.lineWidth = 1.5
      ctx.moveTo(xPixel, yScale.bottom)
      ctx.lineTo(xPixel, yPixel)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(xPixel, yPixel, 5, 0, Math.PI * 2)
      ctx.fillStyle = colors[i]!
      ctx.fill()
      ctx.restore()
    })
  },
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items: Array<{ label: string }>) => items[0]?.label ?? '',
        label: (ctx: { parsed: { y: number | null } }) => `Effective Rate: ${(ctx.parsed.y ?? 0).toFixed(1)}%`,
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: 'hsl(240 5% 65%)',
        maxTicksLimit: 6,
        callback: function (_value: string | number, index: number) {
          const maxIncome = Math.max(props.income1, props.income2, 200000) * 1.5
          const income = Math.round((maxIncome / 50) * index)
          if (income >= 1000000) return `$${(income / 1000000).toFixed(1)}M`
          return `$${Math.round(income / 1000)}k`
        },
      },
      grid: { display: false },
    },
    y: {
      ticks: {
        color: 'hsl(240 5% 65%)',
        callback: (value: string | number) => `${value}%`,
      },
      grid: { color: 'hsl(240 5% 65% / 0.15)' },
      min: 0,
    },
  },
}))
</script>

<template>
  <div class="h-72">
    <Line :data="chartData" :options="options" :plugins="[verticalLinePlugin]" />
  </div>
</template>
