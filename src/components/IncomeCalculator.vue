<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableFooter,
  TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import {
  evaluateIncome, formatCurrency, formatRate,
  type TaxData, type FilingStatus,
} from '@/lib/tax'
import IncomeBreakdownChart from '@/components/charts/IncomeBreakdownChart.vue'
import TaxRateCurveChart from '@/components/charts/TaxRateCurveChart.vue'
import ComparisonChart from '@/components/charts/ComparisonChart.vue'
import { useUrlSync, moneyToUrl, moneyFromUrl, percentToUrl, percentFromUrl } from '@/composables/useUrlSync'

const taxData = ref<TaxData | null>(null)
const taxYearIndex = ref('0')
const income1 = ref('$120,000')
const income2 = ref('$80,000')
const filingStatusIndex = ref('0')
const charityInput = ref('10%')
const budgetInput = ref('$2,000')
const period = ref('1')

useUrlSync({
  income1: { ref: income1, defaultValue: '$120,000', toUrl: moneyToUrl, fromUrl: moneyFromUrl },
  income2: { ref: income2, defaultValue: '$80,000', toUrl: moneyToUrl, fromUrl: moneyFromUrl },
  taxYear: { ref: taxYearIndex, defaultValue: '0' },
  filing: { ref: filingStatusIndex, defaultValue: '0' },
  charity: { ref: charityInput, defaultValue: '10%', toUrl: percentToUrl, fromUrl: percentFromUrl },
  budget: { ref: budgetInput, defaultValue: '$2,000', toUrl: moneyToUrl, fromUrl: moneyFromUrl },
  period: { ref: period, defaultValue: '1' },
})

onMounted(async () => {
  const res = await fetch(import.meta.env.BASE_URL + 'tax-data.json')
  taxData.value = await res.json()
})

const moneyRe = /[$,]/g
const parseMoney = (val: string) => parseFloat((val || '0').replace(moneyRe, '')) || 0
const parsePercent = (val: string) => (parseFloat((val || '0').replace(/%/g, '')) || 0) / 100

const selectedYear = computed(() => {
  if (!taxData.value) return null
  return taxData.value[+taxYearIndex.value] ?? null
})

const filingStatus = computed<FilingStatus | null>(() => {
  if (!selectedYear.value) return null
  return selectedYear.value.filingStatuses[+filingStatusIndex.value] ?? null
})

const periodLabel = computed(() => {
  const labels: Record<string, string> = { '1': 'Annual', '12': 'Monthly', '26': 'Biweekly', '52': 'Weekly', '2080': 'Hourly' }
  return labels[period.value] ?? 'Annual'
})

const data1 = computed(() => {
  if (!filingStatus.value) return null
  return evaluateIncome(parseMoney(income1.value), filingStatus.value, parsePercent(charityInput.value), parseMoney(budgetInput.value))
})

const data2 = computed(() => {
  if (!filingStatus.value) return null
  return evaluateIncome(parseMoney(income2.value), filingStatus.value, parsePercent(charityInput.value), parseMoney(budgetInput.value))
})

const p = computed(() => +period.value)

interface Row {
  label: string
  val1: string
  val2: string
  diff: string
  color?: 'negative' | 'positive'
}

const rows = computed<Row[]>(() => {
  if (!data1.value || !data2.value) return []
  const d1 = data1.value
  const d2 = data2.value
  const div = p.value

  return [
    { label: 'Gross', val1: formatCurrency(d1.gross / div), val2: formatCurrency(d2.gross / div), diff: formatCurrency((d1.gross - d2.gross) / div) },
    { label: 'Tax', val1: formatCurrency(-d1.tax / div), val2: formatCurrency(-d2.tax / div), diff: formatCurrency((-d1.tax + d2.tax) / div), color: 'negative' },
    { label: 'Effective Tax Rate', val1: formatRate(d1.taxRate), val2: formatRate(d2.taxRate), diff: formatRate(d1.taxRate - d2.taxRate) },
    { label: 'Net Income', val1: formatCurrency(d1.net / div), val2: formatCurrency(d2.net / div), diff: formatCurrency((d1.net - d2.net) / div) },
    { label: 'Budget (%)', val1: formatCurrency(-d1.charity / div), val2: formatCurrency(-d2.charity / div), diff: formatCurrency((-d1.charity + d2.charity) / div), color: 'negative' },
    { label: 'Budget ($)', val1: formatCurrency(-d1.budget / div), val2: formatCurrency(-d2.budget / div), diff: '-', color: 'negative' },
    { label: 'Savings', val1: formatCurrency(d1.savings / div), val2: formatCurrency(d2.savings / div), diff: formatCurrency((d1.savings - d2.savings) / div), color: 'positive' },
  ]
})

