export interface TaxBracket {
  from: number
  rate: number
}

export interface FilingStatus {
  label: string
  standardDeduction: number
  brackets: TaxBracket[]
}

export interface TaxYearData {
  taxYear: number
  source?: string
  filingStatuses: FilingStatus[]
}

export type TaxData = TaxYearData[]

export function calculateTax(income: number, filingStatus: FilingStatus): number {
  const { standardDeduction, brackets } = filingStatus
  let remaining = Math.max(income - standardDeduction, 0)
  let taxAmount = 0

  for (let i = 0; i < brackets.length; i++) {
    if (remaining <= 0) break
    const { from, rate } = brackets[i]!
    const nextFrom = brackets[i + 1]?.from ?? null
    const diff = nextFrom !== null ? Math.min(remaining, nextFrom - from) : remaining
    taxAmount += diff * rate
    remaining -= diff
  }

  return Math.ceil(taxAmount)
}

export interface IncomeBreakdown {
  gross: number
  tax: number
  taxRate: number
  charity: number
  budget: number
  net: number
  savings: number
}

export function evaluateIncome(
  gross: number,
  filingStatus: FilingStatus,
  charityRate: number,
  monthlyBudget: number,
): IncomeBreakdown {
  const tax = calculateTax(gross, filingStatus)
  const net = gross - tax
  const charity = +(gross * charityRate).toFixed(2)
  const budget = +(monthlyBudget * 12).toFixed(2)
  const savings = +(net - charity - budget).toFixed(2)

  return {
    gross,
    tax,
    taxRate: gross > 0 ? Math.round((tax / gross) * 100) / 100 : 0,
    charity,
    budget,
    net,
    savings,
  }
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
  currencySign: 'accounting',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatRate(rate: number): string {
  return Math.round(rate * 100) + '%'
}
