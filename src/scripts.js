document.addEventListener('DOMContentLoaded', async e => {
  const p = fetch('./tax-data.json').then(res => res.json())
  const [
    taxData
  ] = await Promise.all([
    p
  ])


  {
    ///////////////////////////////////////////////////////////////
    // Income Evaluator
    //
    const sectionEl = document.querySelector('main > .income')
    const income1 = sectionEl.querySelector('.income-input-1')
    const income2 = sectionEl.querySelector('.income-input-2')
    const filingStatusEl = sectionEl.querySelector('.filing-status')
    const charityEl = sectionEl.querySelector('.charity-input')
    const budgetEl = sectionEl.querySelector('.budget-input')
    const periodSelEl = sectionEl.querySelector('.period')
    const resultsEl = sectionEl.querySelector('.results')
    const noteEl = sectionEl.querySelector('.note')

    const getTaxAmount = income => {
      const { standardDeduction, brackets } = taxData.filingStatuses[filingStatusEl.value]
      let remaining = Math.max(income - standardDeduction, 0)
      let taxAmount = 0
      for (let i = 0, l = brackets.length; i < l; i++) {
        if (remaining <= 0) break
        const { from, rate } = brackets[i]
        const { from: to = null } = brackets[i + 1] || {}
        const diff = to !== null
          ? Math.min(remaining, to - from)
          : remaining
        taxAmount += diff * rate
        remaining -= diff
      }
      return Math.ceil(taxAmount)
    }

    const update = (data, period = 1) => {
      const [data1, data2] = data

      resultsEl.querySelector('.income1').textContent = $$.format(data1.gross)
      resultsEl.querySelector('.gross1').textContent = $$.format(data1.gross / period)
      resultsEl.querySelector('.tax1').textContent = $$.format(-data1.tax / period)
      resultsEl.querySelector('.rate1').textContent = $$.formatRate(data1.taxRate)
      resultsEl.querySelector('.charity1').textContent = $$.format(-data1.charity / period)
      resultsEl.querySelector('.net1').textContent = $$.format(data1.net / period)
      resultsEl.querySelector('.budget1').textContent = $$.format(-data1.budget / period)
      resultsEl.querySelector('.savings1').textContent = $$.format(data1.savings / period)

      resultsEl.querySelector('.income2').textContent = $$.format(data2.gross)
      resultsEl.querySelector('.gross2').textContent = $$.format(data2.gross / period)
      resultsEl.querySelector('.tax2').textContent = $$.format(-data2.tax / period)
      resultsEl.querySelector('.rate2').textContent = $$.formatRate(data2.taxRate)
      resultsEl.querySelector('.charity2').textContent = $$.format(-data2.charity / period)
      resultsEl.querySelector('.net2').textContent = $$.format(data2.net / period)
      resultsEl.querySelector('.budget2').textContent = $$.format(-data2.budget / period)
      resultsEl.querySelector('.savings2').textContent = $$.format(data2.savings / period)

      resultsEl.querySelector('.grossDiff').textContent = $$.format((data1.gross - data2.gross) / period)
      resultsEl.querySelector('.taxDiff').textContent = $$.format((-data1.tax - -data2.tax) / period)
      const rateDiff = Math.round((data1.taxRate - data2.taxRate) * 100) / 100
      resultsEl.querySelector('.rateDiff').textContent = $$.formatRate(rateDiff)
      resultsEl.querySelector('.charityDiff').textContent = $$.format((-data1.charity - -data2.charity) / period)
      resultsEl.querySelector('.netDiff').textContent = $$.format((data1.net - data2.net) / period)
      resultsEl.querySelector('.budgetDiff').textContent = '-' // $$.format((-data1.budget - -data2.budget) / period)
      resultsEl.querySelector('.savingsDiff').textContent = $$.format((data1.savings - data2.savings) / period)
    }

    let updateFigures
    const evaluate = () => {
      const charityRate = parseFloat(charityEl.value.replace(/%/g, ''))
      const monthlyBudget = parseFloat(budgetEl.value)
      const data = [income1.value, income2.value]
        .map(x => parseFloat((x || 0).replace(/[$,]/g, '')))
        .map(gross => {
          const tax = +getTaxAmount(gross).toFixed(2)
          const net = +(gross - tax).toFixed(2)
          const charity = +(gross * charityRate).toFixed(2)
          const budget = +(monthlyBudget * 12).toFixed(2)
          return {
            gross,
            tax,
            taxRate: Math.round((tax / gross) * 100) / 100,
            charity,
            budget,
            net,
            savings: +(net - (charity + budget))
          }
        })
      updateFigures = update.bind(null, data)
      updateFigures(periodSelEl.value)
    }

    taxData.filingStatuses.forEach((filingStatus, i) => {
      const option = document.createElement('option')
      option.textContent = filingStatus.label
      option.value = i
      filingStatusEl.append(option)
    })

    noteEl.textContent = `*Figures generating using tax data for ${taxData.taxYear}.`
    income1.addEventListener('input', evaluate)
    income2.addEventListener('input', evaluate)
    filingStatusEl.addEventListener('input', evaluate)
    budgetEl.addEventListener('input', evaluate)
    const percentRe = /([^0-9%.]+)|(%(?=.))|(\.(?=[^.]*\.))/g
    charityEl.addEventListener('input', e => {
      e.target.value = e.target.value.replace(percentRe, '')
      evaluate()
    })
    periodSelEl.addEventListener('input', e => updateFigures(e.target.value))
    evaluate()
  }


  {
    ///////////////////////////////////////////////////////////////
    // Tabs!
    //

    const route = route => {
      document.querySelectorAll('.tabs h2').forEach(x => x.classList.remove('selected'))
      document.querySelectorAll('main > section').forEach(x => x.classList.remove('show'))
      document.querySelector(`.tabs .${route}`).classList.add('selected')
      document.querySelector(`main .${route}`).classList.add('show')
    }

    if (!location.hash) location.hash = 'disclaimer'
    route(location.hash.slice(1))

    window.addEventListener('hashchange', e => {
      const hash = new URL(e.newURL).hash.slice(1)
      route(hash)
    })
  }

})

function $(...selectors) {
  return selectors.map(selector => {
    if (typeof selector === 'string') {
      document.querySelector(selector)
    } else if (Array.isArray(selector)) {
      return Array.from(
        document.querySelectorAll(selector[0])
      )
    }
  })
}

function $$(pad = 0) {
  return (strs, ...exps) => {
    let str = ''
    const styles = []
    for(let i=0, l=strs.length; i < l; i++) {
      str += `%c${strs[i]}`
      styles.push($$.styles.normal)
      if (i !== exps.length) {
        const n = exps[i]
        str += `%c${$$.format(n).padStart(pad, ' ')}`
        styles.push(n < 0 ? $$.styles.negative : $$.styles.positive)
      }
    }
    return [str, ...styles]
  }
}
$$.styles = {
  normal: 'color: #ddd;',
  positive: 'color: #5f5;',
  negative: 'color: #f55;'
}
$$.format = Intl
  .NumberFormat(
    'en-US',
    {
      currency: 'USD',
      style: 'currency',
      currencySign: 'accounting'
    }
  ).format
$$.formatRate = rate => {
  if (typeof rate !== 'number') return rate
  return Math.round(rate * 100) + '%'
}
