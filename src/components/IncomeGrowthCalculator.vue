<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { Copy, ClipboardPaste } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/tax'
import IncomeGrowthChart from '@/components/charts/IncomeGrowthChart.vue'
import { useUrlSync, moneyToUrl, moneyFromUrl } from '@/composables/useUrlSync'

interface PayChange {
  year: string
  income: string
}

const cpiData = ref<Record<string, number>>({})
const cpiYears = computed(() => Object.keys(cpiData.value).map(Number).sort((a, b) => a - b))
const minCpiYear = computed(() => cpiYears.value[0] ?? 2000)
const maxCpiYear = computed(() => cpiYears.value[cpiYears.value.length - 1] ?? 2025)

const defaultTimeline: PayChange[] = [
  { year: '2018', income: '$65,000' },
  { year: '2020', income: '$75,000' },
  { year: '2022', income: '$85,000' },
  { year: '2024', income: '$95,000' },
]

const baseYear = ref('0')

// Read timeline from URL or use defaults
function parseTimelineParam(): PayChange[] | null {
  const raw = new URLSearchParams(window.location.search).get('timeline')
  if (!raw) return null
  const entries = raw.split(',').map((s) => {
    const [year, income] = s.split(':')
    if (!year || !income) return null
    return { year, income: moneyFromUrl(income) }
  }).filter((e): e is PayChange => e !== null)
  return entries.length > 0 ? entries : null
}

const timeline = ref<PayChange[]>(parseTimelineParam() ?? defaultTimeline.map((e) => ({ ...e })))

useUrlSync({
  baseYear: { ref: baseYear, defaultValue: '0' },
})

// Sync timeline to URL
const defaultTimelineEncoded = '2018:65000,2020:75000,2022:85000,2024:95000'

watch(timeline, () => {
  const url = new URL(window.location.href)
  const encoded = timeline.value
    .map((e) => `${e.year}:${moneyToUrl(e.income)}`)
    .join(',')
  if (encoded === defaultTimelineEncoded) {
    url.searchParams.delete('timeline')
  } else {
    url.searchParams.set('timeline', encoded)
  }
  history.replaceState(null, '', url)
}, { deep: true })

onMounted(async () => {
  const res = await fetch(import.meta.env.BASE_URL + 'cpi-data.json')
  const json = await res.json()
  cpiData.value = json.data
})

const moneyRe = /[$,]/g
const parseMoney = (val: string) => parseFloat((val || '0').replace(moneyRe, '')) || 0

function addEntry() {
  const lastEntry = timeline.value[timeline.value.length - 1]
  const nextYear = lastEntry ? Math.min(+lastEntry.year + 2, maxCpiYear.value) : new Date().getFullYear()
  timeline.value.push({
    year: String(nextYear),
    income: lastEntry?.income ?? '$0',
  })
}

function removeEntry(index: number) {
  timeline.value.splice(index, 1)
}

const copyTooltip = ref('')

async function copyTimeline() {
  const text = timeline.value
    .map((e) => `${e.year}\t${e.income}`)
    .join('\n')
  await navigator.clipboard.writeText(text)
  copyTooltip.value = 'Copied!'
  setTimeout(() => { copyTooltip.value = '' }, 1500)
}

async function pasteTimeline() {
  const text = await navigator.clipboard.readText()
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length === 0) return

  const entries: PayChange[] = []
  for (const line of lines) {
    // Support tab or multiple spaces as delimiter (not comma — it appears in currency values)
    const parts = line.split(/\t|\s{2,}/).map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const year = parts[0]!.replace(/\D/g, '')
      const income = parts.slice(1).join(' ')
      if (year.length === 4) {
        entries.push({ year, income })
      }
    }
  }
  if (entries.length > 0) {
    timeline.value = entries
    await nextTick()
  }
}

// Parse timeline into sorted entries with numeric values
const parsedTimeline = computed(() => {
  return timeline.value
    .map((e) => ({ year: +e.year, income: parseMoney(e.income) }))
    .filter((e) => e.year >= minCpiYear.value && e.income > 0)
    .sort((a, b) => a.year - b.year)
})

// Expand timeline entries into year-by-year data
// Income stays flat between pay changes
interface YearData {
  year: number
  nominal: number
  real: number
  inflation: number | null
  nominalGrowth: number | null
  realGrowth: number | null
  isPayChange: boolean
}

