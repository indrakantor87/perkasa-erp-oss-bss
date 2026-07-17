'use client'

import { useEffect, useId, useMemo, useState } from 'react'

type LookupItem = {
  id: number
  code?: string | null
  title?: string | null
  subtitle?: string | null
}

function extractLeadingId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function LookupIdPicker({
  label,
  value,
  onChange,
  endpoint,
  disabled,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: { raw: string; id: string }) => void
  endpoint: string
  disabled: boolean
  placeholder: string
}) {
  const listId = useId()
  const [options, setOptions] = useState<LookupItem[]>([])
  const [loading, setLoading] = useState(false)

  const datalistOptions = useMemo(() => {
    return options
      .map((item) => {
        const parts = [String(item.id), item.code, item.title, item.subtitle]
          .filter(Boolean)
          .map((entry) => String(entry).trim())
        return parts.join(' | ')
      })
      .filter(Boolean)
  }, [options])

  useEffect(() => {
    if (disabled) return

    let mounted = true
    setLoading(true)
    fetch(endpoint)
      .then((response) => response.json())
      .then((payload: { items?: LookupItem[] }) => {
        if (!mounted) return
        setOptions(Array.isArray(payload.items) ? payload.items : [])
      })
      .catch(() => {
        if (!mounted) return
        setOptions([])
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [disabled, endpoint])

  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-semibold text-slate-950">{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(event) => {
          const raw = event.target.value
          onChange({ raw, id: extractLeadingId(raw) })
        }}
        className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        placeholder={loading ? 'Memuat data...' : placeholder}
        disabled={disabled}
      />
      <datalist id={listId}>
        {datalistOptions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </label>
  )
}

