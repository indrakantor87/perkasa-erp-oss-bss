'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DAILY_ACTIVITY_PLANNING_LEVELS,
  dailyActivityPlanningLevelLabels,
  getDailyActivitySubdivisionMap,
  isValidDailyActivityDivision,
  isValidDailyActivityPlanningLevel,
  isValidDailyActivitySubdivision,
} from '@/lib/daily-activity-org'
import type { DailyActivityUserProfile } from '@/lib/services/daily-activity-user-profile-service'
import type { AuthUserListItem } from '@/lib/services/auth-user-service'

type DailyActivityUserProfilePanelProps = {
  canManage: boolean
  reviewDbReady: boolean
  users: AuthUserListItem[]
  profiles: DailyActivityUserProfile[]
  divisionOptions: string[]
}

function extractUsername(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function DailyActivityUserProfilePanel({
  canManage,
  reviewDbReady,
  users,
  profiles,
  divisionOptions,
}: DailyActivityUserProfilePanelProps) {
  const router = useRouter()
  const [userValue, setUserValue] = useState('')
  const [planningLevel, setPlanningLevel] = useState<string>(DAILY_ACTIVITY_PLANNING_LEVELS[0] ?? 'LEADER')
  const [divisionName, setDivisionName] = useState(divisionOptions[0] ?? '')
  const [subdivisionName, setSubdivisionName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canManage || !reviewDbReady || submitting
  const subdivisionMap = useMemo(() => getDailyActivitySubdivisionMap() as Record<string, string[]>, [])
  const subdivisionOptions = useMemo(() => subdivisionMap[divisionName] ?? [], [divisionName, subdivisionMap])
  const userSuggestions = useMemo(
    () =>
      users
        .filter((user) => user.source === 'review-db')
        .map((user) => `${user.username} | ${user.fullName} | ${user.roleLabel}`),
    [users],
  )

  const profileIndex = useMemo(() => {
    const index = new Map<string, DailyActivityUserProfile>()
    profiles.forEach((profile) => index.set(profile.username, profile))
    return index
  }, [profiles])

  useEffect(() => {
    if (subdivisionOptions.length === 0) {
      setSubdivisionName('')
      return
    }
    if (!subdivisionOptions.includes(subdivisionName)) {
      setSubdivisionName(subdivisionOptions[0] ?? '')
    }
  }, [subdivisionName, subdivisionOptions])

  useEffect(() => {
    const username = extractUsername(userValue)
    const profile = profileIndex.get(username)
    if (!profile) return

    const nextDivision = profile.divisionName || divisionOptions[0] || ''
    if (nextDivision && isValidDailyActivityDivision(nextDivision)) {
      setDivisionName(nextDivision)
      const nextSubdivision = profile.subdivisionName ?? ''
      setSubdivisionName(nextSubdivision)
    }

    const nextLevel = String(profile.planningLevel ?? '').trim().toUpperCase()
    if (nextLevel && isValidDailyActivityPlanningLevel(nextLevel)) {
      setPlanningLevel(nextLevel)
    }
  }, [divisionOptions, profileIndex, userValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const username = extractUsername(userValue)
    if (!username) {
      setFeedback({ tone: 'error', message: 'Pilih username dari daftar saran.' })
      return
    }
    if (!divisionName || !isValidDailyActivityDivision(divisionName)) {
      setFeedback({ tone: 'error', message: 'Divisi daily activity tidak valid.' })
      return
    }
    if (!isValidDailyActivitySubdivision(divisionName, subdivisionName)) {
      setFeedback({ tone: 'error', message: 'Sub-divisi daily activity tidak valid.' })
      return
    }
    if (!isValidDailyActivityPlanningLevel(planningLevel)) {
      setFeedback({ tone: 'error', message: 'Level daily activity tidak valid.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/settings/users/daily-activity-profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          divisionName,
          subdivisionName,
          planningLevel,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Profil daily activity gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Profil daily activity berhasil disimpan.',
      })
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Daily Activity Profile</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Mapping divisi & level per user
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        Profil ini dipakai untuk auto-fill daily activity (divisi, sub-divisi, level) dan scope approval manager agar konsisten per username.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">User</span>
          <input
            list="daily-activity-user-profile-suggestions"
            value={userValue}
            onChange={(event) => setUserValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="username | Nama | Role"
            disabled={isDisabled}
            required
          />
          <datalist id="daily-activity-user-profile-suggestions">
            {userSuggestions.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Level</span>
          <select
            value={planningLevel}
            onChange={(event) => setPlanningLevel(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {DAILY_ACTIVITY_PLANNING_LEVELS.map((level) => (
              <option key={level} value={level}>
                {dailyActivityPlanningLevelLabels[level]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={divisionName}
            onChange={(event) => setDivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {divisionOptions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Sub-divisi</span>
          <select
            value={subdivisionName}
            onChange={(event) => setSubdivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {subdivisionOptions.length ? (
              subdivisionOptions.map((subdivision) => (
                <option key={subdivision} value={subdivision}>
                  {subdivision}
                </option>
              ))
            ) : (
              <option value="">Tanpa sub-divisi khusus</option>
            )}
          </select>
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Profil yang sudah dibuat akan otomatis dipakai saat user tersebut mengisi daily activity.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Profil'}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {profiles.length ? (
        <div className="mt-8 space-y-3">
          {profiles.slice(0, 12).map((profile) => (
            <article key={profile.id} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{profile.username}</p>
                  <p className="mt-1 text-sm text-mute">
                    {profile.divisionName}
                    {profile.subdivisionName ? ` / ${profile.subdivisionName}` : ''} • {profile.planningLevel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserValue(profile.username)}
                  className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                  disabled={isDisabled}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}