const baseYearOptions = computed(() => {
  const entries = parsedTimeline.value
  if (entries.length === 0) return []
  return [
    { label: 'First year (start)', value: '0' },
    { label: 'Last year (today\'s $)', value: '1' },
  ]
})

const projections = computed<YearData[]>(() => {
  const entries = parsedTimeline.value
  if (entries.length === 0) return []

  const cpi = cpiData.value
  const firstYear = entries[0]!.year
  const lastYear = entries[entries.length - 1]!.year

  // Build a map of year -> income (carry forward between changes)
  const incomeByYear: Record<number, number> = {}
  const payChangeYears = new Set<number>()
  let currentIncome = entries[0]!.income

  for (let y = firstYear; y <= lastYear; y++) {
    const entry = entries.find((e) => e.year === y)
    if (entry) {
      currentIncome = entry.income
      payChangeYears.add(y)
    }
    incomeByYear[y] = currentIncome
  }

  // For years beyond CPI data, extrapolate using average recent inflation
  const lastCpiYear = maxCpiYear.value
  const lastCpiValue = cpi[String(lastCpiYear)]
  let avgRecentInflation = 0.03 // fallback
  if (lastCpiValue) {
    const lookback = 3
    const olderCpi = cpi[String(lastCpiYear - lookback)]
    if (olderCpi) {
      avgRecentInflation = Math.pow(lastCpiValue / olderCpi, 1 / lookback) - 1
    }
  }

  function getCpi(year: number): number | null {
    const val = cpi[String(year)]
    if (val) return val
    if (lastCpiValue && year > lastCpiYear) {
      return lastCpiValue * Math.pow(1 + avgRecentInflation, year - lastCpiYear)
    }
    return null
  }

  // Pick base CPI for real-dollar conversion
  const refYear = baseYear.value === '1' ? lastYear : firstYear
  const baseCpi = getCpi(refYear)
  if (!baseCpi) return []

  const results: YearData[] = []

  for (let y = firstYear; y <= lastYear; y++) {
    const nominal = incomeByYear[y]!
    const yearCpi = getCpi(y)
    if (!yearCpi) continue

    const real = nominal * (baseCpi / yearCpi)
    const inflation = y === firstYear ? null : (() => {
      const prevCpi = getCpi(y - 1)
      return prevCpi ? (yearCpi - prevCpi) / prevCpi : null
    })()

    const prev = results.length > 0 ? results[results.length - 1]! : null

    results.push({
      year: y,
      nominal,
      real,
      inflation,
      nominalGrowth: prev ? (nominal - prev.nominal) / prev.nominal : null,
      realGrowth: prev ? (real - prev.real) / prev.real : null,
      isPayChange: payChangeYears.has(y),
    })
  }

  return results
})

const summary = computed(() => {
  if (projections.value.length < 2) return null
  const first = projections.value[0]!
  const last = projections.value[projections.value.length - 1]!
  const years = last.year - first.year

  const nominalChange = last.nominal - first.nominal
  const nominalTotal = ((last.nominal / first.nominal) - 1) * 100
  const realChange = last.real - first.real
  const realTotal = ((last.real / first.real) - 1) * 100

  // Cumulative inflation over the period
  const firstCpi = cpiData.value[String(first.year)]
  const lastCpi = cpiData.value[String(last.year)]
  const cumulativeInflation = (firstCpi && lastCpi) ? ((lastCpi / firstCpi) - 1) * 100 : 0

  return {
    nominalChange,
    nominalTotal,
    realChange,
    realTotal,
    cumulativeInflation,
    years,
  }
})

