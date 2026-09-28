'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import { UiButton } from '@/components/ui-button'

type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'AUTH_FAILED' | 'SYNC_ERROR' | 'UNKNOWN'
type SyncMode = 'MANUAL' | 'SCHEDULED' | 'RETRY'
type SyncRunFinalStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'
type EnrollmentStatus = 'ENROLLED' | 'PENDING' | 'REVOKED'
type FpSubTab = 'devices' | 'mappings'

type DeviceSummary = {
  total_active: number
  online_count: number
  offline_count: number
  unknown_count: number
}

type FpMachine = {
  id: number
  ip: string
  port: number | null
  model: string
  deviceTimezone: string
  authConfigEncrypted: string
  displayName: string
  lastSyncAt: string | null
  lastConnectionStatus: ConnectionStatus
  createdAt: string
  updatedAt: string
}

type FpMapping = {
  id: number
  machineId: number
  machineUserId: string
  employeeId: number
  employeeCode: string | null
  fullName: string | null
  enrollmentStatus: EnrollmentStatus
  enrolledAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

type FpSyncRun = {
  id: number
  machineId: number
  actorUserId: number | null
  syncMode: SyncMode
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  totalRecordsFetched: number
  totalNewValid: number
  totalDuplicatesSkipped: number
  totalUnmapped: number
  totalFailedParse: number
  finalStatus: SyncRunFinalStatus
  errorSummary: string | null
}

type EmployeeOption = {
  id: number
  employeeCode: string
  fullName: string
  employmentStatus: string
}

type HrFingerprintManagementProps = {
  canCreate: boolean
  canUpdate: boolean
  canView: boolean
  canDelete: boolean
  reviewDbReady: boolean
}

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

function connectionTone(status: ConnectionStatus): StatusTone {
  switch (status) {
    case 'ONLINE':
      return 'success'
    case 'OFFLINE':
      return 'warning'
    case 'AUTH_FAILED':
    case 'SYNC_ERROR':
      return 'danger'
    case 'UNKNOWN':
    default:
      return 'neutral'
  }
}

function connectionLabel(status: ConnectionStatus): string {
  switch (status) {
    case 'ONLINE':
      return 'Online'
    case 'OFFLINE':
      return 'Offline'
    case 'AUTH_FAILED':
      return 'Gagal Otentikasi'
    case 'SYNC_ERROR':
      return 'Error Sinkronisasi'
    case 'UNKNOWN':
    default:
      return 'Tidak Diketahui'
  }
}

function finalStatusTone(status: SyncRunFinalStatus): StatusTone {
  switch (status) {
    case 'SUCCESS':
      return 'success'
    case 'PARTIAL':
      return 'warning'
    case 'FAILED':
      return 'danger'
    default:
      return 'neutral'
  }
}

function enrollmentTone(status: EnrollmentStatus): StatusTone {
  switch (status) {
    case 'ENROLLED':
      return 'success'
    case 'PENDING':
      return 'warning'
    case 'REVOKED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function enrollmentLabel(status: EnrollmentStatus): string {
  switch (status) {
    case 'ENROLLED':
      return 'Terdaftar'
    case 'PENDING':
      return 'Menunggu'
    case 'REVOKED':
      return 'Dicabut'
    default:
      return status || '-'
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  try {
    const d = new Date(value)
    if (!Number.isFinite(d.getTime())) return value
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

function durationMsLabel(durationMs: number | null): string {
  if (durationMs == null || !Number.isFinite(durationMs)) return '-'
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function friendlyErrorMessage(raw: string | null, fallback: string): string {
  const msg = String(raw || '').trim()
  if (!msg) return fallback
  const hasSql = /unknown column|duplicate entry|sqlstate|syntax error|table.*doesn/i.test(msg)
  if (msg === 'Unauthorized') return 'Sesi anda telah habis. Silakan login ulang.'
  if (msg === 'Forbidden') return 'Anda tidak memiliki izin untuk aksi ini.'
  if (/DUPLICATE_IP_PORT/i.test(msg) || /ip.*port.*sudah|duplicate.*ip/i.test(msg)) {
    return 'Kombinasi IP dan port device fingerprint sudah terdaftar. Gunakan IP/port lain.'
  }
  if (hasSql) return 'Terjadi kesalahan sistem. Silakan coba beberapa saat lagi.'
  return msg
}

export function HrFingerprintManagement({
  canCreate,
  canUpdate,
  canView,
  canDelete,
  reviewDbReady,
}: HrFingerprintManagementProps) {
  const [subTab, setSubTab] = useState<FpSubTab>('devices')

  const [devicesStatus, setDevicesStatus] = useState<LoadStatus>('idle')
  const [devices, setDevices] = useState<FpMachine[]>([])
  const [devicesError, setDevicesError] = useState<string | null>(null)

  const [summaryStatus, setSummaryStatus] = useState<LoadStatus>('idle')
  const [summary, setSummary] = useState<DeviceSummary | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [mappingsStatus, setMappingsStatus] = useState<LoadStatus>('idle')
  const [mappings, setMappings] = useState<FpMapping[]>([])
  const [mappingsError, setMappingsError] = useState<string | null>(null)

  const [employeesStatus, setEmployeesStatus] = useState<LoadStatus>('idle')
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [employeeQuery, setEmployeeQuery] = useState<string>('')

  const [syncHistoryOpen, setSyncHistoryOpen] = useState(false)
  const [syncHistoryDevice, setSyncHistoryDevice] = useState<FpMachine | null>(null)
  const [syncHistoryStatus, setSyncHistoryStatus] = useState<LoadStatus>('idle')
  const [syncHistory, setSyncHistory] = useState<FpSyncRun[]>([])
  const [syncHistoryError, setSyncHistoryError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editDevice, setEditDevice] = useState<FpMachine | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteDevice, setDeleteDevice] = useState<FpMachine | null>(null)

  const [formStatus, setFormStatus] = useState<LoadStatus>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const [formDisplayName, setFormDisplayName] = useState('')
  const [formIp, setFormIp] = useState('')
  const [formPort, setFormPort] = useState<string>('4370')
  const [formModel, setFormModel] = useState('')
  const [formTimezone, setFormTimezone] = useState('Asia/Jakarta')
  const [formAuthEnabled, setFormAuthEnabled] = useState(false)
  const [formAuthUser, setFormAuthUser] = useState('')
  const [formAuthPass, setFormAuthPass] = useState('')

  const [testConnectId, setTestConnectId] = useState<number | null>(null)
  const [testConnectStatus, setTestConnectStatus] = useState<LoadStatus>('idle')
  const [testConnectMessage, setTestConnectMessage] = useState<string | null>(null)
  const [testConnectTone, setTestConnectTone] = useState<'success' | 'danger' | 'info' | 'warning'>('info')

  const [syncNowId, setSyncNowId] = useState<number | null>(null)
  const [syncNowStatus, setSyncNowStatus] = useState<LoadStatus>('idle')
  const [syncNowMessage, setSyncNowMessage] = useState<string | null>(null)
  const [syncNowTone, setSyncNowTone] = useState<'success' | 'danger' | 'info' | 'warning'>('info')

  const [mappingFormStatus, setMappingFormStatus] = useState<LoadStatus>('idle')
  const [mappingFormError, setMappingFormError] = useState<string | null>(null)
  const [mappingFormSuccess, setMappingFormSuccess] = useState<string | null>(null)
  const [mappingMachineId, setMappingMachineId] = useState<number | ''>('')
  const [mappingMachineUserId, setMappingMachineUserId] = useState('')
  const [mappingEmployeeId, setMappingEmployeeId] = useState<number | ''>('')
  const [mappingEnrollment, setMappingEnrollment] = useState<EnrollmentStatus>('ENROLLED')
  const [mappingFilterMachine, setMappingFilterMachine] = useState<number | ''>('')

  const mappingsFiltered = useMemo(() => {
    if (!Number.isFinite(Number(mappingFilterMachine)) || mappingFilterMachine === '') {
      return mappings
    }
    return mappings.filter((m) => m.machineId === Number(mappingFilterMachine))
  }, [mappings, mappingFilterMachine])

  const employeesFiltered = useMemo(() => {
    const q = employeeQuery.trim().toLowerCase()
    if (!q) return employees.slice(0, 50)
    return employees
      .filter((e) => {
        const code = (e.employeeCode || '').toLowerCase()
        const name = (e.fullName || '').toLowerCase()
        return code.includes(q) || name.includes(q)
      })
      .slice(0, 50)
  }, [employees, employeeQuery])

  const canWrite = canCreate || canUpdate
  const canWriteWarn = reviewDbReady ? null : 'Aksi tulis hanya tersedia saat database review benar-benar tersedia.'

  useEffect(() => {
    void refreshDevices()
    void refreshSummary()
    void refreshEmployees()
  }, [canView])

  useEffect(() => {
    if (subTab === 'mappings') {
      void refreshMappings()
    }
  }, [subTab, canView])

  async function refreshDevices() {
    if (!canView) return
    setDevicesStatus('loading')
    setDevicesError(null)
    try {
      const res = await fetch('/api/hr/fingerprint/devices')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const data = Array.isArray(json?.data) ? (json.data as FpMachine[]) : []
      setDevices(data)
      setDevicesStatus('loaded')
    } catch (err: any) {
      setDevicesError(friendlyErrorMessage(err?.message || null, 'Gagal memuat daftar device fingerprint.'))
      setDevicesStatus('error')
    }
  }

  async function refreshSummary() {
    if (!canView) return
    setSummaryStatus('loading')
    setSummaryError(null)
    try {
      const res = await fetch('/api/hr/fingerprint/devices/summary')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const s: DeviceSummary = {
        total_active: Number(json?.total_active) || 0,
        online_count: Number(json?.online_count) || 0,
        offline_count: Number(json?.offline_count) || 0,
        unknown_count: Number(json?.unknown_count) || 0,
      }
      setSummary(s)
      setSummaryStatus('loaded')
    } catch (err: any) {
      setSummaryError(friendlyErrorMessage(err?.message || null, 'Gagal memuat ringkasan device fingerprint.'))
      setSummaryStatus('error')
    }
  }

  async function refreshMappings() {
    if (!canView) return
    setMappingsStatus('loading')
    setMappingsError(null)
    try {
      const url = mappingFilterMachine !== '' && Number.isFinite(Number(mappingFilterMachine))
        ? `/api/hr/fingerprint/mappings?machineId=${encodeURIComponent(String(mappingFilterMachine))}`
        : '/api/hr/fingerprint/mappings'
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const data = Array.isArray(json?.data) ? (json.data as FpMapping[]) : []
      setMappings(data)
      setMappingsStatus('loaded')
    } catch (err: any) {
      setMappingsError(friendlyErrorMessage(err?.message || null, 'Gagal memuat mapping fingerprint karyawan.'))
      setMappingsStatus('error')
    }
  }

  async function refreshEmployees() {
    if (!canView) return
    setEmployeesStatus('loading')
    try {
      const res = await fetch('/api/hr/employees?limit=200')
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const list = Array.isArray(json?.data) ? (json.data as EmployeeOption[]) : []
      setEmployees(list)
      setEmployeesStatus('loaded')
    } catch (err: any) {
      setEmployeesStatus('error')
      void err
    }
  }

  function openCreate() {
    if (!canCreate) return
    setFormDisplayName('')
    setFormIp('')
    setFormPort('4370')
    setFormModel('')
    setFormTimezone('Asia/Jakarta')
    setFormAuthEnabled(false)
    setFormAuthUser('')
    setFormAuthPass('')
    setFormStatus('idle')
    setFormError(null)
    setFormSuccess(null)
    setCreateOpen(true)
    setEditOpen(false)
    setEditDevice(null)
  }

  function openEdit(device: FpMachine) {
    if (!canUpdate) return
    setEditDevice(device)
    setFormDisplayName(device.displayName || '')
    setFormIp(device.ip || '')
    setFormPort(device.port != null && device.port !== 0 ? String(device.port) : '')
    setFormModel(device.model || '')
    setFormTimezone(device.deviceTimezone || 'Asia/Jakarta')
    setFormAuthEnabled(false)
    setFormAuthUser('')
    setFormAuthPass('')
    setFormStatus('idle')
    setFormError(null)
    setFormSuccess(null)
    setEditOpen(true)
    setCreateOpen(false)
  }

  function openDelete(device: FpMachine) {
    if (!canDelete) return
    setDeleteDevice(device)
    setDeleteOpen(true)
  }

  function openSyncHistory(device: FpMachine) {
    if (!canView) return
    setSyncHistoryDevice(device)
    setSyncHistory([])
    setSyncHistoryError(null)
    setSyncHistoryStatus('idle')
    setSyncHistoryOpen(true)
    void loadSyncHistory(device.id)
  }

  async function loadSyncHistory(deviceId: number) {
    setSyncHistoryStatus('loading')
    setSyncHistoryError(null)
    try {
      const res = await fetch(`/api/hr/fingerprint/devices/${encodeURIComponent(String(deviceId))}/sync-history?limit=50`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { message?: string }).message || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const data = Array.isArray(json?.data) ? (json.data as FpSyncRun[]) : []
      setSyncHistory(data)
      setSyncHistoryStatus('loaded')
    } catch (err: any) {
      setSyncHistoryError(friendlyErrorMessage(err?.message || null, 'Gagal memuat riwayat sinkronisasi.'))
      setSyncHistoryStatus('error')
    }
  }

  function resetTestConnect() {
    setTestConnectId(null)
    setTestConnectStatus('idle')
    setTestConnectMessage(null)
    setTestConnectTone('info')
  }

  async function handleTestConnect(device: FpMachine) {
    if (!canView) return
    resetTestConnect()
    setTestConnectId(device.id)
    setTestConnectStatus('loading')
    setTestConnectTone('info')
    setTestConnectMessage('Menghubungkan ke mesin fingerprint...')
    try {
      const res = await fetch(`/api/hr/fingerprint/devices/${encodeURIComponent(String(device.id))}/test-connection`, {
        method: 'POST',
      })
      const json = await res.json().catch(() => ({}))
      const ok = Boolean((json as { ok?: boolean }).ok)
      const info = (json as { info?: string | null })?.info || ''
      const errMsg = (json as { errorMessage?: string | null })?.errorMessage || (json as { message?: string })?.message || ''
      if (!res.ok || !ok) {
        setTestConnectTone('danger')
        const raw = errMsg || info || 'Gagal terhubung ke mesin fingerprint.'
        if (errMsg === 'MACHINE_NOT_FOUND') {
          setTestConnectMessage('Device fingerprint tidak ditemukan di sistem.')
        } else if (/AUTH/i.test(raw) || /CREDENTIAL/i.test(raw)) {
          setTestConnectMessage('Kredensial otentikasi tidak valid untuk device ini.')
        } else if (/TIMEOUT|NETWORK|TIDAK DAPAT|ECONN|ENOTFOUND/i.test(raw)) {
          setTestConnectMessage('Tidak dapat menjangkau device. Periksa IP, port, dan koneksi jaringan.')
        } else {
          setTestConnectMessage(friendlyErrorMessage(raw, 'Gagal terhubung ke mesin fingerprint.'))
        }
        setTestConnectStatus('error')
      } else {
        setTestConnectTone('success')
        setTestConnectMessage(info ? `Berhasil terhubung. ${info}` : 'Berhasil terhubung ke mesin fingerprint.')
        setTestConnectStatus('loaded')
      }
      await Promise.all([refreshDevices(), refreshSummary()]).catch(() => {})
    } catch (err: any) {
      setTestConnectTone('danger')
      setTestConnectMessage(friendlyErrorMessage(err?.message || null, 'Gagal memanggil test koneksi ke mesin fingerprint.'))
      setTestConnectStatus('error')
    }
  }

  function resetSyncNow() {
    setSyncNowId(null)
    setSyncNowStatus('idle')
    setSyncNowMessage(null)
    setSyncNowTone('info')
  }

  async function handleSyncNow(device: FpMachine) {
    if (!canCreate) return
    resetSyncNow()
    setSyncNowId(device.id)
    setSyncNowStatus('loading')
    setSyncNowTone('info')
    setSyncNowMessage('Menjalankan sinkronisasi...')
    try {
      const res = await fetch(`/api/hr/fingerprint/devices/${encodeURIComponent(String(device.id))}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncMode: 'MANUAL' }),
      })
      const json = await res.json().catch(() => ({}))
      const run = (json as { run?: FpSyncRun }).run
      const message = (json as { message?: string }).message || ''
      if (!res.ok || !run) {
        setSyncNowTone('danger')
        setSyncNowMessage(friendlyErrorMessage(message, 'Gagal menjalankan sinkronisasi.'))
        setSyncNowStatus('error')
      } else {
        if (run.finalStatus === 'SUCCESS') {
          setSyncNowTone('success')
          setSyncNowMessage(
            `Sinkronisasi selesai (SUKSES). ${run.totalNewValid} data baru, ${run.totalDuplicatesSkipped} dilewati, ${run.totalUnmapped} belum ter-mapping.`,
          )
          setSyncNowStatus('loaded')
        } else if (run.finalStatus === 'PARTIAL') {
          setSyncNowTone('warning')
          setSyncNowMessage(
            `Sinkronisasi selesai (PARSIAL). ${run.totalNewValid} baru, ${run.totalFailedParse} gagal parse, ${run.totalUnmapped} unmapped.${
              run.errorSummary ? ` Catatan: ${run.errorSummary}` : ''
            }`,
          )
          setSyncNowStatus('loaded')
        } else {
          setSyncNowTone('danger')
          setSyncNowMessage(
            `Sinkronisasi GAGAL.${run.errorSummary ? ` ${run.errorSummary}` : ' Cek konfigurasi device dan koneksi.'}`,
          )
          setSyncNowStatus('error')
        }
      }
      await Promise.all([refreshDevices(), refreshSummary(), refreshMappings()]).catch(() => {})
    } catch (err: any) {
      setSyncNowTone('danger')
      setSyncNowMessage(friendlyErrorMessage(err?.message || null, 'Gagal memanggil sinkronisasi fingerprint.'))
      setSyncNowStatus('error')
    }
  }

  function validateDeviceForm(): string | null {
    if (!String(formIp || '').trim()) return 'IP / hostname wajib diisi.'
    if (!String(formModel || '').trim()) return 'Model mesin fingerprint wajib diisi.'
    if (formPort !== '') {
      const n = Number(formPort)
      if (!Number.isFinite(n) || n < 0 || n > 65535) return 'Port harus angka valid 0-65535 atau dikosongkan.'
    }
    if (!String(formTimezone || '').trim()) return 'Timezone device wajib diisi.'
    if (formAuthEnabled) {
      if ((formAuthUser || formAuthPass) && !(formAuthUser && formAuthPass)) {
        return 'Jika otentikasi diaktifkan, username dan password harus diisi bersamaan.'
      }
    }
    return null
  }

  async function handleSubmitCreateOrUpdate(e: FormEvent) {
    e.preventDefault()
    const isUpdate = editOpen && editDevice != null
    if (isUpdate && !canUpdate) return
    if (!isUpdate && !canCreate) return
    if (!reviewDbReady) {
      setFormStatus('error')
      setFormError('Aksi tulis hanya tersedia saat review DB benar-benar tersedia.')
      return
    }
    const validationError = validateDeviceForm()
    if (validationError) {
      setFormStatus('error')
      setFormError(validationError)
      return
    }
    setFormStatus('loading')
    setFormError(null)
    setFormSuccess(null)
    const body: Record<string, unknown> = {
      ip: String(formIp || '').trim(),
      model: String(formModel || '').trim(),
      deviceTimezone: String(formTimezone || 'Asia/Jakarta').trim(),
      displayName: formDisplayName ? String(formDisplayName).trim() : undefined,
    }
    body.port = formPort === '' ? null : Number(formPort)
    if (formAuthEnabled && formAuthUser && formAuthPass) {
      body.authConfig = { username: formAuthUser.trim(), password: formAuthPass }
    } else if (isUpdate) {
      body.authConfig = null
    }
    try {
      let res: Response
      if (isUpdate) {
        res = await fetch(`/api/hr/fingerprint/devices/${encodeURIComponent(String(editDevice!.id))}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/hr/fingerprint/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      const json = await res.json().catch(() => ({}))
      const msg = String((json as { message?: string }).message || '')
      if (res.status === 409 || /DUPLICATE_IP_PORT/i.test(msg) || /already.*exist|duplicate.*port/i.test(msg)) {
        setFormStatus('error')
        setFormError('Kombinasi IP dan port device fingerprint sudah terdaftar. Gunakan IP/port lain.')
        return
      }
      if (!res.ok) {
        setFormStatus('error')
        setFormError(friendlyErrorMessage(msg, isUpdate ? 'Gagal memperbarui device fingerprint.' : 'Gagal menyimpan device fingerprint.'))
        return
      }
      setFormStatus('loaded')
      setFormSuccess(isUpdate ? msg || 'Device fingerprint berhasil diperbarui.' : msg || 'Device fingerprint berhasil disimpan.')
      await Promise.all([refreshDevices(), refreshSummary()]).catch(() => {})
      setTimeout(() => {
        setCreateOpen(false)
        setEditOpen(false)
        setEditDevice(null)
        setFormStatus('idle')
        setFormSuccess(null)
      }, 700)
    } catch (err: any) {
      setFormStatus('error')
      setFormError(friendlyErrorMessage(err?.message || null, 'Terjadi kesalahan saat menyimpan device.'))
    }
  }

  async function handleConfirmDelete() {
    if (!deleteDevice || !canDelete || !reviewDbReady) return
    setFormStatus('loading')
    setFormError(null)
    try {
      const res = await fetch(`/api/hr/fingerprint/devices/${encodeURIComponent(String(deleteDevice.id))}`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => ({}))
      const msg = String((json as { message?: string }).message || '')
      if (!res.ok) {
        setDeleteOpen(false)
        setDeleteDevice(null)
        setFormStatus('error')
        setFormError(friendlyErrorMessage(msg, 'Gagal menghapus device fingerprint.'))
        return
      }
      setFormStatus('loaded')
      setFormSuccess(msg || 'Device fingerprint berhasil dihapus.')
      await Promise.all([refreshDevices(), refreshSummary(), refreshMappings()]).catch(() => {})
      setDeleteOpen(false)
      setDeleteDevice(null)
      setTimeout(() => {
        setFormStatus('idle')
        setFormSuccess(null)
      }, 900)
    } catch (err: any) {
      setDeleteOpen(false)
      setDeleteDevice(null)
      setFormStatus('error')
      setFormError(friendlyErrorMessage(err?.message || null, 'Gagal menghapus device fingerprint.'))
    }
  }

  async function handleSubmitMapping(e: FormEvent) {
    e.preventDefault()
    if (!canCreate || !reviewDbReady) {
      setMappingFormStatus('error')
      setMappingFormError(!canCreate ? 'Anda tidak memiliki izin menambah mapping.' : 'Aksi tulis hanya tersedia saat review DB benar-benar tersedia.')
      return
    }
    const machineIdN = Number(mappingMachineId)
    const employeeIdN = Number(mappingEmployeeId)
    const machineUserIdV = String(mappingMachineUserId || '').trim()
    if (!machineIdN || !Number.isFinite(machineIdN)) {
      setMappingFormStatus('error')
      setMappingFormError('Pilih device fingerprint terlebih dahulu.')
      return
    }
    if (!machineUserIdV) {
      setMappingFormStatus('error')
      setMappingFormError('ID User pada Mesin Fingerprint wajib diisi.')
      return
    }
    if (!employeeIdN || !Number.isFinite(employeeIdN)) {
      setMappingFormStatus('error')
      setMappingFormError('Pilih karyawan untuk di-mapping.')
      return
    }
    setMappingFormStatus('loading')
    setMappingFormError(null)
    setMappingFormSuccess(null)
    try {
      const res = await fetch('/api/hr/fingerprint/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: machineIdN,
          machineUserId: machineUserIdV,
          employeeId: employeeIdN,
          enrollmentStatus: mappingEnrollment,
        }),
      })
      const json = await res.json().catch(() => ({}))
      const msg = String((json as { message?: string }).message || '')
      if (res.status === 409) {
        setMappingFormStatus('error')
        setMappingFormError(msg || 'Mapping untuk ID user mesin fingerprint ini sudah ada di device tersebut. Gunakan ID lain atau cabut mapping yang lama.')
        return
      }
      if (!res.ok) {
        setMappingFormStatus('error')
        setMappingFormError(friendlyErrorMessage(msg, 'Gagal menyimpan mapping fingerprint.'))
        return
      }
      setMappingFormStatus('loaded')
      setMappingFormSuccess(msg || 'Mapping fingerprint berhasil disimpan.')
      setMappingMachineUserId('')
      setMappingEmployeeId('')
      await refreshMappings()
      setTimeout(() => {
        setMappingFormStatus('idle')
        setMappingFormSuccess(null)
      }, 900)
    } catch (err: any) {
      setMappingFormStatus('error')
      setMappingFormError(friendlyErrorMessage(err?.message || null, 'Gagal menyimpan mapping fingerprint.'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="panel p-2 inline-flex flex-wrap items-center gap-2 rounded-full">
        <UiButton variant={subTab === 'devices' ? 'primary' : 'ghost'} size="sm" onClick={() => setSubTab('devices')}>
          Perangkat Fingerprint
        </UiButton>
        <UiButton variant={subTab === 'mappings' ? 'primary' : 'ghost'} size="sm" onClick={() => setSubTab('mappings')}>
          Mapping Karyawan
        </UiButton>
        {canWrite && canWriteWarn ? (
          <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">{canWriteWarn}</span>
        ) : null}
      </div>

      {formStatus === 'loaded' && formSuccess ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200">
          {formSuccess}
        </div>
      ) : null}
      {formStatus === 'error' && formError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200">
          {formError}
        </div>
      ) : null}

      {subTab === 'devices' ? (
        <div className="space-y-4">
          <SummaryCards status={summaryStatus} summary={summary} error={summaryError} />
          <section className="panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-title">Perangkat Fingerprint</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  Daftar Mesin Absensi
                </h2>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Kelola koneksi, konfigurasi, dan sinkronisasi mesin fingerprint untuk data absensi karyawan.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <UiButton variant="secondary" size="sm" onClick={() => { void refreshDevices(); void refreshSummary() }}>
                  Refresh
                </UiButton>
                {canCreate ? (
                  <UiButton variant="primary" size="sm" onClick={openCreate}>
                    Tambah Mesin Fingerprint
                  </UiButton>
                ) : null}
              </div>
            </div>

            <DevicesTable
              status={devicesStatus}
              devices={devices}
              error={devicesError}
              canView={canView}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEdit}
              onDelete={openDelete}
              onTestConnect={handleTestConnect}
              onSyncNow={handleSyncNow}
              onSyncHistory={openSyncHistory}
              testConnectId={testConnectId}
              testConnectStatus={testConnectStatus}
              testConnectMessage={testConnectMessage}
              testConnectTone={testConnectTone}
              syncNowId={syncNowId}
              syncNowStatus={syncNowStatus}
              syncNowMessage={syncNowMessage}
              syncNowTone={syncNowTone}
              refreshAction={() => { void refreshDevices(); void refreshSummary() }}
            />
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="panel p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-title">Mapping Karyawan ↔ Mesin Fingerprint</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  ID User pada Mesin Fingerprint
                </h2>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Mapping ID user internal mesin fingerprint ke data karyawan agar data tap mesin dapat
                  diidentifikasi sebagai kehadiran karyawan yang benar.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-mute">
                  Filter device
                  <select
                    value={mappingFilterMachine}
                    onChange={(e) => {
                      const v = e.target.value
                      setMappingFilterMachine(v === '' ? '' : Number(v))
                    }}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Semua device</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName || d.model} · {d.ip}:{d.port ?? '-'}
                      </option>
                    ))}
                  </select>
                </label>
                <UiButton variant="secondary" size="sm" onClick={() => { void refreshMappings(); void refreshEmployees() }}>
                  Refresh
                </UiButton>
              </div>
            </div>

            {canCreate ? (
              <form
                onSubmit={handleSubmitMapping}
                className="mt-6 grid gap-4 rounded-2xl border border-line bg-slate-50/60 p-5 dark:bg-slate-800/40 md:grid-cols-2 xl:grid-cols-5"
              >
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Device Fingerprint</span>
                  <select
                    value={mappingMachineId}
                    onChange={(e) => setMappingMachineId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Pilih device...</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName || d.model} · {d.ip}:{d.port ?? '-'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">ID User pada Mesin Fingerprint</span>
                  <input
                    type="text"
                    value={mappingMachineUserId}
                    onChange={(e) => setMappingMachineUserId(e.target.value)}
                    placeholder="Contoh: 1 / 1001 / A-007"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>
                <label className="xl:col-span-2 flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Karyawan</span>
                  <input
                    type="text"
                    value={employeeQuery}
                    onChange={(e) => setEmployeeQuery(e.target.value)}
                    placeholder="Cari berdasarkan kode karyawan atau nama..."
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {employeesStatus !== 'idle' && employeesStatus !== 'loading' && employeesFiltered.length > 0 ? (
                    <div className="mt-1 grid max-h-48 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                      {employeesFiltered.map((e) => {
                        const selected = mappingEmployeeId !== '' && Number(mappingEmployeeId) === e.id
                        return (
                          <button
                            type="button"
                            key={e.id}
                            onClick={() => {
                              setMappingEmployeeId(e.id)
                              setEmployeeQuery(`${e.employeeCode} ${e.fullName}`)
                            }}
                            className={`rounded-lg px-3 py-2 text-left text-sm transition ${
                              selected
                                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="font-semibold">{e.employeeCode}</span> · {e.fullName}
                            {e.employmentStatus ? <span className="ml-2 text-xs text-mute">({e.employmentStatus})</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : employeesStatus === 'loading' ? (
                    <div className="mt-1 animate-pulse h-8 rounded-xl bg-slate-200/60 dark:bg-slate-700/60" />
                  ) : null}
                  <select
                    value={mappingEmployeeId}
                    onChange={(e) => setMappingEmployeeId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Pilih karyawan...</option>
                    {employees.slice(0, 500).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.employeeCode} · {e.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Status Mapping</span>
                  <select
                    value={mappingEnrollment}
                    onChange={(e) => setMappingEnrollment(e.target.value as EnrollmentStatus)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ENROLLED">Terdaftar</option>
                    <option value="PENDING">Menunggu</option>
                    <option value="REVOKED">Dicabut</option>
                  </select>
                </label>
                <div className="xl:col-span-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm">
                    {mappingFormStatus === 'loaded' && mappingFormSuccess ? (
                      <span className="text-emerald-700 dark:text-emerald-300">{mappingFormSuccess}</span>
                    ) : mappingFormStatus === 'error' && mappingFormError ? (
                      <span className="text-rose-700 dark:text-rose-300">{mappingFormError}</span>
                    ) : null}
                  </div>
                  <UiButton
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={mappingFormStatus === 'loading'}
                    loadingLabel="Menyimpan..."
                    disabled={!canCreate || !reviewDbReady}
                  >
                    Simpan Mapping
                  </UiButton>
                </div>
              </form>
            ) : null}

            <MappingsTable status={mappingsStatus} mappings={mappingsFiltered} error={mappingsError} devices={devices} />
          </section>
        </div>
      )}

      {createOpen || editOpen ? (
        <DeviceFormModal
          mode={editOpen && editDevice ? 'edit' : 'create'}
          device={editDevice || null}
          onClose={() => { setCreateOpen(false); setEditOpen(false); setEditDevice(null); setFormStatus('idle'); setFormError(null); setFormSuccess(null) }}
          onSubmit={handleSubmitCreateOrUpdate}
          formStatus={formStatus}
          formError={formError}
          formSuccess={formSuccess}
          reviewDbReady={reviewDbReady}
          displayName={formDisplayName}
          setDisplayName={setFormDisplayName}
          ip={formIp}
          setIp={setFormIp}
          port={formPort}
          setPort={setFormPort}
          model={formModel}
          setModel={setFormModel}
          timezone={formTimezone}
          setTimezone={setFormTimezone}
          authEnabled={formAuthEnabled}
          setAuthEnabled={setFormAuthEnabled}
          authUser={formAuthUser}
          setAuthUser={setFormAuthUser}
          authPass={formAuthPass}
          setAuthPass={setFormAuthPass}
        />
      ) : null}

      {deleteOpen && deleteDevice ? (
        <ConfirmModal
          title="Hapus konfigurasi mesin fingerprint ini?"
          description={`Konfigurasi untuk ${deleteDevice.displayName || deleteDevice.model} (IP ${deleteDevice.ip}) akan dihapus secara permanen. Data absensi yang sudah tersimpan tidak akan hilang, namun konfigurasi koneksi dan mapping mesin bisa terputus sampai anda tambahkan kembali.`}
          confirmLabel="Hapus Device"
          cancelLabel="Batal"
          tone="danger"
          loading={formStatus === 'loading'}
          loadingLabel="Menghapus..."
          onConfirm={handleConfirmDelete}
          onCancel={() => { setDeleteOpen(false); setDeleteDevice(null) }}
        />
      ) : null}

      {syncHistoryOpen ? (
        <SyncHistoryDrawer
          open={syncHistoryOpen}
          onClose={() => { setSyncHistoryOpen(false); setSyncHistoryDevice(null); setSyncHistory([]); setSyncHistoryStatus('idle'); setSyncHistoryError(null) }}
          device={syncHistoryDevice}
          status={syncHistoryStatus}
          runs={syncHistory}
          error={syncHistoryError}
        />
      ) : null}
    </div>
  )
}

function SummaryCards({
  status,
  summary,
  error,
}: {
  status: LoadStatus
  summary: DeviceSummary | null
  error: string | null
}) {
  if (status === 'loading' || summary === null) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="panel p-5 animate-pulse">
            <div className="h-4 w-24 rounded bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="mt-4 h-8 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          </div>
        ))}
      </div>
    )
  }
  if (status === 'error' && error) {
    return (
      <div role="alert" className="panel p-5">
        <p className="section-title">Ringkasan Perangkat</p>
        <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-300">{error}</p>
      </div>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <article className="panel p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total Mesin Aktif</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{summary.total_active}</p>
      </article>
      <article className="panel p-5 border-emerald-200 bg-emerald-50/50 dark:border-emerald-700/40 dark:bg-emerald-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">ONLINE</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">{summary.online_count}</p>
      </article>
      <article className="panel p-5 border-rose-200 bg-rose-50/50 dark:border-rose-700/40 dark:bg-rose-950/20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">OFFLINE / ERROR</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-rose-800 dark:text-rose-200">{summary.offline_count}</p>
      </article>
      <article className="panel p-5 border-slate-200 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-800/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">UNKNOWN</p>
        <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">{summary.unknown_count}</p>
      </article>
    </div>
  )
}

function DevicesTable({
  status,
  devices,
  error,
  canView,
  canCreate,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onTestConnect,
  onSyncNow,
  onSyncHistory,
  testConnectId,
  testConnectStatus,
  testConnectMessage,
  testConnectTone,
  syncNowId,
  syncNowStatus,
  syncNowMessage,
  syncNowTone,
  refreshAction,
}: {
  status: LoadStatus
  devices: FpMachine[]
  error: string | null
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: (d: FpMachine) => void
  onDelete: (d: FpMachine) => void
  onTestConnect: (d: FpMachine) => void
  onSyncNow: (d: FpMachine) => void
  onSyncHistory: (d: FpMachine) => void
  testConnectId: number | null
  testConnectStatus: LoadStatus
  testConnectMessage: string | null
  testConnectTone: 'success' | 'danger' | 'info' | 'warning'
  syncNowId: number | null
  syncNowStatus: LoadStatus
  syncNowMessage: string | null
  syncNowTone: 'success' | 'danger' | 'info' | 'warning'
  refreshAction: () => void
}) {
  if (status === 'loading') {
    return (
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 w-full rounded-2xl border border-line bg-slate-50 dark:bg-slate-800/50" />
        ))}
        <p className="text-xs text-mute">Memuat daftar device fingerprint...</p>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-700/40 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat device fingerprint</p>
        <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error || 'Terjadi kesalahan tidak diketahui.'}</p>
      </div>
    )
  }
  if (devices.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/40">
        <div className="text-5xl" aria-hidden="true">🖇️</div>
        <h3 className="mt-5 font-[family-name:var(--font-heading)] text-xl font-semibold text-slate-950 dark:text-white">
          Belum ada mesin fingerprint
        </h3>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-mute">
          Tambahkan IP dan konfigurasi mesin fingerprint untuk mulai melakukan sinkronisasi data absensi.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {canCreate ? (
            <UiButton variant="primary" size="md" onClick={() => { const anyCreate = document.querySelector<HTMLButtonElement>('button[data-create-fallback]'); if (anyCreate) anyCreate.click() }}>
              Tambah Mesin Fingerprint
            </UiButton>
          ) : null}
          <UiButton variant="secondary" size="md" onClick={refreshAction}>Coba Lagi</UiButton>
        </div>
      </div>
    )
  }
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-mute dark:bg-slate-800/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Device Name</th>
            <th className="px-4 py-3 text-left font-semibold">IP</th>
            <th className="px-4 py-3 text-left font-semibold">Port</th>
            <th className="px-4 py-3 text-left font-semibold">Model</th>
            <th className="px-4 py-3 text-left font-semibold">Timezone</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Last Sync</th>
            <th className="px-4 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {devices.map((d) => {
            const tcActive = testConnectId === d.id
            const snActive = syncNowId === d.id
            return (
              <tr key={d.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-950 dark:text-white">
                    {d.displayName || d.model}
                  </div>
                  <div className="text-xs text-mute">{d.id} · created {formatDateTime(d.createdAt)}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{d.ip}</td>
                <td className="px-4 py-3 font-mono text-xs">{d.port ?? '-'}</td>
                <td className="px-4 py-3">{d.model}</td>
                <td className="px-4 py-3 text-xs">{d.deviceTimezone}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={connectionTone(d.lastConnectionStatus)} label={connectionLabel(d.lastConnectionStatus)} size="sm" />
                  {tcActive && testConnectMessage ? (
                    <div
                      className={`mt-2 max-w-xs rounded-lg border p-2 text-xs ${
                        testConnectTone === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                          : testConnectTone === 'danger'
                          ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200'
                          : testConnectTone === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200'
                          : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200'
                      }`}
                    >
                      {testConnectStatus === 'loading' ? (
                        <span className="inline-flex items-center gap-2"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current"></span>{testConnectMessage}</span>
                      ) : (
                        testConnectMessage
                      )}
                    </div>
                  ) : null}
                  {snActive && syncNowMessage ? (
                    <div
                      className={`mt-2 max-w-xs rounded-lg border p-2 text-xs ${
                        syncNowTone === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                          : syncNowTone === 'danger'
                          ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200'
                          : syncNowTone === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200'
                          : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200'
                      }`}
                    >
                      {syncNowStatus === 'loading' ? (
                        <span className="inline-flex items-center gap-2"><span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current"></span>{syncNowMessage}</span>
                      ) : (
                        syncNowMessage
                      )}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-mute">{formatDateTime(d.lastSyncAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {canView ? (
                      <UiButton
                        variant="ghost"
                        size="sm"
                        onClick={() => onTestConnect(d)}
                        loading={tcActive && testConnectStatus === 'loading'}
                        loadingLabel="Connecting..."
                      >
                        Test Connection
                      </UiButton>
                    ) : null}
                    {canCreate ? (
                      <UiButton
                        variant="primary"
                        size="sm"
                        onClick={() => onSyncNow(d)}
                        loading={snActive && syncNowStatus === 'loading'}
                        loadingLabel="Syncing..."
                      >
                        Sync Sekarang
                      </UiButton>
                    ) : null}
                    {canView ? (
                      <UiButton variant="secondary" size="sm" onClick={() => onSyncHistory(d)}>
                        Riwayat Sync
                      </UiButton>
                    ) : null}
                    {canUpdate ? (
                      <UiButton variant="secondary" size="sm" onClick={() => onEdit(d)}>
                        Edit
                      </UiButton>
                    ) : null}
                    {canDelete ? (
                      <UiButton variant="danger" size="sm" onClick={() => onDelete(d)}>
                        Hapus
                      </UiButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MappingsTable({
  status,
  mappings,
  error,
  devices,
}: {
  status: LoadStatus
  mappings: FpMapping[]
  error: string | null
  devices: FpMachine[]
}) {
  if (status === 'loading') {
    return (
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-14 w-full rounded-2xl border border-line bg-slate-50 dark:bg-slate-800/50" />
        ))}
        <p className="text-xs text-mute">Memuat mapping fingerprint...</p>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-700/40 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat mapping fingerprint</p>
        <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error || 'Terjadi kesalahan tidak diketahui.'}</p>
      </div>
    )
  }
  if (mappings.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-3xl" aria-hidden="true">🔗</p>
        <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">Belum ada mapping karyawan</h3>
        <p className="mt-2 text-sm leading-6 text-mute">
          Tambahkan mapping di atas agar event tap mesin fingerprint dapat terasosiasikan ke karyawan yang benar.
        </p>
      </div>
    )
  }
  const deviceLabel = (id: number) => {
    const d = devices.find((dev) => dev.id === id)
    return d ? `${d.displayName || d.model} · ${d.ip}:${d.port ?? '-'}` : `Device #${id}`
  }
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-mute dark:bg-slate-800/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Device</th>
            <th className="px-4 py-3 text-left font-semibold">ID User pada Mesin Fingerprint</th>
            <th className="px-4 py-3 text-left font-semibold">Karyawan</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {mappings.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-3 text-xs">{deviceLabel(m.machineId)}</td>
              <td className="px-4 py-3 font-mono text-xs">{m.machineUserId}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-slate-950 dark:text-white">{m.fullName || `employee_id:${m.employeeId}`}</div>
                <div className="text-xs text-mute">{m.employeeCode || '-'}</div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={enrollmentTone(m.enrollmentStatus)} label={enrollmentLabel(m.enrollmentStatus)} size="sm" />
              </td>
              <td className="px-4 py-3 text-xs text-mute">
                <div>Created: {formatDateTime(m.createdAt)}</div>
                <div>Didaftar: {formatDateTime(m.enrolledAt)} · Dicabut: {formatDateTime(m.revokedAt)}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DeviceFormModal({
  mode,
  device,
  onClose,
  onSubmit,
  formStatus,
  formError,
  formSuccess,
  reviewDbReady,
  displayName, setDisplayName,
  ip, setIp,
  port, setPort,
  model, setModel,
  timezone, setTimezone,
  authEnabled, setAuthEnabled,
  authUser, setAuthUser,
  authPass, setAuthPass,
}: {
  mode: 'create' | 'edit'
  device: FpMachine | null
  onClose: () => void
  onSubmit: (e: FormEvent) => void
  formStatus: LoadStatus
  formError: string | null
  formSuccess: string | null
  reviewDbReady: boolean
  displayName: string; setDisplayName: (v: string) => void
  ip: string; setIp: (v: string) => void
  port: string; setPort: (v: string) => void
  model: string; setModel: (v: string) => void
  timezone: string; setTimezone: (v: string) => void
  authEnabled: boolean; setAuthEnabled: (v: boolean) => void
  authUser: string; setAuthUser: (v: string) => void
  authPass: string; setAuthPass: (v: string) => void
}) {
  const isUpdate = mode === 'edit' && device != null
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between dark:border-slate-700">
            <div>
              <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                {isUpdate ? 'Edit Mesin Fingerprint' : 'Tambah Mesin Fingerprint'}
              </h3>
              <p className="mt-1 text-sm text-mute">
                {isUpdate
                  ? `Perbarui konfigurasi untuk ${device!.displayName || device!.model} (IP ${device!.ip}).`
                  : 'Tambahkan device fingerprint yang akan dikelola untuk sinkronisasi absensi.'}
              </p>
            </div>
            <UiButton variant="icon" size="sm" onClick={onClose} type="button" ariaLabel="Tutup modal">
              ✕
            </UiButton>
          </div>
          <div className="space-y-4 p-5">
            {!reviewDbReady ? (
              <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-200">
                Aksi tulis hanya tersedia saat database review benar-benar tersedia.
              </div>
            ) : null}
            {formStatus === 'error' && formError ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200">
                {formError}
              </div>
            ) : null}
            {formStatus === 'loaded' && formSuccess ? (
              <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                {formSuccess}
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Display Name <span className="text-xs font-normal normal-case">(opsional)</span></span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Contoh: Mesin Fingerprint Kantor Pusat"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">IP / hostname <span className="text-xs font-normal normal-case text-rose-700 dark:text-rose-300">(wajib)</span></span>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="Contoh: 192.168.1.101 atau mesin-absensi.local"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Port</span>
                <input
                  type="number"
                  min={0}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Default: 4370"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="text-xs text-mute">Dikosongkan jika device tanpa port spesifik.</p>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Model <span className="text-xs font-normal normal-case text-rose-700 dark:text-rose-300">(wajib)</span></span>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Contoh: ZKTeco F18, X6, MB460"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Device Timezone</span>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Contoh: Asia/Jakarta"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <div className="md:col-span-2 rounded-2xl border border-line bg-slate-50 p-4 dark:bg-slate-800/40">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={authEnabled}
                    onChange={(e) => setAuthEnabled(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/20 dark:border-slate-600"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">Konfigurasi Otentikasi Device</div>
                    <p className="mt-1 text-xs leading-6 text-mute">
                      Aktifkan hanya jika mesin fingerprint membutuhkan username/password untuk koneksi SDK.
                      {isUpdate ? (
                        <> Jika dikosongkan, <strong>kredensial lama akan dipertahankan.</strong> Untuk menghapus otentikasi, centang bagian ini dan biarkan username + password kosong.</>
                      ) : null}
                    </p>
                    {authEnabled ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Username</span>
                          <input
                            type="text"
                            value={authUser}
                            onChange={(e) => setAuthUser(e.target.value)}
                            placeholder={isUpdate ? 'Kosongkan untuk mempertahankan username lama' : 'Contoh: admin'}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Password</span>
                          <input
                            type="password"
                            autoComplete="new-password"
                            value={authPass}
                            onChange={(e) => setAuthPass(e.target.value)}
                            placeholder={isUpdate ? 'Kosongkan untuk mempertahankan password lama' : 'Masukkan password device'}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          />
                          <p className="text-xs text-mute">
                            {isUpdate
                              ? 'Password tidak akan ditampilkan (tersimpan dalam bentuk terenkripsi di server).'
                              : 'Password akan dikirimkan terenkripsi ke server dan tidak pernah ditampilkan kembali.'}
                          </p>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
            <UiButton variant="secondary" size="md" type="button" onClick={onClose}>Batal</UiButton>
            <UiButton
              type="submit"
              variant="primary"
              size="md"
              loading={formStatus === 'loading'}
              loadingLabel={isUpdate ? 'Menyimpan...' : 'Menambah...'}
              disabled={!reviewDbReady || formStatus === 'loaded'}
            >
              {isUpdate ? 'Simpan Perubahan' : 'Tambah Device'}
            </UiButton>
          </div>
        </form>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  loading,
  loadingLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  tone: 'primary' | 'danger'
  loading: boolean
  loadingLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-mute">{description}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <UiButton variant="secondary" size="md" onClick={onCancel} disabled={loading}>{cancelLabel}</UiButton>
          <UiButton variant={tone} size="md" loading={loading} loadingLabel={loadingLabel} onClick={onConfirm}>{confirmLabel}</UiButton>
        </div>
      </div>
    </div>
  )
}

function SyncHistoryDrawer({
  open,
  onClose,
  device,
  status,
  runs,
  error,
}: {
  open: boolean
  onClose: () => void
  device: FpMachine | null
  status: LoadStatus
  runs: FpSyncRun[]
  error: string | null
}) {
  if (!open) return null
  const d = device
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-end p-0 md:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 h-full w-full max-w-3xl overflow-hidden rounded-none md:rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:h-[85vh]">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between dark:border-slate-700">
          <div>
            <p className="section-title">Riwayat Sinkronisasi</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
              {d ? `${d.displayName || d.model} · ${d.ip}:${d.port ?? '-'}` : '-'}
            </h3>
            <p className="mt-2 text-sm text-mute">Catatan riwayat sinkronisasi attendance terbaru (maksimal 50 run terakhir).</p>
          </div>
          <UiButton variant="icon" size="sm" onClick={onClose} ariaLabel="Tutup drawer riwayat">✕</UiButton>
        </div>
        <div className="h-[calc(100%-9rem)] overflow-y-auto p-5">
          {status === 'loading' ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse h-24 rounded-2xl border border-line bg-slate-50 dark:bg-slate-800/50" />
              ))}
              <p className="text-xs text-mute">Memuat riwayat sinkronisasi...</p>
            </div>
          ) : status === 'error' ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-700/40 dark:bg-rose-950/30">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat riwayat sinkronisasi</p>
              <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error || 'Terjadi kesalahan tidak diketahui.'}</p>
            </div>
          ) : runs.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/40">
              <p className="text-3xl" aria-hidden="true">🕓</p>
              <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">Belum ada riwayat sinkronisasi</h3>
              <p className="mt-2 text-sm leading-6 text-mute">Belum ada sinkronisasi yang dijalankan untuk device ini. Jalankan Sync Sekarang untuk membuat riwayat pertama.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((r) => (
                <article key={r.id} className="rounded-2xl border border-line bg-slate-50 p-5 dark:bg-slate-800/40">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={finalStatusTone(r.finalStatus)} label={r.finalStatus} size="sm" />
                        <span className="badge border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          Mode: {r.syncMode}
                        </span>
                        <span className="badge border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          #{r.id}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-mute">Started: {formatDateTime(r.startedAt)}</p>
                      <p className="text-sm text-mute">Finished: {formatDateTime(r.finishedAt)}</p>
                      <p className="text-sm text-mute">Durasi: {durationMsLabel(r.durationMs)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:w-1/2">
                      <div className="rounded-xl border border-line bg-white p-3 dark:bg-slate-900">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Fetched</p>
                        <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{r.totalRecordsFetched}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-700/40 dark:bg-emerald-950/30">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Baru</p>
                        <p className="mt-2 text-lg font-semibold text-emerald-800 dark:text-emerald-200">{r.totalNewValid}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Duplikat</p>
                        <p className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{r.totalDuplicatesSkipped}</p>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-950/30">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">Unmapped</p>
                        <p className="mt-2 text-lg font-semibold text-amber-800 dark:text-amber-200">{r.totalUnmapped}</p>
                      </div>
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-700/40 dark:bg-rose-950/30">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-rose-700 dark:text-rose-300">Gagal Parse</p>
                        <p className="mt-2 text-lg font-semibold text-rose-800 dark:text-rose-200">{r.totalFailedParse}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Actor</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {r.actorUserId != null ? `User #${r.actorUserId}` : 'Sistem'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {r.errorSummary ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-700/40 dark:bg-rose-950/30 dark:text-rose-200">
                      <span className="font-semibold">Catatan error:</span> {r.errorSummary}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
