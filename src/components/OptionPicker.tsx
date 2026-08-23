/**
 * هەڵبژێرێک کە هەرچی خۆت زیادی دەکەیت **لەبیری دەمێنێت**.
 *
 * لیستەکە لە سێ سەرچاوەوە پێکدێت:
 *   ١) لیستی بنەڕەتیی سیستەم (کاتالۆگ)
 *   ٢) ئەوانەی پێشتر لە داتاکەی خۆتدا بەکارهاتوون (نموونە: مۆدێلی سەیارەکانی تر)
 *   ٣) ئەوانەی خۆت بە دەست زیادت کردوون و لە ڕێکخستندا پاشەکەوت بوون
 *
 * بۆیە ئەگەر «Denali» بۆ GMC بنووسیت، جارێکی تر لە لیستەکەدا دەیبینیت.
 */

import { useMemo } from 'react'
import { useApp } from '../store/app'
import { Picker } from './ui'

/** لێکدانەوەی هەموو سەرچاوەکان — بێ دووبارەبوونەوە */
export function mergeOptions(...groups: (string[] | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of groups) {
    for (const raw of g || []) {
      const v = (raw || '').trim()
      if (!v) continue
      const k = v.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
    }
  }
  return out
}

export function OptionPicker({
  optKey,
  base,
  fromData,
  value,
  onChange,
  placeholder,
  disabled,
  renderOption,
}: {
  /** ناسنامەی لیستەکە — نموونە: 'brand' یان 'model:GMC' */
  optKey: string
  base: string[]
  /** ئەوانەی لە داتای ئێستادا بەکارهاتوون */
  fromData?: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  renderOption?: (o: string) => React.ReactNode
}) {
  const { settings, save, say, can } = useApp()
  const custom = settings.customOptions?.[optKey]

  const options = useMemo(
    () => mergeOptions(base, custom, fromData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base.join('|'), (custom || []).join('|'), (fromData || []).join('|')],
  )

  const pick = (v: string) => {
    const t = (v || '').trim()
    onChange(t)
    if (!t) return
    /* ئەگەر نوێ بوو، بۆ جاری داهاتوو پاشەکەوتی دەکەین */
    const known = options.some((o) => o.toLowerCase() === t.toLowerCase())
    if (known || !can('settings.edit')) return
    const next = [...(custom || []), t]
    save('settings', { ...settings, customOptions: { ...(settings.customOptions || {}), [optKey]: next } })
      .then(() => say(`«${t}» زیادکرا و پاشەکەوتکرا`))
      .catch(() => {
        /* هەرچەند پاشەکەوت نەکرا، بەهاکە لەسەر ئەم تۆمارە دادەنرێت */
      })
  }

  return (
    <Picker
      value={value}
      onChange={pick}
      options={options}
      allowCustom
      placeholder={placeholder}
      disabled={disabled}
      renderOption={renderOption}
    />
  )
}
