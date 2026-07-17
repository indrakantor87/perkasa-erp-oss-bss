'use client'

import { useEffect, useId, useMemo, useState } from 'react'

type TechnicianLookupItem = {
  id: number
  username: string
  fullName: string
  roleCode: string
  roleName: string
}

function extractLeadingId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function TechnicianUserPicker({
  label,
  value,
  onChange,
  disabled,
  placeholder = 'Pilih teknisi (contoh: 12 | teknisi.pat | Teknisi PSB)',
}: {
  label: string
  value: string
  onChange: (value: { raw: string; userId: string }) => void
  disabled: boolean
  placeholder?: string
}) {
  const listId = useId()
  const [options, setOptions] = useState<TechnicianLookupItem[]>([])
  const [loading, setLoading] = useState(false)

  const datalistOptions = useMemo(() => {
    return options
      .map((item) => {
        const pieces = [String(item.id), item.username, item.fullName || item.roleName || item.roleCode]
          .filter(Boolean)
          .map((value) => String(value).trim())
        return pieces.join(' | ')
      })
      .filter(Boolean)
  }, [options])

  useEffect(() => {
    if (disabled) return

    let mounted = true
    setLoading(true)
    fetch('/api/lookups/technicians')
      .then((response) => response.json())
      .then((payload: { items?: TechnicianLookupItem[] }) => {
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
  }, [disabled])

  return (
    <label className="flex flex-col gap-2 text-sm text-slate-700">
      <span className="font-semibold text-slate-950">{label}</span>
      <input
        list={listId}
        value={value}
        onChange={(event) => {
          const raw = event.target.value
          onChange({ raw, userId: extractLeadingId(raw) })
        }}
        className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        placeholder={loading ? 'Memuat daftar teknisi...' : placeholder}
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