function formatPct(val: number | null): string {
  if (val === null) return '—'
  return (val >= 0 ? '+' : '') + (val * 100).toFixed(1) + '%'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Input Panel -->
      <div class="lg:w-80 shrink-0 space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base text-muted-foreground">Pay Timeline</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3">
            <p class="text-xs text-muted-foreground">
              Enter your annual income at each point it changed. Income carries forward between entries.
            </p>
            <div
              v-for="(entry, i) in timeline"
              :key="i"
              class="flex gap-2 items-center"
            >
              <Input v-model="entry.year" class="w-20 shrink-0" />
              <Input v-model="entry.income" class="flex-1" />
              <button
                v-if="timeline.length > 1"
                class="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none px-1"
                @click="removeEntry(i)"
              >
                &times;
              </button>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                @click="addEntry"
              >
                + Add Pay Change
              </button>
              <span class="flex-1" />
              <button
                class="text-muted-foreground hover:text-foreground transition-colors relative"
                title="Copy timeline"
                @click="copyTimeline"
              >
                <Copy class="h-3.5 w-3.5" />
                <span
                  v-if="copyTooltip"
                  class="absolute -top-7 left-1/2 -translate-x-1/2 text-xs bg-foreground text-background px-2 py-0.5 rounded whitespace-nowrap"
                >
                  {{ copyTooltip }}
                </span>
              </button>
              <button
                class="text-muted-foreground hover:text-foreground transition-colors"
                title="Paste timeline"
                @click="pasteTimeline"
              >
                <ClipboardPaste class="h-3.5 w-3.5" />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base text-muted-foreground">Settings</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label>Real Dollars Basis</Label>
              <Select v-model="baseYear">
                <option
                  v-for="opt in baseYearOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </Select>
            </div>
            <p class="text-xs text-muted-foreground">
              Inflation data: CPI-U annual averages ({{ minCpiYear }}–{{ maxCpiYear }}) from the Bureau of Labor Statistics. Years beyond {{ maxCpiYear }} use estimated inflation based on recent trends.
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Results Panel -->
      <Card class="flex-1 min-w-0">
        <CardHeader>
          <CardTitle>Nominal vs Real Income</CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              <strong class="text-foreground">Nominal income</strong> is the actual dollar amount you're paid.
              <strong class="text-foreground">Real income</strong> adjusts for inflation — it shows what
              your paycheck is actually worth in terms of purchasing power.
            </p>
            <p>
              For example, if you got a 3% raise but prices went up 4%, your nominal income grew
              but your real income shrank — you can buy less than before. The gap between the two
              lines below shows how much purchasing power you've gained or lost over time.
            </p>
          </div>

          <!-- Summary Cards -->
          <div v-if="summary" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">Nominal Growth</p>
              <p class="text-lg font-semibold">{{ summary.nominalTotal.toFixed(1) }}%</p>
              <p class="text-xs text-muted-foreground">{{ formatCurrency(summary.nominalChange) }} over {{ summary.years }}yr</p>
            </div>
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">Real Growth</p>
              <p class="text-lg font-semibold" :class="summary.realTotal >= 0 ? 'text-[hsl(var(--positive))]' : 'text-[hsl(var(--negative))]'">
                {{ summary.realTotal.toFixed(1) }}%
              </p>
              <p class="text-xs text-muted-foreground">{{ formatCurrency(summary.realChange) }} in real terms</p>
            </div>
            <div class="rounded-lg border p-3">
              <p class="text-xs text-muted-foreground">Cumulative Inflation</p>
              <p class="text-lg font-semibold text-[hsl(var(--negative))]">
                {{ summary.cumulativeInflation.toFixed(1) }}%
              </p>
              <p class="text-xs text-muted-foreground">CPI-U over {{ summary.years }}yr</p>
            </div>
          </div>

          <!-- Chart -->
          <IncomeGrowthChart v-if="projections.length > 1" :data="projections" />

          <!-- Table -->
          <div class="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead class="text-right">Nominal</TableHead>
                  <TableHead class="text-right">Real</TableHead>
                  <TableHead class="text-right">Inflation</TableHead>
                  <TableHead class="text-right">Real YoY</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="row in projections" :key="row.year">
                  <TableCell class="font-medium">
                    {{ row.year }}
                    <span v-if="row.isPayChange" class="text-xs text-muted-foreground ml-1">*</span>
                  </TableCell>
                  <TableCell class="text-right">{{ formatCurrency(row.nominal) }}</TableCell>
                  <TableCell class="text-right">{{ formatCurrency(row.real) }}</TableCell>
                  <TableCell class="text-right">{{ formatPct(row.inflation) }}</TableCell>
                  <TableCell
                    class="text-right"
                    :class="row.realGrowth !== null ? (row.realGrowth >= 0 ? 'text-[hsl(var(--positive))]' : 'text-[hsl(var(--negative))]') : ''"
                  >
                    {{ formatPct(row.realGrowth) }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p class="text-xs text-muted-foreground italic">* indicates a pay change</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
