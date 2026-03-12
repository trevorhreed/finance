import { watch, type Ref } from 'vue'

interface ParamDef {
  ref: Ref<string>
  defaultValue: string
  toUrl?: (value: string) => string
  fromUrl?: (urlValue: string) => string
}

export function useUrlSync(params: Record<string, ParamDef>) {
  const search = new URLSearchParams(window.location.search)

  for (const [key, param] of Object.entries(params)) {
    const raw = search.get(key)
    if (raw !== null) {
      param.ref.value = param.fromUrl ? param.fromUrl(raw) : raw
    }
  }

  watch(
    Object.values(params).map((p) => p.ref),
    () => {
      const url = new URL(window.location.href)
      for (const [key, param] of Object.entries(params)) {
        const val = param.toUrl ? param.toUrl(param.ref.value) : param.ref.value
        const def = param.toUrl ? param.toUrl(param.defaultValue) : param.defaultValue
        if (val === def) {
          url.searchParams.delete(key)
        } else {
          url.searchParams.set(key, val)
        }
      }
      history.replaceState(null, '', url)
    },
  )
}

const moneyRe = /[$,]/g

export function moneyToUrl(val: string): string {
  return String(parseFloat((val || '0').replace(moneyRe, '')) || 0)
}

export function moneyFromUrl(val: string): string {
  const n = parseFloat(val)
  if (isNaN(n)) return val
  return '$' + n.toLocaleString('en-US')
}

export function percentToUrl(val: string): string {
  return String(parseFloat((val || '0').replace(/%/g, '')) || 0)
}

export function percentFromUrl(val: string): string {
  return val + '%'
}