function cellColor(row: Row, _col: 'val1' | 'val2' | 'diff'): string {
  if (row.color === 'negative') return 'text-[hsl(var(--negative))]'
  if (row.color === 'positive') return 'text-[hsl(var(--positive))]'
  return ''
}
</script>

<template>
  <div v-if="taxData" class="space-y-6">
    <div class="flex flex-col lg:flex-row gap-6">
      <!-- Input Panel -->
      <div class="lg:w-80 shrink-0 space-y-4">
        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label>Annual Income #1</Label>
              <Input v-model="income1" />
            </div>
            <div class="space-y-2">
              <Label>Annual Income #2</Label>
              <Input v-model="income2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base text-muted-foreground">Tax</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label>Tax Year</Label>
              <Select v-model="taxYearIndex">
                <option
                  v-for="(year, i) in taxData"
                  :key="year.taxYear"
                  :value="String(i)"
                >
                  {{ year.taxYear }}
                </option>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Filing Status</Label>
              <Select v-model="filingStatusIndex">
                <option
                  v-for="(fs, i) in selectedYear?.filingStatuses"
                  :key="i"
                  :value="String(i)"
                >
                  {{ fs.label }}
                </option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="pb-3">
            <CardTitle class="text-base text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <Label>% of annual income</Label>
              <Input v-model="charityInput" />
            </div>
            <div class="space-y-2">
              <Label>Monthly (fixed)</Label>
              <Input v-model="budgetInput" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Output Panel -->
      <Card class="flex-1 min-w-0">
        <CardHeader>
          <CardTitle>Income Comparison</CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
            <p>
              This calculator compares two income scenarios side by side. It applies
              <strong class="text-foreground">federal income tax</strong> using
              progressive tax brackets — meaning different portions of your income are
              taxed at different rates. Your <strong class="text-foreground">effective tax rate</strong>
              is the overall percentage you pay, which is always lower than your top
              marginal bracket.
            </p>
            <p>
              Keep in mind that a raise or salary difference is never as large as it looks on
              paper. Every additional dollar you earn is taxed at your
              <strong class="text-foreground">marginal rate</strong> — the highest bracket your
              income falls into. A $10,000 raise in the 22% bracket only puts about $7,800 in
              your pocket. The Difference column shows what the gap between two incomes actually
              looks like after taxes.
            </p>
            <p>
              After taxes, your remaining income is split into budget allocations and savings.
              Use the period selector below to see figures broken down per paycheck, month, or hour.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <Label class="shrink-0">View as</Label>
            <Select v-model="period" class="w-36">
              <option value="1">Annual</option>
              <option value="12">Monthly</option>
              <option value="26">Biweekly</option>
              <option value="52">Weekly</option>
              <option value="2080">Hourly</option>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ periodLabel }}</TableHead>
                <TableHead class="text-right">{{ formatCurrency(data1!.gross) }}</TableHead>
                <TableHead class="text-right">{{ formatCurrency(data2!.gross) }}</TableHead>
                <TableHead class="text-right">Difference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in rows" :key="row.label">
                <TableCell class="font-medium">{{ row.label }}</TableCell>
                <TableCell :class="`text-right ${cellColor(row, 'val1')}`">{{ row.val1 }}</TableCell>
                <TableCell :class="`text-right ${cellColor(row, 'val2')}`">{{ row.val2 }}</TableCell>
                <TableCell :class="`text-right ${cellColor(row, 'diff')}`">{{ row.diff }}</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colspan="4" class="text-right text-xs italic text-muted-foreground">
                  Figures generated using {{ selectedYear!.taxYear }} tax data.
                  Please read the <button class="underline" @click="$emit('navigate', 'disclaimer')">disclaimer</button>.
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div v-if="data1 && data2 && filingStatus" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Income Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeBreakdownChart :data1="data1" :data2="data2" :period="p" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-lg">Side-by-Side Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonChart :data1="data1" :data2="data2" :period="p" />
        </CardContent>
      </Card>

      <Card class="lg:col-span-2">
        <CardHeader>
          <CardTitle class="text-lg">Effective Tax Rate Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <TaxRateCurveChart
            :filing-status="filingStatus"
            :income1="parseMoney(income1)"
            :income2="parseMoney(income2)"
          />
        </CardContent>
      </Card>
    </div>
  </div>

  <div v-else class="flex items-center justify-center py-12">
    <p class="text-muted-foreground">Loading tax data...</p>
  </div>
</template>
